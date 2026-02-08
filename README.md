# Yoshino - Protected Trading on Sui

**An intent-based privacy layer for DeFi that protects users from MEV and front-running through Sui Seal encryption and DeepBook V3 atomic settlement.**

## Problem

Public order books expose traders to:
- **MEV & Front-Running**: Bots exploit visible orders before execution
- **Information Leakage**: Large trades move markets before completion
- **Complexity**: Users must understand limit orders, slippage, gas optimization
- **Dust Orders**: Small trades are economically unviable due to gas fees

## Solution

Yoshino introduces a **Shielded Execution Layer**:
- **Intent-Based**: Users express *what* they want, not *how* to achieve it
- **Verifiable Privacy**: Sui Seal cryptographically enforces decryption policies
- **Optimistic Dark Pool**: Batch aggregation hides individual orders
- **Atomic Settlement**: Execute on DeepBook with guaranteed consistency

## Architecture

```
┌─────────────┐     Encrypted      ┌──────────────┐
│   User UI   │────Intent Blob────▶│   Resolver   │
│  (Next.js)  │                     │   Agent      │
└─────────────┘                     └──────┬───────┘
                                           │
                     ┌─────────────────────┘
                     │ Decrypt with SolverCap
                     ▼
              ┌──────────────┐
              │  Sui Seal    │
              │  Network     │
              └──────┬───────┘
                     │ Approved
                     ▼
              ┌──────────────┐      ┌─────────────┐
              │    Vault     │─────▶│  DeepBook   │
              │  Contract    │      │     V3      │
              └──────────────┘      └─────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Sui CLI
- Docker (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/yoshino.git
cd yoshino

# Install dependencies
npm install

# Deploy contracts (see DEPLOYMENT.md)
cd contracts
sui client publish --gas-budget 100000000

# Configure environment
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local
# Edit .env files with deployed addresses

# Start Resolver Agent
cd backend
npm install
npm run dev

# Start Frontend
cd web
npm install
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
Yoshino/
├── contracts/              # Sui Move smart contracts
│   ├── sources/
│   │   ├── vault.move             # Main vault contract [🔗](contracts/sources/vault.move)
│   │   ├── shielded_pool.move     # DeepBook integration [🔗](contracts/sources/shielded_pool.move)
│   │   ├── solver_cap.move        # Capability system [🔗](contracts/sources/solver_cap.move)
│   │   ├── seal_policy.move       # Sui Seal integration [🔗](contracts/sources/seal_policy.move)
│   │   ├── intent.move            # Intent structures [🔗](contracts/sources/intent.move)
│   │   └── events.move            # Event definitions [🔗](contracts/sources/events.move)
│   └── tests/                     # 54 passing tests [🔗](contracts/tests/)
├── backend/                # Resolver Agent (Hono.js)
│   ├── src/
│   │   ├── seal/          # Sui Seal client [🔗](backend/src/seal/client.ts)
│   │   ├── batch/         # Batch execution & queue [🔗](backend/src/batch/executor.ts)
│   │   ├── sui/           # Sui client wrapper [🔗](backend/src/sui/client.ts)
│   │   └── api/           # REST API endpoints [🔗](backend/src/api/)
├── web/                    # Dashboard (Next.js 16)
│   ├── app/
│   │   ├── components/
│   │   │   └── dashboard/ # Trading UI components [🔗](web/app/components/)
│   │   ├── console/       # Main trading interface [🔗](web/app/console/)
│   │   └── providers/     # Sui dApp Kit setup [🔗](web/src/app/providers.tsx)
│   └── lib/               # Utilities & configs [🔗](web/lib/sui-client.ts)
└── docs/                   # Documentation
```

## Key Features

### 1. Sui Seal Privacy
- Client-side encryption with on-chain policy enforcement
- Only SolverCap holder can decrypt intents
- Instant revocation via capability burn
- No centralized key custody

### 2. Hot Potato Pattern
- Borrowed funds MUST be returned in same transaction
- Mathematical guarantee against fund theft
- Enforced by Move type system
- Zero trust in Resolver required

### 3. Batch Aggregation
- Multiple users' intents combined into one trade
- Hides individual amounts and identities
- Shares gas costs across participants
- Supports TWAP and limit orders

### 4. DeepBook V3 Integration
- Leverages Sui's premier CLOB for liquidity
- BalanceManager for efficient contract trading
- Market and limit order support
- Atomic execution guarantees

### 5. Advanced Intent Features
- **TWAP Orders**: Split large trades to reduce slippage
- **Limit Orders**: Set price constraints
- **Time Expiry**: Auto-cancel after deadline
- **Partial Fills**: Accept incomplete execution

### 6. Live Market Data
- Real-time prices from DeepBook indexer
- 15-second auto-refresh
- Multi-pool support (SUI/USDC, SUI/CETUS, ETH/USDC)
- Price charts with recent trade history

## Sui SDK Integration

### Core Sui Components Used

| Component | Usage | Implementation |
|-----------|-------|----------------|
| **SuiClient** | Blockchain interaction | [`backend/src/sui/client.ts:15-25`](backend/src/sui/client.ts#L15-L25) |
| **Transaction Builder** | PTB construction | [`backend/src/batch/executor.ts:120-150`](backend/src/batch/executor.ts#L120-L150) |
| **Ed25519Keypair** | Resolver signing | [`backend/src/sui/client.ts:35-45`](backend/src/sui/client.ts#L35-L45) |
| **@mysten/dapp-kit** | Wallet connection | [`web/src/app/providers.tsx:20-40`](web/src/app/providers.tsx#L20-L40) |
| **useSuiClient** | Frontend queries | [`web/app/console/hooks/useBalance.ts:10-25`](web/app/console/hooks/useBalance.ts#L10-L25) |
| **ConnectButton** | Wallet UI | [`web/app/components/WalletConnection.tsx:15-30`](web/app/components/WalletConnection.tsx#L15-L30) |
| **@mysten/seal** | Privacy encryption | [`backend/src/seal/client.ts:30-60`](backend/src/seal/client.ts#L30-L60) |

### DeepBook V3 Integration Points

- **BalanceManager**: [`contracts/sources/shielded_pool.move:75-95`](contracts/sources/shielded_pool.move#L75-L95)
- **Pool Access**: [`contracts/sources/shielded_pool.move:120-140`](contracts/sources/shielded_pool.move#L120-L140)
- **Trade Execution**: [`backend/src/batch/executor.ts:180-220`](backend/src/batch/executor.ts#L180-L220)

### Move-Specific Patterns

- **Hot Potato**: [`contracts/sources/vault.move:90-110`](contracts/sources/vault.move#L90-L110)
- **Capability Pattern**: [`contracts/sources/solver_cap.move:25-45`](contracts/sources/solver_cap.move#L25-L45)
- **Event Emission**: [`contracts/sources/events.move:20-50`](contracts/sources/events.move#L20-L50)

## �🧪 Testing

```bash
# Run Move tests (54 tests)
cd contracts
sui move test

# Run backend tests
cd backend
npm test

# Type checking
npm run check
```

### Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| vault.move | 17 | ✅ Passing |
| shielded_pool.move | 9 | ✅ Passing |
| solver_cap.move | 9 | ✅ Passing |
| seal_policy.move | 12 | ✅ Passing |
| integration_tests.move | 7 | ✅ Passing |

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| Contract Tests | 54 passing |
| Move Modules | 6 core modules |
| Backend API | 3 endpoints |
| Frontend Components | 15+ components |
| DeepBook Pools | 4+ supported |
| Auto-refresh | 15 seconds |

## Roadmap

- [x] Phase 1: Smart Contract Development
- [x] Phase 2: Resolver Agent Backend
- [x] Phase 3: Integration & Testing
- [x] Phase 4a: Frontend Foundation
- [x] Phase 4b: Trading Features
- [x] Phase 4c: Advanced Intents (TWAP, Limits)
- [x] Phase 4d: Live Market Data Integration
- [x] Phase 5: Documentation
- [ ] Phase 6: ZK-Coprocessor Integration
- [ ] Phase 7: Decentralized Solver Network
- [ ] Phase 8: Cross-Chain Intents
