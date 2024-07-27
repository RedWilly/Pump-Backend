const WebSocket = require('ws');

// Replace this URL with your actual WebSocket server URL
const WS_URL = 'ws://localhost:9007';

const ws = new WebSocket(WS_URL);

ws.on('open', function open() {
  console.log('Connected to WebSocket server');
});

ws.on('message', function incoming(data) {
  try {
    const parsedData = JSON.parse(data);
    console.log('Received message:', JSON.stringify(parsedData, null, 2));
  } catch (error) {
    console.log('Received raw message:', data);
  }
});

ws.on('close', function close() {
  console.log('Disconnected from WebSocket server');
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

// Keep the script running
process.on('SIGINT', function() {
  ws.close();
  process.exit();
});