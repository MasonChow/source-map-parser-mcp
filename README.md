# Source Map Parser

🌐 **Languages**: [English](README.md) | [简体中文](README.zh-CN.md)

This project implements a WebAssembly-based Source Map parser that maps JavaScript error stack traces back to the original source code and extracts relevant context information. Developers can easily locate and fix issues by mapping JavaScript error stack traces to the original source code. We hope this documentation helps developers better understand and use this tool.

## MCP Integration

> Note: The minimum required Node.js version is 18+.

`npx -y source-map-parser-mcp@latest`

## Features

1. **Stack Trace Parsing**: Parse the corresponding source code location based on the provided line number, column number, and Source Map file.
2. **Batch Parsing**: Support parsing multiple stack traces simultaneously and return batch results.
3. **Context Extraction**: Extract a specified number of context lines to help developers better understand the environment where the error occurred.

## MCP Service Tools

### `operating_guide`

Retrieve the usage guide for the MCP service. This tool provides an interactive way to understand how to use the MCP service.

### `parse_stack`

Parse stack trace information and Source Map URLs.

#### Request Example

- `stacks`: Stack trace information, including line number, column number, and Source Map URL.
  - `line`: Line number (required).
  - `column`: Column number (required).
  - `sourceMapUrl`: URL of the Source Map file (required).
- `ctxOffset`: Number of context lines (default is 5).

```json
{
  "stacks": [
    {
      "line": 10,
      "column": 5,
      "sourceMapUrl": "https://example.com/source.map"
    }
  ],
  "ctxOffset": 5
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

### 4. Parsing Result Explanation

- `success`: Indicates whether the parsing was successful.
- `token`: The parsed token object returned upon successful parsing, including source code line number, column number, context code, etc.
- `error`: Error information returned when parsing fails.

## Advanced Usage

For security or performance reasons, some teams may prefer not to expose Source Maps directly to the browser for parsing. Instead, they preprocess the upload paths of Source Maps. For example, the path `/assets/index.js` can be transformed into `source_backup/index.js.map`.

In such cases, you can guide the model to complete the path transformation using prompt-based rules.

### Prompt Example

```markdown
**Source Map Tool Usage Guide**

Below are the rules for resolving remote Source Map URLs, where `origin_url` represents the error path in the stack trace.

1. Replace the Source Map resource URL based on the source path in the stack trace:
   `https://example.com${origin_url.replace('/assets/', '/source_backup/')}.map`

2. If no matching rule is found, use the following fallback rule:
   `${origin_url}.map` and retry.
```

## FAQ

### 1. WebAssembly Module Loading Failure

If the tool returns the following error message, follow these steps to troubleshoot:

> parser init error: WebAssembly.instantiate(): invalid value type 'externref', enable with --experimental-wasm-reftypes @+86

1. **Check Node.js Version**: Ensure that the Node.js version is 18 or higher. If it is lower than 18, upgrade Node.js.
2. **Enable Experimental Flag**: If the Node.js version is 18+ but the issue persists, start the tool with the following command:
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

#### 1. Key Files

- **`stack_parser_js_sdk.js`**: JavaScript wrapper for the WebAssembly module, providing core functionality for stack trace parsing.
- **`parser.ts`**: Main implementation of the parser, responsible for initializing the WebAssembly module, fetching Source Map content, and parsing stack trace information.
- **`server.ts`**: Implementation of the MCP server, providing the `parse_stack` tool interface for external calls.

#### 2. Modify Parsing Logic

To modify the parsing logic, edit the `getSourceToken` method in the `parser.ts` file.

#### 3. Add New Tools

In the `server.ts` file, you can add new tool interfaces using the `server.tool` method.

## Notes

1. **Source Map Files**: Ensure the provided Source Map file URL is accessible and the file format is correct.
2. **Context Lines**: The `ctxOffset` parameter controls the number of context lines to extract. Adjust it based on your needs.
3. **Error Handling**: Parsing may encounter issues such as network errors or file format errors. It is recommended to handle errors appropriately when calling the tool.

## Contribution Guide

We welcome Issues and Pull Requests to improve this project together.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
