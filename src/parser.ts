import { stackParserJsSdk } from './external/index.js';

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

class Parser {
  /** Indicates whether the parser has been initialized */
  private isInit = false;

  /**
   * Initializes the parser by loading necessary dependencies.
   * This method ensures initialization is performed only once.
   */
  private async init() {
    if (this.isInit) {
      return;
    }

    try {
      await stackParserJsSdk.default();
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
   * @throws An error if the fetch operation fails.
   * 
   * @todo Add caching for fetched source maps.
   */
  private async fetchSourceMapContent(url: string) {

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
  public async batchParseStack(stackArr: Stack[], contextOffsetLine?: number): Promise<BatchParseResult> {
    const result: BatchParseResult = [];

    await Promise.all(stackArr.map(async (stack) => {
      try {
        const sourceMapContent = await this.fetchSourceMapContent(stack.sourceMapUrl);
        const token = await this.getSourceToken(stack.line, stack.column, sourceMapContent, contextOffsetLine);
        result.push({
          success: true,
          token,
        });
      } catch (error) {
        result.push({
          success: false,
          error: error instanceof Error ? error : new Error("unknown error", {
            cause: error,
          }),
        });
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
  public async praseStack(stack: Stack, contextOffsetLine?: number): Promise<Token> {
    const sourceMapContent = await this.fetchSourceMapContent(stack.sourceMapUrl);
    return this.getSourceToken(stack.line, stack.column, sourceMapContent, contextOffsetLine);
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
  public async getSourceToken(line: number, column: number, sourceMap: string, contextOffsetLine?: number): Promise<Token> {
    await this.init();

    try {
      const res = await stackParserJsSdk.generate_token_by_single_stack(line, column, sourceMap, contextOffsetLine);
      return JSON.parse(res) satisfies Token;

    } catch (error) {
      throw new Error("parse token error: " + (error instanceof Error ? error.message : error), {
        cause: error,
      });
    }
  }
}

export default new Parser();