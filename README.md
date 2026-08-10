# AssettoServer-Kommander

AssettoServer-Kommander is a comprehensive web administration interface designed specifically for [AssettoServer](https://assettoserver.org/). Built with a robust Go backend and a highly responsive React frontend (Vite), it provides server administrators with the ability to manage their game instances directly from a web browser, eliminating the need for manual `.ini` or `.yml` file editing.

Whether you are hosting a traditional track day or a large-scale freeroam environment (e.g., Shutoko Revival Project), this panel provides total control over your deployment.

## Features

- **Live Dashboard & Metrics:** Monitor the server status in real-time, including active players, current vehicles, and session best lap times.
- **Event Presets Management:** Create, edit, and save racing configurations and conditions through an intuitive visual interface. Configures `server_cfg.ini`, `extra_cfg.yml` and `csp_extra_options.ini` on the fly.
- **Smart Content Upload:** Drag and drop your `.zip`, `.rar`, `.7z` archives or uncompressed folders directly into the panel to install cars and tracks automatically. Fully compatible with ACSM.
- **Advanced AI Traffic Control:** Visually configure AssettoServer AI traffic (vehicles, skins, density, and spawn distance). Upload `fast_lane.ai` trajectories directly via the track settings.
- **Patreon Upgrade Support:** Automates the AssettoServer Premium/Patreon upgrade process. Import the official `.zip` archive or set your Docker image and enter your Patreon key straight from the dashboard.
- **Plugin Management:** View, enable, and configure AssettoServer plugins directly from the web interface using an integrated YAML editor. Upload your custom plugins (`.dll` or `.zip`).
- **User Roles & Security:** Add multiple admin or moderator accounts with secure login systems and role-based access.
- **Server Lifecycle Control:** Start, stop, and restart the underlying AssettoServer Docker container directly from the web panel.
- **Real-Time Log Console:** Monitor the server activity directly within the web interface via WebSocket-streamed logs.

## Architecture

The system relies on a unified Docker Compose architecture consisting of three primary services:
1. `assettoserver`: The official game server image (standard or patreon version).
2. `kommander-backend`: The Go API managing the container lifecycles, configuration files, mod extraction, and plugin coordination.
3. `kommander-frontend`: An Nginx container serving the static React build and proxying API requests.

## Prerequisites

- **Docker** and **Docker Compose** installed on your host machine.
- A Linux environment (Debian/Ubuntu recommended) is preferred for optimal Docker performance.
- Port `3000` (Web GUI) and `9600`/`8081` (AssettoServer) opened in your firewall.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bouletdu69/AssettoServer-Kommander.git
   cd AssettoServer-Kommander
   ```

2. **Start the containers:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the Web Interface:**
   Open your browser and navigate to: `http://<YOUR_SERVER_IP>:3000`

4. **Default Login:**
   - The first time you launch, you may need to register an admin account or use the default credentials if provided by your deployment script.

## Usage Guide (How-To)

### 1. Uploading Content (Cars / Tracks)
Go to the **Content** tab. You can directly drag and drop `.zip`, `.rar`, or `.7z` mods into the dropzone. Kommander's "Smart Upload" will automatically discover the tracks and cars inside the archive, extract them, and place them in the correct `content/` folders. It is fully compatible with ACSM.

### 2. Managing Events and Presets
Go to the **Events** tab. You can create a new Event Preset.
- Choose the track and layout.
- Adjust session parameters (Practice, Qualify, Race).
- Configure weather and time.
- In the **CSP Extra Options** section, you can add custom rules like disabling wrong way penalties using the quick-insert buttons.
- Click **Apply Preset** to automatically restart the server with this new configuration.

### 3. Uploading Custom Plugins
Go to the **Plugins** tab. Scroll down to the "Custom Plugins" section.
- Compile your plugin targeting `.NET 8` (AssettoServer requirement).
- Zip the folder containing the `.dll` (e.g., `CannonballTimingPlugin.zip`).
- Upload the `.zip` file. Kommander will automatically inject it into the server container.
- Restart the server to activate the plugin.

---
*Note: This project is currently under active development.*
