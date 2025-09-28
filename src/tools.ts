import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type Parser from './parser.js';

/**
 * Union type representing all available tool names in the source map parser MCP server.
 *
 * @public
 */
export type ToolName = "parse_stack" | "lookup_context" | "unpack_sources";

/**
 * Configuration options for filtering which tools should be registered.
 *
 * @public
 */
export interface ToolFilterOptions {
  /** List of tools that are allowed to be registered. If provided, only these tools will be registered. */
  allowList?: ToolName[];
  /** List of tools that should not be registered. These tools will be excluded from registration. */
  blockList?: ToolName[];
}

/**
 * Configuration options for the tools registry.
 *
 * @public
 */
export interface ToolsRegistryOptions {
  /** Number of context lines to include around the target location in source code. Defaults to 1. */
  contextOffsetLine?: number;
  /** Filter options to control which tools are registered. */
  toolFilter?: ToolFilterOptions;
}

/**
 * Result type for batch parsing operations.
 * Each element represents either a successful parse with token data or a failed parse with error information.
 *
 * @internal
 */
type BatchParseResult = Array<{
  /** Indicates the parsing operation failed */
  success: false;
  /** Error that occurred during parsing */
  error: Error;
} | {
  /** Indicates the parsing operation succeeded */
  success: true;
  /** Parsed token containing source map information */
  token: {
    /** Line number in the original source */
    line: number;
    /** Column number in the original source */
    column: number;
    /** Array of source code lines with context */
    sourceCode: Array<{
      /** Line number in the source file */
      line: number;
      /** Whether this line is part of the error stack trace */
      isStackLine: boolean;
      /** Raw source code content */
      raw: string;
    }>;
    /** Source file path */
    src: string;
  };
}>;

/**
 * Determines whether a tool should be registered based on the provided filter options.
 *
 * @param toolName - The name of the tool to check
 * @param filter - Filter options containing allowList and/or blockList
 * @returns `true` if the tool should be registered, `false` otherwise
 *
 * @remarks
 * - If no filter is provided, all tools are registered
 * - If allowList is provided and non-empty, only tools in the allowList are registered
 * - If blockList is provided and non-empty, tools in the blockList are excluded
 * - allowList takes precedence over blockList
 *
 * @internal
 */
function shouldRegisterTool(toolName: ToolName, filter?: ToolFilterOptions): boolean {
  if (!filter) {
    return true;
  }

  if (filter.allowList && filter.allowList.length > 0) {
    return filter.allowList.includes(toolName);
  }

  if (filter.blockList && filter.blockList.length > 0) {
    return !filter.blockList.includes(toolName);
  }

  return true;
}

/**
 * Interface defining the structure for tool configuration.
 *
 * @internal
 */
interface ToolDefinition {
  /** The unique name identifier for the tool */
  name: ToolName;
  /** Markdown-formatted description of the tool's functionality and usage */
  description: string;
  /** Zod schema object defining the tool's parameter validation */
  schema: Record<string, any>;
  /**
   * Function that handles the tool's execution logic
   *
   * @param params - Parameters passed to the tool (validated against schema)
   * @param getParser - Function to get or create a Parser instance
   * @returns Promise resolving to the tool's response
   */
  handler: (params: any, getParser: () => Promise<Parser>) => Promise<any>;
}

/**
 * Registers all available source map parsing tools with the MCP server.
 *
 * This function uses a declarative approach to register tools, automatically handling
 * filtering and registration logic for all defined tools.
 *
 * @param server - The MCP server instance to register tools with
 * @param options - Configuration options for tool registration
 *
 * @remarks
 * The function creates a lazy-loaded parser instance that is shared across all tools
 * for efficiency. Tools are registered based on the provided filter options.
 *
 * Available tools:
 * - `parse_stack`: Maps error stack traces to original source locations
 * - `lookup_context`: Retrieves source code context for specific positions
 * - `unpack_sources`: Extracts all source files from a source map
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerTools } from './tools.js';
 *
 * const server = new McpServer({ name: 'source-map-parser', version: '1.0.0' });
 *
 * // Register all tools
 * registerTools(server);
 *
 * // Register only specific tools
 * registerTools(server, {
 *   toolFilter: {
 *     allowList: ['parse_stack', 'lookup_context']
 *   }
 * });
 *
 * // Exclude specific tools
 * registerTools(server, {
 *   toolFilter: {
 *     blockList: ['unpack_sources']
 *   }
 * });
 * ```
 *
 * @public
 */
export function registerTools(server: McpServer, options: ToolsRegistryOptions = {}) {
  let parserInstance: Parser | null = null;

  /**
   * Lazy-loaded parser instance getter.
   * Creates and configures a parser instance on first access, then reuses it.
   *
   * @returns Promise resolving to the configured Parser instance
   * @internal
   */
  const getParser = async (): Promise<Parser> => {
    if (!parserInstance) {
      const { default: ParserClass } = await import('./parser.js');
      parserInstance = new ParserClass({
        contextOffsetLine: options.contextOffsetLine || 1,
      });
    }
    return parserInstance;
  };

  /**
   * Centralized tool definitions using declarative configuration.
   * Each tool is defined with its name, description, schema, and handler function.
   *
   * @internal
   */
  const toolDefinitions: ToolDefinition[] = [
    {
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
      schema: {
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
      },
      handler: async ({ stacks }, getParser) => {
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
      }
    },
    {
      name: "lookup_context",
      description: `
  # Lookup Source Code Context

  This tool looks up original source code context for a specific line and column position in compiled/minified code.

  ## Parameters:
  - **line**: The line number in the compiled code (1-based)
  - **column**: The column number in the compiled code
  - **sourceMapUrl**: The URL of the source map file
  - **contextLines** (optional): Number of context lines to include before and after the target line (default: 5)

  ## Returns:
  - A JSON object containing the source code context snippet with file path, target line info, and surrounding context lines
  - Returns null if the position cannot be mapped
`,
      schema: {
        line: z.number({
          description: "The line number in the compiled code (1-based)",
        }),
        column: z.number({
          description: "The column number in the compiled code",
        }),
        sourceMapUrl: z.string({
          description: "The URL of the source map file",
        }),
        contextLines: z.number({
          description: "Number of context lines to include (default: 5)",
        }).optional().default(5),
      },
      handler: async ({ line, column, sourceMapUrl, contextLines }, getParser) => {
        const parser = await getParser();
        const result = await parser.lookupContext(line, column, sourceMapUrl, contextLines);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }],
        }
      }
    },
    {
      name: "unpack_sources",
      description: `
  # Unpack Source Map Sources

  This tool extracts all source files and their content from a source map.

  ## Parameters:
  - **sourceMapUrl**: The URL of the source map file to unpack

  ## Returns:
  - A JSON object containing:
    - **sources**: Object with source file paths as keys and their content as values
    - **sourceRoot**: The source root path from the source map
    - **file**: The original file name
    - **totalSources**: Total number of source files found
`,
      schema: {
        sourceMapUrl: z.string({
          description: "The URL of the source map file to unpack",
        }),
      },
      handler: async ({ sourceMapUrl }, getParser) => {
        const parser = await getParser();
        const result = await parser.unpackSources(sourceMapUrl);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }],
        }
      }
    }
  ];

  /**
   * Automatic tool registration loop.
   * Iterates through all tool definitions and registers those that pass the filter.
   *
   * @internal
   */
  toolDefinitions.forEach(tool => {
    if (shouldRegisterTool(tool.name, options.toolFilter)) {
      server.tool(tool.name, tool.description, tool.schema, async (params) => {
        return tool.handler(params, getParser);
      });
    }
  });
}