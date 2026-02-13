/**
 * Performance Profiler - Development tool for measuring optimization impact
 * Helps identify bottlenecks and validate that optimizations are effective
 */

export interface ProfileResult {
  name: string;
  duration: number; // milliseconds
  opsPerSecond: number;
  iterations: number;
  avgPerIteration: number;
}

export interface ComparisonResult {
  baseline: ProfileResult;
  optimized: ProfileResult;
  improvement: number; // percentage improvement (negative = regression)
  speedup: number; // 2.0 = 2x faster
}

/**
 * Simple profiler for measuring code execution time
 * Usage:
 *   const profiler = new PerformanceProfiler();
 *   profiler.profile("myFunction", () => myFunction(), 1000);
 */
export class PerformanceProfiler {
  /**
   * Profile a function's execution time
   * @param name Description of what's being profiled
   * @param fn Function to profile
   * @param iterations Number of times to run (default: 1000)
   * @returns ProfileResult with timing and throughput info
   */
  profile(name: string, fn: () => void, iterations: number = 1000): ProfileResult {
    // Warm up to avoid JIT compilation effects
    for (let i = 0; i < 10; i++) {
      fn();
    }

    // Actual profiling
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const end = performance.now();

    const duration = end - start;
    const avgPerIteration = duration / iterations;
    const opsPerSecond = 1000 / avgPerIteration;

    return {
      name,
      duration,
      opsPerSecond,
      iterations,
      avgPerIteration
    };
  }

  /**
   * Compare two implementations to measure optimization impact
   * @param name Description of the comparison
   * @param baseline Original implementation
   * @param optimized Optimized implementation
   * @param iterations Number of times to run each (default: 1000)
   * @returns Comparison showing improvement percentage and speedup
   */
  compare(
    name: string,
    baseline: () => void,
    optimized: () => void,
    iterations: number = 1000
  ): ComparisonResult {
    const baselineResult = this.profile(`${name} (baseline)`, baseline, iterations);
    const optimizedResult = this.profile(`${name} (optimized)`, optimized, iterations);

    // Calculate improvement (negative means slower, positive means faster)
    const improvement = ((baselineResult.duration - optimizedResult.duration) / baselineResult.duration) * 100;
    const speedup = baselineResult.duration / optimizedResult.duration;

    return {
      baseline: baselineResult,
      optimized: optimizedResult,
      improvement,
      speedup
    };
  }

  /**
   * Format results for console output
   */
  static formatResult(result: ProfileResult): string {
    return (
      `${result.name}:\n` +
      `  Total: ${result.duration.toFixed(2)}ms\n` +
      `  Per iteration: ${result.avgPerIteration.toFixed(4)}ms\n` +
      `  Throughput: ${result.opsPerSecond.toFixed(0)} ops/sec`
    );
  }

  /**
   * Format comparison results for console output
   */
  static formatComparison(result: ComparisonResult): string {
    const sign = result.improvement >= 0 ? "+" : "";
    const status = result.improvement >= 0 ? "✅ Faster" : "❌ Slower";

    return (
      `${result.baseline.name} vs ${result.optimized.name}:\n` +
      `  Baseline: ${result.baseline.duration.toFixed(2)}ms (${result.baseline.opsPerSecond.toFixed(0)} ops/sec)\n` +
      `  Optimized: ${result.optimized.duration.toFixed(2)}ms (${result.optimized.opsPerSecond.toFixed(0)} ops/sec)\n` +
      `  ${status}: ${sign}${result.improvement.toFixed(1)}% (${result.speedup.toFixed(2)}x speedup)`
    );
  }
}

/**
 * Memory profiler for tracking allocations and heap usage
 */
export class MemoryProfiler {
  private startMemory: number | null = null;
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
    if ("memory" in performance) {
      this.startMemory = (performance as any).memory.usedJSHeapSize;
    }
  }

  end(): {
    duration: number;
    memoryDelta: number | null;
    heapUsed: number | null;
  } {
    const endTime = performance.now();
    let memoryDelta = null;
    let heapUsed = null;

    if ("memory" in performance && this.startMemory !== null) {
      const endMemory = (performance as any).memory.usedJSHeapSize;
      memoryDelta = endMemory - this.startMemory;
      heapUsed = endMemory;
    }

    return {
      duration: endTime - this.startTime,
      memoryDelta,
      heapUsed
    };
  }

  static formatResult(result: {
    duration: number;
    memoryDelta: number | null;
    heapUsed: number | null;
  }): string {
    let output = `Duration: ${result.duration.toFixed(2)}ms`;

    if (result.memoryDelta !== null) {
      const memoryMB = (result.memoryDelta / 1024 / 1024).toFixed(2);
      const sign = result.memoryDelta >= 0 ? "+" : "";
      output += `\nMemory delta: ${sign}${memoryMB}MB`;
    }

    if (result.heapUsed !== null) {
      const heapMB = (result.heapUsed / 1024 / 1024).toFixed(1);
      output += `\nHeap used: ${heapMB}MB`;
    }

    return output;
  }
}

/**
 * Frame rate profiler for measuring animation smoothness
 */
export class FrameRateProfiler {
  private frameTimestamps: number[] = [];
  private maxFrames: number;

  constructor(maxFrames: number = 300) {
    this.maxFrames = maxFrames; // Default: 5 seconds at 60 FPS
  }

  recordFrame(): void {
    this.frameTimestamps.push(performance.now());

    // Keep only recent frames
    if (this.frameTimestamps.length > this.maxFrames) {
      this.frameTimestamps.shift();
    }
  }

  getStats(): {
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    droppedFrames: number;
    p99FPS: number;
  } {
    if (this.frameTimestamps.length < 2) {
      return {
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        droppedFrames: 0,
        p99FPS: 0
      };
    }

    const intervals: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      const delta = this.frameTimestamps[i] - this.frameTimestamps[i - 1];
      intervals.push(delta);
    }

    // Calculate FPS from intervals
    const fpsList = intervals.map((interval) => 1000 / interval).sort((a, b) => a - b);

    const averageFPS = fpsList.reduce((a, b) => a + b, 0) / fpsList.length;
    const minFPS = fpsList[0];
    const maxFPS = fpsList[fpsList.length - 1];
    const p99Index = Math.floor(fpsList.length * 0.01);
    const p99FPS = fpsList[p99Index];

    // Count dropped frames (more than 2x normal frame time = 30ms at 60 FPS)
    const targetFrameTime = 16.67; // 60 FPS
    const droppedFrames = intervals.filter((interval) => interval > targetFrameTime * 2).length;

    return {
      averageFPS,
      minFPS,
      maxFPS,
      droppedFrames,
      p99FPS
    };
  }

  reset(): void {
    this.frameTimestamps = [];
  }

  static formatStats(stats: {
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    droppedFrames: number;
    p99FPS: number;
  }): string {
    return (
      `Frame Rate Analysis:\n` +
      `  Average: ${stats.averageFPS.toFixed(1)} FPS\n` +
      `  Min: ${stats.minFPS.toFixed(1)} FPS\n` +
      `  Max: ${stats.maxFPS.toFixed(1)} FPS\n` +
      `  P99: ${stats.p99FPS.toFixed(1)} FPS\n` +
      `  Dropped frames: ${stats.droppedFrames}`
    );
  }
}

/**
 * Global profiler instance for convenience
 */
export const profiler = new PerformanceProfiler();
export const memoryProfiler = new MemoryProfiler();
export const frameRateProfiler = new FrameRateProfiler();
