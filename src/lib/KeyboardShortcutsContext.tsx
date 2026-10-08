import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { KEYS, readJSON, writeJSON } from './storage';

export type ShortcutAction = 'next' | 'back' | 'review' | 'search' | 'save' | 'help';
export type ShortcutMap = Record<ShortcutAction, string>;

export const defaultShortcuts: ShortcutMap = {
  next: 'Alt+N',
  back: 'Alt+B',
  review: 'Alt+R',
  search: 'Alt+S',
  save: 'Alt+D',
  help: '?',
};

const labels: Record<ShortcutAction, string> = {
  next: 'Next',
  back: 'Back',
  review: 'Review',
  search: 'Focus search',
  save: 'Save draft',
  help: 'Help',
};

type Ctx = {
  shortcuts: ShortcutMap;
  setShortcut: (action: ShortcutAction, value: string) => void;
  resetShortcuts: () => void;
};

const C = createContext<Ctx | null>(null);
const eventName = 'applyease:shortcut';

function normalize(combo: string): string {
  return combo.trim().replace(/\s+/g, '').split('+').map((part) => {
    if (/^alt$/i.test(part)) return 'Alt';
    if (/^ctrl$/i.test(part)) return 'Ctrl';
    if (/^shift$/i.test(part)) return 'Shift';
    if (/^meta$/i.test(part)) return 'Meta';
    return part.length === 1 ? part.toUpperCase() : part;
  }).join('+');
}

function eventCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.altKey) parts.push('Alt');
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.metaKey) parts.push('Meta');
  if (e.shiftKey && e.key !== '?') parts.push('Shift');
  if (e.key === '?') return '?';
  parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
  return parts.join('+');
}

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(() => ({ ...defaultShortcuts, ...readJSON<Partial<ShortcutMap>>(KEYS.shortcuts, {}) }));
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    writeJSON(KEYS.shortcuts, shortcuts);
  }, [shortcuts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target?.closest('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      const combo = eventCombo(e);
      const action = (Object.keys(shortcuts) as ShortcutAction[]).find((key) => normalize(shortcuts[key]) === combo);
      if (!action) return;
      e.preventDefault();
      if (action === 'help') setHelpOpen(true);
      else document.dispatchEvent(new CustomEvent(eventName, { detail: { action } }));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcuts]);

  const value = useMemo<Ctx>(() => ({
    shortcuts,
    setShortcut: (action, value) => setShortcuts((current) => ({ ...current, [action]: normalize(value) })),
    resetShortcuts: () => setShortcuts({ ...defaultShortcuts }),
  }), [shortcuts]);

  return (
    <C.Provider value={value}>
      {children}
      {helpOpen && (
        <div className="overlay shortcut-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
          <section className="shortcut-help" role="dialog" aria-modal="true" aria-labelledby="shortcut-help-title">
            <div className="panel-head"><div><p className="eyebrow">Keyboard help</p><h2 id="shortcut-help-title">Shortcuts you can change</h2></div><button className="icon-btn" onClick={() => setHelpOpen(false)} aria-label="Close keyboard help">×</button></div>
            <div className="shortcut-list">{(Object.keys(shortcuts) as ShortcutAction[]).map((action) => <div key={action}><strong>{labels[action]}</strong><kbd>{shortcuts[action]}</kbd></div>)}</div>
            <p className="muted">Shortcuts pause while you are typing. Change them in Accessibility Center.</p>
            <button className="btn primary" onClick={() => setHelpOpen(false)}>Close</button>
          </section>
        </div>
      )}
    </C.Provider>
  );
}

export function useKeyboardShortcuts(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('KeyboardShortcutsProvider missing');
  return c;
}

export function useShortcutAction(action: ShortcutAction, handler: () => void) {
  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<{ action: ShortcutAction }>).detail?.action === action) handler();
    };
    document.addEventListener(eventName, listener);
    return () => document.removeEventListener(eventName, listener);
  }, [action, handler]);
}
