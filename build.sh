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

# Note: External directory copying has been removed as we now use source_map_parser_node npm package directly