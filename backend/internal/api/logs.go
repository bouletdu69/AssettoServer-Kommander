package api

import (
	"bufio"
	"log"
	"net/http"
	"os/exec"

	"github.com/gorilla/websocket"
	"web-gui-acserver/internal/db"
	"web-gui-acserver/internal/process"
)

var logsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func StreamBackendLogsHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" || !db.ValidateSession(cookie.Value) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := logsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	ch, history := process.BackendLogger.Subscribe()
	defer process.BackendLogger.Unsubscribe(ch)

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

func streamDockerContainerLogs(w http.ResponseWriter, r *http.Request, containerName string) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" || !db.ValidateSession(cookie.Value) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := logsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	cmd := exec.Command("docker", "logs", "-n", "100", "-f", containerName)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Println("Error attaching to docker logs:", err)
		return
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		log.Println("Error attaching to docker logs:", err)
		return
	}

	if err := cmd.Start(); err != nil {
		log.Println("Error starting docker logs:", err)
		return
	}
	defer cmd.Process.Kill()

	logChan := make(chan string, 100)
	
	readOutput := func(scanner *bufio.Scanner) {
		for scanner.Scan() {
			logChan <- scanner.Text()
		}
	}
	
	go readOutput(bufio.NewScanner(stdout))
	go readOutput(bufio.NewScanner(stderr))

	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				cmd.Process.Kill()
				break
			}
		}
	}()

	for line := range logChan {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			break
		}
	}
}

func StreamACSMLogsHandler(w http.ResponseWriter, r *http.Request) {
	streamDockerContainerLogs(w, r, "acsm-assetto-multiserver-1")
}

func StreamAssettoServerLogsHandler(w http.ResponseWriter, r *http.Request) {
	streamDockerContainerLogs(w, r, "AssettoServer")
}

func StreamAuditLogsHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" || !db.ValidateSession(cookie.Value) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := logsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	// 1. Send recent history from DB
	recent, _ := db.GetRecentAuditLogs(100)
	for _, line := range recent {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			return
		}
	}

	// 2. Subscribe to new broadcasts
	ch, _ := db.AuditBroadcaster.Subscribe()
	defer db.AuditBroadcaster.Unsubscribe(ch)

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
