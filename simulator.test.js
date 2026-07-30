const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

process.env.CONNECTION_KEY = 'connection-secret';
process.env.NODE_ID = 'node-1';
const { fetchCommands, sendTelemetry, state } = require('./simulator');

const originalFetch = global.fetch;
const originalConsoleError = console.error;

test.beforeEach(() => {
  state.lastTelemetrySuccess = null;
  state.lastTelemetryError = null;
  state.lastCommandPollSuccess = null;
  state.lastCommandPollError = null;
  state.relay = 'UNKNOWN';
  console.error = () => {};
});

test.afterEach(() => {
  global.fetch = originalFetch;
  console.error = originalConsoleError;
});

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  };
}

test('fails fast when required environment variables are missing', () => {
  const env = { ...process.env };
  delete env.CONNECTION_KEY;
  delete env.NODE_ID;

  const result = spawnSync(process.execPath, ['simulator.js'], { env, encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /CONNECTION_KEY, NODE_ID/);
});

test('fetches and acknowledges relay commands through the device API', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    if (url.endsWith('/commands/next')) {
      return response({
        success: true,
        commandId: 'cmd-1',
        command: 'toggle-relay',
        data: 'ON',
        datatype: 'string',
      });
    }
    return response({ success: true });
  };

  await fetchCommands();

  assert.equal(state.relay, 'ON');
  assert.equal(state.lastCommandPollError, null);
  assert.match(state.lastCommandPollSuccess, /^\d{4}-/);
  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /device\.ap-in-1\.anedya\.io\/v1\/commands\/next$/);
  assert.deepEqual(requests[0].body, {});
  assert.equal(requests[0].options.headers['Auth-mode'], 'key');
  assert.equal(requests[0].options.headers.Authorization, 'connection-secret');
  assert.match(requests[1].url, /\/commands\/updateStatus$/);
  assert.deepEqual(requests[1].body, {
    commandId: 'cmd-1',
    status: 'success',
    ackdata: 'Command processed',
    ackdatatype: 'string',
  });
});

test('rejects malformed relay commands and acknowledges failure', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    if (url.endsWith('/commands/next')) {
      return response({ success: true, commandId: 'cmd-2', command: 'toggle-relay', data: 'MAYBE' });
    }
    return response({ success: true });
  };

  await fetchCommands();

  assert.equal(state.relay, 'UNKNOWN');
  assert.equal(state.lastCommandPollError, 'Invalid relay state: MAYBE');
  assert.equal(requests[1].body.status, 'failure');
  assert.equal(requests[1].body.ackdata, 'Invalid relay state: MAYBE');
});

test('treats a semantic telemetry rejection as an error', async () => {
  global.fetch = async () => response({ success: false, error: 'invalid connection key' });

  await sendTelemetry();

  assert.equal(state.lastTelemetrySuccess, null);
  assert.equal(state.lastTelemetryError, 'invalid connection key');
});
