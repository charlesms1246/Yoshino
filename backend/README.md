# Yoshino Resolver Agent

Backend service for the Yoshino privacy layer. Decrypts user intents and executes batched trades on Sui.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
vim .env

# Type check
npm run check

# Start development server
npm run dev

# Run tests
npm test
```

## Environment Setup

Required variables in `.env`:

```env
# Sui Network
SUI_NETWORK=localnet
SUI_RPC_URL=http://127.0.0.1:9000

# Deployed Contract IDs
VAULT_BASE_PACKAGE_ID=0x...
SOLVER_CAP_OBJECT_ID=0x...

# Resolver Credentials
RESOLVER_PRIVATE_KEY=suiprivkey...

# Optional
PORT=3000
SEAL_NETWORK_URL=https://seal-testnet.sui.io
```

## API Endpoints

### Health & Status

#### `GET /`
Health check and service info.

**Response:**
```json
{
  "service": "Yoshino Resolver Agent",
  "status": "running",
  "network": "localnet",
  "resolverAddress": "0x..."
}
```

---

#### `GET /status`
Verify SolverCap and configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "solverCapId": "0x...",
    "solverCapExists": true,
    "resolverAddress": "0x..."
  }
}
```

---

### Intent Management (Phase 2b)

#### `POST /api/intents/submit`
Submit encrypted intent to queue.

**Request Body:**
```json
{
  "user": "0x...",
  "encryptedData": "base64_encrypted_blob"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Intent queued for execution",
    "queuePosition": 5
  }
}
```

---

#### `GET /api/intents/queue`
Get current queue status.

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingIntents": 7,
    "nextExecution": 1738876543210,
    "readyForBatch": false
  }
}
```

---

#### `GET /api/intents/queue/details`
Get detailed queue information (debugging).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIntents": 3,
    "intents": [
      {
        "user": "0xabc...",
        "status": "pending",
        "createdAt": 1738876500000
      }
    ]
  }
}
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts          # Hono server
│   ├── config.ts         # Configuration
│   ├── types.ts          # TypeScript types
│   ├── sui/
│   │   ├── client.ts     # Sui client wrapper
│   │   └── client.test.ts
│   ├── seal/             # Sui Seal integration (Phase 2b) ✅
│   │   ├── client.ts     # Seal SDK wrapper
│   │   └── client.test.ts
│   ├── batch/            # Batch processing (Phase 2b) ✅
│   │   ├── decoder.ts    # Intent decryption
│   │   └── queue.ts      # Queue management
│   └── api/              # API routes (Phase 2b) ✅
│       └── intents.ts    # Intent endpoints
├── .env.example
├── tsconfig.json
└── package.json
```

## Development

```bash
# Watch mode (hot reload)
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Run production build
npm start
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch
```

Tests require:
- Running Sui localnet
- DPHASE_2B_COMPLETE.md](../PHASE_2B_COMPLETE.md) - Phase 2b details
- [STRUCTURE.md](STRUCTURE.md) - Backend architecture
- [CONTEXT.md](../CONTEXT.md) - Full project context
- [AGENTS.md](../AGENTS.md) - Agent hierarchy

## Current Status

**Phase 2a:** ✅ Complete  
**Phase 2b:** ✅ Complete (Sui Seal integration)  
**Phase 2c:** 🚧 Next (PTB construc

## Current Status

**Phase 2a:** ✅ Complete  
**Phase 2b:** 🚧 In Progress (Sui Seal integration)

## License

MIT
