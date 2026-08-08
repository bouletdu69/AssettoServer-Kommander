package api

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"strings"
)

type PluginInfo struct {
	Name string `json:"name"`
}

func GetAvailablePluginsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == "OPTIONS" {
		return
	}

	cmd := exec.Command("docker", "exec", "AssettoServer", "ls", "-1", "/app/plugins")
	output, err := cmd.Output()
	if err != nil {
		http.Error(w, `{"error": "Failed to list plugins from container: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// Read custom plugins to filter them out
	customPluginsDir := getCustomPluginsDir()
	customFiles, _ := os.ReadDir(customPluginsDir)
	customPluginMap := make(map[string]bool)
	for _, cf := range customFiles {
		customPluginMap[cf.Name()] = true
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var plugins []PluginInfo
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !customPluginMap[line] {
			plugins = append(plugins, PluginInfo{Name: line})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plugins)
}

type PluginConfigPayload struct {
	YamlContent string `json:"yamlContent"`
}

func PluginConfigHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		return
	}

	_, yamlPath := getPaths()

	if r.Method == http.MethodGet {
		content, err := ioutil.ReadFile(yamlPath)
		if err != nil {
			http.Error(w, `{"error": "Failed to read config"}`, http.StatusInternalServerError)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(PluginConfigPayload{YamlContent: string(content)})
		return
	}

	if r.Method == http.MethodPut || r.Method == http.MethodPost {
		var req PluginConfigPayload
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error": "Invalid payload"}`, http.StatusBadRequest)
			return
		}

		err := ioutil.WriteFile(yamlPath, []byte(req.YamlContent), 0644)
		if err != nil {
			http.Error(w, `{"error": "Failed to write config"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Plugin configuration saved"}`))
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
