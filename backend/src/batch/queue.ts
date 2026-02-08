import { EncryptedIntent } from '../types.js';
import { intentDecoder } from './decoder.js';
import { batchExecutor } from './executor.js';
import { CONFIG } from '../config.js';

/**
 * In-memory queue for encrypted intents with automated batch execution
 * TODO: Replace with Redis or persistent storage in production
 */
export class IntentQueue {
  private queue: EncryptedIntent[] = [];
  private batchSize: number = CONFIG.batch.size;
  private batchInterval: number = CONFIG.batch.intervalMs;
  private nextExecutionTime: number = Date.now() + this.batchInterval;
  private executing: boolean = false;
  private batchLoopInterval?: NodeJS.Timeout;

  constructor() {
    // Start automatic batch execution loop
    this.startBatchLoop();
  }
  
  /**
   * Add encrypted intent to queue
   * Triggers immediate execution if batch is full
   */
  async add(intent: EncryptedIntent): Promise<void> {
    this.queue.push(intent);
    console.log(`📥 Intent queued from ${intent.user}. Queue size: ${this.queue.length}`);
    
    // Execute immediately if batch is full
    if (this.queue.length >= this.batchSize && !this.executing) {
      await this.executeBatch();
    }
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

  /**
   * Execute batch from queue
   * Decrypts intents, filters expired/invalid, and executes on-chain
   */
  private async executeBatch(): Promise<void> {
    if (this.executing || this.queue.length === 0) {
      return;
    }

    this.executing = true;

    try {
      // Take batch from queue
      const batch = this.queue.splice(0, this.batchSize);
      console.log(`\n🔓 Processing batch of ${batch.length} intents...`);

      // Decrypt all intents
      const decryptedIntents = await intentDecoder.decryptBatch(batch);
      console.log(`✅ Decrypted ${decryptedIntents.length} intents`);

      // Filter expired intents
      const now = Date.now();
      const validIntents = decryptedIntents.filter(intent => {
        if (now > intent.expires_at) {
          console.log(`⏱️  Intent from ${intent.user} expired at ${new Date(intent.expires_at).toISOString()}`);
          return false;
        }
        return true;
      });

      if (validIntents.length === 0) {
        console.log('⚠️  No valid intents after filtering expired');
        return;
      }

      console.log(`✅ ${validIntents.length} valid intents after expiry filter`);

      // TODO: Check limit prices against DeepBook market price
      // For now, pass all valid intents to executor
      // The executor will handle limit price validation

      // Execute on-chain
      const result = await batchExecutor.executeBatch(validIntents);
      console.log(`✅ Batch executed: ${result.txDigest}`);
      console.log(`   Total volume: ${result.totalVolume}`);
      console.log(`   Executed at: ${new Date(result.executedAt).toISOString()}\n`);

      // Update next execution time
      this.nextExecutionTime = Date.now() + this.batchInterval;
    } catch (error) {
      console.error('❌ Batch execution failed:', error);
      // Re-queue failed intents (optional, could implement retry logic)
      // For now, they are discarded and need to be resubmitted
    } finally {
      this.executing = false;
    }
  }

  /**
   * Start periodic batch execution loop
   */
  private startBatchLoop(): void {
    this.batchLoopInterval = setInterval(async () => {
      if (this.isReadyForBatch()) {
        await this.executeBatch();
      }
    }, this.batchInterval);

    console.log(`⏰ Batch execution loop started (size: ${this.batchSize}, interval: ${this.batchInterval}ms)`);
  }

  /**
   * Stop batch execution loop (for graceful shutdown)
   */
  stopBatchLoop(): void {
    if (this.batchLoopInterval) {
      clearInterval(this.batchLoopInterval);
      console.log('⏸️  Batch execution loop stopped');
    }
  }
}

// Singleton instance
export const intentQueue = new IntentQueue();
