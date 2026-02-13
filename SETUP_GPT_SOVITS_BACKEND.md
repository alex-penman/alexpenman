# Setting Up GPT-SoVITS Backend for Voice Cloning

This guide sets up a local Python backend for voice training and synthesis using GPT-SoVITS.

## Overview

```
Next.js Frontend (TypeScript)
         ↓
    API Routes (/api/voice/*)
         ↓
    Python Backend (Flask/FastAPI)
         ↓
    GPT-SoVITS Library
         ↓
    Trained Voice Models (Cached)
```

## Prerequisites

- Python 3.9+ (recommend 3.11)
- PyTorch (CPU or CUDA)
- 8GB RAM minimum (16GB recommended)
- ~2GB disk space per voice model

## Quick Start

### 1. Install Python Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-voice.txt
```

### 2. Create requirements-voice.txt

```txt
# Voice synthesis
GPT-SoVITS>=1.0.0
torch>=2.0.0
torchaudio>=2.0.0

# Backend
Flask>=2.3.0
Flask-CORS>=4.0.0
python-dotenv>=1.0.0

# Audio processing
librosa>=0.10.0
soundfile>=0.12.0
scipy>=1.11.0

# Utilities
numpy>=1.24.0
pydantic>=2.0.0
```

### 3. Create Python Backend Service

Create `voice_backend.py`:

```python
"""
GPT-SoVITS Voice Synthesis Backend

Handles voice model training and text-to-speech synthesis.
Runs alongside Next.js on localhost:5000
"""

import os
import json
import tempfile
from pathlib import Path
from typing import Optional, Tuple
import logging

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
import torchaudio
import librosa
import numpy as np

# Import GPT-SoVITS
try:
    from gpt_sovits import GPTSoVITSInference, train_voice_model
except ImportError:
    # Fallback if package structure differs
    from gpt_sovits.inference import GPTSoVITSInference

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
MODELS_DIR = Path("./voice_models")
MODELS_DIR.mkdir(exist_ok=True)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Global model cache
model_cache = {}

class VoiceModel:
    """Wrapper for trained GPT-SoVITS model"""

    def __init__(self, model_id: str, model_path: str):
        self.model_id = model_id
        self.model_path = model_path
        self.inference = None
        self.created_at = None
        self.reference_audio_path = None

    def load(self):
        """Load model from disk"""
        if not self.inference:
            logger.info(f"Loading model {self.model_id}...")
            self.inference = GPTSoVITSInference(
                model_path=self.model_path,
                device=DEVICE
            )
        return self.inference

    def unload(self):
        """Free memory"""
        if self.inference:
            del self.inference
            self.inference = None

    def synthesize(self, text: str, emotion: str = "neutral") -> bytes:
        """Synthesize speech from text"""
        inference = self.load()

        # Generate audio
        audio = inference.synthesize(
            text=text,
            emotion=emotion,
            language="auto"
        )

        # Convert to bytes
        return audio


# ============================================================================
# TRAINING ENDPOINT
# ============================================================================

@app.route("/api/voice/train", methods=["POST"])
def train_voice():
    """
    Train a new voice model from audio samples

    Expected request:
    {
        "voice_id": "alex_voice",
        "samples": [file1, file2, ...],  # WAV/MP3 files
        "transcripts": ["transcript1", "transcript2", ...]
    }
    """
    try:
        voice_id = request.form.get("voice_id")
        if not voice_id:
            return jsonify({"error": "voice_id required"}), 400

        # Check if already trained
        if voice_id in model_cache:
            logger.info(f"Model {voice_id} already exists in cache")
            return jsonify({
                "success": True,
                "voice_id": voice_id,
                "status": "cached"
            }), 200

        # Get uploaded files
        files = request.files.getlist("samples")
        if not files:
            return jsonify({"error": "No audio files provided"}), 400

        logger.info(f"Training voice model: {voice_id} ({len(files)} samples)")

        # Combine audio samples
        combined_audio = []
        sample_rate = None

        with tempfile.TemporaryDirectory() as tmpdir:
            for i, file in enumerate(files):
                # Save uploaded file
                temp_path = Path(tmpdir) / f"sample_{i}.wav"
                file.save(temp_path)

                # Load audio
                audio, sr = librosa.load(str(temp_path), sr=None)
                sample_rate = sr
                combined_audio.append(audio)

            # Concatenate samples
            combined = np.concatenate(combined_audio)
            reference_audio_path = MODELS_DIR / f"{voice_id}_reference.wav"

            # Save reference audio
            torchaudio.save(
                str(reference_audio_path),
                torch.FloatTensor(combined).unsqueeze(0),
                sample_rate
            )

            # Train model
            model_path = MODELS_DIR / f"{voice_id}_model.pt"

            logger.info(f"Training GPT-SoVITS model... (this may take a few minutes)")

            train_voice_model(
                reference_audio=str(reference_audio_path),
                model_output_path=str(model_path),
                num_epochs=10,
                device=DEVICE
            )

        # Cache trained model
        voice_model = VoiceModel(
            model_id=voice_id,
            model_path=str(model_path)
        )
        voice_model.reference_audio_path = str(reference_audio_path)
        voice_model.load()  # Verify it loads
        model_cache[voice_id] = voice_model

        logger.info(f"Successfully trained voice model: {voice_id}")

        return jsonify({
            "success": True,
            "voice_id": voice_id,
            "status": "trained",
            "model_path": str(model_path)
        }), 201

    except Exception as e:
        logger.error(f"Training failed: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ============================================================================
# SYNTHESIS ENDPOINT
# ============================================================================

@app.route("/api/voice/synthesize", methods=["POST"])
def synthesize_voice():
    """
    Synthesize speech from text using trained voice model

    Expected request:
    {
        "text": "Hello, how are you?",
        "voice_id": "alex_voice",
        "emotion": "neutral"
    }
    """
    try:
        data = request.get_json()
        text = data.get("text")
        voice_id = data.get("voice_id")
        emotion = data.get("emotion", "neutral")

        if not text or not voice_id:
            return jsonify({
                "error": "text and voice_id required"
            }), 400

        # Get model from cache
        if voice_id not in model_cache:
            return jsonify({
                "error": f"Model {voice_id} not found. Train first."
            }), 404

        logger.info(f"Synthesizing: '{text[:50]}...' with voice {voice_id}")

        voice_model = model_cache[voice_id]
        audio_bytes = voice_model.synthesize(text, emotion)

        # Save to temporary file for sending
        temp_file = tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False
        )
        temp_file.write(audio_bytes)
        temp_file.close()

        return send_file(
            temp_file.name,
            mimetype="audio/wav",
            as_attachment=True,
            download_name="output.wav"
        )

    except Exception as e:
        logger.error(f"Synthesis failed: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ============================================================================
# STATUS ENDPOINT
# ============================================================================

@app.route("/api/voice/status", methods=["GET"])
def status():
    """Get status of trained models"""
    return jsonify({
        "device": DEVICE,
        "models": list(model_cache.keys()),
        "cuda_available": torch.cuda.is_available(),
        "torch_version": torch.__version__
    }), 200


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    logger.info(f"Starting GPT-SoVITS voice backend on {DEVICE}")
    logger.info("Available endpoints:")
    logger.info("  POST /api/voice/train - Train new voice model")
    logger.info("  POST /api/voice/synthesize - Generate speech")
    logger.info("  GET /api/voice/status - Check status")
    logger.info("  GET /health - Health check")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        threaded=True
    )
```

### 4. Update Next.js API Routes

Create `/app/api/voice/train/route.ts`:

```typescript
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Forward to Python backend
    const response = await fetch('http://127.0.0.1:5000/api/voice/train', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return Response.json(result, { status: response.status });
  } catch (error) {
    console.error('Voice training error:', error);
    return Response.json(
      { error: 'Failed to train voice model' },
      { status: 500 }
    );
  }
}
```

Create `/app/api/voice/synthesize/route.ts`:

```typescript
export async function POST(req: Request) {
  try {
    const { text, voice_id, emotion } = await req.json();

    const response = await fetch(
      'http://127.0.0.1:5000/api/voice/synthesize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id, emotion }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return Response.json(error, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/wav' },
    });
  } catch (error) {
    console.error('Synthesis error:', error);
    return Response.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}
```

## Running the Backend

### Development

```bash
# Terminal 1: Start Python backend
source venv/bin/activate
python voice_backend.py

# Terminal 2: Start Next.js frontend
npm run dev
```

### Production (Self-Hosted)

Use systemd to manage the Python service:

```bash
# /etc/systemd/system/voice-backend.service
[Unit]
Description=GPT-SoVITS Voice Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/alex-penman
ExecStart=/var/www/alex-penman/venv/bin/python voice_backend.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable voice-backend
sudo systemctl start voice-backend
```

## Troubleshooting

### "No module named 'gpt_sovits'"

```bash
pip install git+https://github.com/RVC-Boss/GPT-SoVITS.git
```

### Out of Memory

Use CPU inference:
```python
DEVICE = "cpu"  # In voice_backend.py
```

### Slow Synthesis

First run trains the model. Subsequent calls are cached and fast.

## Performance Notes

- **First call (training):** 2-5 minutes
- **Subsequent calls (cached):** <1 second
- **Memory:** ~4GB during training, ~2GB cached
- **Storage:** ~500MB per trained model

## Next: Frontend Integration

Once backend is running, the Next.js API routes forward requests to the Python service automatically.

See PHASE_3_IMPLEMENTATION.md for frontend components.
