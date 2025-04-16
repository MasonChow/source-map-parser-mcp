# Source Map Parser

🌐 **语言**: [English](README.md) | [简体中文](README.zh-CN.md)

[![Node Version](https://img.shields.io/node/v/source-map-parser-mcp)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/source-map-parser-mcp.svg)](https://www.npmjs.com/package/source-map-parser-mcp)
[![Downloads](https://img.shields.io/npm/dm/source-map-parser-mcp)](https://npmjs.com/package/source-map-parser-mcp)
[![Build Status](https://github.com/MasonChow/source-map-parser-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/MasonChow/source-map-parser-mcp/actions)
[![codecov](https://codecov.io/gh/MasonChow/source-map-parser-mcp/graph/badge.svg)](https://codecov.io/gh/MasonChow/source-map-parser-mcp)
![](https://badge.mcpx.dev?type=server&features=tools 'MCP server with tools')

<a href="https://glama.ai/mcp/servers/@MasonChow/source-map-parser-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@MasonChow/source-map-parser-mcp/badge" />
</a>

This project implements a WebAssembly-based Source Map parser that can map JavaScript error stack traces back to source code and extract relevant context information. Developers can easily map JavaScript error stack traces back to source code for quick problem identification and resolution. This documentation aims to help developers better understand and use this tool.

## MCP Integration

> Note: Requires Node.js 18+ support

Option 1: Run directly with NPX

```bash
npx -y source-map-parser-mcp@latest
```

Option 2: Download the build artifacts

Download the corresponding version of the build artifacts from the [GitHub Release](https://github.com/MasonChow/source-map-parser-mcp/releases) page, then run:

```bash
node dist/main.es.js
```

### Runtime Parameter Configuration

> System runtime parameters can be flexibly configured through environment variables to meet the needs of different scenarios

- `SOURCE_MAP_PARSER_RESOURCE_CACHE_MAX_SIZE`: Sets the maximum memory space occupied by resource cache, default is 200MB. Adjusting this value appropriately can balance performance and memory usage.
- `SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE`: Defines the number of context code lines to display around the error location, default is 1 line. Increasing this value provides more context information, facilitating problem diagnosis.

**Example:**

```bash
# Set 500MB cache and display 3 lines of context
export SOURCE_MAP_PARSER_RESOURCE_CACHE_MAX_SIZE=500
export SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE=3
npx -y source-map-parser-mcp@latest
```

## Feature Overview

1. **Stack Parsing**: Parse the corresponding source code location based on provided line number, column number, and Source Map file.
2. **Batch Processing**: Support parsing multiple stack traces simultaneously and return batch results.
3. **Context Extraction**: Extract context code for a specified number of lines to help developers better understand the environment where errors occur.

## MCP Service Tool Description

### `operating_guide`

Get usage instructions for the MCP service. Provides information on how to use the MCP service through chat interaction.

### `parse_stack`

Parse stack information by providing stack traces and Source Map addresses.

#### Request Example

- stacks: Stack information including line number, column number, and Source Map address.
  - line: Line number, required.
  - column: Column number, required.
  - sourceMapUrl: Source Map address, required.

```json
{
  "stacks": [
    {
      "line": 10,
      "column": 5,
      "sourceMapUrl": "https://example.com/source.map"
    }
  ]
}
```

#### Response Example

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"success\":true,\"token\":{\"line\":10,\"column\":5,\"sourceCode\":[{\"line\":8,\"isStackLine\":false,\"raw\":\"function foo() {\"},{\"line\":9,\"isStackLine\":false,\"raw\":\"  console.log('bar');\"},{\"line\":10,\"isStackLine\":true,\"raw\":\"  throw new Error('test');\"},{\"line\":11,\"isStackLine\":false,\"raw\":\"}\"}],\"src\":\"index.js\"}}]"
    }
  ]
}
```

### Parsing Result Description

- `success`: Indicates whether the parsing was successful.
- `token`: The Token object returned when parsing is successful, containing source code line number, column number, context code, and other information.
- `error`: Error information returned when parsing fails.

## Advanced Usage

Some teams, for security or performance reasons, may not want to expose Source Maps directly to browsers for parsing, and instead process the Source Map upload paths. For example, converting path `/assets/index.js` to `source_backup/index.js.map`.

In such cases, prompt rules can guide the model to complete path conversion.

### Prompt Example

```markdown
**Source Map Tool Usage Guide**

The following are the parsing rules for Source Map remote addresses, where `origin_url` represents the error address in the stack.

1. Replace the resource address of the Source Map based on the source path in the stack:
   `https://example.com${origin_url.replace('/assets/', '/source_backup/')}.map`

2. If all rules fail to match, use the following fallback rule:
   `${origin_url}.map` and try again.
```

## FAQ

### 1. WebAssembly Module Loading Failure

If the tool returns the following error message, please troubleshoot as follows:

> parser init error: WebAssembly.instantiate(): invalid value type 'externref', enable with --experimental-wasm-reftypes @+86

1. **Check Node.js Version**: Ensure Node.js version is 18 or higher. If it's lower than 18, please upgrade Node.js.
2. **Enable Experimental Flag**: If Node.js version is 18+ but you still encounter issues, use the following command to start the tool:
   ```bash
   npx --node-arg=--experimental-wasm-reftypes -y source-map-parser-mcp@latest
   ```

## Local Development Guide

### 1. Install Dependencies

Ensure Node.js and npm are installed, then run the following command to install project dependencies:

```bash
npm install
```

### 2. Link MCP Service

Run the following command to start the MCP server:

```bash
npx tsx src/main.ts
```

### Internal Logic Overview

#### 1. Main File Description

- **`stack_parser_js_sdk.js`**: JavaScript wrapper for the WebAssembly module, providing core stack parsing functionality.
- **`parser.ts`**: Main implementation of the parser, responsible for initializing the WebAssembly module, retrieving Source Map content, and parsing stack information.
- **`server.ts`**: Implementation of the MCP server, providing the `parse_stack` tool interface for external calls.

#### 2. Modify Parsing Logic

To modify the parsing logic, edit the `getSourceToken` method in the `parser.ts` file.

#### 3. Add New Tools

In the `server.ts` file, new tool interfaces can be added using the `server.tool` method.

## Notes

1. **Source Map Files**: Ensure that the provided Source Map file address is accessible and the file format is correct.
2. **Error Handling**: During parsing, network errors, file format errors, and other issues may be encountered; it's recommended to implement proper error handling when making calls.

## Contribution Guidelines

Contributions via Issues and Pull Requests are welcome to improve this project.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
