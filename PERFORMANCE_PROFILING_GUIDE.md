# Performance Profiling Guide

This guide explains how to use the performance profiling tools to measure and validate optimizations.

## Quick Start

### AudioAnalyzer Mobile Optimization

The `AudioAnalyzer` now includes mobile optimizations:
- **Adaptive FFT size**: 128-bin on mobile (50% less computation), 256-bin on desktop
- **Frame skipping**: On low FPS (<30 FPS), skip analysis every other frame
- **Object pooling**: Frequency data buffers are reused to reduce allocations

#### Test the optimization:

```bash
npm test
# All 64 tests should pass, including new mobile optimization tests
```

## Using the Performance Profiler

### 1. Profile a Single Function

```typescript
import { profiler, PerformanceProfiler } from "@/app/lib/performanceProfiler";

// Profile with global profiler
const result = profiler.profile("my-function", () => {
  // Code to profile
  audioAnalyzer.analyze();
}, 1000); // Run 1000 times

console.log(PerformanceProfiler.formatResult(result));
// Output:
// my-function:
//   Total: 51ms
//   Per iteration: 0.0510ms
//   Throughput: 19607 ops/sec
```

### 2. Compare Baseline vs Optimized

```typescript
import { profiler, PerformanceProfiler } from "@/app/lib/performanceProfiler";

const comparison = profiler.compare(
  "audio-analysis",
  () => {
    // Baseline implementation
    audioAnalyzer.analyze(); // 256-bin FFT
  },
  () => {
    // Optimized implementation (on mobile)
    const mobileAnalyzer = new AudioAnalyzer({ fftSize: 128 });
    mobileAnalyzer.analyze();
  },
  1000
);

console.log(PerformanceProfiler.formatComparison(comparison));
// Output:
// audio-analysis (baseline) vs audio-analysis (optimized):
//   Baseline: 51ms (19607 ops/sec)
//   Optimized: 25ms (40000 ops/sec)
//   ✅ Faster: +50.9% (2.04x speedup)
```

### 3. Measure Memory Impact

```typescript
import { memoryProfiler, MemoryProfiler } from "@/app/lib/performanceProfiler";

memoryProfiler.start();

// Code that allocates memory
for (let i = 0; i < 100; i++) {
  const analyzer = new AudioAnalyzer();
  analyzer.analyze();
}

const result = memoryProfiler.end();
console.log(MemoryProfiler.formatResult(result));
// Output:
// Duration: 15.23ms
// Memory delta: +2.34MB
// Heap used: 145.6MB
```

### 4. Measure Frame Rate

```typescript
import { frameRateProfiler, FrameRateProfiler } from "@/app/lib/performanceProfiler";

// Simulate animation loop
for (let i = 0; i < 300; i++) {
  frameRateProfiler.recordFrame();
  // Do frame work...
  const targets = audioAnalyzer.analyze();
  // Update avatar with targets...
}

const stats = frameRateProfiler.getStats();
console.log(FrameRateProfiler.formatStats(stats));
// Output:
// Frame Rate Analysis:
//   Average: 59.8 FPS
//   Min: 45.2 FPS
//   Max: 62.1 FPS
//   P99: 58.5 FPS
//   Dropped frames: 2
```

## Performance Testing Workflow

### Phase 5c Optimization Cycle

For each optimization, follow this cycle:

1. **Baseline Measurement** (before optimization)
   ```typescript
   const baseline = profiler.profile(
     "feature-name",
     () => originalImplementation(),
     1000
   );
   ```

2. **Implement Optimization**
   - Modify code
   - Ensure tests pass

3. **Measure Optimization** (after optimization)
   ```typescript
   const optimized = profiler.profile(
     "feature-name",
     () => optimizedImplementation(),
     1000
   );

   const comparison = {
     baseline,
     optimized,
     improvement: ((baseline.duration - optimized.duration) / baseline.duration) * 100,
     speedup: baseline.duration / optimized.duration
   };
   ```

4. **Verify Against Targets**
   - Check against goals from PERFORMANCE_OPTIMIZATION_GUIDE.md
   - Ensure no regressions in other areas

5. **Document Results**
   - Record before/after metrics
   - Update PHASE_5C_PERFORMANCE.md with actual results

## Optimization Priorities

### Priority 1 - Priority 1 (DONE)
✅ **AudioAnalyzer Mobile Optimization**
- Expected: 20% CPU reduction on mobile
- Implementation: Adaptive FFT size (128 vs 256)
- Status: COMPLETE with tests passing

### Priority 1 - Priority 2 (TODO)
- **LIT-LAND Model Lazy Loading** (40% load time improvement)
  - Lazy load avatar.wasm on viewport visibility
  - Implement with IntersectionObserver

### Priority 1 - Priority 3 (TODO)
- **JavaScript Bundle Splitting** (30% TTI improvement)
  - Dynamic imports for heavy components
  - Code splitting by route

## Chrome DevTools Profiling

### Network Profiling

1. Open Chrome DevTools → Network tab
2. Throttle network (simulate 4G)
3. Throttle CPU (4x slowdown for mobile simulation)
4. Reload page
5. Measure:
   - HTML/CSS/JS download time
   - Parse + evaluate time
   - Total page load time

### JavaScript Profiling

1. Open Chrome DevTools → Performance tab
2. Click record
3. Interact with app
4. Stop recording
5. Analyze:
   - JavaScript execution time
   - Paint time
   - Composite time
6. Check for:
   - Long tasks (>50ms)
   - Jank (dropped frames)
   - Layout thrashing

### Memory Profiling

1. Open Chrome DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Interact with app (analyze audio, animate avatar)
4. Take another heap snapshot
5. Compare:
   - Detached DOM nodes
   - Unreleased memory
   - Object allocations

## Performance Budgets

### Target Metrics

**Desktop (Chrome)**
- Page load: < 3 seconds
- Largest Contentful Paint (LCP): < 2.5 seconds
- Avatar animation: 60 FPS sustained
- Memory: < 200MB peak

**Mobile (iOS Safari)**
- Page load: < 5 seconds
- Avatar animation: 40+ FPS sustained
- Memory: < 150MB peak
- Battery: < 5% per hour

**Audio Analysis**
- Per-frame analysis: < 5ms
- Throughput: 60+ FPS
- No frame drops

## Common Profiling Tasks

### Profile Audio Analysis

```typescript
import { profiler } from "@/app/lib/performanceProfiler";

// Desktop
const desktopResult = profiler.profile(
  "audio-analysis-desktop",
  () => new AudioAnalyzer({ fftSize: 256 }).analyze(),
  1000
);

// Mobile
const mobileResult = profiler.profile(
  "audio-analysis-mobile",
  () => new AudioAnalyzer({ fftSize: 128 }).analyze(),
  1000
);

console.log("Desktop:", desktopResult.avgPerIteration.toFixed(4), "ms");
console.log("Mobile:", mobileResult.avgPerIteration.toFixed(4), "ms");
console.log("Speedup:", desktopResult.duration / mobileResult.duration, "x");
```

### Profile Animation Loop

```typescript
import { frameRateProfiler, audioAnalyzer } from "@/app/lib/performanceProfiler";

const animationLoopTest = () => {
  for (let frame = 0; frame < 300; frame++) {
    frameRateProfiler.recordFrame();

    // Measure animation frame
    const startFrame = performance.now();
    const targets = audioAnalyzer.analyze();
    // Update avatar with targets
    const frameTime = performance.now() - startFrame;
  }

  const stats = frameRateProfiler.getStats();
  console.log(`Average FPS: ${stats.averageFPS.toFixed(1)}`);
  console.log(`Dropped frames: ${stats.droppedFrames}`);

  return stats;
};

const results = animationLoopTest();
```

### Compare Bundle Sizes

```bash
# Build the application
npm run build

# Analyze bundle size
npx next-bundle-analyzer
```

## Performance Monitoring in Production

Once deployed, monitor with:

1. **Sentry Performance Monitoring**
   - Real user monitoring (RUM)
   - Transaction tracking
   - Error correlation

2. **Custom Performance Metrics**
   - Use `performanceMonitor.ts` for app-specific metrics
   - Send to analytics backend
   - Alert on regressions

3. **Chrome User Experience Report (CrUX)**
   - Real-world performance data
   - Pinpoint issues on specific devices
   - Track improvements over time

## Troubleshooting

### Memory Leaks
```typescript
// Check for unreleased resources
const initial = performance.memory.usedJSHeapSize;

for (let i = 0; i < 100; i++) {
  const analyzer = new AudioAnalyzer();
  analyzer.initialize(audioElement);
  analyzer.destroy();
}

const final = performance.memory.usedJSHeapSize;
console.log(`Memory growth: ${(final - initial) / 1024 / 1024}MB`);

// Should be near zero if cleanup is working
```

### Frame Rate Drops
```typescript
// Enable performance monitoring in app
import { getPerformanceMonitor } from "@/app/lib/performanceMonitor";

const monitor = getPerformanceMonitor();
setInterval(() => {
  monitor.logMetrics();
}, 5000);

// Check for:
// - Animation FPS < 40 (target issue)
// - Audio analysis > 5ms (needs optimization)
// - Long tasks in console
```

### CPU Usage Spikes
```typescript
// Profile CPU-intensive code
const profiler = new PerformanceProfiler();

// Before optimization
const baseline = profiler.profile("cpu-intensive", () => {
  // Original code
}, 100);

// After optimization
const optimized = profiler.profile("cpu-intensive", () => {
  // Optimized code
}, 100);

console.log(`CPU improvement: ${baseline.duration / optimized.duration}x`);
```

## Next Steps

After Phase 5c optimizations are complete and validated:

1. **Phase 5d: Deployment Preparation**
   - Set up production monitoring
   - Configure performance budgets in CI/CD
   - Set up error tracking (Sentry)

2. **Phase 5e: Production Launch**
   - Deploy with monitoring active
   - Collect real-world metrics
   - Alert on performance regressions

3. **Ongoing: Monitor & Optimize**
   - Track metrics daily
   - Investigate performance regressions
   - Plan next optimization cycle
