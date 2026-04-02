#!/bin/bash

# CRUD Flow Designer - Quick Start Script
# This script starts the React Flow Designer on port 3000

echo "🚀 Starting CRUD Flow Designer..."
echo "================================="
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Starting development server..."
echo ""
echo "🌐 App will be available at: http://localhost:5173"
echo "⚡ Using Vite for fast hot-reload"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

