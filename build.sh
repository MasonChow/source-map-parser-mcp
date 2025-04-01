#!/bin/bash

# Run Vite build
npm run build:vite

# Run repomix to gen the operating guide
npx -y repomix

# Check if the build was successful
if [ $? -ne 0 ]; then
  echo "Build failed, exiting script."
  exit 1
fi

# Define source and destination directories
SRC_DIR="src/external"
DIST_DIR="dist/external"

# Create the destination directory if it does not exist
mkdir -p "$DIST_DIR"

# Copy the src/external directory to dist/external and overwrite all contents
cp -r "$SRC_DIR/"* "$DIST_DIR/"

# Output completion message
echo "Copied $SRC_DIR to $DIST_DIR and overwrote all contents."