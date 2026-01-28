'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
}

interface UseTextToSpeechReturn {
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
}

const VOICE_PREFERENCE_KEY = 'resolution-lab-voice-preference';
const AUTO_PLAY_KEY = 'resolution-lab-voice-autoplay';

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const { rate = 1, pitch = 1, volume = 1, voiceName } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if speech synthesis is supported
  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Try to restore saved voice preference
      const savedVoiceName = localStorage.getItem(VOICE_PREFERENCE_KEY);

      if (savedVoiceName) {
        const savedVoice = availableVoices.find(v => v.name === savedVoiceName);
        if (savedVoice) {
          setSelectedVoice(savedVoice);
          return;
        }
      }

      // Default to a good English voice
      const preferredVoice = availableVoices.find(
        v => v.lang.startsWith('en') && (
          v.name.includes('Samantha') ||
          v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.name.includes('Daniel')
        )
      ) || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];

      if (preferredVoice) {
        setSelectedVoice(preferredVoice);
      }
    };

    // Voices may load asynchronously
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported, voiceName]);

  // Save voice preference when changed
  useEffect(() => {
    if (selectedVoice) {
      localStorage.setItem(VOICE_PREFERENCE_KEY, selectedVoice.name);
    }
  }, [selectedVoice]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, rate, pitch, volume, selectedVoice]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
  };
}

// Helper functions for auto-play preference
export function getAutoPlayPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTO_PLAY_KEY) === 'true';
}

export function setAutoPlayPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_PLAY_KEY, String(enabled));
}
