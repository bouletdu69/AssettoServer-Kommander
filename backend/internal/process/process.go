package process

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
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
	logCmd      *exec.Cmd
	logClients  map[chan string]bool
	clientsMu   sync.Mutex
	logHistory  []string
	container   string
}

var Manager *ServerManager

func InitManager() {
	Manager = &ServerManager{
		status:     StatusStopped,
		container:  "AssettoServer",
		logClients: make(map[chan string]bool),
		logHistory: make([]string, 0, 1000),
	}
}

func (m *ServerManager) GetStatus() ServerStatus {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	cmd := exec.Command("docker", "inspect", "-f", "{{.State.Status}}", m.container)
	out, err := cmd.CombinedOutput()
	if err == nil {
		statusStr := string(out)
		if strings.Contains(statusStr, "running") {
			m.status = StatusRunning
			if m.logCmd == nil {
				m.startLogStream()
			}
		} else if strings.Contains(statusStr, "exited") || strings.Contains(statusStr, "dead") {
			m.status = StatusStopped
		}
	}
	
	return m.status
}

func (m *ServerManager) injectCustomPlugins() {
	// Attempt to copy custom plugins into the container before starting
	// Note: We use the shell to glob files inside the container or from host.
	// Since backend runs in Docker and maps /app/data, we can just run:
	// docker cp /app/data/custom_plugins/. AssettoServer:/app/plugins/
	// BUT docker cp with /. is a bit tricky if the folder is empty, it might fail.
	
	pluginsDir := "/app/data/custom_plugins"
	if _, err := os.Stat(pluginsDir); os.IsNotExist(err) {
		return
	}
	
	files, err := os.ReadDir(pluginsDir)
	if err != nil || len(files) == 0 {
		return
	}

	m.broadcastLog("--- Injecting custom plugins ---")
	for _, f := range files {
		if f.IsDir() || strings.HasSuffix(strings.ToLower(f.Name()), ".dll") {
			src := pluginsDir + "/" + f.Name()
			dest := m.container + ":/app/plugins/" + f.Name()
			exec.Command("docker", "cp", src, dest).Run()
		}
	}
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

	// Inject custom plugins before starting
	m.injectCustomPlugins()

	// Start container
	startCmd := exec.Command("docker", "start", m.container)
	if err := startCmd.Run(); err != nil {
		m.status = StatusCrashed
		return fmt.Errorf("failed to start container %s: %v", m.container, err)
	}

	m.status = StatusRunning
	m.startLogStream()

	m.broadcastLog("--- Server process started ---")
	return nil
}

func (m *ServerManager) startLogStream() {
	if m.logCmd != nil {
		m.logCmd.Process.Kill()
	}

	m.clientsMu.Lock()
	m.logHistory = make([]string, 0, 1000)
	m.clientsMu.Unlock()

	m.logCmd = exec.Command("docker", "logs", "-f", "--tail", "100", m.container)
	
	stdout, err := m.logCmd.StdoutPipe()
	if err == nil {
		go m.readOutput(stdout)
	}
	
	stderr, err := m.logCmd.StderrPipe()
	if err == nil {
		go m.readOutput(stderr)
	}

	m.logCmd.Start()

	go func() {
		m.logCmd.Wait()
		m.mu.Lock()
		m.logCmd = nil
		m.mu.Unlock()
		m.broadcastLog("--- Server log stream ended ---")
	}()
}

func (m *ServerManager) Restart() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.broadcastLog("--- Restarting server ---")
	
	// Inject custom plugins before restarting
	m.injectCustomPlugins()
	
	restartCmd := exec.Command("docker", "restart", m.container)
	if err := restartCmd.Run(); err != nil {
		return fmt.Errorf("failed to restart container %s: %v", m.container, err)
	}
	
	m.status = StatusRunning
	m.startLogStream()
	
	return nil
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

	stopCmd := exec.Command("docker", "stop", m.container)
	if err := stopCmd.Run(); err != nil {
		return fmt.Errorf("failed to stop container %s: %v", m.container, err)
	}
	
	m.status = StatusStopped
	
	if m.logCmd != nil && m.logCmd.Process != nil {
		m.logCmd.Process.Kill()
	}

	return nil
}

// ... BackendLogBroadcaster remains the same ...

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
