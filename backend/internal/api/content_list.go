package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
)

// Car structure represents a subset of ui_car.json
type Car struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Brand       string   `json:"brand"`
	Description string   `json:"description"`
	Class       string   `json:"class"`
	Specs       CarSpecs `json:"specs"`
	Skins       []string `json:"skins"`
}

type CarSpecs struct {
	Bhp    string `json:"bhp"`
	Torque string `json:"torque"`
	Weight string `json:"weight"`
	TopSpeed string `json:"topspeed"`
}

// Track structure represents ui_track.json
type Track struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Country     string        `json:"country"`
	Length      string        `json:"length"`
	Pitboxes    string        `json:"pitboxes"`
	Layouts     []TrackLayout `json:"layouts"`
}

type TrackLayout struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Length      string `json:"length"`
	Pitboxes    string `json:"pitboxes"`
	Country     string `json:"country"`
}

func getContentPath() string {
	basePath := os.Getenv("AC_CONTENT_PATH")
	if basePath == "" {
		basePath = "./content"
	}
	return basePath
}

func GetCarsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		return
	}

	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	carsPath := filepath.Join(getContentPath(), "cars")
	var cars []Car

	entries, err := os.ReadDir(carsPath)
	if err == nil {
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			carID := entry.Name()
			uiPath := filepath.Join(carsPath, carID, "ui", "ui_car.json")
			
			data, err := os.ReadFile(uiPath)
			if err != nil {
				continue // Skip if no ui_car.json
			}

			var car Car
			if err := json.Unmarshal(data, &car); err == nil {
				car.ID = carID
				
				// Read skins
				skinsPath := filepath.Join(carsPath, carID, "skins")
				skinEntries, err := os.ReadDir(skinsPath)
				if err == nil {
					for _, se := range skinEntries {
						if se.IsDir() {
							car.Skins = append(car.Skins, se.Name())
						}
					}
				}
				
				cars = append(cars, car)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if cars == nil {
		cars = []Car{}
	}
	json.NewEncoder(w).Encode(cars)
}

func GetTracksHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	if r.Method == "OPTIONS" {
		return
	}

	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tracksPath := filepath.Join(getContentPath(), "tracks")
	var tracks []Track

	entries, err := os.ReadDir(tracksPath)
	if err == nil {
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			trackID := entry.Name()
			trackDir := filepath.Join(tracksPath, trackID, "ui")

			// Check if single layout or multi-layout
			var track Track
			track.ID = trackID

			// Try reading single layout directly
			singleLayoutPath := filepath.Join(trackDir, "ui_track.json")
			data, err := os.ReadFile(singleLayoutPath)
			if err == nil {
				// Single layout
				if json.Unmarshal(data, &track) == nil {
					track.ID = trackID
					tracks = append(tracks, track)
				}
				continue
			}

			// Try reading multi-layouts
			layoutEntries, err := os.ReadDir(trackDir)
			if err == nil {
				for _, layoutEntry := range layoutEntries {
					if !layoutEntry.IsDir() {
						continue
					}
					layoutID := layoutEntry.Name()
					layoutData, err := os.ReadFile(filepath.Join(trackDir, layoutID, "ui_track.json"))
					if err != nil {
						continue
					}

					var layout TrackLayout
					if json.Unmarshal(layoutData, &layout) == nil {
						layout.ID = layoutID
						if track.Name == "" {
							// Inherit base properties from first layout
							track.Name = layout.Name
							track.Description = layout.Description
							track.Country = layout.Country
						}
						track.Layouts = append(track.Layouts, layout)
					}
				}
				if len(track.Layouts) > 0 {
					tracks = append(tracks, track)
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if tracks == nil {
		tracks = []Track{}
	}
	json.NewEncoder(w).Encode(tracks)
}

func GetCarImageHandler(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	
	if r.Method == "OPTIONS" {
		return
	}
	
	carID := r.URL.Query().Get("id")
	if carID == "" {
		http.Error(w, "Car ID required", http.StatusBadRequest)
		return
	}

	carsPath := filepath.Join(getContentPath(), "cars")
	carDir := filepath.Join(carsPath, carID)
	
	// First check for a preview in skins
	skinsDir := filepath.Join(carDir, "skins")
	entries, err := os.ReadDir(skinsDir)
	if err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				previewPath := filepath.Join(skinsDir, entry.Name(), "preview.jpg")
				if _, err := os.Stat(previewPath); err == nil {
					http.ServeFile(w, r, previewPath)
					return
				}
				// check for preview.png just in case
				previewPng := filepath.Join(skinsDir, entry.Name(), "preview.png")
				if _, err := os.Stat(previewPng); err == nil {
					http.ServeFile(w, r, previewPng)
					return
				}
			}
		}
	}

	// Fallback to UI badge
	badgePath := filepath.Join(carDir, "ui", "badge.png")
	if _, err := os.Stat(badgePath); err == nil {
		http.ServeFile(w, r, badgePath)
		return
	}
	
	// If no image found, return 404
	http.Error(w, "Image not found", http.StatusNotFound)
}

func GetTrackImageHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	
	if r.Method == "OPTIONS" {
		return
	}
	
	trackID := r.URL.Query().Get("id")
	if trackID == "" {
		http.Error(w, "Track ID required", http.StatusBadRequest)
		return
	}

	tracksPath := filepath.Join(getContentPath(), "tracks")
	trackDir := filepath.Join(tracksPath, trackID)
	uiDir := filepath.Join(trackDir, "ui")
	
	// 1. Direct preview.png or preview.jpg
	previewPng := filepath.Join(uiDir, "preview.png")
	if _, err := os.Stat(previewPng); err == nil {
		http.ServeFile(w, r, previewPng)
		return
	}
	previewJpg := filepath.Join(uiDir, "preview.jpg")
	if _, err := os.Stat(previewJpg); err == nil {
		http.ServeFile(w, r, previewJpg)
		return
	}
	
	// 2. Check layouts (subfolders inside ui)
	entries, err := os.ReadDir(uiDir)
	if err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				layoutPreview := filepath.Join(uiDir, entry.Name(), "preview.png")
				if _, err := os.Stat(layoutPreview); err == nil {
					http.ServeFile(w, r, layoutPreview)
					return
				}
				layoutPreviewJpg := filepath.Join(uiDir, entry.Name(), "preview.jpg")
				if _, err := os.Stat(layoutPreviewJpg); err == nil {
					http.ServeFile(w, r, layoutPreviewJpg)
					return
				}
			}
		}
	}
	
	// Fallback to UI badge
	badgePath := filepath.Join(uiDir, "badge.png")
	if _, err := os.Stat(badgePath); err == nil {
		http.ServeFile(w, r, badgePath)
		return
	}

	http.Error(w, "Image not found", http.StatusNotFound)
}

func GetTrackLayoutImageHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	
	if r.Method == "OPTIONS" {
		return
	}
	
	trackID := r.URL.Query().Get("id")
	layoutID := r.URL.Query().Get("layout")
	if trackID == "" || layoutID == "" {
		http.Error(w, "Track ID and Layout ID required", http.StatusBadRequest)
		return
	}

	uiDir := filepath.Join(getContentPath(), "tracks", trackID, "ui", layoutID)
	
	previewPng := filepath.Join(uiDir, "preview.png")
	if _, err := os.Stat(previewPng); err == nil {
		http.ServeFile(w, r, previewPng)
		return
	}
	previewJpg := filepath.Join(uiDir, "preview.jpg")
	if _, err := os.Stat(previewJpg); err == nil {
		http.ServeFile(w, r, previewJpg)
		return
	}
	
	http.Error(w, "Image not found", http.StatusNotFound)
}

func GetCarSkinImageHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	
	if r.Method == "OPTIONS" {
		return
	}
	
	carID := r.URL.Query().Get("id")
	skinID := r.URL.Query().Get("skin")
	if carID == "" || skinID == "" {
		http.Error(w, "Car ID and Skin ID required", http.StatusBadRequest)
		return
	}

	skinDir := filepath.Join(getContentPath(), "cars", carID, "skins", skinID)
	
	previewPath := filepath.Join(skinDir, "preview.jpg")
	if _, err := os.Stat(previewPath); err == nil {
		http.ServeFile(w, r, previewPath)
		return
	}
	
	previewPng := filepath.Join(skinDir, "preview.png")
	if _, err := os.Stat(previewPng); err == nil {
		http.ServeFile(w, r, previewPng)
		return
	}
	
	http.Error(w, "Skin image not found", http.StatusNotFound)
}
