import { Hono } from 'hono';
import { intentQueue } from '../batch/queue.js';
import { EncryptedIntent, ApiResponse } from '../types.js';

const app = new Hono();

/**
 * Submit encrypted intent to queue
 */
app.post('/submit', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validate required fields
    if (!body.user || !body.encryptedData) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: user, encryptedData',
      };
      return c.json(response, 400);
    }
    
    const encryptedIntent: EncryptedIntent = {
      user: body.user,
      encryptedData: body.encryptedData,
      createdAt: Date.now(),
      status: 'pending',
    };
    
    // Add to queue for batching
    await intentQueue.add(encryptedIntent);
    
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Intent queued for execution',
        queuePosition: intentQueue.size(),
      },
    };
    
    return c.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message,
    };
    return c.json(response, 400);
  }
});

/**
 * Get queue status
 */
app.get('/queue', (c) => {
  const allIntents = intentQueue.getAll();
  
  const response = {
    pendingIntents: intentQueue.size(),
    totalIntents: allIntents.length,
    nextExecution: intentQueue.getNextExecutionTime(),
    readyForBatch: intentQueue.isReadyForBatch(),
    intents: allIntents.map(intent => ({
      user: intent.user,
      status: intent.status,
      createdAt: intent.createdAt,
    })),
  };
  
  return c.json(response);
});

/**
 * Get queue details (for debugging)
 */
app.get('/queue/details', (c) => {
  const allIntents = intentQueue.getAll();
  
  const response: ApiResponse = {
    success: true,
    data: {
      totalIntents: allIntents.length,
      intents: allIntents.map(intent => ({
        user: intent.user,
        status: intent.status,
        createdAt: intent.createdAt,
      })),
    },
  };
  
  return c.json(response);
});

export default app;
