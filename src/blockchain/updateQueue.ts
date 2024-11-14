import { prisma } from '../app';
import * as fs from 'fs';
import * as path from 'path';

interface TokenUpdateData {
  tokenAddress: string;
  updateData: {
    logo?: string;
    description?: string;
    website?: string;
    telegram?: string;
    discord?: string;
    twitter?: string;
    youtube?: string;
  };
  attempts: number;
  lastAttempt: Date;
}

class UpdateQueue {
  private queue: Map<string, TokenUpdateData> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly RETRY_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly QUEUE_FILE_PATH = path.join(__dirname, '../data/updateQueue.json');

  constructor() {
    this.ensureDataDirectoryExists();
    this.ensureQueueFileExists();
    this.loadQueueFromFile();
  }

  private ensureDataDirectoryExists() {
    const dir = path.dirname(this.QUEUE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private ensureQueueFileExists() {
    if (!fs.existsSync(this.QUEUE_FILE_PATH)) {
      fs.writeFileSync(this.QUEUE_FILE_PATH, JSON.stringify({}, null, 2));
      console.log('Created new update queue file');
    }
  }

  private loadQueueFromFile() {
    try {
      if (fs.existsSync(this.QUEUE_FILE_PATH)) {
        const data = fs.readFileSync(this.QUEUE_FILE_PATH, 'utf8');
        const queueData = JSON.parse(data);
        this.queue = new Map(
          Object.entries(queueData).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              lastAttempt: new Date(value.lastAttempt)
            }
          ])
        );
        console.log('Update queue loaded from file');
      }
    } catch (error) {
      console.error('Error loading update queue from file:', error);
    }
  }

  private saveQueueToFile() {
    try {
      const queueData = Object.fromEntries(this.queue);
      fs.writeFileSync(this.QUEUE_FILE_PATH, JSON.stringify(queueData, null, 2));
    } catch (error) {
      console.error('Error saving update queue to file:', error);
    }
  }

  async addToQueue(tokenAddress: string, updateData: TokenUpdateData['updateData']) {
    this.queue.set(tokenAddress, {
      tokenAddress,
      updateData,
      attempts: 0,
      lastAttempt: new Date()
    });

    this.saveQueueToFile();

    // Try immediate update
    await this.processUpdate(tokenAddress);
  }

  private async processUpdate(tokenAddress: string) {
    const updateData = this.queue.get(tokenAddress);
    if (!updateData) return;

    try {
      // Attempt to update the token
      await prisma.token.update({
        where: { address: tokenAddress },
        data: updateData.updateData
      });

      // If successful, remove from queue
      this.queue.delete(tokenAddress);
      this.saveQueueToFile();
      console.log(`Successfully updated token ${tokenAddress}`);
    } catch (error) {
      updateData.attempts += 1;
      updateData.lastAttempt = new Date();

      if (updateData.attempts >= this.MAX_ATTEMPTS) {
        console.log(`Max attempts reached for token ${tokenAddress}, removing from queue`);
        this.queue.delete(tokenAddress);
        this.saveQueueToFile();
        return;
      }

      this.queue.set(tokenAddress, updateData);
      this.saveQueueToFile();
      console.log(`Update failed for token ${tokenAddress}, attempt ${updateData.attempts}/${this.MAX_ATTEMPTS}`);
    }
  }

  async processQueue() {
    const now = new Date();
    for (const [tokenAddress, updateData] of this.queue.entries()) {
      const timeSinceLastAttempt = now.getTime() - updateData.lastAttempt.getTime();
      if (timeSinceLastAttempt >= this.RETRY_INTERVAL) {
        await this.processUpdate(tokenAddress);
      }
    }
  }

  getQueueStatus() {
    return {
      queueSize: this.queue.size,
      items: Array.from(this.queue.entries()).map(([address, data]) => ({
        tokenAddress: address,
        attempts: data.attempts,
        lastAttempt: data.lastAttempt,
        updateData: data.updateData
      }))
    };
  }
}

export const updateQueue = new UpdateQueue();

// Start the queue processor
setInterval(() => {
  updateQueue.processQueue();
}, 300000); // Check update queue every 5 minutes