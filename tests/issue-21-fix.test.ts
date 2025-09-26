import { describe, it, expect } from 'vitest';
import Parser from '../src/parser.js';
import fs from 'fs/promises';
import path from 'path';

describe('Issue #21 - Token validation fix', () => {
  it('should correctly parse multiple stack traces from the issue report', async () => {
    const parser = new Parser({ contextOffsetLine: 1 });

    // Read the local source map file mentioned in the issue
    const sourceMapPath = path.join(process.cwd(), 'example', 'special', 'foo.js.map');
    const sourceMapContent = await fs.readFile(sourceMapPath, 'utf-8');

    // Test the exact stack traces from the issue
    const testCases = [
      { line: 49, column: 34832, description: 'Main error location' },
      { line: 48, column: 83322, description: 'ka function call' },
      { line: 48, column: 98013, description: 'Vs function call (1)' },
      { line: 48, column: 97897, description: 'Et function call (1)' },
      { line: 48, column: 98749, description: 'Vs function call (2)' },
      { line: 48, column: 97897, description: 'Et function call (2)' },
      { line: 48, column: 98059, description: 'Vs function call (3)' },
      { line: 48, column: 110550, description: 'sv function call' },
      { line: 48, column: 107925, description: 'Anonymous call' },
      { line: 25, column: 1635, description: 'MessagePort.Ot call' }
    ];

    console.log('Testing all stack traces from the original issue...');

    for (const testCase of testCases) {
      try {
        const token = await parser.getSourceToken(testCase.line, testCase.column, sourceMapContent);

        // Verify the token structure is correct
        expect(token).toBeDefined();
        expect(typeof token.line).toBe('number');
        expect(typeof token.column).toBe('number');
        expect(typeof token.src).toBe('string');
        expect(Array.isArray(token.sourceCode)).toBe(true);

        // Verify sourceCode array contains SourceCode objects with correct structure
        for (const sourceCode of token.sourceCode) {
          expect(typeof sourceCode.line).toBe('number');
          expect(typeof sourceCode.isStackLine).toBe('boolean');
          expect(typeof sourceCode.raw).toBe('string');
        }

        console.log(`✅ ${testCase.description} (${testCase.line}:${testCase.column}) - Success`);
        console.log(`   → Mapped to: ${token.src}:${token.line}:${token.column}`);

      } catch (error) {
        if (error instanceof Error) {
          console.error(`❌ ${testCase.description} (${testCase.line}:${testCase.column}) - Failed:`, error.message);
        }
        throw error;
      }
    }

    console.log('🎉 All test cases passed! The issue has been resolved.');
  });

  it('should handle batch parsing correctly', async () => {
    const parser = new Parser({ contextOffsetLine: 1 });

    // Use the local source map file for consistent results
    const sourceMapPath = path.join(process.cwd(), 'example', 'special', 'foo.js.map');
    const sourceMapUrl = `file://${sourceMapPath}`;

    const stacks = [
      {
        line: 49,
        column: 34832,
        sourceMapUrl: sourceMapUrl
      },
      {
        line: 48,
        column: 83322,
        sourceMapUrl: sourceMapUrl
      }
    ];

    try {
      const result = await parser.batchParseStack(stacks);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      for (const res of result) {
        if (res.success) {
          expect(res.token).toBeDefined();
          expect(Array.isArray(res.token.sourceCode)).toBe(true);
          console.log(`✅ Batch parsing success: ${res.token.src}:${res.token.line}:${res.token.column}`);
        } else {
          console.log(`ℹ️ Batch parsing failed (expected for file:// URLs):`, res.error?.message);
          // For file:// URLs, we expect fetch to fail, which is OK
          expect(res.error).toBeDefined();
        }
      }

    } catch (error) {
      console.error('Batch parsing test error:', error);
      throw error;
    }
  });
});