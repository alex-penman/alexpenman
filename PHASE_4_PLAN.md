# Phase 4: Avatar Animation & Lip-Sync - Implementation Plan

**Status:** Planning
**Approach:** Free, real-time lip-sync (Web Audio API + morph targets)
**Cost:** $0/month (vs D-ID $18/mo)

## Overview

Phase 4 adds avatar animation synchronization with audio playback. Instead of using D-ID ($18/mo), we'll implement **real-time lip-sync using Web Audio API** and morph target animation.

### Architecture

```
Audio Playback (HTMLAudioElement)
    ↓
Web Audio API
    ↓
Frequency Analysis (FFT)
    ↓
Mouth Morph Target Driver
    ↓
LIT-LAND Avatar Animation
    ↓
Real-time Lip-Sync (0ms latency)
```

## Why This Approach

| Solution | Cost | Latency | Quality | Realtime | Setup |
|----------|------|---------|---------|----------|-------|
| **Web Audio API** | $0 | 0ms | Good | ✅ Yes | Simple |
| D-ID | $18/mo | 200-500ms | Excellent | ⚠️ Streaming | Complex |
| Wav2Lip | $0 | 5-10s | Excellent | ❌ No | Hard |
| SadTalker | $0 | 1-3s | Very Good | ⚠️ API | Medium |

**Our choice:** Web Audio API for simplicity and cost, with optional D-ID enhancement later.

## Implementation Strategy

### Phase 4a: Audio Analysis (Real-time Lip-Sync)

```typescript
// Analyze audio frequencies to drive mouth animation
const audioContext = new AudioContext()
const analyser = audioContext.createAnalyser()
const frequencyData = new Uint8Array(analyser.frequencyBinCount)

// Each frame:
analyser.getByteFrequencyData(frequencyData)
const mouthAmount = calculateMouthOpening(frequencyData)
// 0 = closed, 1 = fully open

// Drive avatar morph targets
avatar.setMorphTarget('mouthOpen', mouthAmount)
avatar.setMorphTarget('mouthRound', mouthRounding)
```

### Phase 4b: Animation State Management

```
Avatar States:
├── idle
│   └── Subtle breathing (breathing animation)
│
├── listening
│   └── Head tilt + attention pose
│
└── speaking
    ├── Mouth opens/closes (frequency-based)
    ├── Head moves naturally (bobbing)
    ├── Eye focus on user
    └── Facial expressions (subtle)
```

### Phase 4c: Audio-to-Animation Sync

```
Timeline:
0s    Audio starts → Avatar "speaking" state
      ↓
      Web Audio API analyzes frequencies in real-time
      ↓
      Frequency bands:
      - 0-500 Hz: Mouth opening amplitude
      - 500-2000 Hz: Mouth rounding
      - 2000+ Hz: Consonant articulation (optional)
      ↓
      Morph targets updated @ 60 FPS
      ↓
Audio ends → Avatar returns to "idle" state
```

## Files to Create

### 1. Audio Analysis Module
**`app/lib/audioAnalyzer.ts`**
- Initialize Web Audio API
- Real-time frequency analysis
- Mouth morph calculation
- Performance optimization

### 2. Animation Driver Hook
**`app/hooks/useAvatarAnimation.ts`**
- Manage animation states
- Apply morph targets
- Handle transitions
- Performance monitoring

### 3. Avatar Lip-Sync Component
**`app/components/AvatarWithLipSync.tsx`**
- Wrapper around Avatar3D (from Phase 2)
- Integrates audio analysis
- Manages animation states
- Handles audio synchronization

### 4. TwinChat Updates
**`app/components/TwinChat.tsx`** (modifications)
- Pass audio blob to avatar component
- Trigger animation states
- Handle playback events

## Implementation Details

### Audio Frequency Bands

```
Human speech frequency distribution:
- Fundamental (F0): 80-250 Hz
- Formant 1 (vowels): 200-700 Hz  ← MOUTH OPEN
- Formant 2: 600-2500 Hz           ← MOUTH SHAPE
- Formant 3+: 2000+ Hz             ← CONSONANTS (optional)

Mapping:
- 0-500 Hz average → Mouth opening (0-1)
- 500-2000 Hz shape → Mouth roundness
- High frequencies → Speech intensity
```

### Morph Target Updates

```
// Typical GLB avatar morph targets (from Ready Player Me)
avatar.morphTargets:
  - mouthOpen (0-1)      // Jaw opening
  - mouthRound (0-1)     // Lip rounding
  - mouthSmile (0-0.5)   // Smile depth
  - eyesClose (0-1)      // Eye closing
  - eyesLookUp (0-1)     // Eye direction
```

### Animation Transitions

```
User sends message
  ↓ (AI responds, synthesizes audio)
Audio blob ready
  ↓
Avatar: idle → listening (head tilt, attention)
  ↓
AudioPlayer starts playback
  ↓
Avatar: listening → speaking (mouth animation starts)
  ├─ Web Audio API analyzes frequency
  ├─ Morph targets update 60 FPS
  ├─ Head bobs naturally
  └─ Eyes focus on user
  ↓
Audio ends
  ↓
Avatar: speaking → idle (return to breathing)
```

## Performance Targets

| Metric | Target | Approach |
|--------|--------|----------|
| **Latency** | <16ms (60 FPS) | Web Audio API (0ms added) |
| **CPU** | <5% on mobile | Throttled frequency analysis |
| **GPU** | <10MB additional | Morph target updates only |
| **Memory** | <50MB addition | Frequency data buffer reused |

## Phase 4 Tasks

### Task 1: Audio Analysis Engine
- [ ] Create `app/lib/audioAnalyzer.ts`
- [ ] Implement frequency analysis
- [ ] Calculate mouth opening from frequencies
- [ ] Add smoothing to prevent jitter
- [ ] Performance profiling

### Task 2: Animation State Machine
- [ ] Create `app/hooks/useAvatarAnimation.ts`
- [ ] State transitions (idle/listening/speaking)
- [ ] Morphtarget updates
- [ ] Timing and scheduling
- [ ] Error handling

### Task 3: Lip-Sync Component
- [ ] Create `app/components/AvatarWithLipSync.tsx`
- [ ] Integrate AudioAnalyzer
- [ ] Connect to Avatar3D
- [ ] Sync with audio playback
- [ ] Responsive design

### Task 4: TwinChat Integration
- [ ] Update TwinChat to use AvatarWithLipSync
- [ ] Pass audio blob to avatar
- [ ] Handle animation state changes
- [ ] Add visual feedback

### Task 5: Testing & Optimization
- [ ] Test on desktop (Chrome/Safari/Firefox)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Performance profiling
- [ ] Audio sync verification
- [ ] Fallback testing

## Optional Enhancements (Not Required for Phase 4)

### Enhancement 1: D-ID Integration (Future)
- Swap Web Audio lip-sync for D-ID for higher quality
- Optional, behind feature flag
- Adds $18/mo cost

### Enhancement 2: Advanced Expressions
- Eye movement tracking
- Eyebrow animation
- Head pose prediction
- Subtle smile during positive content

### Enhancement 3: Multi-Language Support
- Phoneme-based animation (advanced)
- Language-specific mouth shapes
- Complex but more accurate

## Risk Mitigation

### Risk 1: Audio Sync Drift
- **Mitigation:** Continuous frequency analysis correction
- **Fallback:** Reset to audio position periodically

### Risk 2: Jittery Mouth Animation
- **Mitigation:** Smoothing filters (exponential moving average)
- **Fallback:** Reduced update frequency

### Risk 3: Mobile Performance
- **Mitigation:** Lower FFT size on mobile, throttled updates
- **Fallback:** Static mouth open/close animation

### Risk 4: Avatar Model Without Morph Targets
- **Mitigation:** LIT-LAND supports custom animations
- **Fallback:** Simple head bobbing instead of mouth

## Technology Choices

**Web Audio API** ✅
- Native browser API (no dependencies)
- Real-time (<1ms latency)
- Works offline
- Cross-browser support
- Free

**LIT-LAND Morph Targets** ✅
- GLB models support standard morph targets
- Ready Player Me avatars have mouth morphs
- C++ engine handles animation efficiently
- Integrated with existing system

**No Additional Libraries Needed** ✅
- Everything uses native browser APIs
- Keeps bundle size small
- Performance-first approach

## Deployment

### Development
```bash
npm run dev
# Tests audio animation locally
# No Python backend needed for animation
```

### Production
```bash
npm run build && npm start
# Animation runs entirely in browser
# No server-side processing
```

## Testing Strategy

### Unit Tests
- [ ] Frequency analysis accuracy
- [ ] Morph target calculation
- [ ] State transitions
- [ ] Timing precision

### Integration Tests
- [ ] Audio playback → animation sync
- [ ] User sends message → avatar speaks
- [ ] Error recovery
- [ ] Mobile responsiveness

### Performance Tests
- [ ] FPS on desktop
- [ ] FPS on mobile
- [ ] CPU/GPU usage
- [ ] Memory consumption

## Success Criteria

✅ Avatar mouth animates when speaking
✅ Animation synced with audio (<50ms tolerance)
✅ Smooth 60 FPS animation
✅ Works on desktop and mobile
✅ No audio latency added
✅ Graceful fallback if audio unavailable
✅ No dependencies beyond browser APIs

## Next Steps After Phase 4

### Phase 4 Complete → Phase 5
- Polish and final testing
- Performance optimization
- Mobile verification
- Production deployment

### Optional Later
- D-ID integration for enhanced quality
- Advanced facial expressions
- Eye tracking
- Head movement prediction

---

## Summary

Phase 4 implements **real-time avatar lip-sync using Web Audio API**, providing:
- ✅ Zero latency animation
- ✅ No additional cost ($0/mo)
- ✅ Native browser support
- ✅ Simple, maintainable code
- ✅ Mobile-optimized performance

Ready to build? Let's implement the audio analyzer next!

---

**Phase 4 Approach:** Web Audio API + Morph Targets (Free & Real-Time)
**Alternative:** D-ID API for enhanced quality ($18/mo) - can add later
**Timeline:** 1-2 days for core implementation
