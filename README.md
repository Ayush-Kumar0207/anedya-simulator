<div align="center">

# ⚡ Anedya IoT Hardware Simulator

**A cloud-native virtual IoT device that streams real-time telemetry to the [Anedya Platform](https://anedya.io) — powering your dashboard without physical hardware.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Deployed on Render](https://img.shields.io/badge/Render-Live-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![Dashboard](https://img.shields.io/badge/Dashboard-Live_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://io-t-dashboard-development-using-re.vercel.app)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/Ayush-Kumar0207/anedya-simulator/pulls)

<br/>

> 🔄 Runs 24/7 on Render · 📡 Sends data every 5 seconds · 🎛️ Listens for relay commands in real-time

<br/>

[Live Dashboard ↗](https://io-t-dashboard-development-using-re.vercel.app) · [Report Bug](https://github.com/Ayush-Kumar0207/anedya-simulator/issues) · [Request Feature](https://github.com/Ayush-Kumar0207/anedya-simulator/issues)

</div>

---

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Dashboard Integration](#-dashboard-integration)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [FAQ](#-faq)
- [License](#-license)
- [Author](#-author)

---

## 🧠 About The Project

Building an IoT dashboard is exciting — until you realize you need actual hardware to generate data. **This simulator eliminates that barrier entirely.**

Anedya IoT Hardware Simulator is a lightweight Node.js service that acts as a **virtual IoT device**, continuously pushing realistic sensor telemetry (temperature & humidity) to the [Anedya IoT Cloud](https://anedya.io). It also listens for incoming **device commands** (like relay toggles), simulating a full hardware lifecycle — all from a simple cloud deployment.

### Why This Exists

| Problem | Solution |
|---|---|
| No physical hardware for development | Virtual device generates realistic data |
| Dashboard needs continuous data stream | Simulator runs 24/7 on Render |
| Testing command delivery is hard | Automatic command polling & acknowledgment |
| Need real API integration, not mocks | Direct Anedya Cloud API communication |

---

## ⚙️ How It Works

The simulator performs two continuous operations in parallel:

### 📡 Telemetry Transmission (every 5s)
- Generates **randomized but realistic** sensor readings:
  - 🌡️ **Temperature**: `20.00°C` – `30.00°C`
  - 💧 **Humidity**: `40.00%` – `60.00%`
- Submits data via Anedya's **Device API** using the Connection Key
- Data appears instantly on the [IoT Dashboard](https://io-t-dashboard-development-using-re.vercel.app)

### 🎛️ Command Polling (every 2s)
- Polls the Anedya **Cloud API** for pending device commands
- Processes commands like `toggle-relay` and logs hardware state changes
- Enables dashboard → device communication

---

## 🏗 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | JavaScript runtime |
| **HTTP Client** | ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white) | API communication with Anedya |
| **Web Framework** | ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) | Keep-alive server for Render |
| **IoT Platform** | ![Anedya](https://img.shields.io/badge/Anedya-IoT_Cloud-0078D7?style=flat-square) | Device management & data storage |
| **Deployment** | ![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white) | 24/7 cloud hosting |
| **Dashboard** | ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black) | [Companion dashboard on Vercel](https://io-t-dashboard-development-using-re.vercel.app) |

---

## 🏛 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        RENDER (Cloud)                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Anedya IoT Hardware Simulator                 │  │
│  │                                                            │  │
│  │   ┌─────────────┐    every 5s    ┌──────────────────────┐  │  │
│  │   │  Telemetry   │──────────────▶│  Anedya Device API   │  │  │
│  │   │  Generator   │   POST data   │  (ap-in-1 region)    │  │  │
│  │   └─────────────┘                └──────────┬───────────┘  │  │
│  │                                              │              │  │
│  │   ┌─────────────┐    every 2s    ┌──────────▼───────────┐  │  │
│  │   │  Command     │◀──────────────│  Anedya Cloud API    │  │  │
│  │   │  Poller      │   FETCH cmds  │  (ap-in-1 region)    │  │  │
│  │   └─────────────┘                └──────────────────────┘  │  │
│  │                                                            │  │
│  │   ┌─────────────┐                                          │  │
│  │   │  Express     │ ← Keeps Render free tier alive          │  │
│  │   │  :PORT       │                                          │  │
│  │   └─────────────┘                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   IoT Dashboard (React)       │
              │   Vercel Deployment            │
              │   Real-time data visualization │
              └───────────────────────────────┘
```

---

## 📂 Project Structure

```
anedya-simulator/
├── simulator.js        # Core simulator — telemetry + command engine
├── package.json        # Dependencies & project metadata
├── .gitignore          # Ignores node_modules, .env, logs
└── .env                # Environment variables (not committed)
```

> Intentionally minimal. One file. One purpose. Zero bloat.

---

## ⚡ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- An [Anedya](https://anedya.io) account with a configured project & node

### Installation

```bash
# Clone the repository
git clone https://github.com/Ayush-Kumar0207/anedya-simulator.git
cd anedya-simulator

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Anedya credentials (see below)

# Start the simulator
node simulator.js
```

You should see output like:

```
🚀 Anedya IoT Hardware Simulator (STRICT CLOUD MODE)
- Communication: Strict Cloud API (AP-IN-1)
----------------------------------------------------
🌐 Dummy Web Server listening on port 3000 to satisfy Render.
[Telemetry] Sent to Cloud: Temp=24.37°C, Hum=52.18%
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# Anedya Device Connection Key
# Found in: Anedya Console → Your Project → Node → Connection Key
CONNECTION_KEY=your_connection_key_here

# Anedya Project API Key
# Found in: Anedya Console → Your Project → Settings → API Keys
API_KEY=your_api_key_here

# Anedya Node ID
# Found in: Anedya Console → Your Project → Nodes → Node ID
NODE_ID=your_node_id_here

# Server port (optional, defaults to 3000)
PORT=3000
```

| Variable | Required | Description |
|---|---|---|
| `CONNECTION_KEY` | ✅ | Authenticates telemetry submissions to Device API |
| `API_KEY` | ✅ | Authenticates command fetching from Cloud API |
| `NODE_ID` | ✅ | Identifies the virtual device node in Anedya |
| `PORT` | ❌ | Web server port (auto-set by Render) |

---

## 🚀 Deployment

### Deploy to Render (Recommended)

This simulator is designed to run as a **Render Web Service** on the free tier.

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create a Web Service on Render**
   - Go to [render.com](https://render.com) → **New** → **Web Service**
   - Connect your `anedya-simulator` repo
   - Configure:

     | Setting | Value |
     |---|---|
     | **Runtime** | Node |
     | **Build Command** | `npm install` |
     | **Start Command** | `node simulator.js` |
     | **Plan** | Free |

3. **Add Environment Variables**
   - In Render dashboard → **Environment** tab
   - Add `CONNECTION_KEY`, `API_KEY`, and `NODE_ID`

4. **Deploy** — Render will build and start your simulator automatically.

> 💡 **Why Express?** Render's free tier requires an HTTP listener to keep the service alive. The Express server on `PORT` serves this purpose while the simulator runs in the background.

### Run Locally

```bash
node simulator.js
```

The simulator will start sending telemetry immediately and log all activity to the console.

---

## 📊 Dashboard Integration

This simulator is the **data engine** behind the IoT Dashboard:

| Component | Repository | Deployment |
|---|---|---|
| **Simulator** (this repo) | [anedya-simulator](https://github.com/Ayush-Kumar0207/anedya-simulator) | [Render](https://render.com) |
| **Dashboard** | [IOT_Dashboard_using_React](https://github.com/Ayush-Kumar0207/IOT_Dashboard_using_React) | [Vercel ↗](https://io-t-dashboard-development-using-re.vercel.app) |

**Data Flow**: `Simulator → Anedya Cloud → Dashboard (via Anedya API)`

---

## 🔒 Security

- ✅ All credentials stored as **environment variables** — never hardcoded
- ✅ `.gitignore` excludes `.env`, logs, and debug files
- ✅ API communication over **HTTPS** exclusively
- ✅ Connection Key used for device-level auth (scoped to single node)
- ✅ API Key used for project-level cloud operations

> ⚠️ **Never commit your `.env` file.** Rotate keys immediately if exposed.

---

## 🗺 Roadmap

- [ ] Add more sensor types (pressure, light, motion)
- [ ] Configurable data ranges via environment variables
- [ ] WebSocket support for bi-directional communication
- [ ] Simulate multiple devices concurrently
- [ ] Add data anomaly simulation for alert testing
- [ ] Health check endpoint with uptime stats
- [ ] Docker containerization

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/multi-device-sim`)
3. **Commit** your changes (`git commit -m 'Add multi-device simulation'`)
4. **Push** to the branch (`git push origin feature/multi-device-sim`)
5. **Open** a Pull Request

---

## ❓ FAQ

<details>
<summary><b>Why does it need Express if it's just a simulator?</b></summary>
<br/>
Render's free tier requires an active HTTP listener to keep the service running. The Express server satisfies this requirement while the actual simulation runs via <code>setInterval</code> loops.
</details>

<details>
<summary><b>How accurate is the simulated data?</b></summary>
<br/>
Temperature ranges from 20–30°C and humidity from 40–60% — realistic for indoor IoT sensors. Values are randomized with 2 decimal places for authentic-looking data streams.
</details>

<details>
<summary><b>Can I use this with a different IoT region?</b></summary>
<br/>
Currently configured for <code>ap-in-1</code> (Asia-Pacific India). To use another region, update the <code>DEVICE_URL</code> and <code>CLOUD_URL</code> constants in <code>simulator.js</code>.
</details>

<details>
<summary><b>Will this work with Anedya's free plan?</b></summary>
<br/>
Yes. The simulator uses standard Device and Cloud APIs that are available on all Anedya plans.
</details>

---

## 📜 License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Ayush Kumar**

[![GitHub](https://img.shields.io/badge/GitHub-Ayush--Kumar0207-181717?style=for-the-badge&logo=github)](https://github.com/Ayush-Kumar0207)

---

<div align="center">

### 🌟 Star This Repo

If this simulator helped you build your IoT project without hardware, consider giving it a ⭐

It helps others discover this tool and motivates further development!

[![Star History](https://img.shields.io/github/stars/Ayush-Kumar0207/anedya-simulator?style=social)](https://github.com/Ayush-Kumar0207/anedya-simulator/stargazers)

</div>
