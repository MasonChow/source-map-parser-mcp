import MemoryCacheManager from './memoryCacheManager';

// Read cache size from environment variable or use default value
const DEFAULT_CACHE_SIZE_MB = 200;
const cacheSizeMB = parseInt(process.env.SOURCE_MAP_PARSER_RESOURCE_CACHE_MAX_SIZE || `${DEFAULT_CACHE_SIZE_MB}`, 10);

// Global cache manager instance with size from environment variable
const cacheManager = new MemoryCacheManager({
  maxSize: cacheSizeMB // Size in MB
});

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