package server

import (
	"encoding/json"
	"sync"
	"time"
)

type EventHub struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

func NewEventHub() *EventHub {
	return &EventHub{
		clients: make(map[chan []byte]struct{}),
	}
}

func (h *EventHub) Broadcast(eventType string, payload interface{}) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.clients) == 0 {
		return
	}
	message := map[string]interface{}{
		"type":      eventType,
		"payload":   payload,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	data, err := json.Marshal(message)
	if err != nil {
		return
	}
	for ch := range h.clients {
		select {
		case ch <- data:
		default:
		}
	}
}

func (h *EventHub) Subscribe() chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *EventHub) Unsubscribe(ch chan []byte) {
	h.mu.Lock()
	if _, ok := h.clients[ch]; ok {
		delete(h.clients, ch)
		close(ch)
	}
	h.mu.Unlock()
}
