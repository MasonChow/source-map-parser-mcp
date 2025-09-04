import { describe, it, expect } from 'vitest';
import Parser from '../src/parser.js';

describe('Source Map Parser Issue', () => {
  it('should parse source map tokens correctly', async () => {
    const parser = new Parser({ contextOffsetLine: 1 });
    
    const stacks = [
        {
            line: 49,
            column: 34832,
            sourceMapUrl: "https://cdn.jsdelivr.net/gh/MasonChow/source-map-parser-mcp@main/example/special/foo.js.map"
        }
    ];
    
    const result = await parser.batchParseStack(stacks);
    console.log('Parsing result:', JSON.stringify(result, null, 2));
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    
    if (result[0].success) {
      expect(result[0].token).toBeDefined();
      expect(Array.isArray(result[0].token.sourceCode)).toBe(true);
    } else {
      console.error('Parsing failed:', result[0]);
    }
  });
});