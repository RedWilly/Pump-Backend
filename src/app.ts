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
import { fileQueue } from './blockchain/fileQueue';
import './telegramBot';
import bodyParser from 'body-parser';
import db from './db';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

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

// routes for queues
app.get('/dlq', async (req, res) => {
  const dlqItems = await fileQueue.listDeadLetterQueue();
  res.json(dlqItems);
});

app.post('/dlq/:id/reprocess', async (req, res) => {
  const success = await fileQueue.reprocessDeadLetterQueueItem(req.params.id);
  res.json({ success });
});

app.delete('/dlq/:id', async (req, res) => {
  const success = await fileQueue.deleteDeadLetterQueueItem(req.params.id);
  res.json({ success });
});

app.get('/queue-stats', async (req, res) => {
  try {
    const stats = await fileQueue.getQueueStats();
    res.json({
      success: true,
      stats: {
        mainQueue: stats.main,
        errorQueue: stats.error,
        deadLetterQueue: stats.dlq
      }
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue statistics' });
  }
});

// Health check endpoint
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

// POST /chats endpoint to add a new chat message
app.post('/chats', (req, res) => {
  const { user, token, message, reply_to } = req.body;
  if (!user || !token || !message) {
    return res.status(400).json({ error: 'User, token, and message are required' });
  }

  const stmt = db.prepare('INSERT INTO chats (user, token, message, reply_to) VALUES (?, ?, ?, ?)');
  stmt.run(user, token, message, reply_to || null, (err: Error) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to add message' });
    }
    res.status(201).json({ id: (stmt as any).lastID });
  });
  stmt.finalize();
});

// GET /chats endpoint to retrieve chat messages for a specific token
app.get('/chats', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const query = `
    SELECT 
      c1.id, c1.user, c1.token, c1.message, c1.reply_to, c1.timestamp,
      MAX(c2.timestamp) AS latest_reply_timestamp
    FROM 
      chats c1
    LEFT JOIN 
      chats c2 ON c1.id = c2.reply_to
    WHERE 
      c1.token = ?
    GROUP BY 
      c1.id, c1.user, c1.token, c1.message, c1.reply_to, c1.timestamp
    ORDER BY 
      COALESCE(MAX(c2.timestamp), c1.timestamp) DESC
  `;

  db.all(query, [token], (err: Error, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve messages' });
    }
    res.json(rows);
  });
});
