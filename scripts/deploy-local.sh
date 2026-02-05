#!/bin/bash
set -e

echo "🚀 Yoshino Local Deployment Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo -e "${RED}❌ Sui CLI not found${NC}"
    echo "   Install from: https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
fi

echo -e "${GREEN}✅ Sui CLI found${NC}"
echo ""

# Step 1: Start Sui localnet
echo "1️⃣  Starting Sui localnet..."
echo "   Checking if localnet is already running..."

if lsof -Pi :9000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}   ⚠️  Localnet already running on port 9000${NC}"
else
    echo "   Starting new localnet..."
    sui start &
    LOCALNET_PID=$!
    echo "   Localnet PID: $LOCALNET_PID"
    
    # Wait for localnet to be ready
    echo "   Waiting for localnet to initialize..."
    sleep 10
    
    if lsof -Pi :9000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}   ✅ Localnet started successfully${NC}"
    else
        echo -e "${RED}   ❌ Failed to start localnet${NC}"
        exit 1
    fi
fi

echo ""

# Step 2: Build and deploy contracts
echo "2️⃣  Building and deploying contracts..."
cd contracts

echo "   Building Move package..."
sui move build

if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}   ✅ Build successful${NC}"

echo ""
echo "   Publishing to localnet..."
PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 --json)

if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ Publish failed${NC}"
    exit 1
fi

echo -e "${GREEN}   ✅ Publish successful${NC}"

# Parse deployment info
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.type == "published") | .packageId')

echo ""
echo "📦 Deployment Info:"
echo "   Package ID: $PACKAGE_ID"

# Save to .env file
cd ..
ENV_FILE="integration-tests/.env"

echo "# Yoshino Local Deployment" > "$ENV_FILE"
echo "# Generated on $(date)" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "YOSHINO_PACKAGE_ID=$PACKAGE_ID" >> "$ENV_FILE"
echo "SUI_RPC_URL=http://127.0.0.1:9000" >> "$ENV_FILE"

# Extract object IDs from publish output
# Note: This is simplified - you may need to parse more carefully
VAULT_BASE_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("Vault")) | .objectId' | head -1)
SOLVER_CAP_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("SolverCap")) | .objectId' | head -1)

if [ -n "$VAULT_BASE_ID" ]; then
    echo "VAULT_BASE_ID=$VAULT_BASE_ID" >> "$ENV_FILE"
    echo "   Vault Base ID: $VAULT_BASE_ID"
fi

if [ -n "$SOLVER_CAP_ID" ]; then
    echo "SOLVER_CAP_ID=$SOLVER_CAP_ID" >> "$ENV_FILE"
    echo "   SolverCap ID: $SOLVER_CAP_ID"
fi

echo ""
echo -e "${GREEN}✅ Deployment info saved to $ENV_FILE${NC}"

echo ""

# Step 3: Start resolver (optional)
echo "3️⃣  Starting Resolver Agent..."
echo "   Starting backend in background..."

cd backend

# Check if .env exists, create from template if not
if [ ! -f .env ]; then
    echo "   Creating .env from template..."
    cat > .env << EOF
SUI_NETWORK=localnet
SUI_RPC_URL=http://127.0.0.1:9000
VAULT_BASE_PACKAGE_ID=$PACKAGE_ID
SOLVER_CAP_OBJECT_ID=$SOLVER_CAP_ID
BALANCE_MANAGER_ID=0x0
VAULT_BASE_ID=$VAULT_BASE_ID
VAULT_QUOTE_ID=0x0
DEEPBOOK_POOL_ID=0x0
BASE_ASSET_TYPE=0x2::sui::SUI
QUOTE_ASSET_TYPE=0x2::sui::SUI
RESOLVER_PRIVATE_KEY=
SEAL_NETWORK_URL=https://seal.mysten.io
PORT=3000
BATCH_SIZE=10
BATCH_INTERVAL_MS=5000
EOF
    echo -e "${YELLOW}   ⚠️  .env created - please configure RESOLVER_PRIVATE_KEY${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi

# Start resolver in background
echo "   Starting resolver..."
npm run dev > resolver.log 2>&1 &
RESOLVER_PID=$!

echo "   Resolver PID: $RESOLVER_PID"
echo "   Logs: backend/resolver.log"

# Wait for resolver to start
sleep 3

if ps -p $RESOLVER_PID > /dev/null; then
    echo -e "${GREEN}   ✅ Resolver started successfully${NC}"
else
    echo -e "${YELLOW}   ⚠️  Resolver may have failed to start - check backend/resolver.log${NC}"
fi

cd ..

echo ""
echo "===================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📍 Services:"
echo "   Localnet RPC:    http://localhost:9000"
echo "   Resolver API:    http://localhost:3000"
echo ""
echo "📦 Contract:"
echo "   Package ID:      $PACKAGE_ID"
echo ""
echo "🧪 Next Steps:"
echo "   1. cd integration-tests"
echo "   2. npm install"
echo "   3. npm test"
echo ""
echo "🛑 To stop services:"
echo "   kill $LOCALNET_PID $RESOLVER_PID"
echo ""
