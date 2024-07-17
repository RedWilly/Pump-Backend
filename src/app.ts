import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { setupBlockchainListeners } from './blockchain/events';
import tokenRoutes from './routes/tokenRoutes';
import transactionRoutes from './routes/transactionRoutes';
import liquidityRoutes from './routes/liquidityRoutes';
import priceRoutes from './routes/priceRoutes'; 

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/tokens', tokenRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/liquidity', liquidityRoutes);
app.use('/api/price', priceRoutes); 

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.send(JSON.stringify({ type: 'connection', message: 'Connected to server' }));
});

export function broadcastUpdate(type: string, data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, data }));
    }
  });
}

const PORT = 9007;

let serverStarted = false; // Define serverStarted

async function startServer() {
  if (serverStarted) {
    return;
  }
  serverStarted = true;

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    setupBlockchainListeners();
  });
}

startServer();

app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});

// Prevent multiple server starts
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (!serverStarted) {
    process.exit(1);
  }
});
