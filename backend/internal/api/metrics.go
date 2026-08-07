package api

import (
	"encoding/json"
	"net/http"
	"os"
)

type ServerInfo struct {
	Name       string   `json:"name"`
	Track      string   `json:"track"`
	MaxClients int      `json:"maxclients"`
	Clients    int      `json:"clients"`
	IP         string   `json:"ip"`
	Port       int      `json:"port"`
	CPort      int      `json:"cport"`
	Cars       []string `json:"cars"`
}

type ServerJSON struct {
	Cars []struct {
		Model           string `json:"Model"`
		Skin            string `json:"Skin"`
		DriverName      string `json:"DriverName"`
		DriverTeam      string `json:"DriverTeam"`
		IsConnected     bool   `json:"IsConnected"`
		BestLap         int    `json:"BestLap,omitempty"`
	} `json:"Cars"`
}

type LiveMetricsResponse struct {
	Info ServerInfo `json:"info"`
	Cars []struct {
		Model       string `json:"model"`
		Skin        string `json:"skin"`
		DriverName  string `json:"driverName"`
		DriverTeam  string `json:"driverTeam"`
		IsConnected bool   `json:"isConnected"`
		BestLap     int    `json:"bestLap,omitempty"`
	} `json:"cars"`
}

func LiveMetricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		return
	}
	
	// Ensure server configuration path exists to find out the HTTP port
	// In most cases AssettoServer runs on 8666 locally in this project
	port := "8666" 

	infoResp, err := http.Get("http://localhost:" + port + "/INFO")
	if err != nil {
		http.Error(w, `{"error": "Server unreachable"}`, http.StatusBadGateway)
		return
	}
	defer infoResp.Body.Close()

	var info ServerInfo
	if err := json.NewDecoder(infoResp.Body).Decode(&info); err != nil {
		http.Error(w, `{"error": "Invalid INFO response"}`, http.StatusInternalServerError)
		return
	}
	
	// Enforce public IP for the connection link from env if available
	publicIP := os.Getenv("PUBLIC_IP")
	if publicIP != "" {
		info.IP = publicIP
	} else if info.IP == "127.0.0.1" || info.IP == "" {
		info.IP = "82.29.172.87" // Fallback to known IP for this specific deployment
	}

	jsonResp, err := http.Get("http://localhost:" + port + "/JSON|1")
	if err != nil {
		http.Error(w, `{"error": "Server unreachable"}`, http.StatusBadGateway)
		return
	}
	defer jsonResp.Body.Close()

	var serverJson ServerJSON
	if err := json.NewDecoder(jsonResp.Body).Decode(&serverJson); err != nil {
		http.Error(w, `{"error": "Invalid JSON response"}`, http.StatusInternalServerError)
		return
	}

	response := LiveMetricsResponse{
		Info: info,
		Cars: make([]struct {
			Model       string `json:"model"`
			Skin        string `json:"skin"`
			DriverName  string `json:"driverName"`
			DriverTeam  string `json:"driverTeam"`
			IsConnected bool   `json:"isConnected"`
			BestLap     int    `json:"bestLap,omitempty"`
		}, len(serverJson.Cars)),
	}

	for i, car := range serverJson.Cars {
		response.Cars[i] = struct {
			Model       string `json:"model"`
			Skin        string `json:"skin"`
			DriverName  string `json:"driverName"`
			DriverTeam  string `json:"driverTeam"`
			IsConnected bool   `json:"isConnected"`
			BestLap     int    `json:"bestLap,omitempty"`
		}{
			Model:       car.Model,
			Skin:        car.Skin,
			DriverName:  car.DriverName,
			DriverTeam:  car.DriverTeam,
			IsConnected: car.IsConnected,
			BestLap:     car.BestLap,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
