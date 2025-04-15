import { describe, it, expect, beforeEach } from 'vitest';
import MemoryCacheManager from '../src/memoryCacheManager';

describe('MemoryCacheManager', () => {
  let cache: MemoryCacheManager;

  beforeEach(() => {
    cache = new MemoryCacheManager({ maxSize: 1 }); // 1MB for testing
  });

  it('should use default maxSize when config is not provided', () => {
    expect(new MemoryCacheManager().getStats().maxSize).toBe(200 * 1024 * 1024);
  });


  it('should set and get cache entry', () => {
    const url = 'http://test.com/resource';
    const data = Buffer.from('hello world');
    const etag = 'etag-123';

    cache.set(url, data, etag);
    const entry = cache.get(url);

    expect(entry).not.toBeNull();
    expect(entry!.url).toBe(url);
    expect(entry!.etag).toBe(etag);
    expect(entry!.data.equals(data)).toBe(true);
  });

  it('should update lastAccessed on get', () => {
    const url = 'http://test.com/resource';
    const data = Buffer.from('data');
    const etag = 'etag-1';

    cache.set(url, data, etag);
    const entry1 = cache.get(url);
    const lastAccessed1 = entry1!.lastAccessed;

    // Wait a bit and get again
    setTimeout(() => {
      const entry2 = cache.get(url);
      expect(entry2!.lastAccessed).toBeGreaterThanOrEqual(lastAccessed1);
    }, 10);
  });

  it('should evict oldest entry when exceeding max size', () => {
    // maxSize = 1MB, each buffer is 600KB
    const bufA = Buffer.alloc(600 * 1024, 1);
    const bufB = Buffer.alloc(600 * 1024, 2);

    cache.set('a', bufA, 'etag-a');
    cache.set('b', bufB, 'etag-b'); // should evict 'a'

    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).not.toBeNull();
  });

  it('should throw if single entry exceeds max size', () => {
    const bigBuf = Buffer.alloc(2 * 1024 * 1024, 1); // 2MB
    expect(() => cache.set('big', bigBuf, 'etag-big')).toThrow();
  });

  it('should clear all cache', () => {
    cache.set('x', Buffer.from('1'), 'e1');
    cache.set('y', Buffer.from('2'), 'e2');
    cache.clear();
    expect(cache.getStats().entries).toBe(0);
    expect(cache.get('x')).toBeNull();
    expect(cache.get('y')).toBeNull();
  });

  it('should return correct stats', () => {
    cache.set('foo', Buffer.from('abc'), 'e');
    const stats = cache.getStats();
    expect(stats.entries).toBe(1);
    expect(stats.totalSize).toBe(Buffer.from('abc').length);
    expect(stats.maxSize).toBe(1 * 1024 * 1024);
  });

  it('should update cache size correctly when overwriting an existing entry', () => {
    const url = 'http://test.com/resource';
    const data1 = Buffer.alloc(100, 1);
    const data2 = Buffer.alloc(200, 2);
    const etag1 = 'etag-1';
    const etag2 = 'etag-2';

    cache.set(url, data1, etag1);
    const sizeAfterFirst = cache.getStats().totalSize;
    expect(sizeAfterFirst).toBe(100);

    cache.set(url, data2, etag2);
    const sizeAfterSecond = cache.getStats().totalSize;
    expect(sizeAfterSecond).toBe(200);

    const entry = cache.get(url);
    expect(entry).not.toBeNull();
    expect(entry!.etag).toBe(etag2);
    expect(entry!.data.equals(data2)).toBe(true);
  });
});