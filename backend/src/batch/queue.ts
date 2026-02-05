import { EncryptedIntent } from '../types.js';

/**
 * Simple in-memory queue for encrypted intents
 * TODO: Replace with Redis or persistent storage in production
 */
export class IntentQueue {
  private queue: EncryptedIntent[] = [];
  private batchSize: number = 10;
  private batchInterval: number = 5000; // 5 seconds
  private nextExecutionTime: number = Date.now() + this.batchInterval;
  
  /**
   * Add encrypted intent to queue
   */
  async add(intent: EncryptedIntent): Promise<void> {
    this.queue.push(intent);
    console.log(`Intent queued from ${intent.user}. Queue size: ${this.queue.length}`);
  }
  
  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }
  
  /**
   * Get next scheduled execution time
   */
  getNextExecutionTime(): number {
    return this.nextExecutionTime;
  }
  
  /**
   * Get all pending intents (up to batch size)
   */
  getPending(): EncryptedIntent[] {
    return this.queue.slice(0, this.batchSize);
  }
  
  /**
   * Remove executed intents from queue
   */
  removeExecuted(count: number): void {
    this.queue.splice(0, count);
    this.nextExecutionTime = Date.now() + this.batchInterval;
  }
  
  /**
   * Check if queue is ready for batch execution
   */
  isReadyForBatch(): boolean {
    return this.queue.length >= this.batchSize || 
           (this.queue.length > 0 && Date.now() >= this.nextExecutionTime);
  }
  
  /**
   * Get all intents (for testing)
   */
  getAll(): EncryptedIntent[] {
    return [...this.queue];
  }
  
  /**
   * Clear queue (for testing)
   */
  clear(): void {
    this.queue = [];
  }
}

// Singleton instance
export const intentQueue = new IntentQueue();
