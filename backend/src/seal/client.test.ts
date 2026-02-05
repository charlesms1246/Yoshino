import { describe, it, expect, beforeEach } from 'vitest';
import { sealClient } from './client.js';

describe('SealClient', () => {
  it('should build valid SolverCap proof', async () => {
    // This will fail if SolverCap is not owned by resolver
    const result = await sealClient['buildSolverCapProof']();
    expect(result.signer).toBeDefined();
    expect(result.objectId).toBe(process.env.SOLVER_CAP_OBJECT_ID);
    expect(result.type).toBe('object-ownership');
  });
  
  it('should have valid Seal Network URL', () => {
    expect(sealClient['networkUrl']).toBeDefined();
    expect(sealClient['networkUrl']).toContain('seal');
  });
  
  // Integration test - requires actual encrypted data
  it.skip('should decrypt test intent', async () => {
    const testEncrypted = {
      encryptedData: 'test_encrypted_blob',
      policyModule: 'yoshino::seal_policy',
      policyFunction: 'seal_approve',
    };
    
    const result = await sealClient.decryptIntent(testEncrypted);
    expect(result.decryptedData).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });
  
  it.skip('should decrypt batch of intents', async () => {
    const requests = [
      {
        encryptedData: 'encrypted_blob_1',
        policyModule: 'yoshino::seal_policy',
        policyFunction: 'seal_approve',
      },
      {
        encryptedData: 'encrypted_blob_2',
        policyModule: 'yoshino::seal_policy',
        policyFunction: 'seal_approve',
      },
    ];
    
    const results = await sealClient.decryptBatch(requests);
    expect(results).toHaveLength(2);
    expect(results[0].decryptedData).toBeDefined();
    expect(results[1].decryptedData).toBeDefined();
  });
});
