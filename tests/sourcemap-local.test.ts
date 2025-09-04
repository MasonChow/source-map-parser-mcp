import { describe, it, expect } from 'vitest';
import Parser from '../src/parser.js';
import fs from 'fs/promises';
import path from 'path';

describe('Source Map Parser Issue - Local File', () => {
  it('should parse source map tokens correctly with local file', async () => {
    const parser = new Parser({ contextOffsetLine: 1 });
    
    // Read the local source map file
    const sourceMapPath = path.join(process.cwd(), 'example', 'special', 'foo.js.map');
    const sourceMapContent = await fs.readFile(sourceMapPath, 'utf-8');
    
    try {
      console.log('Testing with local source map...');
      
      // Use the getSourceToken method directly to test the parsing
      const token = await parser.getSourceToken(49, 34832, sourceMapContent);
      console.log('Parsed token:', JSON.stringify(token, null, 2));
      
      expect(token).toBeDefined();
      expect(typeof token.line).toBe('number');
      expect(typeof token.column).toBe('number');
      expect(typeof token.src).toBe('string');
      expect(Array.isArray(token.sourceCode)).toBe(true);
      
    } catch (error) {
      console.error('Error during parsing:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  });
});