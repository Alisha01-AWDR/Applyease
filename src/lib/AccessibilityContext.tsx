import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KEYS, readJSON, writeJSON } from './storage';

export type Mode = 'screen' | 'keyboard' | 'voice' | 'mixed';
export type Spacing = 'comfortable' | 'spacious';
type ToggleKey = 'largeText' | 'highContrast' | 'reducedMotion' | 'dyslexiaFriendly';

export type Settings = {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexiaFriendly: boolean;
  textScale: number;
  spacing: Spacing;
  mode: Mode;
};

type Ctx = Settings & {
  toggle: (k: ToggleKey) => void;
  setSpacing: (s: Spacing) => void;
  setMode: (m: Mode) => void;
  setTextScale: (scale: number) => void;
};

export const modeLabels: Record<Mode, string> = {
  screen: 'Screen reader mode',
  keyboard: 'Keyboard mode',
  voice: 'Voice mode',
  mixed: 'Mixed mode',
};

function osPrefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function loadSettings(): Settings {
  const stored = readJSON<Partial<Settings>>(KEYS.accessibility, {});
  const textScale = Math.min(1.5, Math.max(1, stored.textScale ?? (stored.largeText ? 1.15 : 1)));
  return {
    largeText: stored.largeText ?? textScale > 1,
    highContrast: stored.highContrast ?? false,
    reducedMotion: stored.reducedMotion ?? osPrefersReducedMotion(),
    dyslexiaFriendly: stored.dyslexiaFriendly ?? false,
    textScale,
    spacing: stored.spacing ?? 'comfortable',
    mode: stored.mode ?? 'mixed',
  };
}

const AccessibilityCtx = createContext<Ctx | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.large = String(settings.largeText);
    root.dataset.contrast = String(settings.highContrast);
    root.dataset.motion = String(settings.reducedMotion);
    root.dataset.spacing = settings.spacing;
    root.dataset.dyslexia = String(settings.dyslexiaFriendly);
    root.style.setProperty('--text-scale', String(settings.textScale));
    writeJSON(KEYS.accessibility, settings);
  }, [settings]);

  const toggle = useCallback((k: ToggleKey) => {
    setSettings((s) => {
      if (k === 'largeText') {
        const next = !s.largeText;
        return { ...s, largeText: next, textScale: next ? Math.max(s.textScale, 1.15) : 1 };
      }
      return { ...s, [k]: !s[k] };
    });
  }, []);
  const setSpacing = useCallback((spacing: Spacing) => setSettings((s) => ({ ...s, spacing })), []);
  const setMode = useCallback((mode: Mode) => setSettings((s) => ({ ...s, mode })), []);
  const setTextScale = useCallback((scale: number) => {
    const safe = Math.min(1.5, Math.max(1, scale));
    setSettings((s) => ({ ...s, textScale: safe, largeText: safe > 1 }));
  }, []);

  const value = useMemo<Ctx>(() => ({ ...settings, toggle, setSpacing, setMode, setTextScale }), [settings, toggle, setSpacing, setMode, setTextScale]);
  return <AccessibilityCtx.Provider value={value}>{children}</AccessibilityCtx.Provider>;
}

export function useAccessibility(): Ctx {
  const c = useContext(AccessibilityCtx);
  if (!c) throw new Error('AccessibilityProvider missing');
  return c;
}
