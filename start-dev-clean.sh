 we#!/bin/zsh

# LoadForge Development Startup Script
# This script kills any existing processes on ports 5000 and 4200,
# then starts both backend and frontend in separate terminals

echo "🚀 LoadForge Development Environment Startup"
echo "=============================================="

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "🔴 Killing existing processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        echo "✅ Port $port freed"
    else
        echo "✅ Port $port is already free"
    fi
}

# Free up backend port (5000)
kill_port 5000

# Free up frontend port (4200)
kill_port 4200

echo ""
echo "📦 Starting Backend (port 5000)..."
echo "-----------------------------------"

# Start backend in a new terminal window
osascript <<EOF
tell application "Terminal"
    do script "cd '$PWD/backend/src/LoadForge.Api' && echo '🔧 Backend Starting...' && dotnet run"
    activate
end tell
EOF

# Wait for backend to start
echo "⏳ Waiting for backend to initialize (10 seconds)..."
sleep 10

echo ""
echo "🎨 Starting Frontend (port 4200)..."
echo "------------------------------------"

# Start frontend in a new terminal window
osascript <<EOF
tell application "Terminal"
    do script "cd '$PWD/frontend/loadforge-ui' && echo '🎨 Frontend Starting...' && npm start"
    activate
end tell
EOF

echo ""
echo "✅ Both services are starting in separate terminal windows!"
echo ""
echo "📋 Service URLs:"
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:4200"
echo ""
echo "🔐 Test Login Credentials:"
echo "   Email:    test@loadforge.dev"
echo "   Password: Test123!"
echo ""
echo "📊 Pre-seeded Data:"
echo "   Project:     JSONPlaceholder API Tests"
echo "   Base URL:    https://jsonplaceholder.typicode.com"
echo "   Environment: default"
echo ""
echo "ℹ️  Note: Using in-memory database - data resets on backend restart"
echo ""
echo "🛑 To stop: Close the terminal windows or run ./stop-dev.sh"

