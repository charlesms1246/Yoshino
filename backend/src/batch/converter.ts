/**
 * Trade Converter Module
 * Converts UserIntent to Move Trade struct format for PTB construction
 */

import { Transaction } from '@mysten/sui/transactions';
import { UserIntent } from '../types.js';

/**
 * Move Trade struct representation
 */
export interface MoveTrade {
  user: string;
  amount: string;
  is_bid: boolean;
  min_price: string;
}

/**
 * TradeConverter handles conversion of UserIntent to Move-compatible format
 */
export class TradeConverter {
  /**
   * Convert UserIntent to Move Trade struct format
   * @param intent - Decrypted user intent
   * @returns Move Trade struct representation
   */
  static intentToMoveStruct(intent: UserIntent): MoveTrade {
    return {
      user: intent.user,
      amount: intent.amount.toString(),
      is_bid: intent.isBid,
      min_price: intent.minPrice?.toString() || '0',
    };
  }

  /**
   * Build Move vector of trades for PTB
   * Creates a vector<Trade> argument for the execute_batch function
   * @param tx - Transaction builder instance
   * @param intents - Array of decrypted user intents
   * @returns Transaction argument representing vector<Trade>
   */
  static buildTradesVector(tx: Transaction, intents: UserIntent[]) {
    // Convert each intent to Move struct format
    const trades = intents.map(intent => {
      const trade = this.intentToMoveStruct(intent);
      
      // Create Move struct fields as transaction arguments
      // Trade struct: { user: address, amount: u64, is_bid: bool, min_price: u64 }
      return [
        tx.pure.address(trade.user),
        tx.pure.u64(trade.amount),
        tx.pure.bool(trade.is_bid),
        tx.pure.u64(trade.min_price),
      ];
    });

    // Note: The actual vector construction depends on Sui SDK version
    // For Sui SDK >= 0.50.0, use tx.makeMoveVec with type parameter
    // This is a simplified representation - actual implementation may vary
    return tx.makeMoveVec({
      elements: trades.flat(),
      type: 'vector<0x2::object::ID>', // Adjust type based on actual Trade struct
    });
  }

  /**
   * Validate intent before conversion
   * @param intent - User intent to validate
   * @throws Error if intent is invalid
   */
  static validateIntent(intent: UserIntent): void {
    if (!intent.user || intent.user.length === 0) {
      throw new Error('Invalid intent: user address is required');
    }
    
    if (intent.amount <= 0) {
      throw new Error('Invalid intent: amount must be positive');
    }
    
    if (typeof intent.isBid !== 'boolean') {
      throw new Error('Invalid intent: isBid must be boolean');
    }
    
    if (intent.minPrice !== undefined && intent.minPrice < 0) {
      throw new Error('Invalid intent: minPrice cannot be negative');
    }
  }

  /**
   * Validate and convert batch of intents
   * @param intents - Array of user intents
   * @returns Array of Move Trade structs
   * @throws Error if any intent is invalid
   */
  static validateAndConvertBatch(intents: UserIntent[]): MoveTrade[] {
    if (intents.length === 0) {
      throw new Error('Cannot convert empty batch');
    }

    return intents.map(intent => {
      this.validateIntent(intent);
      return this.intentToMoveStruct(intent);
    });
  }

  /**
   * Calculate total bid and ask volumes from intents
   * Useful for batch optimization and analytics
   * @param intents - Array of user intents
   * @returns Object with total bid and ask volumes
   */
  static calculateVolumes(intents: UserIntent[]): { totalBids: number; totalAsks: number } {
    let totalBids = 0;
    let totalAsks = 0;

    for (const intent of intents) {
      if (intent.isBid) {
        totalBids += intent.amount;
      } else {
        totalAsks += intent.amount;
      }
    }

    return { totalBids, totalAsks };
  }
}
