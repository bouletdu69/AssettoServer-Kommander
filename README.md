# AssettoServer-Kommander

AssettoServer-Kommander is a comprehensive web administration interface designed specifically for [AssettoServer](https://assettoserver.org/). Built with a robust Go backend and a highly responsive React frontend (Vite), it provides server administrators with the ability to manage their game instances directly from a web browser, eliminating the need for manual `.ini` or `.yml` file editing.

Whether you are hosting a traditional track day or a large-scale freeroam environment (e.g., Shutoko Revival Project), this panel provides total control over your deployment.

## Features

- **Event Presets Management:** Create, edit, and save racing configurations and conditions through an intuitive interface.
- **Advanced AI Traffic Control:** Visually configure AssettoServer AI traffic (vehicles, skins, density, and spawn distance) without risking YAML syntax errors.
- **Live Dashboard & Metrics:** Monitor the server status in real-time, including active players, current vehicles, and session best lap times.
- **Server Lifecycle Control:** Start, stop, and restart the underlying AssettoServer Docker container directly from the web panel.
- **Real-Time Log Console:** Monitor the server activity directly within the web interface via WebSocket-streamed logs.

## Architecture

The system relies on a unified Docker Compose architecture consisting of three primary services:
1. `assettoserver`: The official game server image.
2. `kommander-backend`: The Go API managing the container lifecycles and configuration files.
3. `kommander-frontend`: An Nginx container serving the static React build and proxying API requests.

---
*Note: This project is currently under active development.*
