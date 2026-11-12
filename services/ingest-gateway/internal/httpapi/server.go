package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/queue"
)

const maxBodyBytes = 1 << 20

type Server struct {
	queue queue.Queue
	now   func() time.Time
}

func New(q queue.Queue) *Server {
	return &Server{queue: q, now: time.Now}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("POST /v1/traces", s.ingest)
	return mux
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ingest(w http.ResponseWriter, r *http.Request) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" || len(idempotencyKey) > 200 {
		writeError(w, http.StatusBadRequest, "Idempotency-Key is required and must be at most 200 characters")
		return
	}

	authorization := strings.TrimSpace(r.Header.Get("Authorization"))
	apiKey := strings.TrimSpace(r.Header.Get("X-API-Key"))
	if authorization == "" && apiKey == "" {
		writeError(w, http.StatusUnauthorized, "Authorization or X-API-Key is required")
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "request body exceeds 1 MiB")
		return
	}
	body, err = withExternalID(body, idempotencyKey)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	result, err := s.queue.Enqueue(r.Context(), queue.Item{
		ID:            idempotencyKey,
		Body:          body,
		Authorization: authorization,
		APIKey:        apiKey,
		SourceApp:     strings.TrimSpace(r.Header.Get("X-Sentinel-Source")),
		ReceivedAt:    s.now().UTC(),
	})
	if errors.Is(err, queue.ErrFull) {
		w.Header().Set("Retry-After", "1")
		writeError(w, http.StatusServiceUnavailable, "durable queue is at capacity; retry with the same idempotency key")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "trace was not accepted")
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]any{
		"idempotencyKey": idempotencyKey,
		"accepted":       true,
		"duplicate":      result.Duplicate,
	})
}

func withExternalID(body []byte, idempotencyKey string) ([]byte, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("request body must be a JSON object")
	}
	if payload == nil {
		return nil, fmt.Errorf("request body must be a JSON object")
	}
	if existing, ok := payload["externalId"]; ok && existing != idempotencyKey {
		return nil, fmt.Errorf("externalId must match Idempotency-Key when both are provided")
	}
	payload["externalId"] = idempotencyKey
	return json.Marshal(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
