// Pyth Network price feed integration for Sui Testnet
// Package: 0xf7114cc10266d90c0c9e4b84455bddf29b40bd78fe56832c7ac98682c3daa95b

import { SuiClient } from '@mysten/sui/client';

// Pyth price feed IDs (testnet)
export const PYTH_PRICE_FEEDS = {
  // SUI/USD
  SUI_USD: '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  // USDC/USD
  USDC_USD: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  // DEEP/USD (if available, placeholder for now)
  DEEP_USD: '0x0000000000000000000000000000000000000000000000000000000000000000',
} as const;

export const PYTH_PACKAGE = '0xf7114cc10266d90c0c9e4b84455bddf29b40bd78fe56832c7ac98682c3daa95b';
export const PYTH_STATE = '0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8';
export const HERMES_URL = 'https://hermes.pyth.network';

export interface HermesPriceUpdate {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

export interface PythPrice {
  price: number;
  conf: number;
  expo: number;
  publishTime: number;
}

export interface PriceFeedResult {
  price: number; // Human-readable price
  confidence: number;
  timestamp: number;
  raw: PythPrice;
}

/**
 * Fetch price from Pyth oracle for a given price feed ID
 */
export async function fetchPythPrice(
  client: SuiClient,
  priceFeedId: string
): Promise<PriceFeedResult | null> {
  try {
    // Get the price feed object
    const priceInfoObjectId = await getPriceInfoObjectId(client, priceFeedId);
    
    if (!priceInfoObjectId) {
      console.warn(`Price feed not found for ID: ${priceFeedId}`);
      return null;
    }

    // Fetch the price feed object
    const priceObject = await client.getObject({
      id: priceInfoObjectId,
      options: {
        showContent: true,
      },
    });

    if (!priceObject.data?.content || priceObject.data.content.dataType !== 'moveObject') {
      console.warn(`Invalid price feed object: ${priceInfoObjectId}`);
      return null;
    }

    const fields = priceObject.data.content.fields as any;
    
    // Extract price data
    const priceInfo = fields.price_info?.fields || fields;
    const priceData = priceInfo.price_feed?.fields?.price || priceInfo.price;
    
    if (!priceData) {
      console.warn(`No price data in object: ${priceInfoObjectId}`);
      return null;
    }

    const price = parseInt(priceData.fields?.price || priceData.price || '0');
    const conf = parseInt(priceData.fields?.conf || priceData.conf || '0');
    const expo = parseInt(priceData.fields?.expo || priceData.expo || '0');
    const publishTime = parseInt(priceInfo.timestamp || priceData.fields?.publish_time || priceData.publish_time || '0');

    // Convert to human-readable price
    const humanPrice = price * Math.pow(10, expo);
    const humanConf = conf * Math.pow(10, expo);

    return {
      price: humanPrice,
      confidence: humanConf,
      timestamp: publishTime,
      raw: { price, conf, expo, publishTime },
    };
  } catch (error) {
    console.error('Failed to fetch Pyth price:', error);
    return null;
  }
}

/**
 * Get the price info object ID for a given price feed ID
 */
async function getPriceInfoObjectId(
  client: SuiClient,
  priceFeedId: string
): Promise<string | null> {
  try {
    // Query for the PriceInfoObject associated with this feed ID
    // This is a simplified approach - in production, you'd maintain a mapping
    // For now, we'll use the PYTH_STATE to query dynamic fields
    
    const dynamicFields = await client.getDynamicFields({
      parentId: PYTH_STATE,
    });

    // Find the field that matches our price feed ID
    // This is a placeholder - actual implementation depends on Pyth's structure
    for (const field of dynamicFields.data) {
      // Check if this field corresponds to our price feed
      // The exact matching logic depends on Pyth's object structure
      if (field.name.value === priceFeedId) {
        return field.objectId;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get price info object ID:', error);
    return null;
  }
}

/**
 * Calculate price for a trading pair using Pyth feeds
 */
export async function fetchPairPrice(
  client: SuiClient,
  baseAsset: keyof typeof PYTH_PRICE_FEEDS,
  quoteAsset: keyof typeof PYTH_PRICE_FEEDS
): Promise<number | null> {
  try {
    const [basePrice, quotePrice] = await Promise.all([
      fetchPythPrice(client, PYTH_PRICE_FEEDS[baseAsset]),
      fetchPythPrice(client, PYTH_PRICE_FEEDS[quoteAsset]),
    ]);

    if (!basePrice || !quotePrice) {
      return null;
    }

    // Calculate pair price (e.g., SUI/USDC = SUI_USD / USDC_USD)
    return basePrice.price / quotePrice.price;
  } catch (error) {
    console.error('Failed to fetch pair price:', error);
    return null;
  }
}

/**
 * Get pool mapping to Pyth price feed pairs
 */
export function getPoolPythFeeds(poolName: string): { base: keyof typeof PYTH_PRICE_FEEDS; quote: keyof typeof PYTH_PRICE_FEEDS } | null {
  const mapping: Record<string, { base: keyof typeof PYTH_PRICE_FEEDS; quote: keyof typeof PYTH_PRICE_FEEDS }> = {
    'SUI_DBUSDC': { base: 'SUI_USD', quote: 'USDC_USD' },
    'DEEP_DBUSDC': { base: 'DEEP_USD', quote: 'USDC_USD' },
    'DEEP_SUI': { base: 'DEEP_USD', quote: 'SUI_USD' },
    'WAL_SUI': { base: 'SUI_USD', quote: 'SUI_USD' }, // Both use SUI as reference
  };

  return mapping[poolName] || null;
}

/**
 * Fetch real-time price for a pool using Pyth
 */
export async function fetchPoolPythPrice(
  client: SuiClient,
  poolName: string
): Promise<number | null> {
  const feeds = getPoolPythFeeds(poolName);
  
  if (!feeds) {
    console.warn(`No Pyth feeds configured for pool: ${poolName}`);
    return null;
  }

  return await fetchPairPrice(client, feeds.base, feeds.quote);
}

/**
 * Create SSE connection to Hermes for real-time price updates
 * Returns EventSource that emits parsed price updates
 */
export function createPriceStream(
  feedIds: string[],
  onUpdate: (updates: HermesPriceUpdate[]) => void,
  onError?: (error: Event) => void
): EventSource {
  const params = new URLSearchParams({
    parsed: 'true',
    encoding: 'hex'
  });

  feedIds.forEach(id => {
    params.append('ids[]', id);
  });

  const streamUrl = `${HERMES_URL}/v2/updates/price/stream?${params.toString()}`;
  const eventSource = new EventSource(streamUrl);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.parsed && Array.isArray(data.parsed)) {
        onUpdate(data.parsed);
      }
    } catch (error) {
      console.error('Error parsing Hermes SSE event:', error);
    }
  };

  eventSource.onerror = (error) => {
    // Silently handle connection errors - Hermes SSE may not be available in dev
    if (eventSource.readyState === EventSource.CLOSED) {
      console.warn('Hermes SSE connection closed, using fallback polling');
    }
    if (onError) onError(error);
  };

  return eventSource;
}

/**
 * Calculate actual price from Hermes price update
 */
export function calculatePrice(priceData: HermesPriceUpdate['price']): number {
  const price = Number(priceData.price);
  const expo = priceData.expo;
  return price * Math.pow(10, expo);
}

/**
 * Get feed IDs for a pool to stream
 */
export function getStreamFeedIds(poolName: string): string[] {
  const feeds = getPoolPythFeeds(poolName);
  if (!feeds) return [];
  
  const feedIds: string[] = [];
  if (PYTH_PRICE_FEEDS[feeds.base]) feedIds.push(PYTH_PRICE_FEEDS[feeds.base]);
  if (PYTH_PRICE_FEEDS[feeds.quote]) feedIds.push(PYTH_PRICE_FEEDS[feeds.quote]);
  
  return feedIds;
}
