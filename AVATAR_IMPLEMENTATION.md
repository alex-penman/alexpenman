# AI Alex Avatar Implementation Guide

This document describes the 3D avatar implementation for alexpenman.com.au, transforming it into an immersive AI experience with voice cloning and real-time lip-sync.

## Architecture Overview

```
User Message → GPT-4o (text) → ElevenLabs (voice) → Client-side Audio Analysis → React Three Fiber (3D avatar)
                ↓
         PostgreSQL Memory (unchanged)
```

## Technology Stack

| Component | Technology | Cost | Status |
|-----------|-----------|------|--------|
| **3D Avatar** | React Three Fiber + Ready Player Me | FREE | ✅ Implemented |
| **3D Rendering** | @react-three/fiber + @react-three/drei | FREE | ✅ Implemented |
| **Voice Clone** | ElevenLabs API | $22-99/mo | ✅ Implemented |
| **Lip Sync** | Web Audio API (client-side) | FREE | ✅ Implemented |
| **Lip Sync (Optional)** | D-ID Streaming | $18/mo | ✅ API ready (optional) |
| **AI Text** | GPT-4o-mini | $2/mo | ✅ Existing |

**Total Cost:**
- Minimum: $24/mo (ElevenLabs Starter + OpenAI)
- Recommended: $119/mo (ElevenLabs Pro + D-ID + OpenAI)

## Key Features Implemented

### 1. React Three Fiber 3D Avatar
- **File**: `/app/components/Avatar3D.tsx`
- **Features**:
  - GLTF/GLB model loading for Ready Player Me avatars
  - PBR materials with realistic lighting
  - Orbit controls for user interaction
  - Morph target-based facial animations
  - Fallback placeholder when no avatar configured

### 2. ElevenLabs Voice Integration
- **Files**:
  - `/app/api/voice/synthesize/route.ts` - Text-to-speech
  - `/app/api/voice/train/route.ts` - Voice cloning
- **Features**:
  - Professional voice cloning with 1-5 audio samples
  - Streaming TTS for low latency
  - Error handling for quota limits
  - Audio caching (24h)

### 3. D-ID Lip-Sync (Optional)
- **File**: `/app/api/avatar/animate/route.ts`
- **Features**:
  - Server-side lip-sync animation
  - Graceful fallback to client-side audio analysis
  - WebRTC streaming support
  - Cost-effective: only used when configured

### 4. Main Page Layout
- **File**: `/app/page.tsx`
- **Layout**:
  - 40% width: 3D Avatar viewport
  - 60% width: Chat interface
  - Mobile: Stacked layout
  - Lazy loading for performance

## File Structure

```
/app
├── components/
│   ├── Avatar3D.tsx                  # NEW: React Three Fiber avatar
│   ├── AvatarConfigProvider.tsx      # Existing: Avatar config context
│   ├── TwinChat.tsx                  # Existing: Chat interface
│   └── ...
├── api/
│   ├── twin/route.ts                 # Existing: AI text generation
│   ├── voice/
│   │   ├── synthesize/route.ts       # UPDATED: ElevenLabs TTS
│   │   └── train/route.ts            # UPDATED: ElevenLabs voice cloning
│   └── avatar/
│       └── animate/route.ts          # NEW: D-ID lip-sync (optional)
├── page.tsx                          # UPDATED: Main page with avatar
└── globals.css                       # UPDATED: Avatar3D styles

/public
└── avatars/                          # Ready Player Me GLB files
```

## Setup Instructions

### 1. Install Dependencies

Already installed:
```bash
npm install @react-three/fiber@^8.15.0 @react-three/drei@^9.88.0 three@^0.158.0
```

### 2. Configure Environment Variables

Add to `.env.local` (development) and Vercel (production):

```bash
# Required
OPENAI_API_KEY="sk-..."
ELEVENLABS_API_KEY="your_api_key"

# Optional (for enhanced lip-sync)
DID_API_KEY="your_api_key"

# Optional (for custom Ready Player Me subdomain)
NEXT_PUBLIC_READY_PLAYER_ME_SUBDOMAIN="your_subdomain"
```

### 3. Get API Keys

**ElevenLabs** (Required):
1. Sign up at https://elevenlabs.io/
2. Go to Settings → API Keys
3. Generate new key
4. Plans: Starter ($22/mo) or Pro ($99/mo recommended)

**D-ID** (Optional):
1. Sign up at https://studio.d-id.com/
2. Go to Account Settings → API Key
3. Generate new key
4. Free tier: 20 credits/month
5. Pro: $18/month for 120 credits

**Ready Player Me** (Optional):
1. Sign up at https://readyplayer.me/
2. Create custom subdomain (optional)
3. Use default avatars or create custom ones

### 4. Create/Train Your Voice

Visit `/setup` to:
1. Upload photo → Generate Ready Player Me avatar
2. Record 5 voice samples (30s each)
3. Train ElevenLabs voice model
4. Save configuration to localStorage

Or use preset voices:
- Check ElevenLabs dashboard for preset voices
- Use voice IDs directly in config

### 5. Deploy

```bash
# Local development
npm run dev

# Production build
npm run build

# Deploy to Vercel
vercel --prod
```

## Usage

### Basic Chat Flow

1. User visits `/` - sees 3D avatar and chat interface
2. User types message → Avatar state changes to "listening"
3. AI generates response (GPT-4o-mini with memory)
4. Text converts to audio (ElevenLabs)
5. Avatar lip-syncs while speaking (Web Audio API)
6. Audio ends → Avatar returns to "idle"

### Animation States

- **idle**: Subtle breathing animation
- **listening**: Head tilt during user input
- **speaking**: Real-time lip-sync with audio

### Lip-Sync Approach

**Client-Side (Default - FREE)**:
- Web Audio API analyzes frequency data
- Real-time morph target calculation
- Works without D-ID API key
- Good quality for most use cases

**Server-Side (Optional - $18/mo)**:
- D-ID Streaming API
- Higher quality lip-sync
- Requires D-ID API key
- Automatically used when configured

## Cost Optimization

### Budget Option ($24/mo)
```bash
OPENAI_API_KEY="sk-..."           # $2/mo
ELEVENLABS_API_KEY="..."          # $22/mo (Starter)
# DID_API_KEY not set               # Uses free client-side lip-sync
```

### Recommended ($119/mo)
```bash
OPENAI_API_KEY="sk-..."           # $2/mo
ELEVENLABS_API_KEY="..."          # $99/mo (Pro - better quality)
DID_API_KEY="..."                 # $18/mo (Pro - better lip-sync)
```

### Development ($0/mo)
- Use OpenAI TTS instead of ElevenLabs
- Client-side lip-sync only
- Default avatar placeholder

## Performance Considerations

### Lazy Loading
- Avatar3D component lazy loads (not server-side rendered)
- GLTF models cached by browser
- Three.js loaded only when needed

### Bundle Size
- React Three Fiber: ~100KB gzipped
- Three.js: ~500KB gzipped
- Total added: ~600KB (lazy loaded)

### Mobile Performance
- Target: 30+ FPS on mobile devices
- Tested on: iPhone 12, Samsung Galaxy A52
- Optimizations: Lower poly models for mobile

## Database Schema

**No changes required**. The existing PostgreSQL memory system remains unchanged:

```sql
-- Existing tables (unchanged)
mind.fact
mind.story
mind.query_log
```

The avatar system stores configuration in localStorage:
```javascript
{
  avatarUrl: "https://models.readyplayer.me/xxx.glb",
  voiceId: "elevenlabs_voice_id_here",
  isConfigured: true
}
```

## Troubleshooting

### Avatar Not Loading
1. Check browser console for CORS errors
2. Verify avatar URL is accessible
3. Check Ready Player Me model format (must be GLB)
4. Try default fallback avatar

### Voice Synthesis Fails
1. Check ELEVENLABS_API_KEY is set
2. Verify API quota not exceeded
3. Check voice_id is valid
4. Review Vercel function logs

### Lip-Sync Issues
1. Client-side: Check Web Audio API support
2. Server-side: Verify DID_API_KEY is set
3. Check audio file format (MP3/WAV)
4. Review browser console for errors

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Next Steps

1. **Create Avatar**: Visit `/setup` and create your avatar
2. **Train Voice**: Record 5 voice samples
3. **Test Chat**: Try conversation at `/`
4. **Deploy**: Push to production on Vercel

## API Reference

### POST /api/voice/synthesize
Generates speech from text using ElevenLabs.

**Request:**
```json
{
  "text": "Hello, I'm AI Alex",
  "voice_id": "elevenlabs_voice_id"
}
```

**Response:** Audio blob (MP3)

### POST /api/voice/train
Trains a voice model from audio samples.

**Request:** FormData
```
voice_name: "AI Alex Voice"
sample_0: audio_file.wav
sample_1: audio_file.wav
...
```

**Response:**
```json
{
  "success": true,
  "voice_id": "generated_voice_id",
  "status": "Voice model trained successfully"
}
```

### POST /api/avatar/animate
Generates lip-sync animation data (optional).

**Request:**
```json
{
  "text": "Spoken text",
  "audio_url": "https://example.com/audio.mp3"
}
```

**Response:**
```json
{
  "animation_data": {
    "type": "client-side" | "d-id",
    "method": "audio-analysis"
  },
  "duration": 5.2
}
```

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Review browser console errors
3. Test API endpoints with curl/Postman
4. Check ElevenLabs/D-ID dashboards for quota

## License

Proprietary - Alex Penman
