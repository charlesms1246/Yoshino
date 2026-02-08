/**
 * Withdrawal API Endpoints
 * Allows resolver to process withdrawals from the shielded pool
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { suiClient } from '../sui/client.js';
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG } from '../config.js';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

/**
 * POST /api/withdraw/execute
 * Execute withdrawal transaction to return funds to user
 */
app.post('/execute', async (c) => {
  try {
    const { userAddress, amount, tokenType } = await c.req.json<{
      userAddress: string;
      amount: string; // in MIST
      tokenType?: string; // defaults to SUI
    }>();

    if (!userAddress || !userAddress.startsWith('0x')) {
      return c.json({ error: 'Invalid user address' }, 400);
    }

    if (!amount || BigInt(amount) <= 0) {
      return c.json({ error: 'Invalid withdrawal amount' }, 400);
    }

    const token = tokenType || '0x2::sui::SUI';
    const amountNumber = Number(amount);

    console.log(`💸 Processing withdrawal:`);
    console.log(`   User: ${userAddress}`);
    console.log(`   Amount: ${amount} MIST (${amountNumber / 1_000_000_000} SUI)`);
    console.log(`   Token: ${token}`);

    // Build withdrawal transaction
    const tx = new Transaction();

    // Call withdraw_to_user from shielded_pool
    tx.moveCall({
      target: `${CONFIG.sui.packageId}::shielded_pool::withdraw_to_user`,
      arguments: [
        tx.object(CONFIG.sui.solverCapId), // SolverCap
        tx.object(CONFIG.sui.stateId), // YoshinoState
        tx.pure.u64(amountNumber), // amount
        tx.pure.address(userAddress), // recipient
      ],
      typeArguments: [token],
    });

    // Execute transaction
    console.log('📤 Executing withdrawal transaction...');
    const result = await suiClient.signAndExecute(tx);

    if (result.effects?.status?.status === 'success') {
      console.log(`✅ Withdrawal successful!`);
      console.log(`   Digest: ${result.digest}`);

      return c.json({
        success: true,
        message: 'Withdrawal executed successfully',
        txDigest: result.digest,
        userAddress,
        amount,
        explorerUrl: `https://testnet.suivision.xyz/txblock/${result.digest}`,
      });
    } else {
      const error = result.effects?.status?.error || 'Transaction failed';
      console.error(`❌ Withdrawal failed:`, error);

      return c.json({
        success: false,
        error: 'Withdrawal transaction failed',
        details: error,
      }, 500);
    }
  } catch (error) {
    console.error('❌ Error processing withdrawal:', error);
    return c.json({
      success: false,
      error: 'Failed to process withdrawal',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/**
 * POST /api/withdraw/batch
 * Process multiple withdrawals in one transaction
 */
app.post('/batch', async (c) => {
  try {
    const { withdrawals } = await c.req.json<{
      withdrawals: Array<{
        userAddress: string;
        amount: string;
        tokenType?: string;
      }>;
    }>();

    if (!withdrawals || withdrawals.length === 0) {
      return c.json({ error: 'No withdrawals provided' }, 400);
    }

    console.log(`💸 Processing batch of ${withdrawals.length} withdrawals`);

    const tx = new Transaction();

    for (const withdrawal of withdrawals) {
      const token = withdrawal.tokenType || '0x2::sui::SUI';
      const amountNumber = Number(withdrawal.amount);

      console.log(`   → ${withdrawal.userAddress}: ${amountNumber / 1_000_000_000} SUI`);

      tx.moveCall({
        target: `${CONFIG.sui.packageId}::shielded_pool::withdraw_to_user`,
        arguments: [
          tx.object(CONFIG.sui.solverCapId),
          tx.object(CONFIG.sui.stateId),
          tx.pure.u64(amountNumber),
          tx.pure.address(withdrawal.userAddress),
        ],
        typeArguments: [token],
      });
    }

    console.log('📤 Executing batch withdrawal transaction...');
    const result = await suiClient.signAndExecute(tx);

    if (result.effects?.status?.status === 'success') {
      console.log(`✅ Batch withdrawal successful!`);
      console.log(`   Digest: ${result.digest}`);

      return c.json({
        success: true,
        message: `${withdrawals.length} withdrawals executed successfully`,
        txDigest: result.digest,
        count: withdrawals.length,
        explorerUrl: `https://testnet.suivision.xyz/txblock/${result.digest}`,
      });
    } else {
      const error = result.effects?.status?.error || 'Transaction failed';
      console.error(`❌ Batch withdrawal failed:`, error);

      return c.json({
        success: false,
        error: 'Batch withdrawal transaction failed',
        details: error,
      }, 500);
    }
  } catch (error) {
    console.error('❌ Error processing batch withdrawal:', error);
    return c.json({
      success: false,
      error: 'Failed to process batch withdrawal',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/**
 * GET /api/withdraw/user/:address
 * Check user's withdrawable balance
 */
app.get('/user/:address', async (c) => {
  try {
    const userAddress = c.req.param('address');

    if (!userAddress || !userAddress.startsWith('0x')) {
      return c.json({ error: 'Invalid user address' }, 400);
    }

    // Query user's balance from the contract
    // This would use a view function if available
    // For now, return stored data
    console.log(`📊 Checking withdrawable balance for: ${userAddress}`);

    return c.json({
      userAddress,
      message: 'Balance check - integrate with contract view function',
      // TODO: Query actual balance from contract
    });
  } catch (error) {
    console.error('Error checking balance:', error);
    return c.json({
      success: false,
      error: 'Failed to check balance',
    }, 500);
  }
});

export default app;
