const http = require('node:http');

const REQUIRED_ENV = ['CONNECTION_KEY', 'NODE_ID'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
if (require.main === module && missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const CONNECTION_KEY = process.env.CONNECTION_KEY?.trim();
const NODE_ID = process.env.NODE_ID?.trim();
const DEVICE_URL = 'https://device.ap-in-1.anedya.io/v1';
const DEVICE_HEADERS = { 'Auth-mode': 'key', Authorization: CONNECTION_KEY };
const startedAt = Date.now();
const state = {
  lastTelemetrySuccess: null,
  lastTelemetryError: null,
  lastCommandPollSuccess: null,
  lastCommandPollError: null,
  relay: 'UNKNOWN',
};

async function post(url, payload, headers) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  const detail = data.error || response.statusText || 'Anedya request rejected';
  if (!response.ok) throw new Error(`${response.status}: ${detail}`);
  if (data.success === false) throw new Error(detail);
  return data;
}

async function sendTelemetry() {
  const temperature = Number((Math.random() * 10 + 20).toFixed(2));
  const humidity = Number((Math.random() * 20 + 40).toFixed(2));
  try {
    await post(`${DEVICE_URL}/submitData`, {
      data: [
        { variable: 'temperature', value: temperature, timestamp: Date.now() },
        { variable: 'humidity', value: humidity, timestamp: Date.now() },
      ],
    }, DEVICE_HEADERS);
    state.lastTelemetrySuccess = new Date().toISOString();
    state.lastTelemetryError = null;
    console.log(`[Telemetry] Temp=${temperature}°C Hum=${humidity}%`);
  } catch (error) {
    state.lastTelemetryError = error.message;
    console.error(`[Telemetry Error] ${error.message}`);
  }
}

async function fetchCommands() {
  try {
    const command = await post(`${DEVICE_URL}/commands/next`, {}, DEVICE_HEADERS);
    if (!command.commandId) {
      state.lastCommandPollSuccess = new Date().toISOString();
      state.lastCommandPollError = null;
      return;
    }

    let status = 'success';
    let acknowledgement = 'Command processed';
    if (command.command !== 'toggle-relay') {
      status = 'failure';
      acknowledgement = `Unsupported command: ${command.command || 'unknown'}`;
    } else if (!['ON', 'OFF'].includes(command.data)) {
      status = 'failure';
      acknowledgement = `Invalid relay state: ${command.data}`;
    } else {
      state.relay = command.data;
      console.log(`[Command] ${command.command}: ${command.data}`);
    }

    await post(`${DEVICE_URL}/commands/updateStatus`, {
      commandId: command.commandId,
      status,
      ackdata: acknowledgement,
      ackdatatype: 'string',
    }, DEVICE_HEADERS);

    if (status === 'failure') throw new Error(acknowledgement);
    state.lastCommandPollSuccess = new Date().toISOString();
    state.lastCommandPollError = null;
  } catch (error) {
    state.lastCommandPollError = error.message;
    console.error(`[Command Poll Error] ${error.message}`);
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  if (req.url === '/health') {
    const lastSuccess = state.lastTelemetrySuccess ? Date.parse(state.lastTelemetrySuccess) : 0;
    const healthy = lastSuccess > 0 && Date.now() - lastSuccess < 60000;
    return sendJson(res, healthy ? 200 : 503, {
      status: healthy ? 'ok' : 'degraded',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      ...state,
    });
  }
  if (req.url === '/') return sendJson(res, 200, { service: 'anedya-simulator', status: 'running', nodeId: NODE_ID, relay: state.relay });
  return sendJson(res, 404, { error: 'Not found' });
});

function start() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');

  const telemetryTimer = setInterval(sendTelemetry, 5000);
  const commandTimer = setInterval(fetchCommands, 2000);
  telemetryTimer.unref();
  commandTimer.unref();

  server.listen(port, () => {
    console.log(`Anedya simulator listening on ${port}`);
    sendTelemetry();
    fetchCommands();
  });

  const shutdown = () => {
    clearInterval(telemetryTimer);
    clearInterval(commandTimer);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return { server, telemetryTimer, commandTimer };
}

if (require.main === module) {
  try {
    start();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { fetchCommands, sendTelemetry, start, state };
