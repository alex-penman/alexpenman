# Building LIT-LAND Engine to WebAssembly

This guide explains how to compile the LIT-LAND C++ engine to WebAssembly for use in the Avatar Chat application.

## Overview

The avatar rendering system uses a pre-built WebAssembly module (`avatar.wasm`) that:
- Loads and renders GLB avatar models using LIT-LAND's GLTF loader
- Manages animation states (idle, listening, speaking)
- Exposes a JavaScript API for control from React components
- Targets 60 FPS with WebGPU graphics

## Prerequisites

### 1. Install Emscripten

Emscripten is the C++ to WebAssembly compiler.

**On macOS (recommended via Homebrew):**
```bash
brew install emscripten
```

**Or manually:**
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

**Verify installation:**
```bash
emcmake --version
emcc --version
```

### 2. Install CMake (if not present)

```bash
brew install cmake
```

### 3. Ensure LIT-LAND Engine is Available

The LIT-LAND engine source should be in `/Volumes/ll-ssd/projects/lit/lit-cpp/lit-land-engine`

## Build Steps

### Step 1: Create WebAssembly Build Directory

```bash
cd /Volumes/ll-ssd/projects/lit/lit-cpp/lit-land-engine
mkdir -p build-web
cd build-web
```

### Step 2: Configure with Emscripten

```bash
emcmake cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_WEBGPU=ON \
  -DENABLE_WASM=ON \
  -DOPTIMIZE_FOR_SIZE=ON \
  -DCMAKE_CXX_FLAGS="-s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=268435456"
```

**Build flags explained:**
- `Release`: Optimized build
- `ENABLE_WEBGPU`: Use WebGPU for graphics (required for web)
- `ENABLE_WASM`: Target WebAssembly
- `OPTIMIZE_FOR_SIZE`: Reduce .wasm bundle size
- `WASM=1`: Generate WebAssembly
- `ALLOW_MEMORY_GROWTH`: Allow dynamic memory expansion
- `INITIAL_MEMORY`: Start with 256MB heap

### Step 3: Build the Engine

```bash
cmake --build . --config Release -j$(nproc)
```

This will compile the engine and generate:
- `avatar.wasm` - WebAssembly module (~2-5MB gzipped)
- `avatar.js` - WebAssembly loader/glue code
- `avatar.wasm.map` - Debug symbols (optional)

### Step 4: Copy WebAssembly Module to Next.js Public Directory

```bash
# Create output directory
mkdir -p /Volumes/ll-ssd/projects/self/public/lit-land

# Copy built WebAssembly files
cp build-web/avatar.wasm /Volumes/ll-ssd/projects/self/public/lit-land/
cp build-web/avatar.js /Volumes/ll-ssd/projects/self/public/lit-land/
cp build-web/avatar.wasm.map /Volumes/ll-ssd/projects/self/public/lit-land/ 2>/dev/null || true
```

## Verifying the Build

### Check WebAssembly File Size

```bash
ls -lh /Volumes/ll-ssd/projects/self/public/lit-land/avatar.wasm*
# Should show ~2-5MB for .wasm file

# Check gzipped size
gzip -c avatar.wasm | wc -c
# Should be < 5MB for production
```

### Test in Browser

1. Start the Next.js dev server:
```bash
cd /Volumes/ll-ssd/projects/self
npm run dev
```

2. Navigate to http://localhost:3000
3. Check browser console for initialization messages
4. Verify no WebAssembly loading errors

## Build Configuration Options

### Optimize for Smallest Size

```bash
emcmake cmake .. \
  -DCMAKE_BUILD_TYPE=MinSizeRel \
  -DOPTIMIZE_FOR_SIZE=ON \
  -DCMAKE_CXX_FLAGS="-s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=134217728"
```

### Optimize for Performance

```bash
emcmake cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_FLAGS="-s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=536870912 -O3"
```

### Enable Debug Symbols (for troubleshooting)

```bash
emcmake cmake .. \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_CXX_FLAGS="-s WASM=1 -g4"
```

## Troubleshooting

### Error: "emcmake: command not found"

**Solution:** Activate Emscripten environment
```bash
source ~/emsdk/emsdk_env.sh
```

### Error: "WebGPU headers not found"

**Solution:** Ensure WebGPU headers are installed
```bash
# LIT-LAND should fetch these via CMakeLists.txt
# If not, manually download WebGPU headers
```

### WebAssembly Module Won't Load

**Debugging steps:**
1. Check browser console for CORS errors
2. Verify `avatar.wasm` exists in `/public/lit-land/`
3. Check file permissions: `chmod 644 avatar.wasm`
4. Verify Next.js is serving static files correctly

### Performance Issues (Low FPS)

**Optimization options:**
1. Reduce geometry complexity of avatar models
2. Use LOD (Level of Detail) models
3. Optimize textures (compress PBR maps)
4. Profile with Chrome DevTools WebGPU tab

## Production Deployment

### Before Deploying to Vercel:

1. **Build the WebAssembly module** following the steps above
2. **Copy to public directory** as described
3. **Test locally** with `npm run build && npm start`
4. **Verify bundle size** is < 5MB gzipped
5. **Set Vercel environment variables** (if any):
   ```
   NEXT_PUBLIC_WASM_PATH=/lit-land/avatar.wasm
   ```

### Vercel Build Configuration

Add to `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_WASM_PATH": "/lit-land/avatar.wasm"
  }
}
```

## CI/CD Integration

For automated builds, add to GitHub Actions `.github/workflows/build-wasm.yml`:

```yaml
name: Build WebAssembly

on:
  push:
    paths:
      - 'lit-land-engine/**'

jobs:
  build-wasm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Emscripten
        run: |
          git clone https://github.com/emscripten-core/emsdk.git
          cd emsdk && ./emsdk install latest && ./emsdk activate latest

      - name: Build WebAssembly
        run: |
          source emsdk/emsdk_env.sh
          cd lit-land-engine/build-web
          emcmake cmake .. -DCMAKE_BUILD_TYPE=Release -DENABLE_WEBGPU=ON
          cmake --build . -j$(nproc)

      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: avatar-wasm
          path: lit-land-engine/build-web/avatar.wasm*
```

## Next Steps

After building the WebAssembly module:

1. **Test with AvatarCanvas component** - Navigate to `/` and verify avatar renders
2. **Proceed to Phase 3** - Voice cloning with ElevenLabs
3. **Phase 4** - Lip-sync integration with D-ID
4. **Phase 5** - Full integration and deployment

## References

- [Emscripten Documentation](https://emscripten.org)
- [WebGPU Specification](https://gpuweb.github.io/gpuweb/)
- [LIT-LAND Engine Documentation](../lit-land-engine/README.md)
- [CMake for WebAssembly](https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html)
