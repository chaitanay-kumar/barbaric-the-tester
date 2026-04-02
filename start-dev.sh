#!/bin/bash

# LoadForge Development Startup Script
# This script starts both backend and frontend with automatic port cleanup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_PORT=5001
FRONTEND_PORT=4200
LOADFORGE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LoadForge Development Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Killing processes on port $port...${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}Port $port cleared${NC}"
    else
        echo -e "${GREEN}Port $port is already free${NC}"
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $name to start...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}$name is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e "${RED}$name failed to start after $max_attempts seconds${NC}"
    return 1
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}Cleanup complete${NC}"
    exit 0
}

# Trap Ctrl+C to cleanup
trap cleanup SIGINT SIGTERM

# Step 1: Clear ports
echo -e "${BLUE}Step 1: Clearing ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo ""

# Step 2: Build backend
echo -e "${BLUE}Step 2: Building backend...${NC}"
cd "$LOADFORGE_DIR/backend/src/LoadForge.Api"
dotnet build --verbosity quiet
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backend build successful${NC}"
else
    echo -e "${RED}Backend build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Start backend in background
echo -e "${BLUE}Step 3: Starting backend on port $BACKEND_PORT...${NC}"
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://localhost:$BACKEND_PORT" > /tmp/loadforge-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}Backend started with PID $BACKEND_PID${NC}"
echo ""

# Wait for backend to be ready
wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend"
echo ""

# Step 3.1: Verify data seeding
echo -e "${BLUE}Step 3.1: Verifying data seeding...${NC}"
sleep 2  # Give seeding time to complete

# Check if projects exist
PROJECTS=$(curl -s "http://localhost:$BACKEND_PORT/api/projects" 2>/dev/null)
if echo "$PROJECTS" | grep -q "JSONPlaceholder"; then
    echo -e "${GREEN}✓ JSONPlaceholder project seeded successfully${NC}"
else
    echo -e "${YELLOW}⚠ Projects may not be seeded. Check backend logs.${NC}"
fi

# Show seeding info from backend log
echo -e "${BLUE}Backend seeding output:${NC}"
grep -E "Generated|Seeded|Project ID|Collection ID|Environment ID|Base URL" /tmp/loadforge-backend.log 2>/dev/null | head -10 || echo "  (Check /tmp/loadforge-backend.log for details)"
echo ""

# Step 4: Start frontend in background
echo -e "${BLUE}Step 4: Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$LOADFORGE_DIR/frontend/loadforge-ui"
npm start > /tmp/loadforge-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started with PID $FRONTEND_PID${NC}"
echo ""

# Wait for frontend to be ready
wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend"
echo ""

# Print summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   LoadForge is running!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  ${GREEN}Backend:${NC}  http://localhost:$BACKEND_PORT"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "  ${GREEN}Swagger:${NC}  http://localhost:$BACKEND_PORT/swagger"
echo ""
echo -e "${YELLOW}Login credentials:${NC}"
echo -e "  Email:    test@loadforge.dev"
echo -e "  Password: Test123!"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  /tmp/loadforge-backend.log"
echo -e "  Frontend: /tmp/loadforge-frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and show backend logs
tail -f /tmp/loadforge-backend.log

