#!/bin/bash
set -e

echo "🚀 Yoshino Testnet Deployment Script"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo -e "${RED}❌ Sui CLI not found${NC}"
    echo "   Install from: https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
fi

# Check if jq is installed (for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq not found${NC}"
    echo "   Install with: sudo apt install jq"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites met${NC}"
echo ""

# Verify we're on testnet
ACTIVE_ENV=$(sui client active-env)
if [ "$ACTIVE_ENV" != "testnet" ]; then
    echo -e "${YELLOW}⚠️  Current environment: $ACTIVE_ENV${NC}"
    echo "   Switching to testnet..."
    sui client switch --env testnet
fi

echo -e "${BLUE}📍 Active environment: testnet${NC}"
echo ""

# Check gas balance
echo "💰 Checking gas balance..."
GAS_BALANCE=$(sui client gas --json | jq '[.[] | .mistBalance] | add')
SUI_BALANCE=$(echo "scale=2; $GAS_BALANCE / 1000000000" | bc)
echo -e "${GREEN}   Balance: ${SUI_BALANCE} SUI${NC}"

if (( $(echo "$SUI_BALANCE < 0.5" | bc -l) )); then
    echo -e "${RED}❌ Insufficient balance for deployment${NC}"
    echo "   Request testnet SUI from: https://discord.com/channels/916379725201563759/971488439931392130"
    exit 1
fi

echo ""

# Step 1: Build contracts
echo "1️⃣  Building Move contracts..."
cd contracts

sui move build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Contracts built successfully${NC}"
else
    echo -e "${RED}   ❌ Build failed${NC}"
    exit 1
fi

echo ""

# Step 2: Deploy contracts to testnet
echo "2️⃣  Deploying contracts to Sui testnet..."
echo "   This may take 30-60 seconds..."
echo ""

PUBLISH_OUTPUT=$(sui client publish --gas-budget 500000000 --json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Contracts published successfully${NC}"
else
    echo -e "${RED}   ❌ Deployment failed${NC}"
    echo "$PUBLISH_OUTPUT"
    exit 1
fi

echo ""

# Step 3: Parse contract addresses
echo "3️⃣  Extracting contract addresses..."

# Package ID
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.type=="published") | .packageId')
echo -e "${BLUE}   Package ID: $PACKAGE_ID${NC}"

# Shielded Pool (shared object)
SHIELDED_POOL_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("::shielded_pool::ShieldedPool")) | .objectId')
if [ -z "$SHIELDED_POOL_ID" ] || [ "$SHIELDED_POOL_ID" == "null" ]; then
    echo -e "${YELLOW}   ⚠️  ShieldedPool not found as shared object${NC}"
    echo "   Looking for created objects..."
    SHIELDED_POOL_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.type=="created" and (.objectType | contains("ShieldedPool"))) | .objectId')
fi
echo -e "${BLUE}   Shielded Pool: $SHIELDED_POOL_ID${NC}"

# Solver Admin (owned object)
SOLVER_ADMIN_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("::solver_cap::SolverAdmin")) | .objectId')
echo -e "${BLUE}   Solver Admin: $SOLVER_ADMIN_ID${NC}"

# Transaction digest for reference
TX_DIGEST=$(echo "$PUBLISH_OUTPUT" | jq -r '.digest')
echo -e "${BLUE}   Transaction: $TX_DIGEST${NC}"
echo ""

# Verify essential addresses exist
if [ -z "$PACKAGE_ID" ] || [ "$PACKAGE_ID" == "null" ]; then
    echo -e "${RED}❌ Failed to extract Package ID${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract addresses extracted${NC}"
echo ""

# Step 4: Create SolverCap (needed for resolver)
echo "4️⃣  Creating SolverCap for resolver..."

# We need to call create_solver_cap to get the capability
# This requires the SolverAdmin object we just created
SOLVER_CAP_TX=$(sui client call \
    --package "$PACKAGE_ID" \
    --module solver_cap \
    --function create_solver_cap \
    --args "$SOLVER_ADMIN_ID" \
    --gas-budget 50000000 \
    --json 2>&1)

if [ $? -eq 0 ]; then
    SOLVER_CAP_ID=$(echo "$SOLVER_CAP_TX" | jq -r '.objectChanges[] | select(.objectType | contains("::solver_cap::SolverCap")) | .objectId')
    echo -e "${GREEN}   ✅ SolverCap created: $SOLVER_CAP_ID${NC}"
else
    echo -e "${YELLOW}   ⚠️  Could not create SolverCap automatically${NC}"
    echo "   You'll need to create it manually"
    SOLVER_CAP_ID="REPLACE_WITH_SOLVER_CAP_ID"
fi

echo ""

# Step 5: Generate environment files
echo "5️⃣  Generating environment configuration..."

# Backend .env
cat > ../backend/.env <<EOF
# Sui Network Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
NETWORK=testnet

# Deployed Contract Addresses
PACKAGE_ID=$PACKAGE_ID
SHIELDED_POOL_ID=$SHIELDED_POOL_ID
SOLVER_ADMIN_ID=$SOLVER_ADMIN_ID
SOLVER_CAP_ID=$SOLVER_CAP_ID

# System Object IDs
CLOCK_ID=0x6

# Resolver Configuration
PORT=3000
BATCH_INTERVAL=10000
MAX_BATCH_SIZE=20

# Seal Network (configure when available)
SEAL_NETWORK_URL=https://seal-network.sui.io
EOF

echo -e "${GREEN}   ✅ Created backend/.env${NC}"

# Integration tests .env
cat > ../integration-tests/.env <<EOF
# Sui Network Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
NETWORK=testnet

# Deployed Contract Addresses
PACKAGE_ID=$PACKAGE_ID
SHIELDED_POOL_ID=$SHIELDED_POOL_ID
SOLVER_ADMIN_ID=$SOLVER_ADMIN_ID
SOLVER_CAP_ID=$SOLVER_CAP_ID

# System Object IDs
CLOCK_ID=0x6

# Resolver API
RESOLVER_API_URL=http://localhost:3000
EOF

echo -e "${GREEN}   ✅ Created integration-tests/.env${NC}"

# Root .env for reference
cat > ../.env <<EOF
# Yoshino Testnet Deployment
# Deployed: $(date)
# Transaction: $TX_DIGEST

# Contract Addresses
PACKAGE_ID=$PACKAGE_ID
SHIELDED_POOL_ID=$SHIELDED_POOL_ID
SOLVER_ADMIN_ID=$SOLVER_ADMIN_ID
SOLVER_CAP_ID=$SOLVER_CAP_ID

# Network
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
NETWORK=testnet

# Explorer Links
PACKAGE_EXPLORER=https://suiscan.xyz/testnet/object/$PACKAGE_ID
POOL_EXPLORER=https://suiscan.xyz/testnet/object/$SHIELDED_POOL_ID
TX_EXPLORER=https://suiscan.xyz/testnet/tx/$TX_DIGEST
EOF

echo -e "${GREEN}   ✅ Created .env files${NC}"

cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📍 Network:${NC} Sui Testnet"
echo ""
echo -e "${BLUE}📦 Contract Addresses:${NC}"
echo "   Package ID:      $PACKAGE_ID"
echo "   Shielded Pool:   $SHIELDED_POOL_ID"
echo "   Solver Admin:    $SOLVER_ADMIN_ID"
echo "   Solver Cap:      $SOLVER_CAP_ID"
echo ""
echo -e "${BLUE}🔗 Explorer Links:${NC}"
echo "   Package:  https://suiscan.xyz/testnet/object/$PACKAGE_ID"
echo "   Pool:     https://suiscan.xyz/testnet/object/$SHIELDED_POOL_ID"
echo "   TX:       https://suiscan.xyz/testnet/tx/$TX_DIGEST"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo ""
echo "   1️⃣  Start Resolver Agent:"
echo "      cd backend"
echo "      npm install"
echo "      npm run dev"
echo ""
echo "   2️⃣  Run Integration Tests:"
echo "      cd integration-tests"
echo "      npm install"
echo "      npm test"
echo ""
echo "   3️⃣  Start Frontend:"
echo "      cd web"
echo "      npm install"
echo "      npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 Yoshino is now live on Sui testnet!${NC}"
echo ""
