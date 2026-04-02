#!/bin/bash

echo "🚀 Starting CRUD Flow Designer..."
echo "=================================="
echo ""

cd /Users/chaitanya.namireddy/loadforge/crud-flow-designer

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first time setup)..."
    npm install
    echo ""
fi

# Kill any existing processes on port 5173
echo "🧹 Clearing port 5173..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start the dev server
echo "✅ Starting Vite dev server..."
echo ""
echo "🌐 App will be available at:"
echo "   → http://localhost:5173"
echo ""
echo "📝 Features available:"
echo "   ✓ Drag & drop nodes from sidebar"
echo "   ✓ Connect nodes with edges"
echo "   ✓ Export/Import JSON flows"
echo "   ✓ Execute flows with Run button"
echo "   ✓ Real-time visual feedback"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="
echo ""

npm run dev

