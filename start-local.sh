#!/bin/bash

# LoadForge Local Development Startup Script
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting LoadForge locally..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prereqs() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v dotnet &> /dev/null; then
        echo -e "${RED}❌ .NET SDK not found. Please install .NET 8 SDK${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites OK${NC}"
    echo ""
}

# Start databases with Docker (optional)
start_databases() {
    if command -v docker &> /dev/null; then
        echo "🐳 Starting PostgreSQL and Redis with Docker..."
        docker-compose up -d postgres redis 2>/dev/null || true
        sleep 3
        echo -e "${GREEN}✅ Databases started${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker not found. Make sure PostgreSQL (5432) and Redis (6379) are running manually.${NC}"
    fi
    echo ""
}

# Build backend
build_backend() {
    echo "🔨 Building backend..."
    cd "$SCRIPT_DIR/backend"
    dotnet restore --verbosity quiet
    dotnet build --verbosity quiet
    echo -e "${GREEN}✅ Backend built${NC}"
    echo ""
}

# Build frontend
build_frontend() {
    echo "🔨 Installing frontend dependencies..."
    cd "$SCRIPT_DIR/frontend/loadforge-ui"
    if [ ! -d "node_modules" ]; then
        npm install --silent
    fi
    echo -e "${GREEN}✅ Frontend ready${NC}"
    echo ""
}

# Start backend
start_backend() {
    echo "🖥️  Starting backend API on http://localhost:5000..."
    cd "$SCRIPT_DIR/backend/src/LoadForge.Api"
    dotnet run --urls "http://localhost:5000" &
    BACKEND_PID=$!
    echo "   Backend PID: $BACKEND_PID"
    sleep 5
}

# Start frontend
start_frontend() {
    echo "🌐 Starting frontend on http://localhost:4200..."
    cd "$SCRIPT_DIR/frontend/loadforge-ui"
    npm start &
    FRONTEND_PID=$!
    echo "   Frontend PID: $FRONTEND_PID"
}

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "Goodbye! 👋"
}

trap cleanup EXIT

# Main
main() {
    check_prereqs
    start_databases
    build_backend
    build_frontend
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    start_backend
    start_frontend
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}✅ LoadForge is running!${NC}"
    echo ""
    echo "   🌐 Frontend:  http://localhost:4200"
    echo "   🔧 API:       http://localhost:5000"
    echo "   📚 Swagger:   http://localhost:5000/swagger"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Wait forever
    wait
}

main "$@"

