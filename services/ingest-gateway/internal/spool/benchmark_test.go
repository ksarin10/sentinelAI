package spool

import (
	"context"
	"fmt"
	"testing"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/queue"
)

func BenchmarkDurableEnqueue(b *testing.B) {
	store, err := Open(b.TempDir(), b.N+1)
	if err != nil {
		b.Fatal(err)
	}
	ctx := context.Background()
	payload := []byte(`{"name":"support.answer","provider":"openai","model":"gpt-4.1-mini","prompt":"Where is my order?","latencyMs":125}`)

	b.ResetTimer()
	for index := 0; index < b.N; index++ {
		item := queue.Item{ID: fmt.Sprintf("trace-%d", index), APIKey: "benchmark-key", Body: payload}
		if _, err := store.Enqueue(ctx, item); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkDuplicateEnqueue(b *testing.B) {
	store, err := Open(b.TempDir(), 10)
	if err != nil {
		b.Fatal(err)
	}
	ctx := context.Background()
	item := queue.Item{ID: "trace-42", APIKey: "benchmark-key", Body: []byte(`{}`)}
	if _, err := store.Enqueue(ctx, item); err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			result, err := store.Enqueue(ctx, item)
			if err != nil || !result.Duplicate {
				b.Fatalf("duplicate enqueue = %+v, %v", result, err)
			}
		}
	})
}
