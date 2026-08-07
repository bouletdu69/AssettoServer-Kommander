package process

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"time"
)

type ServerStatus string

const (
	StatusStopped ServerStatus = "Stopped"
	StatusRunning ServerStatus = "Running"
	StatusCrashed ServerStatus = "Crashed"
)

type ServerManager struct {
	mu          sync.Mutex
	status      ServerStatus
	cmd         *exec.Cmd
	exePath     string
	logClients  map[chan string]bool
	clientsMu   sync.Mutex
	logHistory  []string
}

var Manager *ServerManager

func InitManager() {
	path := os.Getenv("SERVER_EXEC_PATH")
	if path == "" {
		// Mock script for dev
		path = "bash"
	}
	Manager = &ServerManager{
		status:     StatusStopped,
		exePath:    path,
		logClients: make(map[chan string]bool),
		logHistory: make([]string, 0, 1000),
	}
}

func (m *ServerManager) GetStatus() ServerStatus {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.status
}

func (m *ServerManager) SubscribeLogs() (chan string, []string) {
	m.clientsMu.Lock()
	defer m.clientsMu.Unlock()
	ch := make(chan string, 100)
	m.logClients[ch] = true
	return ch, append([]string(nil), m.logHistory...)
}

func (m *ServerManager) UnsubscribeLogs(ch chan string) {
	m.clientsMu.Lock()
	defer m.clientsMu.Unlock()
	delete(m.logClients, ch)
	close(ch)
}

func (m *ServerManager) broadcastLog(line string) {
	m.clientsMu.Lock()
	defer m.clientsMu.Unlock()
	
	if len(m.logHistory) >= 1000 {
		m.logHistory = m.logHistory[1:]
	}
	m.logHistory = append(m.logHistory, line)

	for ch := range m.logClients {
		select {
		case ch <- line:
		default:
		}
	}
}

func (m *ServerManager) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.status == StatusRunning {
		return errors.New("server is already running")
	}

	m.clientsMu.Lock()
	m.logHistory = make([]string, 0, 1000)
	m.clientsMu.Unlock()

	if m.exePath == "bash" || m.exePath == "" {
		m.exePath = "docker-compose"
	}

	args := []string{}
	if m.exePath == "docker-compose" {
		args = append(args, "-f", "/home/rs/docker/AssettoServer/docker-compose.yaml", "up", "--force-recreate")
	} else if m.exePath == "bash" {
		args = append(args, "-c", `for i in {1..100}; do echo "Simulation AssettoServer running... $i"; sleep 1; done`)
	}


	m.cmd = exec.Command(m.exePath, args...)
	
	stdout, err := m.cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := m.cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := m.cmd.Start(); err != nil {
		m.status = StatusCrashed
		return fmt.Errorf("failed to start server: %v", err)
	}

	m.status = StatusRunning

	go m.readOutput(stdout)
	go m.readOutput(stderr)

	go func() {
		err := m.cmd.Wait()
		m.mu.Lock()
		defer m.mu.Unlock()
		
		if err != nil {
			if m.status != StatusStopped {
				m.status = StatusCrashed
			}
		} else {
			m.status = StatusStopped
		}
		m.cmd = nil
		m.broadcastLog("--- Server process terminated ---")
	}()

	m.broadcastLog("--- Server process started ---")
	return nil
}

func (m *ServerManager) Restart() error {
	m.mu.Lock()
	status := m.status
	m.mu.Unlock()
	
	if status == StatusRunning {
		if err := m.Stop(); err != nil {
			return err
		}
	}
	
	// Wait a bit for the process to actually terminate
	for i := 0; i < 20; i++ {
		m.mu.Lock()
		cmdNil := (m.cmd == nil)
		m.mu.Unlock()
		if cmdNil {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	return m.Start()
}

func (m *ServerManager) readOutput(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		m.broadcastLog(scanner.Text())
	}
}

func (m *ServerManager) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.status != StatusRunning || m.cmd == nil || m.cmd.Process == nil {
		return errors.New("server is not running")
	}

	if err := m.cmd.Process.Signal(os.Interrupt); err != nil {
		if err := m.cmd.Process.Kill(); err != nil {
			return fmt.Errorf("failed to kill server: %v", err)
		}
	}
	
	m.status = StatusStopped
	return nil
}

type BackendLogBroadcaster struct {
	clientsMu  sync.Mutex
	logClients map[chan string]bool
	logHistory []string
}

var BackendLogger = &BackendLogBroadcaster{
	logClients: make(map[chan string]bool),
	logHistory: make([]string, 0, 500),
}

func (b *BackendLogBroadcaster) Write(p []byte) (n int, err error) {
	line := string(p)
	
	// We want to print to stdout as well
	os.Stdout.Write(p)

	b.clientsMu.Lock()
	defer b.clientsMu.Unlock()
	
	if len(b.logHistory) >= 500 {
		b.logHistory = b.logHistory[1:]
	}
	b.logHistory = append(b.logHistory, line)

	for ch := range b.logClients {
		select {
		case ch <- line:
		default:
		}
	}
	return len(p), nil
}

func (b *BackendLogBroadcaster) Subscribe() (chan string, []string) {
	b.clientsMu.Lock()
	defer b.clientsMu.Unlock()
	ch := make(chan string, 100)
	b.logClients[ch] = true
	return ch, append([]string(nil), b.logHistory...)
}

func (b *BackendLogBroadcaster) Unsubscribe(ch chan string) {
	b.clientsMu.Lock()
	defer b.clientsMu.Unlock()
	delete(b.logClients, ch)
	close(ch)
}
