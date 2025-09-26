import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type Parser from './parser.js';

export interface ToolsRegistryOptions {
  contextOffsetLine?: number;
}

type BatchParseResult = Array<{
  success: false;
  error: Error;
} | {
  success: true;
  token: {
    line: number;
    column: number;
    sourceCode: Array<{
      line: number;
      isStackLine: boolean;
      raw: string;
    }>;
    src: string;
  };
}>;

export function registerTools(server: McpServer, options: ToolsRegistryOptions = {}) {
  let parserInstance: Parser | null = null;

  const getParser = async (): Promise<Parser> => {
    if (!parserInstance) {
      const { default: ParserClass } = await import('./parser.js');
      parserInstance = new ParserClass({
        contextOffsetLine: options.contextOffsetLine || 1,
      });
    }
    return parserInstance;
  };

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
  const parser = await getParser();
  const parserRes: BatchParseResult = await parser.batchParseStack(stacks);

  if (parserRes.length === 0) {
    return {
      isError: true,
      content: [{ type: "text", text: "No data could be parsed from the provided stack traces." }],
    }
  }

  return {
    content: [{
      type: "text", text: JSON.stringify(parserRes.map((e) => {
        if (e.success) {
          return e;
        } else {
          // Sanitize error messages to avoid exposing internal details
          const sanitizedMessage = e.error.message.replace(/[^\w\s.:\-]/g, '');
          return {
            success: false,
            msg: sanitizedMessage,
          }
        }
      }))
    }],
  }
});

}