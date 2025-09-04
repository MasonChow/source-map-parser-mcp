import * as sourceMapParser from 'source_map_parser_node';
import fetch from './cachingFetch'
interface Stack {
  /** Line number in the stack trace */
  line: number;
  /** Column number in the stack trace */
  column: number;
  /** URL of the source map file */
  sourceMapUrl: string;
}
interface SourceCode {
  /** Line number in the source code */
  line: number;
  /** Whether this line is part of the error stack trace */
  isStackLine: boolean;
  /** Raw code of the corresponding line */
  raw: string;
}

interface Token {
  /** Line number in the source map */
  line: number;
  /** Column number in the source map */
  column: number;
  /** Contextual source code lines */
  sourceCode: SourceCode[];
  /** File path of the source map */
  src: string;
}

type BatchParseResult = Array<{
  /** Indicates a failed parsing result */
  success: false;
  /** Error object describing the failure */
  error: Error;
} | {
  /** Indicates a successful parsing result */
  success: true;
  /** Parsed token object */
  token: Token;
}>;

const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
};

/**
 * Validates a URL to prevent SSRF attacks
 * @param url - The URL to validate
 * @throws Error if the URL is invalid or potentially malicious
 */
const validateUrl = (url: string): void => {
  try {
    const parsedUrl = new URL(url);
    
    // Allow only HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed.`);
    }
    
    // Optional: Add domain allowlist/blocklist here if needed
    // Example: if (parsedUrl.hostname.endsWith('.internal.company.com')) {
    //   throw new Error('Access to internal domains is not allowed');
    // }
    
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    throw error;
  }
};

class Parser {
  /** Indicates whether the parser has been initialized */
  private isInit = false;

  /** Context offset line for source code */
  private contextOffsetLine: number;

  constructor(config: {
    /** Context offset line for source code */
    contextOffsetLine?: number;
  } = {}) {
    this.contextOffsetLine = config.contextOffsetLine || 1;
  }

  /**
   * Initializes the parser by loading necessary dependencies.
   * This method ensures initialization is performed only once.
   */
  private async init() {
    if (this.isInit) {
      return;
    }

    try {
      await sourceMapParser.init();
      this.isInit = true;
    } catch (error) {
      throw new Error("parser init error: " + (error instanceof Error ? error.message : error), {
        cause: error,
      });
    }
  }

  /**
   * Fetches the content of a source map file from a given URL.
   * 
   * @param url - The URL of the source map file.
   * @returns The content of the source map file as a string.
   * @throws An error if the fetch operation fails or URL is invalid.
   * 
   * @todo Add caching for fetched source maps.
   */
  private async fetchSourceMapContent(url: string) {
    // Validate URL to prevent SSRF attacks
    validateUrl(url);

    try {
      const res = await fetch(url, {
        method: 'GET',
      });

      if (!res.ok) {
        throw new Error(`fetch source map error: ${res.status} ${res.statusText}`);
      }

      const buffer = await res.arrayBuffer();
      return arrayBufferToString(buffer);
    } catch (error) {
      throw new Error("fetch source map error: " + (error instanceof Error ? error.message : error), {
        cause: error,
      });
    }

  }

  /**
   * Parses an array of stack trace objects and returns the results in batch.
   * 
   * @param stackArr - An array of stack trace objects to parse.
   * @returns A batch parse result containing success or failure for each stack trace.
   */
  public async batchParseStack(stackArr: Stack[]): Promise<BatchParseResult> {
    if (!stackArr.length) return [];

    // Ensure initialization is complete
    await this.init();

    const result: BatchParseResult = [];

    // Step 1: Get all necessary source map contents, eliminating duplicates
    const uniqueUrls = [...new Set(stackArr.map(stack => stack.sourceMapUrl))];
    const sourceMapMap = new Map<string, string>();
    const sourceMapErrors = new Map<string, Error>();
    // Fetch all unique source maps in parallel
    await Promise.all(uniqueUrls.map(async (url) => {
      try {
        const content = await this.fetchSourceMapContent(url);
        sourceMapMap.set(url, content);
      } catch (error) {
        sourceMapErrors.set(url, error instanceof Error
          ? error
          : new Error("fetch source map error: " + error));
      }
    }));

    // Step 2: Generate tokens using the fetched source map contents
    await Promise.all(stackArr.map(async (stack, idx) => {
      // If source map fetch failed, return an error directly
      if (sourceMapErrors.has(stack.sourceMapUrl)) {
        result[idx] = {
          success: false,
          error: new Error("parse token error: source map fetch failed", {
            cause: sourceMapErrors.get(stack.sourceMapUrl)
          })
        };
        return;
      }

      // Use the fetched source map content
      const sourceMapContent = sourceMapMap.get(stack.sourceMapUrl);
      if (!sourceMapContent) {
        result[idx] = {
          success: false,
          error: new Error("parse token error: source map content not found")
        };
        return;
      }

      try {
        // Use the dedicated method to get the token
        const token = await this.getSourceToken(stack.line, stack.column, sourceMapContent);
        result[idx] = {
          success: true,
          token,
        };
      } catch (error) {
        result[idx] = {
          success: false,
          error: new Error("parse token error: " + (error instanceof Error ? error.message : error), {
            cause: error,
          })
        };
      }
    }));

    return result;
  }
  /**
   * Parses a single stack trace object and returns the corresponding token.
   * 
   * @param stack - The stack trace object to parse.
   * @returns A parsed token object.
   */
  public async parseStack(stack: Stack): Promise<Token> {
    const sourceMapContent = await this.fetchSourceMapContent(stack.sourceMapUrl);
    return this.getSourceToken(stack.line, stack.column, sourceMapContent);
  }

  /**
   * Validates that the parsed token matches the expected Token interface
   * @param token - The parsed token object to validate
   * @throws Error if the token doesn't match the expected structure
   */
  private validateToken(token: any): asserts token is Token {
    if (!token || typeof token !== 'object') {
      throw new Error('Invalid token: expected an object');
    }
    
    if (typeof token.line !== 'number' || token.line < 0) {
      throw new Error('Invalid token: line must be a non-negative number');
    }
    
    if (typeof token.column !== 'number' || token.column < 0) {
      throw new Error('Invalid token: column must be a non-negative number');
    }
    
    if (typeof token.src !== 'string') {
      throw new Error('Invalid token: src must be a string');
    }
    
    if (!Array.isArray(token.sourceCode)) {
      throw new Error('Invalid token: sourceCode must be an array');
    }
    
    // Validate each source code entry
    for (const code of token.sourceCode) {
      if (typeof code.line !== 'number' || code.line < 0) {
        throw new Error('Invalid source code entry: line must be a non-negative number');
      }
      if (typeof code.isStackLine !== 'boolean') {
        throw new Error('Invalid source code entry: isStackLine must be a boolean');
      }
      if (typeof code.raw !== 'string') {
        throw new Error('Invalid source code entry: raw must be a string');
      }
    }
  }

  /**
   * Retrieves the source token for a given line and column in the source map.
   * 
   * @param line - The line number in the source map.
   * @param column - The column number in the source map.
   * @param sourceMap - The content of the source map file.
   * @returns A parsed token object.
   * @throws An error if the token generation fails.
   */
  public async getSourceToken(line: number, column: number, sourceMap: string): Promise<Token> {
    await this.init();

    try {
      const res = sourceMapParser.generate_token_by_single_stack(line, column, sourceMap, this.contextOffsetLine);
      const token = JSON.parse(res);
      
      // Validate the token structure
      this.validateToken(token);
      
      return token;

    } catch (error) {
      throw new Error("parse token error: " + (error instanceof Error ? error.message : error), {
        cause: error,
      });
    }
  }
}
export default Parser;