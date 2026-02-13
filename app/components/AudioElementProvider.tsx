"use client";

import React, { createContext, useContext, useState } from "react";

interface AudioElementContextType {
  audioElement: HTMLAudioElement | null;
  setAudioElement: (element: HTMLAudioElement | null) => void;
}

const AudioElementContext = createContext<AudioElementContextType | undefined>(undefined);

export function AudioElementProvider({ children }: { children: React.ReactNode }) {
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  return (
    <AudioElementContext.Provider value={{ audioElement, setAudioElement }}>
      {children}
    </AudioElementContext.Provider>
  );
}

export function useAudioElement() {
  const context = useContext(AudioElementContext);
  if (!context) {
    throw new Error("useAudioElement must be used within AudioElementProvider");
  }
  return context;
}
