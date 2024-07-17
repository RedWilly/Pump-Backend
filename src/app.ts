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
import net from 'net';

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

const BASE_PORT = 9006;
const MAX_PORT = 9106; // Try up to 100 ports

let serverStarted = false; // Define serverStarted

function findAvailablePort(startPort: number, endPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    const tryPort = () => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => {
          resolve(port);
        });
        server.close();
      });
      server.on('error', () => {
        if (port >= endPort) {
          reject(new Error('No available ports'));
        } else {
          port++;
          tryPort();
        }
      });
    };
    tryPort();
  });
}

async function startServer() {
  if (serverStarted) {
    return;
  }
  serverStarted = true;

  try {
    const port = await findAvailablePort(BASE_PORT, MAX_PORT);
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      setupBlockchainListeners();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
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
