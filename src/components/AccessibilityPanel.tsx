import { X, Type, Contrast, Move, AlignJustify, BookOpen } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAccessibility } from '../lib/AccessibilityContext';

export default function AccessibilityPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const a = useAccessibility();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    closeRef.current?.focus();

    const getFocusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? []);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside ref={panelRef} className="access-panel" role="dialog" aria-modal="true" aria-labelledby="access-title">
        <div className="panel-head">
          <div><p className="eyebrow">Ease controls</p><h2 id="access-title">Your experience, your way.</h2></div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close accessibility controls"><X /></button>
        </div>
        <p className="muted">These settings change the interface, not your application data.</p>

        <div className="setting">
          <div className="setting-label"><Type /><span>Text size</span></div>
          <div className="text-size-control">
            <input type="range" min="1" max="1.5" step="0.1" value={a.textScale} onChange={(e) => a.setTextScale(Number(e.target.value))} aria-label="Text size" />
            <output>{Math.round(a.textScale * 100)}%</output>
          </div>
        </div>
        <div className="setting"><div className="setting-label"><Type /><span>Large text</span></div><button className={'switch ' + (a.largeText ? 'on' : '')} aria-pressed={a.largeText} aria-label="Large text" onClick={() => a.toggle('largeText')}><span /></button></div>
        <div className="setting"><div className="setting-label"><BookOpen /><span>Dyslexia-friendly font</span></div><button className={'switch ' + (a.dyslexiaFriendly ? 'on' : '')} aria-pressed={a.dyslexiaFriendly} aria-label="Dyslexia-friendly font" onClick={() => a.toggle('dyslexiaFriendly')}><span /></button></div>
        <div className="setting"><div className="setting-label"><Contrast /><span>High contrast</span></div><button className={'switch ' + (a.highContrast ? 'on' : '')} aria-pressed={a.highContrast} aria-label="High contrast" onClick={() => a.toggle('highContrast')}><span /></button></div>
        <div className="setting"><div className="setting-label"><Move /><span>Reduced motion</span></div><button className={'switch ' + (a.reducedMotion ? 'on' : '')} aria-pressed={a.reducedMotion} aria-label="Reduced motion" onClick={() => a.toggle('reducedMotion')}><span /></button></div>
        <div className="setting"><div className="setting-label"><AlignJustify /><span>Spacing</span></div><div className="segmented"><button type="button" aria-pressed={a.spacing === 'comfortable'} className={a.spacing === 'comfortable' ? 'selected' : ''} onClick={() => a.setSpacing('comfortable')}>Comfortable</button><button type="button" aria-pressed={a.spacing === 'spacious'} className={a.spacing === 'spacious' ? 'selected' : ''} onClick={() => a.setSpacing('spacious')}>Spacious</button></div></div>
        <div className="panel-note">✓ Accessibility preferences are saved in this browser.</div>
      </aside>
    </div>
  );
}
