# AI Alex Avatar - Quick Start Guide

Get your AI avatar up and running in 5 minutes.

## Step 1: Get API Keys (5 minutes)

### Required: ElevenLabs (Voice)
1. Go to https://elevenlabs.io/
2. Sign up for free trial or paid plan
3. Navigate to Settings → API Keys
4. Copy your API key
5. **Cost**: $22/mo (Starter) or $99/mo (Pro recommended)

### Optional: D-ID (Premium Lip-Sync)
1. Go to https://studio.d-id.com/
2. Sign up (free tier: 20 credits/month)
3. Navigate to Account Settings → API Key
4. Copy your API key
5. **Cost**: Free tier or $18/mo (Pro)

## Step 2: Configure Vercel (2 minutes)

1. Go to your Vercel dashboard
2. Select the `self` project
3. Go to Settings → Environment Variables
4. Add these variables:

```bash
# Required
ELEVENLABS_API_KEY = paste_your_key_here

# Optional (for premium lip-sync)
DID_API_KEY = paste_your_key_here
```

## Step 3: Deploy (1 minute)

```bash
# Option A: Git push (auto-deploys)
git add .
git commit -m "Add AI Avatar"
git push origin main

# Option B: Vercel CLI
vercel --prod
```

Wait for deployment to complete (~2 minutes).

## Step 4: Setup Your Avatar (5 minutes)

1. Visit `https://your-domain.com/setup`
2. **Create Avatar**:
   - Upload a photo of yourself
   - Ready Player Me generates your 3D avatar
   - Click "Save Avatar"

3. **Train Voice**:
   - Record 5 voice samples (30 seconds each)
   - Read these prompts clearly:
     ```
     1. "Hi, I'm Alex. I teach people to think clearly and build with confidence."
     2. "When I approach a problem, I focus on understanding first, then structure."
     3. "The best code is the code you can delete. Keep systems simple."
     4. "I believe teaching is about momentum: small wins that compound."
     5. "Let me help you turn confusion into clarity, one question at a time."
     ```
   - Click "Train Voice"
   - Wait ~1 minute for processing

4. Click "Save & Continue"

## Step 5: Test Your Avatar (2 minutes)

1. Visit homepage: `https://your-domain.com/`
2. You should see:
   - Your 3D avatar in the left panel
   - Chat interface in the right panel
3. Type a message: "Hello, tell me about yourself"
4. Watch:
   - AI generates response (GPT-4o-mini)
   - Voice synthesis plays (ElevenLabs)
   - Avatar lip-syncs in real-time

## Done! 🎉

Your AI avatar is now live.

## Quick Troubleshooting

### Avatar not loading?
- Check browser console (F12)
- Verify avatar URL was saved in setup
- Try refreshing the page

### Voice not playing?
- Check ELEVENLABS_API_KEY is set in Vercel
- Verify voice_id was saved in setup
- Check browser console for errors

### Build failing?
```bash
rm -rf .next node_modules
npm install
npm run build
```

## Cost Summary

### Minimum ($24/mo)
- OpenAI: $2/mo
- ElevenLabs Starter: $22/mo
- D-ID: Not used (free client-side lip-sync)

### Recommended ($119/mo)
- OpenAI: $2/mo
- ElevenLabs Pro: $99/mo
- D-ID Pro: $18/mo

### Free Tier (for testing)
- OpenAI: First $5 free
- ElevenLabs: 10k characters free
- D-ID: 20 credits free
- **Total: FREE for ~100 conversations**

## Support

Need help?
1. Check `AVATAR_IMPLEMENTATION.md` for detailed docs
2. Review `IMPLEMENTATION_COMPLETE.md` for technical details
3. Check Vercel deployment logs
4. Test API endpoints with curl

## Next Steps

1. Customize avatar appearance at Ready Player Me
2. Record better voice samples for improved quality
3. Add custom prompts to AI personality
4. Monitor usage in ElevenLabs dashboard
5. Upgrade to paid plans for unlimited use

---

**Total setup time**: ~15 minutes
**Monthly cost**: $24-$119
**Difficulty**: Easy (if you follow the steps)
