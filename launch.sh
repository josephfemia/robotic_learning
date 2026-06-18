#!/usr/bin/env bash
# Launch the Robot Learning course (Vite dev server).
set -euo pipefail

# Always run from the project root, regardless of where the script is called from.
cd "$(dirname "$0")"

# Install dependencies on first run (or after they've been cleaned out).
if [ ! -d node_modules ]; then
  echo "node_modules not found — installing dependencies..."
  npm install
fi

echo "Starting the Robot Learning course dev server → http://localhost:5173"
echo "(press Ctrl-C to stop)"
exec npm run dev
