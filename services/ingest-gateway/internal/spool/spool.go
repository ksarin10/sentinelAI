package spool

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/queue"
)

const fileSuffix = ".json"

var ErrEmpty = errors.New("ingestion queue is empty")

type Spool struct {
	root       string
	maxPending int
	mu         sync.Mutex
	pending    int
	known      map[string]*enqueueState
}

type enqueueState struct {
	done chan struct{}
	err  error
}

type Lease struct {
	Item queue.Item
	key  string
}

type receipt struct {
	ID          string    `json:"id"`
	CompletedAt time.Time `json:"completedAt"`
}

type deadLetter struct {
	Item     queue.Item `json:"item"`
	Reason   string     `json:"reason"`
	FailedAt time.Time  `json:"failedAt"`
}

func Open(root string, maxPending int) (*Spool, error) {
	if maxPending < 1 {
		return nil, fmt.Errorf("max pending must be positive")
	}
	for _, directory := range []string{"ready", "processing", "receipts", "dead", "tmp"} {
		if err := os.MkdirAll(filepath.Join(root, directory), 0o750); err != nil {
			return nil, fmt.Errorf("create spool directory: %w", err)
		}
	}

	s := &Spool{root: root, maxPending: maxPending, known: make(map[string]*enqueueState)}
	if err := s.recover(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Spool) Enqueue(ctx context.Context, item queue.Item) (queue.EnqueueResult, error) {
	key := itemKey(item)
	s.mu.Lock()
	if state, exists := s.known[key]; exists {
		s.mu.Unlock()
		select {
		case <-ctx.Done():
			return queue.EnqueueResult{}, ctx.Err()
		case <-state.done:
			if state.err != nil {
				return s.Enqueue(ctx, item)
			}
			return queue.EnqueueResult{Duplicate: true}, nil
		}
	}
	if s.pending >= s.maxPending {
		s.mu.Unlock()
		return queue.EnqueueResult{}, queue.ErrFull
	}
	state := &enqueueState{done: make(chan struct{})}
	s.known[key] = state
	s.pending++
	s.mu.Unlock()

	data, err := json.Marshal(item)
	if err != nil {
		err = fmt.Errorf("encode queued trace: %w", err)
	} else {
		err = s.atomicWrite("ready", key, data)
	}

	s.mu.Lock()
	state.err = err
	if err != nil {
		delete(s.known, key)
		s.pending--
	}
	close(state.done)
	s.mu.Unlock()
	return queue.EnqueueResult{}, err
}

func (s *Spool) Claim(_ context.Context, now time.Time) (*Lease, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := os.ReadDir(s.directory("ready"))
	if err != nil {
		return nil, fmt.Errorf("list ready traces: %w", err)
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), fileSuffix) {
			continue
		}
		key := strings.TrimSuffix(entry.Name(), fileSuffix)
		data, err := os.ReadFile(s.path("ready", key))
		if err != nil {
			return nil, fmt.Errorf("read queued trace: %w", err)
		}
		var item queue.Item
		if err := json.Unmarshal(data, &item); err != nil {
			return nil, fmt.Errorf("decode queued trace %s: %w", key, err)
		}
		if item.NextAttemptAt.After(now) {
			continue
		}
		if err := os.Rename(s.path("ready", key), s.path("processing", key)); err != nil {
			return nil, fmt.Errorf("claim queued trace: %w", err)
		}
		if err := syncDirectory(s.directory("ready")); err != nil {
			return nil, err
		}
		if err := syncDirectory(s.directory("processing")); err != nil {
			return nil, err
		}
		return &Lease{Item: item, key: key}, nil
	}
	return nil, ErrEmpty
}

func (s *Spool) Ack(lease *Lease, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := json.Marshal(receipt{ID: lease.Item.ID, CompletedAt: now.UTC()})
	if err != nil {
		return fmt.Errorf("encode receipt: %w", err)
	}
	if err := s.atomicWrite("receipts", lease.key, data); err != nil {
		return err
	}
	if err := os.Remove(s.path("processing", lease.key)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove delivered trace: %w", err)
	}
	if err := syncDirectory(s.directory("processing")); err != nil {
		return err
	}
	if s.pending > 0 {
		s.pending--
	}
	return nil
}

func (s *Spool) Retry(lease *Lease, nextAttemptAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	lease.Item.Attempts++
	lease.Item.NextAttemptAt = nextAttemptAt.UTC()
	data, err := json.Marshal(lease.Item)
	if err != nil {
		return fmt.Errorf("encode retry: %w", err)
	}
	if err := s.atomicWrite("ready", lease.key, data); err != nil {
		return err
	}
	if err := os.Remove(s.path("processing", lease.key)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("release retried trace: %w", err)
	}
	return syncDirectory(s.directory("processing"))
}

func (s *Spool) DeadLetter(lease *Lease, reason string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := json.Marshal(deadLetter{Item: lease.Item, Reason: reason, FailedAt: now.UTC()})
	if err != nil {
		return fmt.Errorf("encode dead letter: %w", err)
	}
	if err := s.atomicWrite("dead", lease.key, data); err != nil {
		return err
	}
	if err := os.Remove(s.path("processing", lease.key)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove failed trace: %w", err)
	}
	if err := syncDirectory(s.directory("processing")); err != nil {
		return err
	}
	if s.pending > 0 {
		s.pending--
	}
	return nil
}

func (s *Spool) Pending() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.pending
}

func (s *Spool) recover() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	processing, err := os.ReadDir(s.directory("processing"))
	if err != nil {
		return fmt.Errorf("list in-flight traces: %w", err)
	}
	for _, entry := range processing {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), fileSuffix) {
			continue
		}
		key := strings.TrimSuffix(entry.Name(), fileSuffix)
		if fileExists(s.path("receipts", key)) {
			if err := os.Remove(s.path("processing", key)); err != nil {
				return fmt.Errorf("finish acknowledged recovery: %w", err)
			}
			continue
		}
		if err := os.Rename(s.path("processing", key), s.path("ready", key)); err != nil {
			return fmt.Errorf("recover in-flight trace: %w", err)
		}
	}

	readyCount, err := countJSONFiles(s.directory("ready"))
	if err != nil {
		return err
	}
	processingCount, err := countJSONFiles(s.directory("processing"))
	if err != nil {
		return err
	}
	s.pending = readyCount + processingCount
	for _, state := range []string{"ready", "processing", "receipts", "dead"} {
		entries, err := os.ReadDir(s.directory(state))
		if err != nil {
			return fmt.Errorf("rebuild spool index: %w", err)
		}
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), fileSuffix) {
				done := make(chan struct{})
				close(done)
				s.known[strings.TrimSuffix(entry.Name(), fileSuffix)] = &enqueueState{done: done}
			}
		}
	}
	return nil
}

func (s *Spool) atomicWrite(state, key string, data []byte) error {
	temporary, err := os.CreateTemp(s.directory("tmp"), key+"-*")
	if err != nil {
		return fmt.Errorf("create spool temp file: %w", err)
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)

	if _, err := temporary.Write(data); err != nil {
		_ = temporary.Close()
		return fmt.Errorf("write spool file: %w", err)
	}
	if err := temporary.Sync(); err != nil {
		_ = temporary.Close()
		return fmt.Errorf("sync spool file: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close spool file: %w", err)
	}
	if err := os.Rename(temporaryName, s.path(state, key)); err != nil {
		return fmt.Errorf("commit spool file: %w", err)
	}
	return syncDirectory(s.directory(state))
}

func (s *Spool) directory(state string) string {
	return filepath.Join(s.root, state)
}

func (s *Spool) path(state, key string) string {
	return filepath.Join(s.directory(state), key+fileSuffix)
}

func itemKey(item queue.Item) string {
	sum := sha256.Sum256([]byte(item.Authorization + "\x00" + item.APIKey + "\x00" + item.ID))
	return hex.EncodeToString(sum[:])
}

func countJSONFiles(directory string) (int, error) {
	entries, err := os.ReadDir(directory)
	if err != nil {
		return 0, fmt.Errorf("list spool directory: %w", err)
	}
	count := 0
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), fileSuffix) {
			count++
		}
	}
	return count, nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func syncDirectory(path string) error {
	directory, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open spool directory for sync: %w", err)
	}
	defer directory.Close()
	if err := directory.Sync(); err != nil {
		return fmt.Errorf("sync spool directory: %w", err)
	}
	return nil
}
