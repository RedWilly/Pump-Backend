// demo wss server for backend to test websocket connection
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

function generateRandomColor() {
  return Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

function generateRandomName() {
  const adjectives = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Crypto', 'Moon', 'Rocket', 'Diamond', 'Golden'];
  const nouns = ['Coin', 'Token', 'Cash', 'Money', 'Gem', 'Star', 'Planet', 'Dog', 'Cat', 'Rabbit'];
  return adjectives[Math.floor(Math.random() * adjectives.length)] + 
         nouns[Math.floor(Math.random() * nouns.length)];
}

function generateRandomSymbol(name) {
  const length = Math.floor(Math.random() * 3) + 2; // 2 to 4 characters
  let symbol = '';
  const words = name.split(/(?=[A-Z])/);
  for (let i = 0; i < length; i++) {
    if (i < words.length) {
      symbol += words[i][0].toUpperCase();
    } else {
      symbol += String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random uppercase letter
    }
  }
  return symbol;
}

function generateRandomToken() {
  const name = generateRandomName();
  const symbol = generateRandomSymbol(name);
  const color = generateRandomColor();
  return {
    name: name,
    symbol: symbol,
    logo: `https://placehold.co/200x200/${color}/FFFFFF.png?text=${symbol}`
  };
}

function generateRandomAmount() {
  return BigInt(Math.floor(Math.random() * 1e24)).toString(); // Up to 1 million tokens/ETH (with 18 decimals)
}

function generateRandomPrice() {
  return BigInt(Math.floor(Math.random() * 1e18)).toString(); // Up to 1 ETH per token
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
          ethAmount: generateRandomAmount(),
          tokenAmount: generateRandomAmount(),
          tokenPrice: generateRandomPrice()
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
    console.log(event);
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