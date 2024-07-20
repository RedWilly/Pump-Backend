import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { setupBlockchainListeners } from './blockchain/events';
import tokenRoutes from './routes/tokenRoutes';
import transactionRoutes from './routes/transactionRoutes';
import liquidityRoutes from './routes/liquidityRoutes';
import priceRoutes from './routes/priceRoutes';
import { db, pool } from '../src/config/database';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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

const PORT = process.env.PORT || 9007;

let serverStarted = false;

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

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  console.log('Database connection closed.');
  process.exit();
});

// Prevent multiple server starts
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (!serverStarted) {
    process.exit(1);
  }
});

export { app, server };