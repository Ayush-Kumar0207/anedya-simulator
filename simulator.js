const axios = require('axios');
const express = require('express');

const REQUIRED_ENV = ['CONNECTION_KEY', 'API_KEY', 'NODE_ID'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const CONNECTION_KEY = process.env.CONNECTION_KEY;
const API_KEY = process.env.API_KEY;
const NODE_ID = process.env.NODE_ID;
const DEVICE_URL = 'https://device.ap-in-1.anedya.io/v1';
const CLOUD_URL = 'https://api.ap-in-1.anedya.io/v1';
const startedAt = Date.now();

const state = {
  lastTelemetrySuccess: null,
  lastTelemetryError: null,
  lastCommandPollSuccess: null,
  relay: 'UNKNOWN',
};

async function sendTelemetry() {
  const temperature = Number((Math.random() * 10 + 20).toFixed(2));
  const humidity = Number((Math.random() * 20 + 40).toFixed(2));
  const payload = {
    data: [
      { variable: 'temperature', value: temperature, timestamp: Date.now() },
      { variable: 'humidity', value: humidity, timestamp: Date.now() },
    ],
  };

  try {
    await axios.post(`${DEVICE_URL}/submitData`, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Auth-mode': 'key',
        Authorization: CONNECTION_KEY,
      },
    });
    state.lastTelemetrySuccess = new Date().toISOString();
    state.lastTelemetryError = null;
    console.log(`[Telemetry] Temp=${temperature}°C Hum=${humidity}%`);
  } catch (error) {
    state.lastTelemetryError = error.message;
    console.error(`[Telemetry Error] ${error.response?.status || 'network'}: ${error.message}`);
  }
}

async function fetchCommands() {
  try {
    const response = await axios.post(`${CLOUD_URL}/commands/fetch`, { nodeId: NODE_ID }, {
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    state.lastCommandPollSuccess = new Date().toISOString();
    for (const command of response.data?.commands || []) {
      if (command.command === 'toggle-relay') state.relay = command.data;
      console.log(`[Command] ${command.command}: ${command.data}`);
    }
  } catch (error) {
    if (error.response?.status !== 404) console.error(`[Command Poll Error] ${error.message}`);
  }
}

app.get('/', (_req, res) => {
  res.json({ service: 'anedya-simulator', status: 'running', nodeId: NODE_ID, relay: state.relay });
});

app.get('/health', (_req, res) => {
  const lastSuccess = state.lastTelemetrySuccess ? Date.parse(state.lastTelemetrySuccess) : 0;
  const healthy = lastSuccess > 0 && Date.now() - lastSuccess < 60000;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    ...state,
  });
});

const telemetryTimer = setInterval(sendTelemetry, 5000);
const commandTimer = setInterval(fetchCommands, 2000);
telemetryTimer.unref();
commandTimer.unref();

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Anedya simulator listening on ${PORT}`);
  sendTelemetry();
  fetchCommands();
});
