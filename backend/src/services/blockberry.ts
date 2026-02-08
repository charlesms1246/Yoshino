/**
 * Blockberry API Service
 * Fetches transactions and packages from Blockberry
 */

import { CONFIG } from '../config.js';

const BLOCKBERRY_API_URL = 'https://api.blockberry.one';
const API_KEY = process.env.BLOCKBERRY_API_KEY || '';

export class BlockberryService {
  /**
   * Get all transactions for a package
   */
  async getPackageTransactions(packageId: string) {
    try {
      const response = await fetch(
        `${BLOCKBERRY_API_URL}/sui/v1/packages/${packageId}/transactions`,
        {
          headers: API_KEY ? { 'X-API-KEY': API_KEY } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`Blockberry API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching package transactions:', error);
      throw error;
    }
  }

  /**
   * Get package details
   */
  async getPackageById(packageId: string) {
    try {
      const response = await fetch(
        `${BLOCKBERRY_API_URL}/sui/v1/packages/${packageId}`,
        {
          headers: API_KEY ? { 'X-API-KEY': API_KEY } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`Blockberry API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching package details:', error);
      throw error;
    }
  }

  /**
   * Get object transactions by hash
   */
  async getObjectTransactions(objectId: string) {
    try {
      const response = await fetch(
        `${BLOCKBERRY_API_URL}/sui/v1/objects/${objectId}/transactions`,
        {
          headers: API_KEY ? { 'X-API-KEY': API_KEY } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`Blockberry API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching object transactions:', error);
      throw error;
    }
  }

  /**
   * Parse PTB deposit transactions and extract intent/order data
   */
  parseDepositTransactions(transactions: any[]): Array<{
    digest: string;
    sender: string;
    amount: string;
    timestamp: number;
    status: string;
  }> {
    const deposits = [];

    for (const tx of transactions) {
      try {
        // Check if this is a deposit transaction
        const data = tx.transaction?.data;
        if (!data?.transaction || data.transaction.kind !== 'ProgrammableTransaction') {
          continue;
        }

        const ptb = data.transaction;
        const transactions = ptb.transactions as any[];
        
        // Look for shielded_pool::deposit MoveCall
        const hasDeposit = transactions?.some((t: any) => {
          if (!t.MoveCall) return false;
          const call = t.MoveCall;
          return (
            call.package === CONFIG.sui.packageId &&
            call.module === 'shielded_pool' &&
            call.function === 'deposit'
          );
        });

        if (!hasDeposit) continue;

        // Extract amount from inputs
        const inputs = ptb.inputs || [];
        const amountInput = inputs.find((input: any) => 
          input.type === 'pure' && input.valueType === 'u64'
        );

        if (!amountInput?.value) continue;

        deposits.push({
          digest: tx.digest,
          sender: data.sender,
          amount: amountInput.value,
          timestamp: parseInt(tx.timestampMs || Date.now().toString()),
          status: tx.effects?.status?.status || 'unknown',
        });
      } catch (error) {
        console.error('Error parsing transaction:', error);
      }
    }

    return deposits;
  }
}

export const blockberryService = new BlockberryService();
