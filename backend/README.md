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

### `GET /`
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

### `GET /status`
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

### `POST /api/intents/submit`
Submit encrypted intent (coming in Phase 2b).

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
│   ├── seal/             # Sui Seal integration (Phase 2b)
│   ├── batch/            # Batch aggregation (Phase 2c)
│   └── api/              # API routes (Phase 2d)
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
- Deployed contracts with valid SolverCap

## Documentation

- [PHASE_2A_COMPLETE.md](../PHASE_2A_COMPLETE.md) - Phase 2a details
- [CONTEXT.md](../CONTEXT.md) - Full project context
- [AGENTS.md](../AGENTS.md) - Agent hierarchy

## Current Status

**Phase 2a:** ✅ Complete  
**Phase 2b:** 🚧 In Progress (Sui Seal integration)

## License

MIT
