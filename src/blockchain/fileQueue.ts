// fileQueue.ts
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Constants
const QUEUE_BASE_DIR = path.join(__dirname, 'queue');
const QUEUE_DIR = path.join(QUEUE_BASE_DIR, 'event_queue');
const ERROR_DIR = path.join(QUEUE_BASE_DIR, 'error_queue');
const DLQ_DIR = path.join(QUEUE_BASE_DIR, 'dead_letter_queue');
const MAX_RETRIES = 3;
const INTEGRITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STUCK_EVENT_THRESHOLD = 30 * 60 * 1000; // 30 minutes

// Interface for queued events
interface QueuedEvent {
  id: string;
  type: string;
  data: any;
  retries?: number;
  lastAttempt?: number;
}

export class FileQueue {
  private processing: boolean = false;

  // Define event priority (lower number = higher priority)
  private static EVENT_PRIORITY: { [key: string]: number } = {
    'TokenCreated': 1,
    'TokensBought': 2,
    'LiquidityAdded': 3,
    'TokensSold': 4,
  };

  // Private constructor to prevent direct instantiation
  private constructor() {
    this.ensureDirectories();
    this.startIntegrityChecks();
  }

  // Static method to get the singleton instance
  private static instance: FileQueue;

  public static getInstance(): FileQueue {
    if (!FileQueue.instance) {
      FileQueue.instance = new FileQueue();
    }
    return FileQueue.instance;
  }

  private async ensureDirectories() {
    await fs.mkdir(QUEUE_BASE_DIR, { recursive: true });
    await fs.mkdir(QUEUE_DIR, { recursive: true });
    await fs.mkdir(ERROR_DIR, { recursive: true });
    await fs.mkdir(DLQ_DIR, { recursive: true });
  }

  // Custom replacer function for JSON.stringify
  private jsonReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
      return {
        type: 'bigint',
        value: value.toString()
      };
    }
    return value;
  }

  private jsonReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.type === 'bigint') {
      try {
        return BigInt(value.value);
      } catch (error) {
        console.error(`Failed to convert ${value.value} to BigInt:`, error);
        return value.value; // Return the original string value if conversion fails
      }
    } else if (typeof value === 'string' && /^\d+n$/.test(value)) {
      // Handle strings ending with 'n' as BigInt values
      try {
        return BigInt(value.slice(0, -1));
      } catch (error) {
        console.error(`Failed to convert ${value} to BigInt:`, error);
        return value;
      }
    }
    return value;
  }

  async enqueue(type: string, data: any): Promise<void> {
    const event: QueuedEvent = { id: uuidv4(), type, data, retries: 0 };
    const filePath = path.join(QUEUE_DIR, `${event.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(event, this.jsonReplacer));
  }

  async processQueue(processEvent: (type: string, data: any) => Promise<void>): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const files = await fs.readdir(QUEUE_DIR);
      
      // Map files to their event types
      const fileEvents = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(QUEUE_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          try {
            const event: QueuedEvent = JSON.parse(content, this.jsonReviver);
            return { file, filePath, type: event.type };
          } catch (error) {
            console.error(`Error parsing JSON for file ${file}:`, error);
            return { file, filePath, type: 'unknown' };
          }
        })
      );

      // Sort files based on priority
      fileEvents.sort((a, b) => {
        const priorityA = FileQueue.EVENT_PRIORITY[a.type] || 100; // Default low priority
        const priorityB = FileQueue.EVENT_PRIORITY[b.type] || 100;
        return priorityA - priorityB;
      });

      for (const { file, filePath, type } of fileEvents) {
        const content = await fs.readFile(filePath, 'utf-8');

        console.log(`Processing file ${file}, type: ${type}, content:`, content); // Debug log

        try {
          const event: QueuedEvent = JSON.parse(content, this.jsonReviver);
          await processEvent(event.type, event.data);
          await fs.unlink(filePath);
          console.log(`Successfully processed and removed file ${file}`);
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
          // Read the file content without the custom reviver for debugging
          let rawEvent;
          try {
            rawEvent = JSON.parse(content);
          } catch (parseError) {
            console.error(`Failed to parse event data for file ${file}:`, parseError);
            rawEvent = { id: 'unknown', type: 'unknown', data: {} };
          }
          await this.handleFailedEvent(rawEvent, filePath);
        }
      }

      await this.processRetryQueue(processEvent);
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.processing = false;
    }
  }

  private async handleFailedEvent(event: QueuedEvent, filePath: string): Promise<void> {
    event.retries = (event.retries || 0) + 1;
    event.lastAttempt = Date.now();

    if (event.retries < MAX_RETRIES) {
      // Move to error queue for retry
      const errorPath = path.join(ERROR_DIR, path.basename(filePath));
      await fs.writeFile(errorPath, JSON.stringify(event, this.jsonReplacer));
    } else {
      // Move to dead letter queue
      const dlqPath = path.join(DLQ_DIR, path.basename(filePath));
      await fs.writeFile(dlqPath, JSON.stringify(event, this.jsonReplacer));
      console.error(`Event ${event.id} exceeded max retries. Moved to dead letter queue.`);
    }
    await fs.unlink(filePath);
  }

  private async processRetryQueue(processEvent: (type: string, data: any) => Promise<void>): Promise<void> {
    const files = await fs.readdir(ERROR_DIR);
    for (const file of files) {
      const filePath = path.join(ERROR_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const event: QueuedEvent = JSON.parse(content, this.jsonReviver);

      if (Date.now() - (event.lastAttempt || 0) > this.getRetryDelay(event.retries || 0)) {
        try {
          await processEvent(event.type, event.data);
          await fs.unlink(filePath);
          console.log(`Successfully retried and processed event ${event.id}`);
        } catch (error) {
          console.error(`Error retrying event ${event.id}:`, error);
          await this.handleFailedEvent(event, filePath);
        }
      }
    }
  }

  private getRetryDelay(retries: number): number {
    return Math.pow(2, retries) * 1000; // Exponential backoff
  }

  private startIntegrityChecks(): void {
    setInterval(() => this.performIntegrityCheck(), INTEGRITY_CHECK_INTERVAL);
  }

  private async performIntegrityCheck(): Promise<void> {
    console.log('Performing integrity check...');
    try {
      const queueFiles = await fs.readdir(QUEUE_DIR);
      const errorFiles = await fs.readdir(ERROR_DIR);
      const dlqFiles = await fs.readdir(DLQ_DIR);

      // Check for stuck events in the main queue
      for (const file of queueFiles) {
        const filePath = path.join(QUEUE_DIR, file);
        const stats = await fs.stat(filePath);
        const ageInMs = Date.now() - stats.birthtimeMs;
        
        if (ageInMs > STUCK_EVENT_THRESHOLD) {
          console.warn(`Potential stuck event in main queue: ${file}`);
          await this.handleStuckEvent(filePath);
        }
      }

      // Check for events in error queue that haven't been retried
      for (const file of errorFiles) {
        const filePath = path.join(ERROR_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const event: QueuedEvent = JSON.parse(content, this.jsonReviver);
        
        if (!event.lastAttempt || Date.now() - event.lastAttempt > 30 * 60 * 1000) { // 30 minutes
          console.warn(`Event in error queue hasn't been retried: ${file}`);
          // Optionally, force a retry or take other actions
        }
      }

      console.log(`Number of items in Dead Letter Queue: ${dlqFiles.length}`);

      console.log('Integrity check completed.');
    } catch (error) {
      console.error('Error during integrity check:', error);
    }
  }

  private async handleStuckEvent(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const event: QueuedEvent = JSON.parse(content, this.jsonReviver);

      // Increment retry count
      event.retries = (event.retries || 0) + 1;
      event.lastAttempt = Date.now();

      if (event.retries < MAX_RETRIES) {
        // Move to error queue for retry
        const errorPath = path.join(ERROR_DIR, path.basename(filePath));
        await fs.writeFile(errorPath, JSON.stringify(event, this.jsonReplacer));
        console.log(`Moved stuck event ${event.id} to error queue for retry.`);
      } else {
        // Move to dead letter queue
        const dlqPath = path.join(DLQ_DIR, path.basename(filePath));
        await fs.writeFile(dlqPath, JSON.stringify(event, this.jsonReplacer));
        console.error(`Event ${event.id} exceeded max retries. Moved to dead letter queue.`);
      }

      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Error handling stuck event ${path.basename(filePath)}:`, error);
    }
  }

  // Dead Letter Queue Operations
  async listDeadLetterQueue(): Promise<QueuedEvent[]> {
    const files = await fs.readdir(DLQ_DIR);
    const events: QueuedEvent[] = [];
    for (const file of files) {
      const filePath = path.join(DLQ_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      events.push(JSON.parse(content, this.jsonReviver));
    }
    return events;
  }

  async reprocessDeadLetterQueueItem(id: string): Promise<boolean> {
    const filePath = path.join(DLQ_DIR, `${id}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const event: QueuedEvent = JSON.parse(content, this.jsonReviver);
      
      // Reset retry count and move back to main queue
      event.retries = 0;
      event.lastAttempt = undefined;
      await this.enqueue(event.type, event.data);
      
      // Remove from DLQ
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error reprocessing DLQ item ${id}:`, error);
      return false;
    }
  }

  async deleteDeadLetterQueueItem(id: string): Promise<boolean> {
    const filePath = path.join(DLQ_DIR, `${id}.json`);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting DLQ item ${id}:`, error);
      return false;
    }
  }

  // Utility method to get queue statistics
  async getQueueStats(): Promise<{ main: number, error: number, dlq: number }> {
    const [mainFiles, errorFiles, dlqFiles] = await Promise.all([
      fs.readdir(QUEUE_DIR),
      fs.readdir(ERROR_DIR),
      fs.readdir(DLQ_DIR)
    ]);

    return {
      main: mainFiles.length,
      error: errorFiles.length,
      dlq: dlqFiles.length
    };
  }

  // Manual trigger for integrity check
  async runManualIntegrityCheck(): Promise<void> {
    await this.performIntegrityCheck();
  }
}

// Export the singleton instance
export const fileQueue = FileQueue.getInstance();