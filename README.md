# AssettoServer-Kommander

AssettoServer-Kommander is a comprehensive web administration interface designed specifically for [AssettoServer](https://assettoserver.org/). Built with a robust Go backend and a highly responsive React frontend (Vite), it provides server administrators with the ability to manage their game instances directly from a web browser, eliminating the need for manual `.ini` or `.yml` file editing.

Whether you are hosting a traditional track day or a large-scale freeroam environment (e.g., Shutoko Revival Project), this panel provides total control over your deployment.

## Features

- **Live Dashboard & Metrics:** Monitor the server status in real-time, including active players, current vehicles, and session best lap times.
- **Event Presets Management:** Create, edit, and save racing configurations and conditions through an intuitive visual interface.
- **Smart Content Upload:** Drag and drop your `.zip`, `.rar`, `.7z` archives or uncompressed folders directly into the panel to install cars and tracks automatically.
- **Advanced AI Traffic Control:** Visually configure AssettoServer AI traffic (vehicles, skins, density, and spawn distance). Upload `fast_lane.ai` trajectories directly via the track settings.
- **Patreon Upgrade Support:** Automates the AssettoServer Premium/Patreon upgrade process. Import the official `.zip` archive or set your Docker image and enter your Patreon key straight from the dashboard.
- **Plugin Management:** View, enable, and configure AssettoServer plugins directly from the web interface using an integrated JSON/YAML editor.
- **User Roles & Security:** Add multiple admin or moderator accounts with secure login systems and role-based access.
- **Server Lifecycle Control:** Start, stop, and restart the underlying AssettoServer Docker container directly from the web panel.
- **Real-Time Log Console:** Monitor the server activity directly within the web interface via WebSocket-streamed logs.

## Architecture

The system relies on a unified Docker Compose architecture consisting of three primary services:
1. `assettoserver`: The official game server image (standard or patreon version).
2. `kommander-backend`: The Go API managing the container lifecycles, configuration files, mod extraction, and plugin coordination.
3. `kommander-frontend`: An Nginx container serving the static React build and proxying API requests.

---
*Note: This project is currently under active development.*
