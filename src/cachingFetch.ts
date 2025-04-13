// Cache entry type
interface CacheEntry {
  url: string;
  etag: string;
  data: Buffer;
  size: number;
  lastAccessed: number;
}

// Memory cache manager
class MemoryCacheManager {
  private cacheMap: Map<string, CacheEntry> = new Map();
  private currentSize: number = 0;
  private readonly maxSize: number = 200 * 1024 * 1024; // 200MB in bytes

  constructor() { }

  // Get cache entry
  public get(url: string): CacheEntry | null {
    const entry = this.cacheMap.get(url);
    if (entry) {
      // Update last accessed time
      entry.lastAccessed = Date.now();
      return entry;
    }
    return null;
  }

  // Set cache entry
  public set(url: string, data: Buffer, etag: string): void {
    const size = data.length;

    // If adding a new entry would exceed the maximum cache size, clean up space first
    if (this.currentSize + size > this.maxSize) {
      this.cleanup(size);
    }

    // If entry already exists, update the cache size first
    if (this.cacheMap.has(url)) {
      this.currentSize -= this.cacheMap.get(url)!.size;
    }

    // Create new cache entry
    const entry: CacheEntry = {
      url,
      etag,
      data,
      size,
      lastAccessed: Date.now()
    };

    // Save to memory
    this.cacheMap.set(url, entry);
    this.currentSize += size;
  }

  // Clean up cache to free up space
  private cleanup(neededSpace: number): void {
    // If a single request already exceeds the maximum cache size, it cannot be cached
    if (neededSpace > this.maxSize) {
      throw new Error(`Resource size ${neededSpace} bytes exceeds maximum cache size ${this.maxSize} bytes`);
    }

    // Sort by last accessed time
    const entries = Array.from(this.cacheMap.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest entries until there is enough space
    while (this.currentSize + neededSpace > this.maxSize && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.cacheMap.delete(key);
      this.currentSize -= entry.size;
    }
  }

  // Get current cache size information
  public getStats(): { entries: number, totalSize: number, maxSize: number } {
    return {
      entries: this.cacheMap.size,
      totalSize: this.currentSize,
      maxSize: this.maxSize
    };
  }

  // Clear cache
  public clear(): void {
    this.cacheMap.clear();
    this.currentSize = 0;
  }
}

// Global cache manager instance
const cacheManager = new MemoryCacheManager();

/**
 * Enhanced fetch function that supports ETag-based memory caching
 * @param url Request URL
 * @param options Fetch options
 * @returns Promise<Response>
 */
export async function cachingFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Only cache GET requests
  const method = options.method?.toUpperCase() || 'GET';
  if (method !== 'GET') {
    return fetch(url, options);
  }

  // Try to get cache entry
  const cachedEntry = cacheManager.get(url);

  // If there is a cache, add If-None-Match header
  if (cachedEntry) {
    const headers = new Headers(options.headers);
    headers.set('If-None-Match', cachedEntry.etag);
    options = { ...options, headers };
  }

  // Send request
  const response = await fetch(url, options);

  // Handle 304 Not Modified response
  if (response.status === 304 && cachedEntry) {
    // Create new response from cache
    const cachedResponse = new Response(cachedEntry.data, {
      status: 200,
      statusText: 'OK',
      headers: response.headers
    });

    return cachedResponse;
  }

  // If the response is successful and has an ETag header, cache the response
  if (response.ok) {
    const etag = response.headers.get('ETag');
    if (etag) {
      const clonedResponse = response.clone();
      const buffer = Buffer.from(await clonedResponse.arrayBuffer());

      try {
        cacheManager.set(url, buffer, etag);
      } catch (err) {
        console.warn(`Failed to cache response for ${url}:`, err);
      }
    }
  }

  return response;
}

// Also export the cache manager to allow access to cache statistics or manual cache clearing when needed
export { cacheManager };

// Export the enhanced fetch function
export default cachingFetch;