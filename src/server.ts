
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import packageJson from "../package.json";
import Parser from "./parser";
import fs from 'node:fs/promises';
import path from 'node:path';

const parser = new Parser({
  contextOffsetLine: process.env.SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE ? parseInt(process.env.SOURCE_MAP_PARSER_CONTEXT_OFFSET_LINE) : 1,
});

const server = new McpServer({
  name: packageJson.name,
  version: packageJson.version
}, {
  capabilities: {
    tools: {}
  }
});

server.tool('operating_guide', `
  # Parse Error Stack Trace

  This tool allows you to parse error stack traces by mapping them to the corresponding source code locations using source maps.
  It is particularly useful for debugging production errors where the stack trace points to minified or obfuscated code.
`, async () => {

  try {
    const content = await fs.readFile(path.join(process.cwd(), 'README.md'), 'utf-8');

    return {
      content: [
        {
          type: "text",
          text: content
        }
      ]
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "Error reading the documentation file. Please check the README.md file in the project root."
        }
      ]
    }
  }
})

server.tool("parse_stack", `
  # Parse Error Stack Trace

  This tool allows you to parse error stack traces by providing the following:
  - A downloadable source map URL.
  - The line and column numbers from the stack trace.

  The tool will map the provided stack trace information to the corresponding source code location using the source map.
  It also supports fetching additional context lines around the error location for better debugging.

  ## Parameters:
  - **stacks**: An array of stack trace objects, each containing:
    - **line**: The line number in the stack trace.
    - **column**: The column number in the stack trace.
    - **sourceMapUrl**: The URL of the source map file corresponding to the stack trace.

  - **ctxOffset** (optional): The number of additional context lines to include before and after the error location in the source code. Defaults to 5.

  ## Returns:
  - A JSON object containing the parsed stack trace information, including the mapped source code location and context lines.
  - If parsing fails, an error message will be returned for the corresponding stack trace.
`, {
  stacks: z.array(
    z.object({
      line: z.number({
        description: "The line number in the stack trace.",
      }),
      column: z.number({
        description: "The column number in the stack trace.",
      }),
      sourceMapUrl: z.string({
        description: "The URL of the source map file corresponding to the stack trace.",
      }),
    })
  )
}, async ({ stacks }) => {
  const parserRes = await parser.batchParseStack(stacks);

  if (parserRes.length === 0) {
    return {
      isError: true,
      content: [{ type: "text", text: "No data could be parsed from the provided stack traces." }],
    }
  }

  return {
    content: [{
      type: "text", text: JSON.stringify(parserRes.map(e => {
        if (e.success) {
          return e;
        } else {
          // Sanitize error messages to avoid exposing internal details
          const sanitizedMessage = e.error.message.replace(/[^\w\s.:\-\/]/g, '');
          return {
            success: false,
            msg: sanitizedMessage,
          }
        }
      }))
    }],
  }
});
export default server;