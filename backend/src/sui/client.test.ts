import { describe, it, expect } from 'vitest';
import { suiClient } from './client.js';

describe('YoshinoSuiClient', () => {
  it('should connect to Sui network', async () => {
    const client = suiClient.getClient();
    const chainId = await client.getChainIdentifier();
    expect(chainId).toBeDefined();
  });
  
  it('should have valid resolver address', () => {
    const address = suiClient.getAddress();
    expect(address).toMatch(/^0x[a-f0-9]+$/);
  });
  
  it('should fetch SolverCap object', async () => {
    const cap = await suiClient.getSolverCap();
    expect(cap.data).toBeDefined();
  });
});
