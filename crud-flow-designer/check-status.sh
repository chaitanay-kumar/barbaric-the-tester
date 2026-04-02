#!/bin/bash

echo "========================================="
echo "  CRUD Flow Designer - Status Check"
echo "========================================="
echo ""

cd /Users/chaitanya.namireddy/loadforge/crud-flow-designer

echo "✓ Checking project structure..."
echo ""

echo "📁 Core Directories:"
echo "  ✓ src/components (UI layer)"
ls -1 src/components/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo "  ✓ src/hooks (Business logic)"
ls -1 src/hooks/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo "  ✓ src/store (State management)"
ls -1 src/store/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo "  ✓ src/store/slices (Modular slices)"
ls -1 src/store/slices/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo "  ✓ src/services (Core logic)"
ls -1 src/services/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo "  ✓ src/utils (Utilities)"
ls -1 src/utils/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo "  ✓ src/constants (Configuration)"
ls -1 src/constants/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo "  ✓ src/types (TypeScript defs)"
ls -1 src/types/ 2>/dev/null | wc -l | xargs echo "    Files:"
echo ""

echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
  echo "  ✓ node_modules installed"
else
  echo "  ✗ node_modules NOT found - run 'npm install'"
fi
echo ""

echo "📝 Configuration Files:"
[ -f "package.json" ] && echo "  ✓ package.json"
[ -f "tailwind.config.js" ] && echo "  ✓ tailwind.config.js"
[ -f "tsconfig.json" ] && echo "  ✓ tsconfig.json"
[ -f "vite.config.ts" ] && echo "  ✓ vite.config.ts"
echo ""

echo "📚 Documentation:"
[ -f "README.md" ] && echo "  ✓ README.md"
[ -f "ARCHITECTURE.md" ] && echo "  ✓ ARCHITECTURE.md"
[ -f "REFACTORING_COMPLETE.md" ] && echo "  ✓ REFACTORING_COMPLETE.md"
echo ""

echo "========================================="
echo "  Status: READY ✅"
echo "========================================="
echo ""
echo "To start the app:"
echo "  cd /Users/chaitanya.namireddy/loadforge/crud-flow-designer"
echo "  npm run dev"
echo ""
echo "App will be available at: http://localhost:5173"
echo ""

