/**
 * WebAssembly Lazy Loader - Defers WASM module loading until needed
 *
 * Implements Priority 2 optimization: LIT-LAND Model Lazy Loading
 * - Saves ~5MB on initial page load
 * - Loads WebAssembly module when avatar becomes visible
 * - Caches module for subsequent uses
 */

interface WasmCache {
  module?: WebAssembly.Module;
  instance?: WebAssembly.Instance;
  timestamp: number;
}

interface WasmLoaderOptions {
  /** Maximum time to cache WASM module (default: 5 minutes) */
  cacheTimeMs?: number;
  /** Optional progress callback during loading */
  onProgress?: (progress: number) => void;
}

class WasmLazyLoader {
  private cache: Map<string, WasmCache> = new Map();
  private loadingPromises: Map<string, Promise<WebAssembly.Module>> = new Map();
  private cacheTimeMs: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Load a WebAssembly module with lazy loading and caching
   * Defers network request until explicitly called
   *
   * @param url - Path to .wasm file (e.g., "/lit-land/avatar.wasm")
   * @param options - Loading options
   * @returns Promise resolving to WebAssembly.Module
   */
  async load(
    url: string,
    options: WasmLoaderOptions = {}
  ): Promise<WebAssembly.Module> {
    // Set cache time if provided
    if (options.cacheTimeMs !== undefined) {
      this.cacheTimeMs = options.cacheTimeMs;
    }

    // Return cached module if valid
    const cached = this.cache.get(url);
    if (cached && this.isCacheValid(cached)) {
      console.log(`[WasmLazyLoader] Using cached WASM: ${url}`);
      return cached.module!;
    }

    // Return pending promise if already loading
    if (this.loadingPromises.has(url)) {
      console.log(`[WasmLazyLoader] Returning existing load promise: ${url}`);
      return this.loadingPromises.get(url)!;
    }

    // Create new loading promise
    const loadPromise = this.performLoad(url, options);
    this.loadingPromises.set(url, loadPromise);

    // Remove from pending on completion
    loadPromise
      .then(() => {
        this.loadingPromises.delete(url);
      })
      .catch(() => {
        this.loadingPromises.delete(url);
      });

    return loadPromise;
  }

  /**
   * Internal method to perform actual WASM loading and parsing
   */
  private async performLoad(
    url: string,
    options: WasmLoaderOptions
  ): Promise<WebAssembly.Module> {
    try {
      console.log(`[WasmLazyLoader] Loading WASM: ${url}`);

      const startTime = performance.now();

      // Fetch the WebAssembly binary
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.statusText}`);
      }

      // Get total size for progress tracking
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Read response body with progress tracking
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          loaded += value.length;

          if (total > 0 && options.onProgress) {
            const progress = (loaded / total) * 100;
            options.onProgress(progress);
          }
        }
      } else {
        // Fallback for environments without ReadableStream
        const arrayBuffer = await response.arrayBuffer();
        chunks.push(new Uint8Array(arrayBuffer));
      }

      // Combine chunks into single buffer
      const wasmBuffer = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      );
      let offset = 0;
      for (const chunk of chunks) {
        wasmBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Parse WebAssembly module
      const wasmModule = await WebAssembly.compile(wasmBuffer);

      // Cache the module
      this.cache.set(url, {
        module: wasmModule,
        timestamp: Date.now(),
      });

      const loadTime = performance.now() - startTime;
      console.log(
        `[WasmLazyLoader] WASM loaded successfully: ${url} (${(wasmBuffer.length / 1024 / 1024).toFixed(2)}MB in ${loadTime.toFixed(0)}ms)`
      );

      return module;
    } catch (error) {
      console.error(`[WasmLazyLoader] Failed to load WASM: ${url}`, error);
      throw error;
    }
  }

  /**
   * Check if cached module is still valid
   */
  private isCacheValid(cache: WasmCache): boolean {
    if (!cache.module) return false;

    const age = Date.now() - cache.timestamp;
    const isValid = age < this.cacheTimeMs;

    if (!isValid) {
      console.log(`[WasmLazyLoader] Cache expired (${(age / 1000).toFixed(0)}s old)`);
    }

    return isValid;
  }

  /**
   * Clear all cached modules
   */
  clearCache(): void {
    this.cache.clear();
    console.log("[WasmLazyLoader] Cache cleared");
  }

  /**
   * Clear specific cached module
   */
  clearCacheForUrl(url: string): void {
    this.cache.delete(url);
    console.log(`[WasmLazyLoader] Cache cleared for: ${url}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cachedModules: number;
    totalCacheSize: number;
    loadingRequests: number;
  } {
    return {
      cachedModules: this.cache.size,
      totalCacheSize: Array.from(this.cache.values()).length,
      loadingRequests: this.loadingPromises.size,
    };
  }
}

/**
 * Global singleton instance
 */
let globalLoader: WasmLazyLoader | null = null;

/**
 * Get or create global WASM lazy loader instance
 */
export function getWasmLazyLoader(): WasmLazyLoader {
  if (!globalLoader) {
    globalLoader = new WasmLazyLoader();
  }
  return globalLoader;
}

/**
 * Convenience function to preload WASM module
 * Call this after user interacts but before avatar needs it
 *
 * @param wasmPath - Path to WASM file
 * @param onProgress - Optional progress callback (0-100)
 */
export async function preloadWasm(
  wasmPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const loader = getWasmLazyLoader();
  await loader.load(wasmPath, { onProgress });
}

/**
 * Direct export for cleaner imports
 */
export { WasmLazyLoader };
