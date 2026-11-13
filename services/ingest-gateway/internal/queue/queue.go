package queue

import (
	"context"
	"errors"
	"time"
)

var (
	ErrFull       = errors.New("ingestion queue is full")
	ErrTenantFull = errors.New("project ingestion queue is full")
)

type Item struct {
	ID            string    `json:"id"`
	Body          []byte    `json:"body"`
	Authorization string    `json:"authorization,omitempty"`
	APIKey        string    `json:"apiKey,omitempty"`
	SourceApp     string    `json:"sourceApp,omitempty"`
	TenantHash    string    `json:"tenantHash,omitempty"`
	ReceivedAt    time.Time `json:"receivedAt"`
	Attempts      int       `json:"attempts"`
	NextAttemptAt time.Time `json:"nextAttemptAt,omitempty"`
}

type EnqueueResult struct {
	Duplicate bool
}

type Queue interface {
	Enqueue(context.Context, Item) (EnqueueResult, error)
}
