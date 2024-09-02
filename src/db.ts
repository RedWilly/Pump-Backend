import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Create dblite folder if it doesn't exist
const dbFolder = path.join(__dirname, 'dblite');
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder);
}

const dbPath = path.join(dbFolder, 'chats.sqlite');
const db: Database = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    token TEXT NOT NULL,
    message TEXT NOT NULL,
    reply_to INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reply_to) REFERENCES chats(id)
  )`);
});

export default db;