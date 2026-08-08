package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"web-gui-acserver/internal/db"
)

type CreateUserRequest struct {
	Username string `json:"username"`
	Role     string `json:"role"`
}

func UsersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
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
		users, err := db.GetAllUsers()
		if err != nil {
			http.Error(w, `{"error": "Failed to get users"}`, http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(users)
		return
	}

	if r.Method == http.MethodPost {
		var req CreateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
			return
		}
		if req.Username == "" || req.Role == "" {
			http.Error(w, `{"error": "Missing fields"}`, http.StatusBadRequest)
			return
		}
		passphrase, err := db.CreateUser(req.Username, req.Role)
		if err != nil {
			http.Error(w, `{"error": "Failed to create user (might already exist)"}`, http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{
			"message": "User created",
			"passphrase": passphrase,
		})
		return
	}

	if r.Method == http.MethodPut {
		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, `{"error": "Invalid ID"}`, http.StatusBadRequest)
			return
		}

		passphrase, err := db.ResetUserPassword(id)
		if err != nil {
			http.Error(w, `{"error": "Failed to reset password"}`, http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Password reset",
			"passphrase": passphrase,
		})
		return
	}

	if r.Method == http.MethodDelete {
		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, `{"error": "Invalid ID"}`, http.StatusBadRequest)
			return
		}
		if id == user.ID {
			http.Error(w, `{"error": "Cannot delete yourself"}`, http.StatusForbidden)
			return
		}
		
		if err := db.DeleteUser(id); err != nil {
			http.Error(w, `{"error": "Failed to delete user"}`, http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"message": "User deleted"})
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
