#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import server from './server';

export const stdio = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

stdio().catch((err) => {
  console.error("Error starting server:", err instanceof Error ? err.message : err);
  process.exit(1);
});