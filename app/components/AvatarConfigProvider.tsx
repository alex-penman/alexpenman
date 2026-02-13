"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface AvatarConfig {
  avatarUrl: string | null;
  voiceId: string | null;
  isConfigured: boolean;
}

interface AvatarConfigContextType {
  config: AvatarConfig;
  setAvatarUrl: (url: string) => void;
  setVoiceId: (id: string) => void;
  clearConfig: () => void;
  isLoading: boolean;
}

const AvatarConfigContext = createContext<AvatarConfigContextType | undefined>(
  undefined
);

export function AvatarConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AvatarConfig>({
    avatarUrl: null,
    voiceId: null,
    isConfigured: false
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("avatarConfig");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig({
          avatarUrl: parsed.avatarUrl || null,
          voiceId: parsed.voiceId || null,
          isConfigured: !!(parsed.avatarUrl && parsed.voiceId)
        });
      } catch {
        // Ignore parse errors, use defaults
      }
    }
    setIsLoading(false);
  }, []);

  const setAvatarUrl = (url: string) => {
    const newConfig = { ...config, avatarUrl: url, isConfigured: !!(url && config.voiceId) };
    setConfig(newConfig);
    localStorage.setItem("avatarConfig", JSON.stringify(newConfig));
  };

  const setVoiceId = (id: string) => {
    const newConfig = { ...config, voiceId: id, isConfigured: !!(config.avatarUrl && id) };
    setConfig(newConfig);
    localStorage.setItem("avatarConfig", JSON.stringify(newConfig));
  };

  const clearConfig = () => {
    const newConfig = { avatarUrl: null, voiceId: null, isConfigured: false };
    setConfig(newConfig);
    localStorage.removeItem("avatarConfig");
  };

  return (
    <AvatarConfigContext.Provider
      value={{ config, setAvatarUrl, setVoiceId, clearConfig, isLoading }}
    >
      {children}
    </AvatarConfigContext.Provider>
  );
}

export function useAvatarConfig() {
  const context = useContext(AvatarConfigContext);
  if (!context) {
    throw new Error("useAvatarConfig must be used within AvatarConfigProvider");
  }
  return context;
}
