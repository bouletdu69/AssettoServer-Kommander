package services

import (
	"archive/zip"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"os/exec"

	"github.com/nwaples/rardecode"
)

// ProcessUpload gère un fichier d'archive (.zip, .rar) ou des fichiers bruts
func ProcessUpload(file multipart.File, header *multipart.FileHeader) error {
	ext := strings.ToLower(filepath.Ext(header.Filename))

	if ext == ".zip" {
		return processZipStream(file)
	} else if ext == ".rar" {
		return processRarStream(file)
	} else if ext == ".7z" {
		return process7zStream(file)
	}
	return fmt.Errorf("format non supporté: %s", ext)
}

// ProcessRawFiles gère les arborescences glissées nativement (un array de headers avec chemin)
func ProcessRawFiles(headers []*multipart.FileHeader) error {
	for _, header := range headers {
		if shouldIgnore(header.Filename) {
			continue
		}
		
		file, err := header.Open()
		if err != nil {
			return err
		}
		
		// Le frontend envoie souvent le chemin relatif dans un champ caché ou on peut l'avoir si on customise l'upload
		// Pour simplifier, on suppose que header.Filename contient le chemin relatif si uploadé via dropzone webkit
		err = saveFile(header.Filename, file)
		file.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func processZipStream(file multipart.File) error {
	// archive/zip a besoin d'un io.ReaderAt. 
	// On copie l'upload dans un fichier temporaire
	tmpFile, err := os.CreateTemp("", "upload-*.zip")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())

	_, err = io.Copy(tmpFile, file)
	if err != nil {
		tmpFile.Close()
		return err
	}
	tmpFile.Close()

	r, err := zip.OpenReader(tmpFile.Name())
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		if f.FileInfo().IsDir() {
			continue
		}
		if shouldIgnore(f.Name) {
			continue
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}
		
		err = saveFile(f.Name, rc)
		rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func processRarStream(file multipart.File) error {
	r, err := rardecode.NewReader(file, "")
	if err != nil {
		return err
	}

	for {
		header, err := r.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if header.IsDir {
			continue
		}
		if shouldIgnore(header.Name) {
			continue
		}
		if err := saveFile(header.Name, r); err != nil {
			return err
		}
	}
	return nil
}

func process7zStream(file multipart.File) error {
	tmpFile, err := os.CreateTemp("", "upload-*.7z")
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile.Name())

	if _, err := io.Copy(tmpFile, file); err != nil {
		tmpFile.Close()
		return err
	}
	tmpFile.Close()

	basePath := os.Getenv("AC_CONTENT_PATH")
	if basePath == "" {
		basePath = "/home/rs/docker/acsm/server/assetto/content"
	}

	extractPath, err := os.MkdirTemp("", "extract-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(extractPath)

	cmd := exec.Command("7z", "x", "-y", "-o"+extractPath, tmpFile.Name())
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("7z extract failed: %v, output: %s", err, string(output))
	}

	script := fmt.Sprintf(`
		if [ -d "%[1]s/content/tracks" ]; then
			rsync -a "%[1]s/content/tracks/" "%[2]s/tracks/"
		fi
		if [ -d "%[1]s/content/cars" ]; then
			rsync -a "%[1]s/content/cars/" "%[2]s/cars/"
		fi
		if [ -d "%[1]s/content/weather" ]; then
			rsync -a "%[1]s/content/weather/" "%[2]s/weather/"
		fi
		
		if [ -d "%[1]s/tracks" ]; then
			rsync -a "%[1]s/tracks/" "%[2]s/tracks/"
		fi
		if [ -d "%[1]s/cars" ]; then
			rsync -a "%[1]s/cars/" "%[2]s/cars/"
		fi
		if [ -d "%[1]s/weather" ]; then
			rsync -a "%[1]s/weather/" "%[2]s/weather/"
		fi

		find "%[2]s" -type f \( -iname "*.kn5" -o -iname "*.dds" \) -delete
	`, extractPath, basePath)

	cmd = exec.Command("sh", "-c", script)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("move failed: %v, output: %s", err, string(output))
	}

	return nil
}

func shouldIgnore(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == ".kn5" || ext == ".dds" {
		return true
	}
	return false
}

func saveFile(relPath string, r io.Reader) error {
	// Normaliser les chemins qui contiennent déjà "content/"
	relPath = strings.TrimPrefix(relPath, "content/")
	relPath = strings.TrimPrefix(relPath, "content\\")

	basePath := os.Getenv("AC_CONTENT_PATH")
	if basePath == "" {
		basePath = "/home/rs/docker/acsm/server/assetto/content"
	}

	fullPath := filepath.Join(basePath, relPath)
	
	// Empêcher le path traversal (Zip Slip vulnerability)
	cleanBasePath := filepath.Clean(basePath)
	cleanFullPath := filepath.Clean(fullPath)
	if !strings.HasPrefix(cleanFullPath, cleanBasePath+string(os.PathSeparator)) {
		return fmt.Errorf("chemin invalide (zip slip): %s", relPath)
	}

	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}

	out, err := os.Create(fullPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, r)
	return err
}
