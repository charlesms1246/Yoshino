import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CONFIG, validateConfig } from './config.js';
import { suiClient } from './sui/client.js';

// Validate config on startup
validateConfig();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Yoshino Resolver Agent',
    status: 'running',
    network: CONFIG.sui.network,
    resolverAddress: suiClient.getAddress(),
  });
});

// Status endpoint
app.get('/status', async (c) => {
  try {
    const solverCap = await suiClient.getSolverCap();
    
    return c.json({
      success: true,
      data: {
        solverCapId: CONFIG.sui.solverCapId,
        solverCapExists: !!solverCap.data,
        resolverAddress: suiClient.getAddress(),
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: (error as Error).message,
    }, 500);
  }
});

// Intent submission endpoint (placeholder)
app.post('/api/intents/submit', async (c) => {
  return c.json({
    success: false,
    error: 'Not implemented yet',
  }, 501);
});

// Start server
const port = CONFIG.resolver.port;
console.log(`🚀 Resolver Agent starting on port ${port}`);
console.log(`📍 Network: ${CONFIG.sui.network}`);
console.log(`🔑 Resolver Address: ${suiClient.getAddress()}`);

export default {
  port,
  fetch: app.fetch,
};
