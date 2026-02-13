/**
 * Avatar Mock - Development Fallback
 *
 * This mock provides the WebAssembly API interface for development
 * and testing when the actual LIT-LAND WebAssembly module is not available.
 *
 * In production, this is replaced with the actual avatar.wasm module.
 */

class AvatarMockInstance {
  constructor() {
    this.canvasContext = null;
    this.animationState = "idle";
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.frameRate = 0;
    this.animationFrame = null;
  }

  initScene() {
    console.log("[Avatar Mock] Scene initialized");
  }

  loadAvatarModel(bufferPtr, bufferSize) {
    console.log(`[Avatar Mock] Loading avatar model (${bufferSize} bytes)`);
    setTimeout(() => {
      console.log("[Avatar Mock] Avatar model loaded successfully");
    }, 500);
  }

  setAnimationState(statePtr) {
    const state = this.readCString(statePtr);
    this.animationState = state;
    console.log(`[Avatar Mock] Animation state: ${state}`);
  }

  updateFrame() {
    // Calculate frame rate
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastTime >= 1000) {
      this.frameRate = (this.frameCount * 1000) / (now - this.lastTime);
      this.frameCount = 0;
      this.lastTime = now;
    }

    // Render to canvas
    this.renderFrame();
  }

  setCanvasSize(width, height) {
    console.log(`[Avatar Mock] Canvas size: ${width}x${height}`);
  }

  getAnimationState() {
    return this.stateToPtr(this.animationState);
  }

  getFrameRate() {
    return this.frameRate;
  }

  cleanup() {
    console.log("[Avatar Mock] Cleanup");
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  malloc(size) {
    // Mock malloc - in real WASM, this allocates memory
    return 0x1000 + Math.random() * 0x100000;
  }

  free(ptr) {
    // Mock free - no-op
  }

  renderFrame() {
    const canvas = document.getElementById("avatar-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(14, 94, 111, 0.15)");
    gradient.addColorStop(1, "rgba(196, 90, 40, 0.15)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw placeholder avatar representation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw head (circle)
    ctx.fillStyle = "rgba(196, 90, 40, 0.3)";
    ctx.beginPath();
    ctx.arc(centerX, centerY - 30, 40, 0, Math.PI * 2);
    ctx.fill();

    // Draw body (rectangle)
    ctx.fillStyle = "rgba(14, 94, 111, 0.3)";
    ctx.fillRect(centerX - 25, centerY + 10, 50, 80);

    // Draw animation indicator
    ctx.fillStyle = "rgba(17, 19, 23, 0.7)";
    ctx.font = "14px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("Avatar Engine Loading...", centerX, canvas.height - 30);

    // Animation state indicator
    const stateColor = {
      idle: "rgba(31, 75, 63, 0.8)",
      listening: "rgba(14, 94, 111, 0.8)",
      speaking: "rgba(196, 90, 40, 0.8)",
    };

    ctx.fillStyle = stateColor[this.animationState] || "rgba(17, 19, 23, 0.8)";
    ctx.fillText(`State: ${this.animationState}`, centerX, canvas.height - 10);

    // Frame rate display
    ctx.fillStyle = "rgba(17, 19, 23, 0.6)";
    ctx.font = "12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`FPS: ${Math.round(this.frameRate)}`, canvas.width - 10, 20);
  }

  readCString(ptr) {
    // Mock: assume string is simple ASCII
    return "idle";
  }

  stateToPtr(state) {
    return 0x2000;
  }
}

/**
 * Create mock WebAssembly module
 */
function createMockWasmModule() {
  const instance = new AvatarMockInstance();
  const memory = new WebAssembly.Memory({ initial: 256, maximum: 512 });

  return {
    instance: {
      exports: {
        initScene: () => instance.initScene(),
        loadAvatarModel: (ptr, size) => instance.loadAvatarModel(ptr, size),
        setAnimationState: (ptr) => instance.setAnimationState(ptr),
        updateFrame: () => instance.updateFrame(),
        setCanvasSize: (w, h) => instance.setCanvasSize(w, h),
        getAnimationState: () => instance.getAnimationState(),
        getFrameRate: () => instance.getFrameRate(),
        cleanup: () => instance.cleanup(),
        malloc: (size) => instance.malloc(size),
        free: (ptr) => instance.free(ptr),
        memory: memory,
      },
    },
  };
}

/**
 * Load mock module (if WebAssembly unavailable)
 */
async function loadAvatarMockModule() {
  console.warn(
    "[Avatar] WebAssembly module not available, using mock for development"
  );
  return createMockWasmModule();
}

// Export for use in browser
if (typeof window !== "undefined") {
  window.AvatarMock = {
    loadAvatarMockModule,
    createMockWasmModule,
  };
}
