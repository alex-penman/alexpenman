"use client";

import { useEffect, useRef, useState } from "react";

export interface AudioPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onAudioElementReady?: (audioElement: HTMLAudioElement) => void;
  isLoading?: boolean;
}

export default function AudioPlayer({
  audioUrl,
  audioBlob,
  autoPlay = false,
  onPlay,
  onPause,
  onEnd,
  onError,
  onAudioElementReady,
  isLoading = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Create object URL from blob
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    if (audioBlob) {
      // Clean up previous URL
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
      }

      // Create new URL
      objectUrl.current = URL.createObjectURL(audioBlob);
    }

    return () => {
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
      }
    };
  }, [audioBlob]);

  // Notify parent when audio element is ready (for lip-sync sync)
  useEffect(() => {
    if (audioRef.current && onAudioElementReady) {
      onAudioElementReady(audioRef.current);
    }
  }, [onAudioElementReady]);

  // Auto-play when URL changes
  useEffect(() => {
    if (audioRef.current && autoPlay && (audioUrl || audioBlob)) {
      audioRef.current.play().catch((err) => {
        console.error("Autoplay failed:", err);
      });
    }
  }, [audioUrl, audioBlob, autoPlay]);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      onPlay?.();
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    onEnd?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const errorMsg = audioRef.current?.error?.message || "Unknown audio error";
    setError(errorMsg);
    onError?.(new Error(errorMsg));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const src = audioBlob ? objectUrl.current : audioUrl;

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src || ""}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        crossOrigin="anonymous"
      />

      <div className="audio-player-content">
        {/* Error state */}
        {error && <div className="audio-error">{error}</div>}

        {/* Loading state */}
        {isLoading && <div className="audio-loading">Generating audio...</div>}

        {/* Controls */}
        {src && (
          <>
            <div className="audio-controls">
              <button
                className="audio-button play-button"
                onClick={togglePlayPause}
                disabled={isLoading}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? "●" : isPlaying ? "⏸" : "▶"}
              </button>

              <div className="audio-progress-container">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="audio-progress"
                  disabled={isLoading}
                />
              </div>

              <div className="audio-time">
                <span className="time-current">{formatTime(currentTime)}</span>
                <span className="time-separator">/</span>
                <span className="time-duration">{formatTime(duration)}</span>
              </div>

              <div className="audio-volume-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="audio-volume"
                  title="Volume"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Waveform visualization */}
            <div className="audio-visualizer">
              {isPlaying && (
                <>
                  <div className="visualizer-bar"></div>
                  <div className="visualizer-bar"></div>
                  <div className="visualizer-bar"></div>
                  <div className="visualizer-bar"></div>
                  <div className="visualizer-bar"></div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
