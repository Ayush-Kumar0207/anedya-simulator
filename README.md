# Anedya IoT Hardware Simulator

A dependency-free Node.js service that behaves like a small IoT device: it publishes temperature and humidity telemetry, polls Anedya's device command queue, applies relay commands, and acknowledges their outcome.

## Runtime behavior

- Publishes `temperature` and `humidity` every 5 seconds through `POST /v1/submitData`.
- Polls the official device endpoint `POST /v1/commands/next` every 2 seconds.
- Accepts `toggle-relay` commands with `ON` or `OFF` data.
- Concludes every fetched command through `POST /v1/commands/updateStatus`, including failure acknowledgments for invalid commands.
- Exposes HTTP health and status endpoints for container platforms.
- Records the latest telemetry and command-poll success/error in the health response.

All Anedya device calls use the node connection key with `Auth-mode: key`. The simulator does not need a project API key.

## Requirements

- Node.js 20 or newer
- An Anedya node with a connection key

## Configuration

Copy `.env.example` into your local environment manager or configure the values in your hosting platform:

| Variable | Required | Description |
|---|:---:|---|
| `CONNECTION_KEY` | Yes | Node-scoped Anedya device connection key |
| `NODE_ID` | Yes | Node identifier shown by the local status endpoint |
| `PORT` | No | HTTP port; defaults to `3000` |

The service validates required values at startup and exits with a clear error if either is missing. Node does not load `.env` files automatically; use your shell, hosting platform, or a compatible environment loader to provide them.

## Run locally

PowerShell:

```powershell
$env:CONNECTION_KEY = 'your_connection_key_here'
$env:NODE_ID = 'your_node_id_here'
npm start
```

POSIX shell:

```bash
export CONNECTION_KEY='your_connection_key_here'
export NODE_ID='your_node_id_here'
npm start
```

Then inspect:

- `GET /` — service identity and simulated relay state
- `GET /health` — `200` after recent telemetry success, otherwise `503` with diagnostic state

The health endpoint intentionally starts as degraded until the first telemetry submission succeeds.

## Commands

```bash
npm test                       # Runtime contract tests
npm run check                  # Syntax validation
npm audit --omit=dev           # Production dependency audit
npm start                      # Start the simulator
```

## Docker

```bash
docker build -t anedya-simulator .
docker run --rm -p 3000:3000 \
  -e CONNECTION_KEY='your_connection_key_here' \
  -e NODE_ID='your_node_id_here' \
  anedya-simulator
```

The image runs as a non-root user and includes a `/health` container health check. `.dockerignore` excludes local credentials, Git metadata, tests, and development files from the build context.

## Render deployment

Create a Render Web Service from this repository and select the Docker runtime. Configure:

| Setting | Value |
|---|---|
| Health Check Path | `/health` |
| Required environment | `CONNECTION_KEY`, `NODE_ID` |
| Optional environment | `PORT` (Render normally supplies this) |

After deployment, verify `/health`. A `503` response includes `lastTelemetryError`; authentication and Anedya validation failures should be fixed rather than hidden.

## Architecture

```text
Dashboard --sends command--> Anedya Cloud
                                 |
                                 v
Simulator --commands/next--> Anedya Device API
    |                            ^
    |--commands/updateStatus-----|
    `--submitData----------------|

Render / container platform --GET /health--> Simulator
```

The companion dashboard is in [IoT-Dashboard-Development-using-React](https://github.com/Ayush-Kumar0207/IoT-Dashboard-Development-using-React).

## Security

- Never commit connection keys or `.env` files.
- The connection key is node-scoped and used only by the simulator's device API calls.
- API traffic uses HTTPS and a 10-second timeout.
- Rotate a key immediately if it has been exposed.
- Health responses expose diagnostics and the node ID but never credentials.

## Validation

GitHub Actions runs syntax checks, runtime contract tests, a production dependency audit, and a clean Docker build on pushes and pull requests to `main`.

## License

ISC
