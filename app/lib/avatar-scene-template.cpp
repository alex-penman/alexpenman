/**
 * AvatarScene.cpp - LIT-LAND Avatar Rendering System
 *
 * This is a C++ template showing how the avatar scene would be implemented
 * using the LIT-LAND engine. This code would be compiled to WebAssembly
 * using Emscripten and executed in the browser.
 *
 * Build command:
 *   emcmake cmake -B build-web -DCMAKE_BUILD_TYPE=Release -DENABLE_WEBGPU=ON
 *   cmake --build build-web
 *
 * This creates avatar.wasm which is loaded by AvatarCanvas.tsx
 */

#include <emscripten/emscripten.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <memory>
#include <string>
#include <vector>

// LIT-LAND Engine includes (from lit-land-engine)
#include "lit-land/core/math.h"
#include "lit-land/rendering/graphics_device.h"
#include "lit-land/rendering/gltf_loader.h"
#include "lit-land/rendering/scene.h"
#include "lit-land/animation/animator.h"
#include "lit-land/core/ecs.h"

namespace {
  // Global scene state
  struct SceneState {
    std::unique_ptr<litland::GraphicsDevice> graphicsDevice;
    std::unique_ptr<litland::Scene> scene;
    std::unique_ptr<litland::GltfLoader> modelLoader;
    std::unique_ptr<litland::Animator> animator;
    std::unique_ptr<litland::ECS::Registry> registry;

    // Avatar entity
    litland::ECS::Entity avatarEntity;

    // Camera properties
    glm::vec3 cameraPosition{0, 1.7f, 2.5f};
    glm::vec3 cameraTarget{0, 1.5f, 0};
    float cameraFOV{50.0f};

    // Animation state
    std::string currentAnimationState{"idle"};

    // Canvas dimensions
    int canvasWidth{1024};
    int canvasHeight{768};
  } g_scene;

  /**
   * Log messages to browser console
   */
  void logInfo(const std::string& message) {
    EM_ASM({
      console.log("[LIT-LAND Avatar]", UTF8ToString($0));
    }, message.c_str());
  }

  void logError(const std::string& message) {
    EM_ASM({
      console.error("[LIT-LAND Avatar]", UTF8ToString($0));
    }, message.c_str());
  }

  /**
   * Setup idle animation state
   * Subtle breathing, slight swaying
   */
  void setupIdleAnimation() {
    if (!g_scene.animator) return;

    // Idle animation: subtle breathing cycle
    g_scene.animator->setAnimationSpeed(0.3f);
    g_scene.animator->playAnimation("Armature|ArmatureAction", true);
  }

  /**
   * Setup listening animation state
   * Head tilt, attention pose
   */
  void setupListeningAnimation() {
    if (!g_scene.animator) return;

    // Listening animation: head tilt
    g_scene.animator->setAnimationSpeed(0.5f);
    g_scene.animator->playAnimation("HeadTilt", false);
  }

  /**
   * Setup speaking animation state
   * Facial animation prepared for lip-sync
   */
  void setupSpeakingAnimation() {
    if (!g_scene.animator) return;

    // Speaking: prepare for lip-sync in Phase 4
    g_scene.animator->setAnimationSpeed(1.0f);
    g_scene.animator->playAnimation("Talking", true);
  }
}

/**
 * Initialize the avatar scene
 * Called once on application startup
 */
extern "C" EMSCRIPTEN_KEEPALIVE void initScene() {
  try {
    logInfo("Initializing avatar scene...");

    // Create graphics device (WebGPU for browser)
    g_scene.graphicsDevice = litland::createGraphicsDevice(
        litland::GraphicsAPI::WebGPU);
    if (!g_scene.graphicsDevice) {
      throw std::runtime_error("Failed to create graphics device");
    }

    // Create scene
    g_scene.scene = std::make_unique<litland::Scene>(g_scene.graphicsDevice.get());

    // Create model loader
    g_scene.modelLoader = std::make_unique<litland::GltfLoader>(
        g_scene.graphicsDevice.get());

    // Create animator
    g_scene.animator = std::make_unique<litland::Animator>();

    // Create ECS registry
    g_scene.registry = std::make_unique<litland::ECS::Registry>();

    // Setup lighting
    auto light = g_scene.registry->create();
    g_scene.registry->emplace<litland::Transform>(light,
        glm::vec3(2, 3, 2), glm::vec3(0), glm::vec3(1));
    g_scene.registry->emplace<litland::DirectionalLight>(light,
        glm::vec3(1, 1, 1), 1.0f);

    // Setup ambient light
    g_scene.scene->setAmbientLight(glm::vec3(0.5f, 0.5f, 0.5f), 0.5f);

    // Setup camera
    g_scene.scene->setCamera(g_scene.cameraPosition, g_scene.cameraTarget,
        glm::vec3(0, 1, 0), g_scene.cameraFOV,
        static_cast<float>(g_scene.canvasWidth) /
            static_cast<float>(g_scene.canvasHeight),
        0.1f, 100.0f);

    // Start with idle animation state
    setupIdleAnimation();

    logInfo("Avatar scene initialized successfully");
  } catch (const std::exception& e) {
    logError(std::string("Failed to initialize scene: ") + e.what());
  }
}

/**
 * Load avatar model from GLB buffer
 * The GLB data is passed from JavaScript via WebAssembly memory
 */
extern "C" EMSCRIPTEN_KEEPALIVE void loadAvatarModel(
    uint8_t* glbBuffer, size_t bufferSize) {
  try {
    logInfo("Loading avatar model...");

    if (!g_scene.modelLoader) {
      throw std::runtime_error("Model loader not initialized");
    }

    // Load model from buffer
    auto model =
        g_scene.modelLoader->loadFromMemory(glbBuffer, bufferSize);
    if (!model) {
      throw std::runtime_error("Failed to parse GLTF model");
    }

    // Create avatar entity in ECS
    g_scene.avatarEntity = g_scene.registry->create();

    // Add components
    g_scene.registry->emplace<litland::Transform>(
        g_scene.avatarEntity, glm::vec3(0, 0, 0), glm::vec3(0),
        glm::vec3(1));

    g_scene.registry->emplace<litland::RenderMesh>(
        g_scene.avatarEntity, model);

    // Bind animator to avatar skeleton
    if (model->hasSkeleton()) {
      g_scene.animator->bindSkeleton(model->getSkeleton());
    }

    // Add to scene
    g_scene.scene->addEntity(g_scene.avatarEntity,
        g_scene.registry->get<litland::Transform>(g_scene.avatarEntity));

    logInfo("Avatar model loaded successfully");
  } catch (const std::exception& e) {
    logError(std::string("Failed to load avatar model: ") + e.what());
  }
}

/**
 * Set animation state (idle, listening, speaking)
 */
extern "C" EMSCRIPTEN_KEEPALIVE void setAnimationState(
    const char* stateName) {
  try {
    g_scene.currentAnimationState = stateName;

    if (g_scene.currentAnimationState == "idle") {
      setupIdleAnimation();
    } else if (g_scene.currentAnimationState == "listening") {
      setupListeningAnimation();
    } else if (g_scene.currentAnimationState == "speaking") {
      setupSpeakingAnimation();
    } else {
      logError(std::string("Unknown animation state: ") + stateName);
    }

    logInfo(std::string("Animation state changed to: ") + stateName);
  } catch (const std::exception& e) {
    logError(std::string("Error setting animation state: ") + e.what());
  }
}

/**
 * Update and render the scene
 * Called every frame from the browser's requestAnimationFrame
 */
extern "C" EMSCRIPTEN_KEEPALIVE void updateFrame() {
  try {
    // Update animations
    if (g_scene.animator) {
      g_scene.animator->update(1.0f / 60.0f); // Assuming 60 FPS
    }

    // Update scene
    if (g_scene.scene) {
      g_scene.scene->update(1.0f / 60.0f);
    }

    // Render scene
    if (g_scene.graphicsDevice && g_scene.scene) {
      g_scene.graphicsDevice->beginFrame();
      g_scene.scene->render(g_scene.graphicsDevice.get());
      g_scene.graphicsDevice->endFrame();
      g_scene.graphicsDevice->present();
    }
  } catch (const std::exception& e) {
    logError(std::string("Error in update frame: ") + e.what());
  }
}

/**
 * Set canvas size (handles window resizing)
 */
extern "C" EMSCRIPTEN_KEEPALIVE void setCanvasSize(int width, int height) {
  try {
    if (width <= 0 || height <= 0) return;

    g_scene.canvasWidth = width;
    g_scene.canvasHeight = height;

    // Update graphics device viewport
    if (g_scene.graphicsDevice) {
      g_scene.graphicsDevice->setViewport(0, 0, width, height);
    }

    // Update camera aspect ratio
    if (g_scene.scene) {
      g_scene.scene->setCamera(
          g_scene.cameraPosition, g_scene.cameraTarget,
          glm::vec3(0, 1, 0), g_scene.cameraFOV,
          static_cast<float>(width) / static_cast<float>(height), 0.1f,
          100.0f);
    }
  } catch (const std::exception& e) {
    logError(std::string("Error setting canvas size: ") + e.what());
  }
}

/**
 * Get current animation state
 */
extern "C" EMSCRIPTEN_KEEPALIVE const char* getAnimationState() {
  return g_scene.currentAnimationState.c_str();
}

/**
 * Get frame rate (frames per second)
 * For performance monitoring
 */
extern "C" EMSCRIPTEN_KEEPALIVE float getFrameRate() {
  if (g_scene.graphicsDevice) {
    return g_scene.graphicsDevice->getFrameRate();
  }
  return 0.0f;
}

/**
 * Cleanup and shutdown
 */
extern "C" EMSCRIPTEN_KEEPALIVE void cleanup() {
  try {
    logInfo("Cleaning up avatar scene...");

    // Cleanup in reverse order
    g_scene.registry.reset();
    g_scene.animator.reset();
    g_scene.modelLoader.reset();
    g_scene.scene.reset();
    g_scene.graphicsDevice.reset();

    logInfo("Cleanup complete");
  } catch (const std::exception& e) {
    logError(std::string("Error during cleanup: ") + e.what());
  }
}

/**
 * WebAssembly Module Initialization
 * Called automatically when the .wasm module loads
 */
int main() {
  logInfo("LIT-LAND Avatar Engine starting...");
  return 0;
}
