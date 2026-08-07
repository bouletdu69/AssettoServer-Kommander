package db

import (
	"database/sql"
	"os"
	"path/filepath"
	"sync"
	"time"
	"fmt"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB() error {
	// Create data directory if not exists
	err := os.MkdirAll("data", 0755)
	if err != nil {
		return err
	}

	dbPath := filepath.Join("data", "acserver.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}

	DB = db

	return createTables()
}

func createTables() error {
	query := `
	CREATE TABLE IF NOT EXISTS sessions (
		token TEXT PRIMARY KEY,
		created_at DATETIME,
		expires_at DATETIME
	);
	CREATE TABLE IF NOT EXISTS audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		action TEXT,
		user TEXT,
		timestamp DATETIME
	);
	`
	_, err := DB.Exec(query)
	return err
}

type Broadcaster struct {
	clientsMu  sync.Mutex
	logClients map[chan string]bool
	logHistory []string
}

var AuditBroadcaster = &Broadcaster{
	logClients: make(map[chan string]bool),
	logHistory: make([]string, 0, 500),
}

func (b *Broadcaster) Broadcast(line string) {
	b.clientsMu.Lock()
	defer b.clientsMu.Unlock()
	
	if len(b.logHistory) >= 500 {
		b.logHistory = b.logHistory[1:]
	}
	b.logHistory = append(b.logHistory, line)

	for ch := range b.logClients {
		select {
		case ch <- line:
		default:
		}
	}
}

func (b *Broadcaster) Subscribe() (chan string, []string) {
	b.clientsMu.Lock()
	defer b.clientsMu.Unlock()
	ch := make(chan string, 100)
	b.logClients[ch] = true
	return ch, append([]string(nil), b.logHistory...)
}

func (b *Broadcaster) Unsubscribe(ch chan string) {
	b.clientsMu.Lock()
	defer b.clientsMu.Unlock()
	delete(b.logClients, ch)
	close(ch)
}

func LogAction(action, user string) error {
	t := time.Now()
	_, err := DB.Exec("INSERT INTO audit_logs (action, user, timestamp) VALUES (?, ?, ?)", action, user, t)
	
	logLine := fmt.Sprintf("[%s] %s: %s", t.Format("2006-01-02 15:04:05"), user, action)
	AuditBroadcaster.Broadcast(logLine)
	
	return err
}

func GetRecentAuditLogs(limit int) ([]string, error) {
	rows, err := DB.Query("SELECT action, user, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT ?", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []string
	for rows.Next() {
		var action, user string
		var t time.Time
		if err := rows.Scan(&action, &user, &t); err != nil {
			continue
		}
		logLine := fmt.Sprintf("[%s] %s: %s", t.Format("2006-01-02 15:04:05"), user, action)
		logs = append([]string{logLine}, logs...) // Prepend so it's chronological
	}
	return logs, nil
}

func CreateSession(token string, expiresAt time.Time) error {
	_, err := DB.Exec("INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)",
		token, time.Now(), expiresAt)
	return err
}

func ValidateSession(token string) bool {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM sessions WHERE token = ? AND expires_at > ?", token, time.Now()).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}
