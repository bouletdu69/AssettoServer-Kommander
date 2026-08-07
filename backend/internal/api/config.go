package api

import (
	"encoding/json"
	"net/http"
	"os"

	"web-gui-acserver/internal/configparser"
)

type GeneralConfig struct {
	ServerName     string `json:"serverName"`
	ServerPassword string `json:"serverPassword"`
	AdminPassword  string `json:"adminPassword"`
	HTTPPort       string `json:"httpPort"`
	TCPPort        string `json:"tcpPort"`
	UDPPort        string `json:"udpPort"`
}

func getPaths() (string, string) {
	iniPath := os.Getenv("AC_SERVER_INI_PATH")
	if iniPath == "" {
		iniPath = "runtime/data/cfg/server_cfg.ini"
	}
	yamlPath := os.Getenv("AC_SERVER_YAML_PATH")
	if yamlPath == "" {
		yamlPath = "runtime/data/cfg/extra_cfg.yml"
	}
	return iniPath, yamlPath
}

func ConfigGeneralHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		return
	}

	iniPath, _ := getPaths()

	if r.Method == http.MethodGet {
		config := GeneralConfig{
			ServerName:     configparser.ReadINI(iniPath, "SERVER", "NAME"),
			ServerPassword: configparser.ReadINI(iniPath, "SERVER", "PASSWORD"),
			AdminPassword:  configparser.ReadINI(iniPath, "SERVER", "ADMIN_PASSWORD"),
			HTTPPort:       configparser.ReadINI(iniPath, "SERVER", "HTTP_PORT"),
			TCPPort:        configparser.ReadINI(iniPath, "SERVER", "TCP_PORT"),
			UDPPort:        configparser.ReadINI(iniPath, "SERVER", "UDP_PORT"),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(config)
		return
	}

	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var config GeneralConfig
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			http.Error(w, `{"message": "Invalid payload"}`, http.StatusBadRequest)
			return
		}

		configparser.UpdateINI(iniPath, "SERVER", "NAME", config.ServerName)
		configparser.UpdateINI(iniPath, "SERVER", "PASSWORD", config.ServerPassword)
		configparser.UpdateINI(iniPath, "SERVER", "ADMIN_PASSWORD", config.AdminPassword)

		configparser.UpdateINI(iniPath, "SERVER", "HTTP_PORT", config.HTTPPort)
		configparser.UpdateINI(iniPath, "SERVER", "TCP_PORT", config.TCPPort)
		configparser.UpdateINI(iniPath, "SERVER", "UDP_PORT", config.UDPPort)

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Configuration saved"}`))
		return
	}

	http.Error(w, `{"message": "Method not allowed"}`, http.StatusMethodNotAllowed)
}

type EventConfig struct {
	Track        string `json:"track"`
	TrackLayout  string `json:"trackLayout"`
	MaxClients   string `json:"maxClients"`
	PracticeTime string `json:"practiceTime"`
	QualifyTime  string `json:"qualifyTime"`
	RaceLaps     string `json:"raceLaps"`
}

func ConfigEventHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		return
	}

	iniPath, _ := getPaths()

	if r.Method == http.MethodGet {
		config := EventConfig{
			Track:        configparser.ReadINI(iniPath, "SERVER", "TRACK"),
			TrackLayout:  configparser.ReadINI(iniPath, "SERVER", "CONFIG_TRACK"),
			MaxClients:   configparser.ReadINI(iniPath, "SERVER", "MAX_CLIENTS"),
			PracticeTime: configparser.ReadINI(iniPath, "PRACTICE", "TIME"),
			QualifyTime:  configparser.ReadINI(iniPath, "QUALIFY", "TIME"),
			RaceLaps:     configparser.ReadINI(iniPath, "RACE", "LAPS"),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(config)
		return
	}

	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var config EventConfig
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			http.Error(w, `{"message": "Invalid payload"}`, http.StatusBadRequest)
			return
		}

		configparser.UpdateINI(iniPath, "SERVER", "TRACK", config.Track)
		configparser.UpdateINI(iniPath, "SERVER", "CONFIG_TRACK", config.TrackLayout)
		configparser.UpdateINI(iniPath, "SERVER", "MAX_CLIENTS", config.MaxClients)
		
		configparser.UpdateINI(iniPath, "PRACTICE", "TIME", config.PracticeTime)
		configparser.UpdateINI(iniPath, "QUALIFY", "TIME", config.QualifyTime)
		configparser.UpdateINI(iniPath, "RACE", "LAPS", config.RaceLaps)

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Configuration saved"}`))
		return
	}

	http.Error(w, `{"message": "Method not allowed"}`, http.StatusMethodNotAllowed)
}

type AIConfig struct {
	Enabled     string `json:"enabled"`
	MaxCars     string `json:"maxCars"`
	MinDistance string `json:"minDistance"`
}

func ConfigAIHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		return
	}

	_, yamlPath := getPaths()

	if r.Method == http.MethodGet {
		config := AIConfig{
			Enabled:     configparser.ReadYAML(yamlPath, "AI_TRAFFIC.ENABLED"),
			MaxCars:     configparser.ReadYAML(yamlPath, "AI_TRAFFIC.MAX_CARS"),
			MinDistance: configparser.ReadYAML(yamlPath, "AI_TRAFFIC.MIN_DISTANCE"),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(config)
		return
	}

	if r.Method == http.MethodPost || r.Method == http.MethodPut {
		var config AIConfig
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			http.Error(w, `{"message": "Invalid payload"}`, http.StatusBadRequest)
			return
		}

		configparser.UpdateYAML(yamlPath, "AI_TRAFFIC.ENABLED", config.Enabled)
		configparser.UpdateYAML(yamlPath, "AI_TRAFFIC.MAX_CARS", config.MaxCars)
		configparser.UpdateYAML(yamlPath, "AI_TRAFFIC.MIN_DISTANCE", config.MinDistance)

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Configuration AI saved"}`))
		return
	}

	http.Error(w, `{"message": "Method not allowed"}`, http.StatusMethodNotAllowed)
}

