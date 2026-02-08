/**
 * DeepBook V3 Indexer API Client
 * Documentation: https://docs.sui.io/standards/deepbookv3-indexer
 */

const DEEPBOOK_INDEXER_URL = 'https://deepbook-indexer.testnet.mystenlabs.com';

export interface Trade {
  event_digest: string;
  digest: string;
  trade_id: string;
  maker_order_id: string;
  taker_order_id: string;
  maker_balance_manager_id: string;
  taker_balance_manager_id: string;
  price: number;
  base_volume: number;
  quote_volume: number;
  timestamp: number;
  type: 'buy' | 'sell';
  taker_is_bid: boolean;
  taker_fee: number;
  maker_fee: number;
  taker_fee_is_deep: boolean;
  maker_fee_is_deep: boolean;
}

export interface OrderBook {
  timestamp: string;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][];
}

export interface TickerData {
  last_price: number;
  base_volume: number;
  quote_volume: number;
  isFrozen: number;
}

export interface SummaryData {
  trading_pairs: string;
  last_price: number;
  lowest_ask: number;
  highest_bid: number;
  base_volume: number;
  quote_volume: number;
  price_change_percent_24h: number;
  high_price_24h: number;
  low_price_24h: number;
}

export type TickerMap = Record<string, TickerData>;
export type SummaryMap = Record<string, SummaryData>;

/**
 * Fetch recent trades for a pool
 */
export async function fetchTrades(
  poolName: string,
  options?: {
    limit?: number;
    startTime?: number;
    endTime?: number;
  }
): Promise<Trade[]> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.startTime) params.append('start_time', options.startTime.toString());
    if (options?.endTime) params.append('end_time', options.endTime.toString());

    const url = `${DEEPBOOK_INDEXER_URL}/trades/${poolName}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.warn(`DeepBook indexer returned ${response.status} for ${poolName}`);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Failed to fetch trades from DeepBook indexer:', error);
    return [];
  }
}

/**
 * Fetch order book (best bid/ask) for a pool
 */
export async function fetchOrderBook(
  poolName: string,
  options?: {
    level?: 1 | 2;
    depth?: number;
  }
): Promise<OrderBook> {
  try {
    const params = new URLSearchParams();
    if (options?.level) params.append('level', options.level.toString());
    if (options?.depth) params.append('depth', options.depth.toString());

    const url = `${DEEPBOOK_INDEXER_URL}/orderbook/${poolName}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.warn(`DeepBook indexer returned ${response.status} for ${poolName}`);
      return { timestamp: new Date().toISOString(), bids: [], asks: [] };
    }
    
    return response.json();
  } catch (error) {
    console.warn('Failed to fetch order book from DeepBook indexer:', error);
    return { timestamp: new Date().toISOString(), bids: [], asks: [] };
  }
}

/**
 * Fetch ticker data for all pools
 */
export async function fetchTicker(): Promise<TickerMap> {
  try {
    const url = `${DEEPBOOK_INDEXER_URL}/ticker`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.warn(`DeepBook indexer returned ${response.status}`);
      return {};
    }
    
    return response.json();
  } catch (error) {
    console.warn('Failed to fetch ticker from DeepBook indexer:', error);
    return {};
  }
}

/**
 * Fetch 24h summary for all pools
 */
export async function fetchSummary(): Promise<SummaryMap> {
  try {
    const url = `${DEEPBOOK_INDEXER_URL}/summary`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.warn(`DeepBook indexer returned ${response.status}`);
      // Return mock data for development
      return {
        'SUI_USDC': {
          trading_pairs: 'SUI_USDC',
          last_price: 1.7425,
          lowest_ask: 1.7450,
          highest_bid: 1.7400,
          base_volume: 14000000,
          quote_volume: 24500000,
          price_change_percent_24h: 2.4,
          high_price_24h: 1.7800,
          low_price_24h: 1.6900,
        }
      };
    }
    
    return response.json();
  } catch (error) {
    console.warn('Failed to fetch summary from DeepBook indexer:', error);
    // Return mock data for development
    return {
      'SUI_USDC': {
        trading_pairs: 'SUI_USDC',
        last_price: 1.7425,
        lowest_ask: 1.7450,
        highest_bid: 1.7400,
        base_volume: 14000000,
        quote_volume: 24500000,
        price_change_percent_24h: 2.4,
        high_price_24h: 1.7800,
        low_price_24h: 1.6900,
      }
    };
  }
}

/**
 * Get best bid and ask prices for a pool
 */
export async function getBestPrices(poolName: string): Promise<{
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
}> {
  try {
    const orderBook = await fetchOrderBook(poolName, { level: 1, depth: 1 });
    
    const bestBid = orderBook.bids.length > 0 ? parseFloat(orderBook.bids[0][0]) : null;
    const bestAsk = orderBook.asks.length > 0 ? parseFloat(orderBook.asks[0][0]) : null;
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
    
    return { bestBid, bestAsk, midPrice };
  } catch (error) {
    console.error('Failed to get best prices:', error);
    return { bestBid: null, bestAsk: null, midPrice: null };
  }
}

/**
 * Convert pool name to display format
 * Example: "SUI_USDC" -> "SUI/USDC"
 */
export function formatPoolName(poolName: string): string {
  return poolName.replace('_', '/');
}

/**
 * Format price change percentage
 */
export function formatPriceChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * Format volume in millions/thousands
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}
