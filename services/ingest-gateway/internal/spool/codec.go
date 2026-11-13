package spool

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
)

var encryptedHeader = []byte("SEN1")

type codec struct {
	aead cipher.AEAD
}

func newCodec(secret string) (*codec, error) {
	if secret == "" {
		return &codec{}, nil
	}
	if len(secret) < 32 {
		return nil, fmt.Errorf("spool encryption secret must be at least 32 characters")
	}
	key := sha256.Sum256([]byte(secret))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("initialize spool encryption: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("initialize spool authenticated encryption: %w", err)
	}
	return &codec{aead: aead}, nil
}

func (c *codec) seal(plaintext []byte) ([]byte, error) {
	if c.aead == nil {
		return plaintext, nil
	}
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, fmt.Errorf("generate spool nonce: %w", err)
	}
	result := make([]byte, 0, len(encryptedHeader)+len(nonce)+len(plaintext)+c.aead.Overhead())
	result = append(result, encryptedHeader...)
	result = append(result, nonce...)
	result = c.aead.Seal(result, nonce, plaintext, encryptedHeader)
	return result, nil
}

func (c *codec) open(data []byte) ([]byte, error) {
	if !bytes.HasPrefix(data, encryptedHeader) {
		// Existing plaintext spools remain readable and are encrypted on their
		// next state transition.
		return data, nil
	}
	if c.aead == nil {
		return nil, fmt.Errorf("encrypted spool requires INGEST_SPOOL_SECRET")
	}
	nonceSize := c.aead.NonceSize()
	if len(data) < len(encryptedHeader)+nonceSize+c.aead.Overhead() {
		return nil, fmt.Errorf("encrypted spool record is truncated")
	}
	nonce := data[len(encryptedHeader) : len(encryptedHeader)+nonceSize]
	ciphertext := data[len(encryptedHeader)+nonceSize:]
	plaintext, err := c.aead.Open(nil, nonce, ciphertext, encryptedHeader)
	if err != nil {
		return nil, fmt.Errorf("decrypt spool record: authentication failed")
	}
	return plaintext, nil
}
