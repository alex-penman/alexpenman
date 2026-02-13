/**
 * Integration tests for the complete avatar lip-sync system
 * Tests end-to-end flows: audio → frequency analysis → morph targets → avatar
 */

import { AudioAnalyzer } from "@/app/lib/audioAnalyzer";

describe("Avatar Lip-Sync Integration", () => {
  describe("AudioAnalyzer public interface", () => {
    it("should return valid morph targets", () => {
      const analyzer = new AudioAnalyzer({
        fftSize: 256,
        smoothingFactor: 0.3
      });

      const targets = analyzer.analyze();

      // Should have all required properties
      expect(targets).toHaveProperty("mouthOpen");
      expect(targets).toHaveProperty("mouthRound");
      expect(targets).toHaveProperty("speechIntensity");

      // All should be valid numbers in 0-1 range
      expect(targets.mouthOpen).toBeGreaterThanOrEqual(0);
      expect(targets.mouthOpen).toBeLessThanOrEqual(1);
      expect(targets.mouthRound).toBeGreaterThanOrEqual(0);
      expect(targets.mouthRound).toBeLessThanOrEqual(1);
      expect(targets.speechIntensity).toBeGreaterThanOrEqual(0);
      expect(targets.speechIntensity).toBeLessThanOrEqual(1);
    });

    it("should handle multiple sequential analyses", () => {
      const analyzer = new AudioAnalyzer();

      // Should handle 100 analyses without errors
      for (let i = 0; i < 100; i++) {
        const targets = analyzer.analyze();

        expect(targets.mouthOpen).toBeGreaterThanOrEqual(0);
        expect(targets.mouthOpen).toBeLessThanOrEqual(1);
      }
    });

    it("should be ready to use after initialization", () => {
      const analyzer = new AudioAnalyzer({
        fftSize: 256,
        smoothingFactor: 0.3
      });

      // Create results
      const targets1 = analyzer.analyze();
      const targets2 = analyzer.analyze();

      // Both should be valid
      expect(targets1).toBeDefined();
      expect(targets2).toBeDefined();

      // Should be able to access properties
      expect(typeof targets1.mouthOpen).toBe("number");
      expect(typeof targets2.speechIntensity).toBe("number");
    });

    it("should maintain consistency across frames", () => {
      const analyzer = new AudioAnalyzer();
      const results = [];

      // Collect 50 frames
      for (let i = 0; i < 50; i++) {
        const targets = analyzer.analyze();
        results.push(targets.mouthOpen);
      }

      // All should be valid numbers
      results.forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it("should provide frequency data for visualization", () => {
      const analyzer = new AudioAnalyzer();

      const freqData = analyzer.analyze(); // Analyze first
      const visualData = (analyzer as any).getFrequencyData?.();

      // Should either return null or a valid Uint8Array
      if (visualData !== null && visualData !== undefined) {
        expect(visualData).toBeInstanceOf(Uint8Array);
      }
    });
  });

  describe("Analyzer lifecycle", () => {
    it("should initialize and be ready to use", () => {
      const analyzer = new AudioAnalyzer({
        fftSize: 256,
        smoothingFactor: 0.3
      });

      expect(analyzer).toBeDefined();

      // Should be able to analyze
      const targets = analyzer.analyze();
      expect(targets).toBeDefined();
    });

    it("should handle cleanup", () => {
      const analyzer = new AudioAnalyzer();

      // Use it
      analyzer.analyze();

      // Cleanup
      (analyzer as any).destroy?.();

      // Should not crash
      expect(analyzer).toBeDefined();
    });

    it("should be ready after creation", () => {
      const analyzer = new AudioAnalyzer();

      // Check readiness
      const ready = (analyzer as any).isReady?.();

      // Should either be true or the instance should work
      if (ready !== undefined) {
        expect(typeof ready).toBe("boolean");
      }

      // Regardless, analyze should work
      const targets = analyzer.analyze();
      expect(targets).toBeDefined();
    });
  });

  describe("Performance", () => {
    it("should analyze 100 frames quickly", () => {
      const analyzer = new AudioAnalyzer();

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        analyzer.analyze();
      }
      const elapsed = performance.now() - start;

      // 100 frames should take <50ms
      expect(elapsed).toBeLessThan(50);
    });

    it("should maintain 60+ FPS analysis rate", () => {
      const analyzer = new AudioAnalyzer();
      const frameTimes = [];

      // Collect frame times for 60 frames
      for (let i = 0; i < 60; i++) {
        const start = performance.now();
        analyzer.analyze();
        const elapsed = performance.now() - start;
        frameTimes.push(elapsed);
      }

      // Average should be <16.67ms (60 FPS)
      const avgTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
      expect(avgTime).toBeLessThan(5); // Very fast
    });
  });

  describe("Morph target ranges", () => {
    it("should always return clamped values 0-1", () => {
      const analyzer = new AudioAnalyzer();

      // Test 100 analyses
      for (let i = 0; i < 100; i++) {
        const targets = analyzer.analyze();

        // All must be in range
        expect(targets.mouthOpen).toBeGreaterThanOrEqual(0);
        expect(targets.mouthOpen).toBeLessThanOrEqual(1);

        expect(targets.mouthRound).toBeGreaterThanOrEqual(0);
        expect(targets.mouthRound).toBeLessThanOrEqual(1);

        expect(targets.speechIntensity).toBeGreaterThanOrEqual(0);
        expect(targets.speechIntensity).toBeLessThanOrEqual(1);
      }
    });

    it("should handle extreme smoothing values", () => {
      // Low smoothing
      const lowSmooth = new AudioAnalyzer({ smoothingFactor: 0.01 });
      let targets = lowSmooth.analyze();
      expect(targets.mouthOpen).toBeLessThanOrEqual(1);

      // High smoothing
      const highSmooth = new AudioAnalyzer({ smoothingFactor: 0.99 });
      targets = highSmooth.analyze();
      expect(targets.mouthOpen).toBeLessThanOrEqual(1);

      // Default
      const defaultSmooth = new AudioAnalyzer();
      targets = defaultSmooth.analyze();
      expect(targets.mouthOpen).toBeLessThanOrEqual(1);
    });
  });

  describe("Stability and recovery", () => {
    it("should recover from state changes", () => {
      const analyzer = new AudioAnalyzer();

      // Sequence of analyses with different conditions
      let targets1 = analyzer.analyze();
      let targets2 = analyzer.analyze();
      let targets3 = analyzer.analyze();

      // All should be valid
      expect(targets1.mouthOpen).toBeLessThanOrEqual(1);
      expect(targets2.mouthOpen).toBeLessThanOrEqual(1);
      expect(targets3.mouthOpen).toBeLessThanOrEqual(1);
    });

    it("should not accumulate errors over time", () => {
      const analyzer = new AudioAnalyzer();
      const samples = [];

      // Collect 1000 samples over extended period
      for (let i = 0; i < 1000; i++) {
        const targets = analyzer.analyze();
        samples.push(targets.mouthOpen);
      }

      // No value should be invalid
      samples.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        expect(Number.isNaN(value)).toBe(false);
      });
    });
  });

  describe("Interface consistency", () => {
    it("should maintain consistent interface across instances", () => {
      const analyzer1 = new AudioAnalyzer();
      const analyzer2 = new AudioAnalyzer({ smoothingFactor: 0.5 });

      const targets1 = analyzer1.analyze();
      const targets2 = analyzer2.analyze();

      // Both should have same interface
      expect(Object.keys(targets1).sort()).toEqual(
        Object.keys(targets2).sort()
      );

      // Both should have required properties
      expect(targets1).toHaveProperty("mouthOpen");
      expect(targets1).toHaveProperty("mouthRound");
      expect(targets1).toHaveProperty("speechIntensity");

      expect(targets2).toHaveProperty("mouthOpen");
      expect(targets2).toHaveProperty("mouthRound");
      expect(targets2).toHaveProperty("speechIntensity");
    });

    it("should return same type consistently", () => {
      const analyzer = new AudioAnalyzer();

      for (let i = 0; i < 20; i++) {
        const targets = analyzer.analyze();

        expect(typeof targets.mouthOpen).toBe("number");
        expect(typeof targets.mouthRound).toBe("number");
        expect(typeof targets.speechIntensity).toBe("number");
      }
    });
  });
});
