package spool

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/queue"
)

const testSpoolSecret = "test-only-secret-with-at-least-32-characters"

func TestEncryptedSpoolDoesNotExposePayloadOrCredential(t *testing.T) {
	root := t.TempDir()
	store, err := OpenEncrypted(root, 10, testSpoolSecret)
	if err != nil {
		t.Fatal(err)
	}
	item := queue.Item{
		ID:     "trace-42",
		APIKey: "sai_super_secret",
		Body:   []byte(`{"prompt":"private customer message"}`),
	}
	if _, err := store.Enqueue(context.Background(), item); err != nil {
		t.Fatal(err)
	}

	entries, err := os.ReadDir(filepath.Join(root, "ready"))
	if err != nil || len(entries) != 1 {
		t.Fatalf("ready entries = %d, %v", len(entries), err)
	}
	data, err := os.ReadFile(filepath.Join(root, "ready", entries[0].Name()))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(data, encryptedHeader) {
		t.Fatal("spool record does not have encrypted format header")
	}
	if strings.Contains(string(data), "private customer message") || strings.Contains(string(data), "sai_super_secret") {
		t.Fatal("encrypted spool record contains plaintext sensitive data")
	}

	reopened, err := OpenEncrypted(root, 10, testSpoolSecret)
	if err != nil {
		t.Fatal(err)
	}
	lease, err := reopened.Claim(context.Background(), time.Now())
	if err != nil || lease.Item.APIKey != item.APIKey || !bytes.Equal(lease.Item.Body, item.Body) {
		t.Fatalf("recovered item = %+v, %v", lease, err)
	}
}

func TestEncryptedSpoolRejectsWrongSecret(t *testing.T) {
	root := t.TempDir()
	store, err := OpenEncrypted(root, 10, testSpoolSecret)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = store.Enqueue(context.Background(), queue.Item{ID: "trace-42", APIKey: "secret", Body: []byte(`{}`)})

	_, err = OpenEncrypted(root, 10, "different-secret-with-at-least-32-characters")
	if err == nil || !strings.Contains(err.Error(), "authentication failed") {
		t.Fatalf("open error = %v, want authentication failure", err)
	}
}

func TestEncryptedSpoolReadsExistingPlaintextRecord(t *testing.T) {
	root := t.TempDir()
	plain, err := Open(root, 10)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = plain.Enqueue(context.Background(), queue.Item{ID: "legacy", APIKey: "key", Body: []byte(`{}`)})

	encrypted, err := OpenEncrypted(root, 10, testSpoolSecret)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := encrypted.Claim(context.Background(), time.Now()); err != nil {
		t.Fatalf("claim legacy plaintext record: %v", err)
	}
}
