const http = require('node:http');

const REQUIRED_ENV = ['CONNECTION_KEY', 'API_KEY', 'NODE_ID'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const CONNECTION_KEY = process.env.CONNECTION_KEY;
const API_KEY = process.env.API_KEY;
const NODE_ID = process.env.NODE_ID;
const DEVICE_URL = 'https://device.ap-in-1.anedya.io/v1';
const CLOUD_URL = 'https://api.ap-in-1.anedya.io/v1';
const startedAt = Date.now();
const state = { lastTelemetrySuccess: null, lastTelemetryError: null, lastCommandPollSuccess: null, relay: 'UNKNOWN' };

async function post(url, payload, headers) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status}: ${data.error || response.statusText}`);
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
    }, { 'Auth-mode': 'key', Authorization: CONNECTION_KEY });
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
    const data = await post(`${CLOUD_URL}/commands/fetch`, { nodeId: NODE_ID }, { Authorization: `Bearer ${API_KEY}` });
    state.lastCommandPollSuccess = new Date().toISOString();
    for (const command of data.commands || []) {
      if (command.command === 'toggle-relay') state.relay = command.data;
      console.log(`[Command] ${command.command}: ${command.data}`);
    }
  } catch (error) {
    if (!error.message.startsWith('404:')) console.error(`[Command Poll Error] ${error.message}`);
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

const telemetryTimer = setInterval(sendTelemetry, 5000);
const commandTimer = setInterval(fetchCommands, 2000);
telemetryTimer.unref();
commandTimer.unref();

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => {
  console.log(`Anedya simulator listening on ${PORT}`);
  sendTelemetry();
  fetchCommands();
});
