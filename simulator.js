const axios = require('axios');

// Your exact credentials
const CONNECTION_KEY = 'YOUR_CONNECTION_KEY_HERE';
// ⚠️ REPLACE THIS WITH YOUR NEW MASTER API KEY ⚠️
const API_KEY = 'YOUR_MASTER_API_KEY_HERE';
const NODE_ID = 'YOUR_NODE_ID_HERE';

const DEVICE_URL = 'https://device.ap-in-1.anedya.io/v1';
const CLOUD_URL = 'https://api.ap-in-1.anedya.io/v1';

/**
 * Send random telemetry to Anedya Device Cloud
 * Directly uses the Device API with Connection Key
 */
async function sendTelemetry() {
    const temperature = parseFloat((Math.random() * (30 - 20) + 20).toFixed(2));
    const humidity = parseFloat((Math.random() * (60 - 40) + 40).toFixed(2));
    const timestamp = Date.now();

    // FORCE strict JSON formatting to bypass Anedya's invalid_json filter
    const payload = JSON.stringify({
        data: [
            { variable: 'temperature', value: temperature, timestamp: timestamp },
            { variable: 'humidity', value: humidity, timestamp: timestamp }
        ]
    });

    try {
        await axios.post(`${DEVICE_URL}/submitData`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Auth-mode': 'key',
                'Authorization': CONNECTION_KEY
            }
        });
        console.log(`[Telemetry] Sent to Cloud: Temp=${temperature}°C, Hum=${humidity}%`);
    } catch (error) {
        console.error(`[Telemetry Error]: ${error.response?.status || 'Unknown'} - ${JSON.stringify(error.response?.data) || error.message}`);
    }
}

/**
 * Poll for pending commands from Cloud
 * Directly uses the Cloud API with Project API Key
 */
async function fetchCommands() {
    try {
        // Force strict JSON formatting here too, just to be safe
        const payload = JSON.stringify({ nodeId: NODE_ID });

        const response = await axios.post(`${CLOUD_URL}/commands/fetch`, payload, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success && response.data.commands) {
            response.data.commands.forEach(cmd => {
                console.log(`\n🔔 [Command Received] -> ${cmd.command}: ${cmd.data}`);
                if (cmd.command === 'toggle-relay') {
                    console.log(`✅ Hardware Relay state updated to: ${cmd.data}\n`);
                }
            });
        }
    } catch (error) {
        // Silent error for polling frequency
    }
}

console.log(`🚀 Anedya IoT Hardware Simulator (STRICT CLOUD MODE)`);
console.log(`- Node ID: ${NODE_ID}`);
console.log(`- Communication: Strict Cloud API (AP-IN-1)`);
console.log('----------------------------------------------------');

// Main loop
setInterval(sendTelemetry, 5000);
setInterval(fetchCommands, 2000);
sendTelemetry();