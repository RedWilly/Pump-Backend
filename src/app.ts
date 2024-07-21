import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { setupBlockchainListeners } from './blockchain/events';
import tokenRoutes from './routes/tokenRoutes';
import transactionRoutes from './routes/transactionRoutes';
import liquidityRoutes from './routes/liquidityRoutes';
import priceRoutes from './routes/priceRoutes';
import { db, pool, testDatabaseConnection } from '../src/config/database';
import { initializeAllChains } from '../src/blockchain/chainConfig';

import logger from './utils/logger';

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
    logger.warn('Server start attempted when already running');
    return;
  }

  try {
    await testDatabaseConnection();
    await initializeAllChains();
    logger.info('All chains initialized in the database');

    await setupBlockchainListeners();
    logger.info('Blockchain listeners set up for all supported chains');

    server.listen(PORT, () => {
      serverStarted = true;
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await pool.end();
  logger.info('Database connection closed.');
  process.exit();
});

// Start the server
startServer();

export { app, server };