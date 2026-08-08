package api

import (
	"encoding/json"
	"net/http"

	"web-gui-acserver/internal/db"
)

type SettingRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func SettingsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		return
	}

	// Verify caller is admin
	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	user, err := db.GetUserByToken(cookie.Value)
	if err != nil || user.Role != "admin" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodGet {
		key := r.URL.Query().Get("key")
		if key == "" {
			http.Error(w, `{"error": "Missing key"}`, http.StatusBadRequest)
			return
		}
		
		val := db.GetSetting(key, "")
		json.NewEncoder(w).Encode(map[string]string{"key": key, "value": val})
		return
	}

	if r.Method == http.MethodPost {
		var req SettingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
			return
		}
		
		if err := db.SetSetting(req.Key, req.Value); err != nil {
			http.Error(w, `{"error": "Failed to save setting"}`, http.StatusInternalServerError)
			return
		}
		
		json.NewEncoder(w).Encode(map[string]string{"message": "Setting saved"})
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
