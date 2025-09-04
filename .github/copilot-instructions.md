# Source Map Parser MCP Server

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

This is a TypeScript MCP (Model Context Protocol) server for parsing JavaScript source maps. It provides tools to map minified JavaScript error stack traces back to their original source code locations.

## Working Effectively

### Bootstrap and Build (REQUIRED)
- **ALWAYS** run these commands in order to get started:
  - `npm install` -- takes ~1 second. Dependencies are already cached.
  - `npm run build` -- takes ~4-5 seconds total. NEVER CANCEL. Set timeout to 30+ seconds.
  - The build process includes:
    - `npm run build:vite` (Vite build ~1.3 seconds)
    - `npx -y repomix` (documentation generation ~3 seconds)

### Testing
- `npm run test:ci` -- takes ~11 seconds total. NEVER CANCEL. Set timeout to 30+ seconds.
  - Memory cache tests: 8 tests pass in <1 second
  - Client test: Currently times out after 10 seconds (known issue - integration test configuration)
  - **Note**: The client test timeout does NOT indicate the server is broken - it's a test configuration issue
- **Do NOT** attempt to fix the client test timeout unless specifically asked - it's not critical to functionality

### Running the Server
- **Method 1 (Development)**: `npx tsx src/main.ts`
- **Method 2 (Built)**: `node dist/main.es.js`
- **Method 3 (NPX)**: `npx -y source-map-parser-mcp@latest`
- The server runs as an MCP stdio server and will wait for MCP client connections

### Environment Configuration
- `SOURCE_MAP_PARSER_RESOURCE_CACHE_MAX_SIZE` - Max memory cache (default: 200MB)
- `SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE` - Context lines around errors (default: 1)

## Validation

### ALWAYS Test These Scenarios After Changes:
1. **Build Validation**: 
   - `npm run build` must complete successfully
   - Check that `dist/main.es.js` and `dist/main.cjs.js` are created
   - Verify no TypeScript compilation errors

2. **Core Functionality**: Test with example source maps
   - Example source map available at: `example/index.js.map`
   - Example special source map at: `example/special/foo.js.map`
   - Use these for testing parse_stack functionality

3. **Memory Cache Tests**: 
   - `npm run test:ci` - memory cache tests MUST pass
   - These validate caching functionality works correctly

### Manual Testing Commands
```bash
# Test build
npm run build

# Test memory cache functionality only (skip broken client test)
npx vitest run tests/memoryCacheManager.test.ts
```

## MCP Tools Available

### `operating_guide`
- Returns the README.md content
- No parameters required
- Tests server's ability to read documentation

### `parse_stack`
- **Primary functionality** - parses error stack traces using source maps
- Parameters:
  - `stacks`: Array of objects with `line`, `column`, `sourceMapUrl`
- Returns mapped source code with context lines
- **Critical**: Always test this with working example source maps

## Common Tasks and File Locations

### Key Source Files
- `src/main.ts` - Entry point, sets up stdio transport
- `src/server.ts` - MCP server setup, tool definitions
- `src/parser.ts` - Core source map parsing logic (1,147 tokens, 24% of codebase)
- `src/memoryCacheManager.ts` - Caching functionality
- `src/cachingFetch.ts` - HTTP fetching with caching

### Configuration Files
- `package.json` - Dependencies and scripts
- `vite.config.mjs` - Build configuration
- `tsconfig.json` - TypeScript configuration
- `repomix.config.json` - Documentation generation

### Build Outputs
- `dist/main.es.js` - ES module build (primary)
- `dist/main.cjs.js` - CommonJS build
- `src/external/docs/guide.xml` - Generated documentation

### Example Data (For Testing)
- `example/index.js.map` - Basic source map example
- `example/special/foo.js.map` - Special case source map
- Use CDN URLs for testing: `https://cdn.jsdelivr.net/gh/MasonChow/source-map-parser-mcp@main/example/`

## Critical Reminders

### Build Process
- **NEVER CANCEL** the build process - it may appear to hang during repomix documentation generation
- Total build time is 4-5 seconds, which is normal
- **Always** wait for "All Done!" message from repomix

### Testing
- The client test timeout is a **known issue** - do not spend time fixing it unless specifically requested
- Focus on memory cache tests and manual functionality validation
- **ALWAYS** test with actual source map files after making changes

### Dependencies
- Requires Node.js 20+
- Uses Vite for building, Vitest for testing
- External dependency: `source_map_parser_node` npm package
- All dependencies install quickly (~1 second)

### Performance Expectations
- Build: 4-5 seconds
- Test (working tests): <1 second  
- npm install: ~1 second
- Server startup: immediate (stdio server)

## Working with Source Maps
- Source maps must be accessible via HTTP/HTTPS URLs
- The server validates URLs to prevent SSRF attacks
- Supports context line extraction around error locations
- Implements intelligent caching to avoid repeated downloads
- Can handle both regular and "special" directory mappings (see README examples)

Always validate your changes work by building and testing with the provided example source maps.