const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const PORT = 9008;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running');
});

const wss = new WebSocket.Server({ server });

function generateRandomAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

function generateRandomTxHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

function generateRandomToken() {
  const names = ['RedWilly', 'BlueBerry', 'GreenApple', 'YellowBanana', 'PurpleGrape', 'BIGMAN'];
  const symbols = ['RW', 'BB', 'GA', 'YB', 'PG', 'POL', 'YOLO', 'BG', 'BJ'];
  const colors = ['FF0000', '0000FF', '00FF00', 'FFFF00', '800080', '984230', '1f6d0c' ];
  const index = Math.floor(Math.random() * names.length);
  return {
    name: names[index],
    symbol: symbols[index],
    logo: `https://placehold.co/200x200/${colors[index]}/FFFFFF.png?text=${symbols[index]}`
  };
}

function generateRandomEvent() {
  const eventTypes = ['tokensSold', 'tokensBought', 'tokenCreated'];
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const token = generateRandomToken();

  const baseEvent = {
    id: crypto.randomUUID(),
    tokenId: crypto.randomUUID(),
    senderAddress: generateRandomAddress(),
    recipientAddress: generateRandomAddress(),
    txHash: generateRandomTxHash(),
    timestamp: new Date().toISOString(),
    name: token.name,
    symbol: token.symbol,
    logo: token.logo
  };

  switch (eventType) {
    case 'tokensSold':
    case 'tokensBought':
      return {
        type: eventType,
        data: {
          ...baseEvent,
          type: eventType === 'tokensSold' ? 'sell' : 'buy',
          ethAmount: (Math.random() * 10000000000000000000),
          tokenAmount: (Math.random() * 100000000000000000000),
          tokenPrice: (Math.random() * 200010010000000000)
        }
      };
    case 'tokenCreated':
      return {
        type: eventType,
        data: {
          ...baseEvent,
          type: 'creation',
          creatorAddress: baseEvent.senderAddress,
          tokenAddress: baseEvent.recipientAddress
        }
      };
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.send(JSON.stringify({ type: 'connection', message: 'Connected to event simulator server' }));

  const interval = setInterval(() => {
    const event = generateRandomEvent();
    console.log(event)
    ws.send(JSON.stringify(event));
    console.log('Sent event:', event.type);
  }, 10000);

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});