/**
 * Intent Storage Service
 * Stores user intents with Sui Seal encryption
 */

export interface StoredIntent {
  id: string;
  user: string;
  type: 'swap' | 'limit';
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  limit_price?: string;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  submitted_at: number;
  executed_at?: number;
  tx_digest?: string;
}

export interface UserData {
  address: string;
  total_deposited: string; // in MIST
  intents: StoredIntent[];
  last_updated: number;
}

// In-memory storage (for production, use database)
const userDataStore = new Map<string, UserData>();

/**
 * Get user data by wallet address
 */
export function getUserData(address: string): UserData | null {
  const normalizedAddress = address.toLowerCase();
  return userDataStore.get(normalizedAddress) || null;
}

/**
 * Save or update user data
 */
export function saveUserData(data: UserData): void {
  const normalizedAddress = data.address.toLowerCase();
  userDataStore.set(normalizedAddress, {
    ...data,
    last_updated: Date.now(),
  });
}

/**
 * Add intent to user's history
 */
export function addUserIntent(address: string, intent: StoredIntent): void {
  const normalizedAddress = address.toLowerCase();
  let userData = userDataStore.get(normalizedAddress);
  
  if (!userData) {
    userData = {
      address: normalizedAddress,
      total_deposited: '0',
      intents: [],
      last_updated: Date.now(),
    };
  }
  
  userData.intents.push(intent);
  userData.last_updated = Date.now();
  userDataStore.set(normalizedAddress, userData);
}

/**
 * Update intent status
 */
export function updateIntentStatus(
  address: string, 
  intentId: string, 
  status: StoredIntent['status'],
  txDigest?: string
): boolean {
  const normalizedAddress = address.toLowerCase();
  const userData = userDataStore.get(normalizedAddress);
  
  if (!userData) return false;
  
  const intent = userData.intents.find(i => i.id === intentId);
  if (!intent) return false;
  
  intent.status = status;
  if (txDigest) intent.tx_digest = txDigest;
  if (status === 'executed') intent.executed_at = Date.now();
  
  userData.last_updated = Date.now();
  userDataStore.set(normalizedAddress, userData);
  
  return true;
}

/**
 * Track user deposit
 */
export function trackDeposit(address: string, amount: string): void {
  const normalizedAddress = address.toLowerCase();
  let userData = userDataStore.get(normalizedAddress);
  
  if (!userData) {
    userData = {
      address: normalizedAddress,
      total_deposited: '0',
      intents: [],
      last_updated: Date.now(),
    };
  }
  
  const currentDeposit = BigInt(userData.total_deposited);
  const newDeposit = currentDeposit + BigInt(amount);
  userData.total_deposited = newDeposit.toString();
  userData.last_updated = Date.now();
  
  userDataStore.set(normalizedAddress, userData);
}

/**
 * Get all stored addresses (for debugging)
 */
export function getAllAddresses(): string[] {
  return Array.from(userDataStore.keys());
}

/**
 * Clear all data (for testing)
 */
export function clearAllData(): void {
  userDataStore.clear();
}
