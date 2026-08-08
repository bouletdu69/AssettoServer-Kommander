package api

import (
	"archive/zip"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// CustomPlugin represents a custom plugin file or folder
type CustomPlugin struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
	Type string `json:"type"` // "dll" or "folder"
}

func getCustomPluginsDir() string {
	dir := "/app/data/custom_plugins"
	os.MkdirAll(dir, 0755)
	return dir
}

// Handle Custom Plugins API (GET, POST, DELETE)
func CustomPluginsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		return
	}

	pluginsDir := getCustomPluginsDir()

	switch r.Method {
	case http.MethodGet:
		// List custom plugins
		files, err := os.ReadDir(pluginsDir)
		if err != nil {
			http.Error(w, `{"error": "Failed to read custom plugins directory"}`, http.StatusInternalServerError)
			return
		}

		var plugins []CustomPlugin
		for _, f := range files {
			info, err := f.Info()
			if err != nil {
				continue
			}

			if f.IsDir() {
				plugins = append(plugins, CustomPlugin{
					Name: f.Name(),
					Size: info.Size(),
					Type: "folder",
				})
			} else if strings.HasSuffix(strings.ToLower(f.Name()), ".dll") {
				plugins = append(plugins, CustomPlugin{
					Name: f.Name(),
					Size: info.Size(),
					Type: "dll",
				})
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(plugins)

	case http.MethodPost:
		// Upload a new plugin (DLL or ZIP)
		err := r.ParseMultipartForm(100 << 20) // 100 MB max
		if err != nil {
			http.Error(w, `{"message": "Failed to parse form"}`, http.StatusBadRequest)
			return
		}

		file, handler, err := r.FormFile("plugin")
		if err != nil {
			http.Error(w, `{"message": "Failed to get file from request"}`, http.StatusBadRequest)
			return
		}
		defer file.Close()

		ext := strings.ToLower(filepath.Ext(handler.Filename))
		if ext != ".dll" && ext != ".zip" {
			http.Error(w, `{"message": "Only .dll and .zip files are allowed"}`, http.StatusBadRequest)
			return
		}

		if ext == ".dll" {
			pluginPath := filepath.Join(pluginsDir, filepath.Base(handler.Filename))
			outFile, err := os.Create(pluginPath)
			if err != nil {
				http.Error(w, `{"message": "Failed to save plugin"}`, http.StatusInternalServerError)
				return
			}
			defer outFile.Close()

			if _, err := io.Copy(outFile, file); err != nil {
				http.Error(w, `{"message": "Failed to write plugin data"}`, http.StatusInternalServerError)
				return
			}
		} else if ext == ".zip" {
			// Extract Zip
			tempZip := filepath.Join(pluginsDir, "temp_upload.zip")
			outFile, err := os.Create(tempZip)
			if err != nil {
				http.Error(w, `{"message": "Failed to save zip"}`, http.StatusInternalServerError)
				return
			}
			io.Copy(outFile, file)
			outFile.Close()
			defer os.Remove(tempZip)

			archive, err := zip.OpenReader(tempZip)
			if err != nil {
				http.Error(w, `{"message": "Failed to open zip file"}`, http.StatusInternalServerError)
				return
			}
			defer archive.Close()

			// Extract directly into pluginsDir (since zips usually contain their own root folder)
			extractDir := pluginsDir

			for _, f := range archive.File {
				filePath := filepath.Join(extractDir, f.Name)
				if !strings.HasPrefix(filePath, filepath.Clean(extractDir)+string(os.PathSeparator)) {
					continue // Prevent Zip Slip
				}
				if f.FileInfo().IsDir() {
					os.MkdirAll(filePath, os.ModePerm)
					continue
				}
				if err := os.MkdirAll(filepath.Dir(filePath), os.ModePerm); err != nil {
					continue
				}
				outFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
				if err != nil {
					continue
				}
				rc, err := f.Open()
				if err != nil {
					outFile.Close()
					continue
				}
				io.Copy(outFile, rc)
				outFile.Close()
				rc.Close()
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Plugin uploaded successfully"}`))

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func CustomPluginDeleteHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := strings.TrimPrefix(r.URL.Path, "/api/plugins/custom/")
	if name == "" || strings.Contains(name, "/") || strings.Contains(name, "..") {
		http.Error(w, `{"message": "Invalid plugin name"}`, http.StatusBadRequest)
		return
	}

	pluginsDir := getCustomPluginsDir()
	pluginPath := filepath.Join(pluginsDir, name)

	if err := os.RemoveAll(pluginPath); err != nil {
		http.Error(w, `{"message": "Failed to delete plugin"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Plugin deleted successfully"}`))
}
