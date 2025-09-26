#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

# Run Vite build
npm run build:vite

# Generate TypeScript declaration files
npx tsc -p "$SCRIPT_DIR/tsconfig.build.json"

# Bundle declarations into a single file
npx rollup -c "$SCRIPT_DIR/rollup.config.dts.mjs"

# Remove intermediate declaration artifacts
if [ -d "$SCRIPT_DIR/dist/types" ]; then
	rm -rf "$SCRIPT_DIR/dist/types"
fi

# Note: External directory copying has been removed as we now use source_map_parser_node npm package directly