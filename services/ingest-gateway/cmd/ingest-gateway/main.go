package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/delivery"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/httpapi"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/spool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	store, err := spool.Open(env("INGEST_SPOOL_DIR", "/var/lib/sentinelai-ingest"), envInt("INGEST_MAX_PENDING", 100_000))
	if err != nil {
		logger.Error("open durable spool", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	worker := delivery.New(store, &http.Client{Timeout: 10 * time.Second}, delivery.Config{
		UpstreamURL: env("INGEST_UPSTREAM_URL", "http://api:4000"),
		Workers:     envInt("INGEST_WORKERS", 8),
		MaxAttempts: envInt("INGEST_MAX_ATTEMPTS", 12),
		PollEvery:   100 * time.Millisecond,
		BaseBackoff: 250 * time.Millisecond,
		MaxBackoff:  30 * time.Second,
	}, logger)
	go worker.Run(ctx)

	server := &http.Server{
		Addr:              env("INGEST_ADDR", ":4100"),
		Handler:           httpapi.New(store).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	go func() {
		logger.Info("ingestion gateway listening", "address", server.Addr, "pending", store.Pending())
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("ingestion gateway stopped", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func envInt(name string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(name))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}
