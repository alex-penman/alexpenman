/**
 * AvatarController - Interface to LIT-LAND WebAssembly avatar engine
 *
 * This module wraps the C++ avatar system exposed via WebAssembly,
 * providing type-safe control over avatar loading, animation states,
 * and scene management.
 */

export type AnimationState = "idle" | "listening" | "speaking";

export interface MorphTargets {
  mouthOpen: number;
  mouthRound: number;
  eyesLookUp: number;
  eyesClose: number;
}

export interface AvatarControllerConfig {
  canvasId: string;
  wasmModule?: WebAssembly.Module;
  wasmPath?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface AvatarInstance {
  // Scene management
  initScene: () => void;
  loadAvatarModel: (glbUrl: string) => Promise<void>;
  updateFrame: () => void;
  cleanup: () => void;

  // Animation control
  setAnimationState: (state: AnimationState) => void;
  getCurrentAnimationState: () => AnimationState;

  // Morph target control (for lip-sync)
  updateMorphTargets: (targets: MorphTargets) => void;

  // Canvas management
  setCanvasSize: (width: number, height: number) => void;
  getCanvasSize: () => { width: number; height: number };

  // Performance monitoring
  getFrameRate: () => number;
  getMemoryUsage: () => number;
}

class AvatarController implements AvatarInstance {
  private wasmInstance: WebAssembly.Instance | null = null;
  private wasmMemory: WebAssembly.Memory | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isInitialized = false;
  private animationState: AnimationState = "idle";
  private frameRate = 0;
  private frameCount = 0;
  private lastFrameTime = performance.now();

  constructor(private config: AvatarControllerConfig) {}

  /**
   * Initialize the WebAssembly module and prepare for avatar rendering
   */
  async init(): Promise<void> {
    try {
      // Get canvas element
      this.canvasElement = document.getElementById(
        this.config.canvasId
      ) as HTMLCanvasElement;

      if (!this.canvasElement) {
        throw new Error(`Canvas element with id "${this.config.canvasId}" not found`);
      }

      // Load WebAssembly module
      if (!this.config.wasmModule && !this.config.wasmPath) {
        throw new Error("Either wasmModule or wasmPath must be provided");
      }

      const wasmModule =
        this.config.wasmModule ||
        (await this.loadWasmModule(this.config.wasmPath!));

      // Create WebAssembly instance
      this.wasmMemory = new WebAssembly.Memory({ initial: 256, maximum: 512 });

      this.wasmInstance = new WebAssembly.Instance(wasmModule, {
        env: {
          memory: this.wasmMemory,
          // Graphics callbacks
          webgpu_present: () => this.presentFrame(),
          // Error callbacks
          log_error: (msg: number) => this.logError(msg),
          // Performance callbacks
          get_frame_time: () => performance.now(),
        },
      });

      this.isInitialized = true;

      // Initialize scene
      this.callExport("initScene", []);

      // Set canvas size
      const width = this.canvasElement.clientWidth;
      const height = this.canvasElement.clientHeight;
      this.callExport("setCanvasSize", [width, height]);

      // Start render loop
      this.startRenderLoop();

      // Handle window resize
      window.addEventListener("resize", () => this.handleResize());

      this.config.onReady?.();
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Load WebAssembly module from URL or fallback to mock
   */
  private async loadWasmModule(path: string): Promise<WebAssembly.Module> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      return WebAssembly.compile(buffer);
    } catch (error) {
      // Fallback to mock for development
      console.warn(
        `[Avatar] Could not load WebAssembly module from ${path}, using mock: ${error}`
      );

      // Load mock module from script
      const script = document.createElement("script");
      script.src = "/lit-land/avatar-mock.js";
      script.onerror = () => {
        throw new Error("Failed to load mock module");
      };

      return new Promise((resolve, reject) => {
        script.onload = () => {
          // Create a fake WASM module that uses the mock
          const mockModule = (window as any).AvatarMock?.createMockWasmModule?.();
          if (mockModule) {
            // Return a fake WebAssembly.Module with our mock
            resolve(mockModule as any);
          } else {
            reject(new Error("Mock module not initialized"));
          }
        };
        document.head.appendChild(script);
      });
    }
  }

  /**
   * Load avatar model from GLB URL
   */
  async loadAvatarModel(glbUrl: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("AvatarController not initialized");
    }

    try {
      // Fetch GLB file
      const response = await fetch(glbUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch avatar model: ${response.statusText}`);
      }

      const glbBuffer = await response.arrayBuffer();

      // Write GLB data to WebAssembly memory
      const bufferPtr = this.allocateWasmMemory(glbBuffer.byteLength);
      const wasmMemoryView = new Uint8Array(
        this.wasmMemory!.buffer,
        bufferPtr,
        glbBuffer.byteLength
      );
      wasmMemoryView.set(new Uint8Array(glbBuffer));

      // Call C++ function to load model
      this.callExport("loadAvatarModel", [bufferPtr, glbBuffer.byteLength]);
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Set animation state (idle, listening, speaking)
   */
  setAnimationState(state: AnimationState): void {
    if (!this.isInitialized) {
      console.warn("AvatarController not initialized");
      return;
    }

    this.animationState = state;

    // Write state string to memory and call C++ function
    const statePtr = this.writeStringToWasm(state);
    this.callExport("setAnimationState", [statePtr]);
  }

  /**
   * Get current animation state
   */
  getCurrentAnimationState(): AnimationState {
    return this.animationState;
  }

  /**
   * Update morph targets for lip-sync animation
   * Called from useAvatarAnimation hook during audio playback
   */
  updateMorphTargets(targets: MorphTargets): void {
    if (!this.isInitialized) {
      console.warn("AvatarController not initialized");
      return;
    }

    try {
      // Write morph targets to memory as packed float32 values
      // Layout: [mouthOpen, mouthRound, eyesLookUp, eyesClose]
      const targetsPtr = this.allocateWasmMemory(16); // 4 * 4 bytes (float32)
      const floatView = new Float32Array(
        this.wasmMemory!.buffer,
        targetsPtr,
        4
      );

      floatView[0] = Math.max(0, Math.min(1, targets.mouthOpen));
      floatView[1] = Math.max(0, Math.min(1, targets.mouthRound));
      floatView[2] = Math.max(0, Math.min(1, targets.eyesLookUp));
      floatView[3] = Math.max(0, Math.min(1, targets.eyesClose));

      // Call C++ function to update morph targets
      this.callExport("updateMorphTargets", [targetsPtr]);

      // Free allocated memory
      this.freeWasmMemory(targetsPtr);
    } catch (error) {
      console.error("Error updating morph targets:", error);
    }
  }

  /**
   * Update canvas size
   */
  setCanvasSize(width: number, height: number): void {
    if (!this.isInitialized) return;
    if (!this.canvasElement) return;

    this.canvasElement.width = width;
    this.canvasElement.height = height;
    this.callExport("setCanvasSize", [width, height]);
  }

  /**
   * Get current canvas size
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.canvasElement?.width || 0,
      height: this.canvasElement?.height || 0,
    };
  }

  /**
   * Get current frame rate
   */
  getFrameRate(): number {
    return this.frameRate;
  }

  /**
   * Get approximate memory usage
   */
  getMemoryUsage(): number {
    if (!this.wasmMemory) return 0;
    // Rough estimate: memory pages * page size (64KB per page)
    return this.wasmMemory.buffer.byteLength;
  }

  /**
   * Initialize the 3D scene
   */
  initScene(): void {
    if (!this.isInitialized) {
      console.warn("AvatarController not initialized");
      return;
    }
    this.callExport("initScene", []);
  }

  /**
   * Update the current frame
   */
  updateFrame(): void {
    if (!this.isInitialized) return;
    this.callExport("updateFrame", []);
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    const loop = () => {
      if (!this.isInitialized) return;

      // Update frame rate
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.frameCount++;

      if (delta >= 1000) {
        this.frameRate = (this.frameCount * 1000) / delta;
        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      // Call C++ update and render
      try {
        this.callExport("updateFrame", []);
      } catch (error) {
        console.error("Error in render loop:", error);
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (!this.canvasElement) return;

    const width = this.canvasElement.clientWidth;
    const height = this.canvasElement.clientHeight;
    this.setCanvasSize(width, height);
  }

  /**
   * Call exported C++ function via WebAssembly
   */
  private callExport(name: string, args: number[]): number {
    if (!this.wasmInstance || !this.wasmInstance.exports) {
      throw new Error("WebAssembly instance not initialized");
    }

    const fn = (this.wasmInstance.exports as any)[name];
    if (typeof fn !== "function") {
      throw new Error(`Exported function "${name}" not found`);
    }

    return fn(...args) as number;
  }

  /**
   * Allocate memory in WebAssembly heap
   */
  private allocateWasmMemory(size: number): number {
    const mallocPtr = (this.wasmInstance?.exports as any).malloc;
    if (typeof mallocPtr !== "function") {
      throw new Error("malloc not found in WebAssembly exports");
    }
    return mallocPtr(size) as number;
  }

  /**
   * Free allocated WebAssembly memory
   */
  private freeWasmMemory(ptr: number): void {
    const freePtr = (this.wasmInstance?.exports as any).free;
    if (typeof freePtr === "function") {
      freePtr(ptr);
    }
  }

  /**
   * Write string to WebAssembly memory (null-terminated)
   */
  private writeStringToWasm(str: string): number {
    const encoded = new TextEncoder().encode(str);
    const ptr = this.allocateWasmMemory(encoded.length + 1);
    const wasmMemoryView = new Uint8Array(this.wasmMemory!.buffer, ptr);
    wasmMemoryView.set(encoded);
    wasmMemoryView[encoded.length] = 0; // Null terminator
    return ptr;
  }

  /**
   * Log error from WebAssembly
   */
  private logError(msgPtr: number): void {
    const wasmMemoryView = new Uint8Array(this.wasmMemory!.buffer);
    let msg = "";
    for (let i = msgPtr; wasmMemoryView[i] !== 0; i++) {
      msg += String.fromCharCode(wasmMemoryView[i]);
    }
    console.error("[Avatar Engine]", msg);
  }

  /**
   * Present frame (called from WebAssembly)
   */
  private presentFrame(): void {
    // Frame presentation is handled by WebGPU internally
    // This callback could be used for additional synchronization if needed
  }

  /**
   * Cleanup and destroy resources
   */
  cleanup(): void {
    if (this.isInitialized) {
      try {
        this.callExport("cleanup", []);
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    }

    this.isInitialized = false;
    this.wasmInstance = null;
    this.wasmMemory = null;

    window.removeEventListener("resize", () => this.handleResize());
  }

  /**
   * Destroy the controller and free all resources
   */
  destroy(): void {
    this.cleanup();
  }
}

/**
 * Create and initialize an AvatarController
 */
export async function createAvatarController(
  config: AvatarControllerConfig
): Promise<AvatarInstance> {
  const controller = new AvatarController(config);
  await controller.init();
  return controller;
}

/**
 * Singleton instance for global access
 */
let globalAvatarController: AvatarInstance | null = null;

export async function initializeGlobalAvatarController(
  config: AvatarControllerConfig
): Promise<AvatarInstance> {
  globalAvatarController = await createAvatarController(config);
  return globalAvatarController;
}

export function getGlobalAvatarController(): AvatarInstance | null {
  return globalAvatarController;
}

export function destroyGlobalAvatarController(): void {
  if (globalAvatarController) {
    (globalAvatarController as AvatarController).destroy();
    globalAvatarController = null;
  }
}
