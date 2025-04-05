
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import packageJson from "../package.json";
import parser from "./parser";
import fs from 'node:fs/promises';
import path from 'node:path';

const server = new Server({
  name: packageJson.name,
  version: packageJson.version
}, {
  capabilities: {
    tools: {
      list: true,
      call: true
    }
  }
});

const stacksSchema = z.array(
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
);

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [{
      name: "operating_guide",
      description: `
        # Parse Error Stack Trace

        This tool allows you to parse error stack traces by mapping them to the corresponding source code locations using source maps.
        It is particularly useful for debugging production errors where the stack trace points to minified or obfuscated code.
      `,
      arguments: []
    }, {
      name: "parse_stack",
      description: `
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
      `,
      arguments: [

        {
          name: "stacks",
          type: 'array',
          description: "An array of stack trace objects, each containing line, column, and sourceMapUrl.",
          items: {
            type: "object",
            properties: {
              line: {
                type: "number",
                description: "The line number in the stack trace."
              },
              column: {
                type: "number",
                description: "The column number in the stack trace."
              },
              sourceMapUrl: {
                type: "string",
                description: "The URL of the source map file corresponding to the stack trace."
              }
            },
            required: ["line", "column", "sourceMapUrl"]
          }
        },
        {
          name: "ctxOffset",
          type: "number",
          description: "The number of additional context lines to include before and after the error location in the source code.",
          default: 5
        }
      ]
    }]
  };
});


server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    switch (name) {
      case 'operating_guide':
        const content = await fs.readFile(path.join(import.meta.dirname, './external/docs/guide.xml'), 'utf-8');
        return {
          content: [
            {
              type: "text",
              text: content
            }
          ]
        };
      case 'parse_stack':

        if (!args) {
          throw new Error("No arguments provided.");
        }

        const stacks = stacksSchema.parse(args.stacks);
        const ctxOffset = Number(args.ctxOffset) || 1;

        const parserRes = await parser.batchParseStack(stacks, ctxOffset);

        if (parserRes.length === 0) {
          throw new Error("No data could be parsed from the provided stack traces.");
        }

        return {
          content: [{
            type: "text", text: JSON.stringify(parserRes.map(e => {
              if (e.success) {
                return e;
              } else {
                return {
                  success: false,
                  msg: e.error.message,
                }
              }
            }))
          }],
        };
      default:
        throw new Error("Invalid prompt name.");
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : error
        }
      ]
    }
  }
});

export default server;