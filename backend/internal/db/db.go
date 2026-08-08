package db

import (
	"database/sql"
	"os"
	"path/filepath"
	"sync"
	"time"
	"fmt"
	"log"
	"math/rand"
	"strings"

	"golang.org/x/crypto/bcrypt"
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

	if err := createTables(); err != nil {
		return err
	}
	
	return initDefaultAdmin()
}

func createTables() error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE,
		password_hash TEXT,
		role TEXT,
		must_change_password BOOLEAN DEFAULT 0
	);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);
	CREATE TABLE IF NOT EXISTS sessions (
		token TEXT PRIMARY KEY,
		user_id INTEGER,
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
	// Apply migration if table already existed without the column
	DB.Exec("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0")
	return err
}

func initDefaultAdmin() error {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		log.Println("No users found, creating default admin user...")
		// Use ADMIN_PASSWORD from env or default to 'admin'
		adminPassword := os.Getenv("ADMIN_PASSWORD")
		if adminPassword == "" {
			adminPassword = "admin"
		}
		
		hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		
		_, err = DB.Exec("INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 0)", "admin", string(hash), "admin")
		return err
	}
	return nil
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

type User struct {
	ID                 int    `json:"id"`
	Username           string `json:"username"`
	Role               string `json:"role"`
	MustChangePassword bool   `json:"must_change_password"`
}

func CreateSession(token string, userID int, expiresAt time.Time) error {
	_, err := DB.Exec("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
		token, userID, time.Now(), expiresAt)
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

func GetUserByToken(token string) (*User, error) {
	user := &User{}
	query := `
		SELECT u.id, u.username, u.role, u.must_change_password 
		FROM users u 
		JOIN sessions s ON u.id = s.user_id 
		WHERE s.token = ? AND s.expires_at > ?
	`
	err := DB.QueryRow(query, token, time.Now()).Scan(&user.ID, &user.Username, &user.Role, &user.MustChangePassword)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func CheckUserCredentials(username, password string) (*User, error) {
	user := &User{}
	var hash string
	err := DB.QueryRow("SELECT id, username, password_hash, role, must_change_password FROM users WHERE username = ?", username).Scan(&user.ID, &user.Username, &hash, &user.Role, &user.MustChangePassword)
	if err != nil {
		return nil, err
	}
	
	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		return nil, err
	}
	
	return user, nil
}

func GetSetting(key string, defaultValue string) string {
	var value string
	err := DB.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err != nil {
		return defaultValue
	}
	return value
}

func SetSetting(key string, value string) error {
	_, err := DB.Exec("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value)
	return err
}

func GetAllUsers() ([]User, error) {
	rows, err := DB.Query("SELECT id, username, role FROM users")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role); err != nil {
			continue
		}
		users = append(users, u)
	}
	return users, nil
}

func GeneratePassphrase() string {
	words := []string{"pomme", "cheval", "batterie", "agrafe", "voiture", "soleil", "lune", "etoile", "course", "pilote", "moteur", "pneu", "circuit", "virage", "frein", "volant"}
	rand.Seed(time.Now().UnixNano())
	var phrase []string
	for i := 0; i < 4; i++ {
		phrase = append(phrase, words[rand.Intn(len(words))])
	}
	return strings.Join(phrase, "-")
}

func CreateUser(username, role string) (string, error) {
	passphrase := GeneratePassphrase()
	hash, err := bcrypt.GenerateFromPassword([]byte(passphrase), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	_, err = DB.Exec("INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)", username, string(hash), role)
	return passphrase, err
}

func UpdateUserPassword(username, newPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = DB.Exec("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE username = ?", string(hash), username)
	return err
}

func ResetUserPassword(id int) (string, error) {
	passphrase := GeneratePassphrase()
	hash, err := bcrypt.GenerateFromPassword([]byte(passphrase), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	_, err = DB.Exec("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?", string(hash), id)
	return passphrase, err
}

func DeleteUser(id int) error {
	_, err := DB.Exec("DELETE FROM users WHERE id = ?", id)
	return err
}
