export const CONTRACTS = {
  PACKAGE_ID: process.env.NEXT_PUBLIC_PACKAGE_ID || '0xea4d586ac0d5acd3a6a127d5acde57f7ba57f15a9fb1b0fde588b2f2da9655ef',
  YOSHINO_STATE: process.env.NEXT_PUBLIC_YOSHINO_STATE || '0x78ab5d0ff249219beacdd81163613cc6dc0e20d6c0e987c3336856f0a003dc08',
  ADMIN_CAP: process.env.NEXT_PUBLIC_ADMIN_CAP || '0x1f168fce2f78551567e9d82f20568d6985454a91ccd07c314e8c3bbcf0de8d7d',
  SOLVER_CAP: process.env.NEXT_PUBLIC_SOLVER_CAP || '0xb7504d028188b766c5c057247e266e46aed22d6ba6bb26742a1aba5759102e6c',
  BALANCE_MANAGER: process.env.NEXT_PUBLIC_BALANCE_MANAGER || '0x86f9be144fb0c76d15c187c0db5cb97d9e08c722cddaa5d97923248c5b84740a',
  RESOLVER_API_URL: process.env.NEXT_PUBLIC_RESOLVER_API_URL || 'http://localhost:3000',
} as const;

export const ASSET_TYPES = {
  SUI: '0x2::sui::SUI',
  DBUSDC: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC', // DeepBook USDC on testnet
} as const;

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'localnet' | 'testnet' | 'mainnet';
