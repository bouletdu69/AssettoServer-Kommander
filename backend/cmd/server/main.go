package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	
	"web-gui-acserver/internal/db"
	"web-gui-acserver/internal/process"
	"web-gui-acserver/internal/api"
)

type HealthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

type LoginRequest struct {
	Password string `json:"password"`
}

type LoginResponse struct {
	Message string `json:"message"`
}

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	(*w).Header().Set("Access-Control-Allow-Credentials", "true")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	response := HealthResponse{
		Status:  "ok",
		Message: "Backend is connected!",
	}
	json.NewEncoder(w).Encode(response)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, `{"message": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"message": "Invalid request"}`, http.StatusBadRequest)
		return
	}

	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin"
	}

	if req.Password == adminPassword {
		token := uuid.New().String()
		expiresAt := time.Now().Add(24 * time.Hour)

		if err := db.CreateSession(token, expiresAt); err != nil {
			log.Println("Error creating session:", err)
			http.Error(w, `{"message": "Internal error"}`, http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    token,
			Expires:  expiresAt,
			HttpOnly: true,
			Path:     "/",
			SameSite: http.SameSiteLaxMode,
		})

		json.NewEncoder(w).Encode(LoginResponse{
			Message: "Login successful",
		})
		db.LogAction("Logged in successfully", "Admin")
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(LoginResponse{
			Message: "Invalid password",
		})
	}
}

func verifyAuthHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message": "Not authenticated"}`))
		return
	}

	if !db.ValidateSession(cookie.Value) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message": "Invalid or expired session"}`))
		return
	}

	w.Write([]byte(`{"message": "Authenticated", "authenticated": true}`))
}

func serverStatusHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	status := process.Manager.GetStatus()
	
	json.NewEncoder(w).Encode(map[string]string{
		"status": string(status),
	})
}

func serverStartHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, `{"message": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	
	if err := process.Manager.Start(); err != nil {
		http.Error(w, fmt.Sprintf(`{"message": "%v"}`, err), http.StatusBadRequest)
		return
	}
	db.LogAction("Server started", "Admin")
	
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Server started",
	})
}

func serverStopHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, `{"message": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	
	if err := process.Manager.Stop(); err != nil {
		http.Error(w, fmt.Sprintf(`{"message": "%v"}`, err), http.StatusBadRequest)
		return
	}
	db.LogAction("Server stopped", "Admin")
	
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Stop signal sent",
	})
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all for dev
	},
}

func serverConsoleHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" || !db.ValidateSession(cookie.Value) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	ch, history := process.Manager.SubscribeLogs()
	defer process.Manager.UnsubscribeLogs(ch)

	for _, line := range history {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}()

	for line := range ch {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			break
		}
	}
}

func captureFrontendLogs() {
	frontendLogPath := "/home/rs/web-gui-acserver/frontend/frontend.log"
	cmd := exec.Command("tail", "-F", frontendLogPath)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Println("Error piping frontend logs:", err)
		return
	}
	if err := cmd.Start(); err != nil {
		log.Println("Error starting tail on frontend logs:", err)
		return
	}
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			log.Printf("[VITE] %s", scanner.Text())
		}
	}()
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}
	
	// Hook up logs to broadcast to websockets
	log.SetOutput(process.BackendLogger)
	
	// Capture frontend logs
	captureFrontendLogs()

	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}

	process.InitManager()

	http.HandleFunc("/api/health", healthHandler)
	http.HandleFunc("/api/login", loginHandler)
	http.HandleFunc("/api/auth/verify", verifyAuthHandler)
	http.HandleFunc("/api/server/status", serverStatusHandler)
	http.HandleFunc("/api/server/start", serverStartHandler)
	http.HandleFunc("/api/server/stop", serverStopHandler)
	http.HandleFunc("/api/server/console", serverConsoleHandler)
	http.HandleFunc("/api/server/live-metrics", api.LiveMetricsHandler)
	http.HandleFunc("/api/config/general", api.ConfigGeneralHandler)
	http.HandleFunc("/api/config/event", api.ConfigEventHandler)
	http.HandleFunc("/api/config/ai", api.ConfigAIHandler)
	http.HandleFunc("/api/content/upload", api.UploadContentHandler)
	http.HandleFunc("/api/content/tracks/upload-fastlane", api.UploadFastLaneHandler)
	http.HandleFunc("/api/content/cars", api.GetCarsHandler)
	http.HandleFunc("/api/content/cars/image", api.GetCarImageHandler)
	http.HandleFunc("/api/content/cars/skin_image", api.GetCarSkinImageHandler)
	http.HandleFunc("/api/content/tracks", api.GetTracksHandler)
	http.HandleFunc("/api/content/tracks/image", api.GetTrackImageHandler)
	http.HandleFunc("/api/content/tracks/layout_image", api.GetTrackLayoutImageHandler)
	
	http.HandleFunc("/api/logs/backend", api.StreamBackendLogsHandler)
	http.HandleFunc("/api/logs/acsm", api.StreamACSMLogsHandler)
	http.HandleFunc("/api/logs/assettoserver", api.StreamAssettoServerLogsHandler)
	http.HandleFunc("/api/logs/audit", api.StreamAuditLogsHandler)
	
	http.HandleFunc("/api/presets", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			api.CreatePresetHandler(w, r)
		} else {
			api.GetPresetsHandler(w, r)
		}
	})
	http.HandleFunc("/api/presets/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/launch") {
			api.LaunchPresetHandler(w, r)
			return
		}
		if r.Method == "PUT" {
			api.UpdatePresetHandler(w, r)
		} else if r.Method == "DELETE" {
			api.DeletePresetHandler(w, r)
		}
	})

	port := ":8080"
	log.Printf("Starting backend server on port %s\n", port)
	
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Server failed to start: %v\n", err)
	}
}
