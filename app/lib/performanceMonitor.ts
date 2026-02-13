/**
 * Performance Monitoring Module
 * Tracks critical performance metrics throughout the application
 */

export interface PerformanceMetrics {
  // Page Load Metrics
  pageLoadTime?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;

  // Audio Analysis Metrics
  audioAnalysisTime?: number;
  frequencyDataSize?: number;
  analysisFPS?: number;

  // Animation Metrics
  animationFrameTime?: number;
  animationFPS?: number;
  morphTargetUpdateTime?: number;

  // Memory Metrics
  heapSizeUsed?: number;
  heapSizeTotal?: number;
  externalMemoryUsed?: number;

  // CPU Metrics
  cpuUsage?: number;

  // Network Metrics
  dnsTime?: number;
  tcpTime?: number;
  ttfb?: number; // Time to First Byte
  downloadTime?: number;

  // Audio Sync Metrics
  audioLatency?: number;
  syncDrift?: number; // How far audio animation drifts from actual audio
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private frameTimestamps: number[] = [];
  private analysisTimestamps: number[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.initializeObservers();
  }

  /**
   * Initialize Performance Observer to track Web Vitals
   */
  private initializeObservers() {
    try {
      // Observe Long Tasks (TBT)
      if ("PerformanceObserver" in window) {
        try {
          const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              console.log("[Performance] Long Task:", entry.duration.toFixed(2) + "ms");
            }
          });
          longTaskObserver.observe({ entryTypes: ["longtask"] });
          this.observers.set("longtask", longTaskObserver);
        } catch (e) {
          console.log("[Performance] Long Task API not available");
        }

        // Observe Navigation Timing
        try {
          const navigationObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === "navigation") {
                const navEntry = entry as PerformanceNavigationTiming;
                this.metrics.pageLoadTime =
                  navEntry.loadEventEnd - navEntry.fetchStart;
                this.metrics.firstContentfulPaint = this.getMetricValue(
                  "first-contentful-paint"
                );
                this.metrics.largestContentfulPaint = this.getMetricValue(
                  "largest-contentful-paint"
                );

                console.log("[Performance] Page Load:", {
                  total: this.metrics.pageLoadTime?.toFixed(0),
                  fcp: this.metrics.firstContentfulPaint?.toFixed(0),
                  lcp: this.metrics.largestContentfulPaint?.toFixed(0)
                });
              }
            }
          });
          navigationObserver.observe({ entryTypes: ["navigation"] });
          this.observers.set("navigation", navigationObserver);
        } catch (e) {
          console.log("[Performance] Navigation Timing not available");
        }
      }
    } catch (e) {
      console.warn("[Performance] Observer initialization failed:", e);
    }
  }

  /**
   * Record audio analysis frame
   */
  recordAudioAnalysisFrame(duration: number) {
    if (!this.enabled) return;

    this.metrics.audioAnalysisTime = duration;
    this.analysisTimestamps.push(performance.now());

    // Keep last 60 frames for FPS calculation
    if (this.analysisTimestamps.length > 60) {
      this.analysisTimestamps.shift();
    }

    this.calculateAudioAnalysisFPS();
  }

  /**
   * Record animation frame
   */
  recordAnimationFrame(duration: number) {
    if (!this.enabled) return;

    this.metrics.animationFrameTime = duration;
    this.frameTimestamps.push(performance.now());

    // Keep last 60 frames for FPS calculation
    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift();
    }

    this.calculateAnimationFPS();
  }

  /**
   * Record morph target update time
   */
  recordMorphTargetUpdate(duration: number) {
    if (!this.enabled) return;
    this.metrics.morphTargetUpdateTime = duration;
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    if (!this.enabled) return;

    if ("memory" in performance) {
      const perfMemory = (performance as any).memory;
      this.metrics.heapSizeUsed = perfMemory.usedJSHeapSize / 1048576; // Convert to MB
      this.metrics.heapSizeTotal = perfMemory.totalJSHeapSize / 1048576; // Convert to MB
    }
  }

  /**
   * Calculate animation FPS from frame timestamps
   */
  private calculateAnimationFPS() {
    if (this.frameTimestamps.length < 2) return;

    const timeSpan =
      this.frameTimestamps[this.frameTimestamps.length - 1] -
      this.frameTimestamps[0];

    if (timeSpan > 0) {
      this.metrics.animationFPS = (
        (this.frameTimestamps.length / timeSpan) *
        1000
      ).toFixed(1) as any;
    }
  }

  /**
   * Calculate audio analysis FPS
   */
  private calculateAudioAnalysisFPS() {
    if (this.analysisTimestamps.length < 2) return;

    const timeSpan =
      this.analysisTimestamps[this.analysisTimestamps.length - 1] -
      this.analysisTimestamps[0];

    if (timeSpan > 0) {
      this.metrics.analysisFPS = (
        (this.analysisTimestamps.length / timeSpan) *
        1000
      ).toFixed(1) as any;
    }
  }

  /**
   * Get specific metric value from Performance API
   */
  private getMetricValue(entryName: string): number | undefined {
    try {
      const entries = performance.getEntriesByName(entryName);
      if (entries.length > 0) {
        return (entries[0] as any).startTime;
      }
    } catch (e) {
      // Metric not available
    }
    return undefined;
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics {
    this.recordMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * Log metrics to console
   */
  logMetrics() {
    if (!this.enabled) return;

    const metrics = this.getMetrics();

    console.log(
      "%c[Performance Metrics]",
      "color: #00AA00; font-weight: bold; font-size: 12px",
      metrics
    );

    // Detailed breakdown
    if (metrics.animationFPS) {
      console.log(`  Animation FPS: ${metrics.animationFPS}`);
    }
    if (metrics.audioAnalysisTime) {
      console.log(
        `  Audio Analysis: ${metrics.audioAnalysisTime.toFixed(2)}ms`
      );
    }
    if (metrics.heapSizeUsed) {
      console.log(
        `  Memory: ${metrics.heapSizeUsed.toFixed(1)}MB / ${metrics.heapSizeTotal?.toFixed(1)}MB`
      );
    }
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {};
    this.frameTimestamps = [];
    this.analysisTimestamps = [];
  }

  /**
   * Export metrics for analysis
   */
  export(): string {
    const metrics = this.getMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Check if performance is acceptable
   */
  isPerformanceAcceptable(): {
    isAcceptable: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const metrics = this.getMetrics();

    // Check animation FPS
    if (metrics.animationFPS && metrics.animationFPS < 40) {
      issues.push(
        `Animation FPS too low: ${metrics.animationFPS} (target: 60+)`
      );
    }

    // Check audio analysis time
    if (metrics.audioAnalysisTime && metrics.audioAnalysisTime > 5) {
      issues.push(
        `Audio analysis too slow: ${metrics.audioAnalysisTime.toFixed(2)}ms (target: <5ms)`
      );
    }

    // Check memory usage
    if (metrics.heapSizeUsed && metrics.heapSizeUsed > 200) {
      issues.push(
        `Memory usage too high: ${metrics.heapSizeUsed.toFixed(1)}MB (target: <200MB)`
      );
    }

    // Check page load time
    if (metrics.pageLoadTime && metrics.pageLoadTime > 5000) {
      issues.push(
        `Page load too slow: ${(metrics.pageLoadTime / 1000).toFixed(1)}s (target: <3s)`
      );
    }

    return {
      isAcceptable: issues.length === 0,
      issues
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.observers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch (e) {
        // Observer cleanup failed
      }
    });
    this.observers.clear();
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

export function destroyPerformanceMonitor() {
  if (monitorInstance) {
    monitorInstance.destroy();
    monitorInstance = null;
  }
}
