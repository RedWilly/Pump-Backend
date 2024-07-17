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

const PORT = process.env.PORT || 9006;

function startServer(retries = 5) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    setupBlockchainListeners();
  }).on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is busy, retrying...`);
      if (retries > 0) {
        setTimeout(() => startServer(retries - 1), 10000);
      } else {
        console.error(`Could not start server after 5 attempts. Please check if port ${PORT} is available.`);
        process.exit(1);
      }
    } else {
      console.error('An unexpected error occurred:', e);
      process.exit(1);
    }
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