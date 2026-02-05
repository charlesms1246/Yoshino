#!/bin/bash
# Yoshino Resolver - Quick Start Script

set -e

echo "🚀 Starting Yoshino Resolver Agent..."

# Kill any existing instances
pkill -f 'tsx.*index.ts' 2>/dev/null || true
sleep 2

# Start resolver
cd "$(dirname "$0")"
npm run dev &

# Wait for startup
echo "⏳ Waiting for server to start..."
for i in {1..10}; do
    sleep 2
    if curl -s http://localhost:3000/status > /dev/null 2>&1; then
        echo "✅ Resolver is running on port 3000"
        curl -s http://localhost:3000/status | head -10
        exit 0
    fi
    echo "   Attempt $i/10..."
done

echo "❌ Failed to start resolver. Check logs with: tail -f /tmp/resolver.log"
exit 1
