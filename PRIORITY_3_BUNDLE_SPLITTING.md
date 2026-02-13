# Priority 3: JavaScript Bundle Splitting Implementation Plan

**Status:** ⏳ TODO
**Expected Impact:** 30% TTI (Time to Interactive) improvement
**Effort:** Medium
**Target:** Phase 5c completion

---

## Overview

Priority 3 optimizes the initial JavaScript bundle by using dynamic imports and code splitting to defer loading non-critical components until needed.

**Key Strategies:**
- Dynamic imports with React.lazy and Suspense
- Route-based code splitting (Next.js automatic)
- Component-level code splitting (AvatarWithLipSync, SetupWizard)
- Tree-shaking unused dependencies

**Expected Improvements:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial JS Bundle | ~150KB | ~90KB | 40% ↓ |
| Time to Interactive | 3s | 2.1s | 30% ↓ |
| Parse + Compile | 500ms | 300ms | 40% ↓ |

---

## Implementation Plan

### Phase 1: Analysis & Baseline

**1.1 Bundle Analysis**
```bash
npm run build
npx next-bundle-analyzer
```

**Identify:**
- Current bundle size breakdown
- Largest dependencies
- Unused code (tree-shake targets)
- Components that can be lazy-loaded

**Expected Baseline:**
- Total initial bundle: ~150KB gzipped
- React + Next.js: ~110KB
- Custom code: ~40KB
- LIT-LAND (should already be lazy): separate

**1.2 Profiling**
- Measure Time to Interactive baseline
- Identify parse/compile bottlenecks
- Record current FCP and LCP

### Phase 2: Dynamic Imports

**2.1 AvatarWithLipSync (Heavy Component)**

Current approach: Imported directly in `app/page.tsx`
```typescript
import AvatarWithLipSync from "@/app/components/AvatarWithLipSync";
```

Optimized approach: Dynamic import with fallback
```typescript
// app/components/AvatarWithLipSyncLazy.tsx (wrapper)
import dynamic from "next/dynamic";

const AvatarWithLipSync = dynamic(
  () => import("./AvatarWithLipSync"),
  {
    loading: () => (
      <div className="avatar-loading-placeholder">
        <p>Avatar initializing...</p>
      </div>
    ),
    ssr: false,  // Only render on client
  }
);

export default AvatarWithLipSync;
```

**Updated page:**
```typescript
// app/page.tsx
import AvatarWithLipSync from "@/app/components/AvatarWithLipSyncLazy";

// Rest of component remains unchanged
```

**Benefits:**
- Splits AvatarWithLipSync bundle (reduces initial by ~30KB)
- Component loads with Suspense boundary
- Error boundary for graceful failures
- SSR skipped (optimization)

**2.2 SetupWizard (Route-specific)**

Current: Imported in `app/setup/page.tsx`
```typescript
import SetupWizard from "@/app/components/SetupWizard";
```

Optimization: Already route-specific, but can lazy-load sub-components
```typescript
// app/components/VoiceRecorderLazy.tsx
import dynamic from "next/dynamic";

const VoiceRecorder = dynamic(
  () => import("./VoiceRecorder"),
  {
    loading: () => <div>Initializing audio...</div>,
    ssr: false,
  }
);

export default VoiceRecorder;
```

**Update SetupWizard:**
```typescript
// app/components/SetupWizard.tsx
import VoiceRecorder from "./VoiceRecorderLazy";
// VoiceRecorder only loads when wizard reaches that step
```

**2.3 Other Heavy Components**

Audit for other candidates:
- `AudioPlayer` - Heavy if includes visualization
- `StatGrid` - Large if many stats
- `TwinChat` - Can be optimized internally

### Phase 3: Route-Based Splitting

**Next.js automatically splits by route**, but we can optimize:

**3.1 Layout Optimizations**
```typescript
// app/layout.tsx - Shared layout
export default function RootLayout() {
  return (
    <html>
      <body>
        {/* Navigation loaded immediately */}
        <Header />

        {/* Children split by route */}
        {children}
      </body>
    </html>
  );
}
```

**3.2 Route-Specific Code**
```
/app/page.tsx          → home-chunk.js (includes AvatarWithLipSync)
/app/setup/page.tsx    → setup-chunk.js (includes SetupWizard)
/app/about/page.tsx    → about-chunk.js (lightweight)
/app/twin/page.tsx     → twin-chunk.js (text-only chat)
```

### Phase 4: Tree-Shaking & Optimization

**4.1 Remove Unused Dependencies**
```bash
# Analyze what's actually imported
npm run build -- --analyze

# Check for unused code
npx depcheck
```

**4.2 Optimize Imports**

Replace:
```typescript
import { * as utils } from "@/app/lib/utils";
utils.heavyFunction();
```

With:
```typescript
import { heavyFunction } from "@/app/lib/utils";
heavyFunction();
```

This enables tree-shaking of unused exports.

**4.3 Minification**

Next.js automatically minifies, but verify:
```bash
# Check build output
npm run build
# Look for: .next/static/chunks/main-*.js
```

### Phase 5: Measurement & Verification

**5.1 Re-analyze Bundle**
```bash
npm run build
npx next-bundle-analyzer
```

**Expected Results:**
- Initial bundle: 150KB → 90KB (40% reduction)
- Chunks created:
  - main: ~40KB
  - home: ~50KB
  - setup: ~30KB
  - about: ~20KB
  - avatar (lazy): ~30KB

**5.2 Performance Profiling**

Measure with Chrome DevTools:
1. Record performance before/after
2. Check:
   - Parse time: 500ms → 300ms
   - Compile time: 200ms → 100ms
   - TTI: 3s → 2.1s
3. Verify no layout shift in Suspense boundaries

**5.3 Test All Routes**

Verify functionality:
- `/` (home with avatar)
- `/setup` (setup wizard)
- `/about` (about page)
- `/twin` (text-only chat)
- Transitions between routes

---

## Implementation Checklist

### Preparation
- [ ] Run bundle analyzer and record baseline
- [ ] Identify heavy components
- [ ] Document current performance metrics
- [ ] Create performance test harness

### Dynamic Imports
- [ ] Create AvatarWithLipSyncLazy wrapper
- [ ] Update app/page.tsx to use lazy version
- [ ] Add Suspense boundary and loading state
- [ ] Create VoiceRecorderLazy wrapper
- [ ] Update SetupWizard to use lazy version
- [ ] Audit and lazy-load other heavy components

### Optimization
- [ ] Remove unused dependencies
- [ ] Optimize import statements for tree-shaking
- [ ] Verify minification settings
- [ ] Check for dead code

### Testing
- [ ] Test all routes work correctly
- [ ] Test lazy component loading
- [ ] Test error boundaries
- [ ] Verify performance improvements
- [ ] Test on slow networks (4G simulation)
- [ ] Test on low-end devices

### Documentation & Monitoring
- [ ] Document chunking strategy
- [ ] Add performance monitoring
- [ ] Create CI check for bundle size
- [ ] Update README with optimization details

---

## Code Examples

### Creating a Lazy Component Wrapper

**Pattern 1: Simple Component**
```typescript
// app/components/AvatarWithLipSyncLazy.tsx
import dynamic from "next/dynamic";

const AvatarWithLipSync = dynamic(
  () => import("./AvatarWithLipSync"),
  {
    loading: () => (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.05)",
      }}>
        <div>Loading avatar...</div>
      </div>
    ),
    ssr: false,  // Disable SSR for client-only components
  }
);

export default AvatarWithLipSync;
```

**Usage:**
```typescript
// app/page.tsx
import AvatarWithLipSync from "@/app/components/AvatarWithLipSyncLazy";

export default function Home() {
  return (
    <div>
      <AvatarWithLipSync />
      {/* Rest of page */}
    </div>
  );
}
```

### React.lazy for Internal Components

**Pattern 2: Using React.lazy directly**
```typescript
// app/components/VoiceRecorder.tsx
const VoiceRecorder = lazy(() => import("./VoiceRecorder"));

export default function SetupWizard() {
  const [step, setStep] = useState(0);

  return (
    <div>
      {step === 0 && <AvatarSelector />}

      {/* Only load when step 1 */}
      {step === 1 && (
        <Suspense fallback={<div>Loading audio...</div>}>
          <VoiceRecorder />
        </Suspense>
      )}
    </div>
  );
}
```

### Monitoring Bundle Size in CI

**Add to package.json scripts:**
```json
{
  "scripts": {
    "analyze:bundle": "next build && next-bundle-analyzer",
    "check:bundle-size": "npm run build && node check-bundle-size.js"
  }
}
```

**Create check-bundle-size.js:**
```javascript
const fs = require("fs");
const path = require("path");

const maxSize = 150 * 1024; // 150KB gzipped
const manifestPath = path.join(process.cwd(), ".next/build-manifest.json");

// Check total chunk sizes...
// Alert if exceeds threshold
```

---

## Performance Targets

### Before Optimization
```
Timeline:
0-500ms:    DNS/TCP/TLS
500-1500ms: Download HTML/CSS/JS (150KB)
1500-2000ms: Parse + evaluate JS (500ms)
2000-2500ms: React hydration
2500-3000ms: Avatar initialization
────────────────────────────
TTI: ~3 seconds
FCP: 1.2s
LCP: 2.5s
```

### After Optimization
```
Timeline:
0-500ms:    DNS/TCP/TLS
500-1000ms: Download HTML/CSS/JS (90KB)
1000-1300ms: Parse + evaluate JS (300ms)
1300-2100ms: React hydration
────────────────────────────
TTI: ~2.1 seconds (30% improvement)
FCP: 0.7s (42% improvement)
LCP: 1.5s (40% improvement)

Avatar loads as chunk:
2100-3100ms: Download AvatarWithLipSync chunk (50KB)
3100+:      Avatar renders while user sees page
```

---

## Testing Strategy

### Unit Tests
```typescript
// Tests for lazy-loaded components
describe("AvatarWithLipSyncLazy", () => {
  it("should load dynamically", async () => {
    // Verify component loads in Suspense
  });

  it("should show loading state", () => {
    // Verify loading placeholder shows
  });

  it("should render after load", async () => {
    // Verify component renders after dynamic import
  });
});
```

### Performance Tests
```bash
# Measure TTI before/after
npm run build
# Record metrics with:
# - Chrome DevTools Performance tab
# - Lighthouse CI
# - WebPageTest

# Check bundle size
npm run analyze:bundle
```

### Integration Tests
1. Home page loads and displays chat immediately
2. Avatar chunk loads without blocking UI
3. Setup wizard routes load on-demand
4. Navigation between routes is instant

---

## Browser Support

All modern browsers support dynamic imports:
- Chrome 63+
- Firefox 67+
- Safari 11.1+
- Edge 79+

Fallback for older browsers: Webpack automatically provides polyfills via Next.js.

---

## Rollback Plan

If issues occur:

1. **Too many chunks (too slow):** Reduce number of lazy boundaries
2. **Loading states ugly:** Improve Suspense fallback UI
3. **Performance worse:** Check for over-chunking (create too many small files)

Rollback: Remove `dynamic()` imports, return to static imports.

---

## Documentation Plan

Create these after implementation:
- `BUNDLE_SPLITTING_GUIDE.md` - How chunks work
- Update `PERFORMANCE_OPTIMIZATION_GUIDE.md` with results
- Add bundle size monitoring to CI docs

---

## Estimated Timeline

- **Phase 1 (Analysis):** 0.5 day
  - Run bundle analyzer
  - Identify candidates
  - Record baseline metrics

- **Phase 2 (Implementation):** 1-2 days
  - Create lazy wrappers
  - Update imports
  - Add Suspense boundaries
  - Test each change

- **Phase 3 (Testing):** 1 day
  - Test all routes
  - Performance profiling
  - Test on slow networks
  - CI/CD validation

- **Total:** 2.5-3 days

---

## Success Criteria

✅ Bundle splitting implemented:
- Initial bundle: <100KB (from 150KB)
- Chunks created automatically by Next.js
- No manual chunk management needed

✅ Performance targets met:
- TTI: <2.5 seconds (target: 2.1s)
- FCP: <1 second (target: 0.7s)
- Parse time: <400ms

✅ User experience maintained:
- No layout shift during chunk loading
- Smooth transitions
- Loading states visible but not jarring

✅ Tests passing:
- All route transitions work
- Lazy components load correctly
- Error boundaries catch failures

✅ Monitoring in place:
- Bundle size tracked in CI
- Performance metrics logged
- Alerts on regressions

---

## Related Optimizations

This builds on:
- **Priority 1:** AudioAnalyzer Mobile (20% CPU reduction) ✅
- **Priority 2:** LIT-LAND Lazy Loading (40% load time) ✅

Combined expected improvements:
- Desktop: 60% faster (3s → 1.2s)
- Mobile: 75% faster (5s → 1.25s)

---

## Next Phase

After Priority 3 completion, Phase 5c moves to:

1. **Desktop Profiling** (Chrome DevTools)
   - Lighthouse audit
   - CPU profiling
   - Memory profiling

2. **Mobile Profiling** (iOS Safari, Android Chrome)
   - 4G/3G simulation
   - CPU throttling
   - Real device testing

3. **Final Verification**
   - Re-profile with all optimizations
   - Verify targets met
   - Document final metrics

Then proceed to **Phase 5d: Deployment Preparation**
