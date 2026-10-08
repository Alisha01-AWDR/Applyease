import { Accessibility, Contrast, Keyboard, Mic, Move, Type, Volume2, Check, BookOpen } from 'lucide-react';
import { useAccessibility } from '../lib/AccessibilityContext';
import { defaultShortcuts, ShortcutAction, useKeyboardShortcuts } from '../lib/KeyboardShortcutsContext';

const shortcutLabels: Record<ShortcutAction, string> = {
  next: 'Next', back: 'Back', review: 'Review', search: 'Focus search', save: 'Save draft', help: 'Help',
};

export default function AccessibilityCenter() {
  const a = useAccessibility();
  const k = useKeyboardShortcuts();
  return (
    <div className="page">
      <div className="page-head"><div><p className="eyebrow">Accessibility center</p><h1>Your experience, your way.</h1><p className="page-sub">Tune the interface without changing your application data or creating a disability record.</p></div><div className="center-badge"><Accessibility /> WCAG-minded controls</div></div>
      <div className="access-grid">
        <section className="card access-card">
          <h2>Display</h2><p>Preview the reading experience as you change it.</p>
          <div className="setting-row"><div><Type /><span>Text size</span></div><div className="text-size-control"><input type="range" min="1" max="1.5" step="0.1" value={a.textScale} onChange={(e) => a.setTextScale(Number(e.target.value))} aria-label="Text size" /><output>{Math.round(a.textScale * 100)}%</output></div></div>
          <div className="setting-row"><div><Type /><span>Large text</span></div><button className={'switch ' + (a.largeText ? 'on' : '')} aria-pressed={a.largeText} aria-label="Large text" onClick={() => a.toggle('largeText')}><span /></button></div>
          <div className="setting-row"><div><BookOpen /><span>Dyslexia-friendly font</span></div><button className={'switch ' + (a.dyslexiaFriendly ? 'on' : '')} aria-pressed={a.dyslexiaFriendly} aria-label="Dyslexia-friendly font" onClick={() => a.toggle('dyslexiaFriendly')}><span /></button></div>
          <div className="setting-row"><div><Contrast /><span>High contrast</span></div><button className={'switch ' + (a.highContrast ? 'on' : '')} aria-pressed={a.highContrast} aria-label="High contrast" onClick={() => a.toggle('highContrast')}><span /></button></div>
          <div className="setting-row"><div><Move /><span>Reduced motion</span></div><button className={'switch ' + (a.reducedMotion ? 'on' : '')} aria-pressed={a.reducedMotion} aria-label="Reduced motion" onClick={() => a.toggle('reducedMotion')}><span /></button></div>
          <div className="setting-row"><div><span className="spacing-label">Aa</span><span>Spacing</span></div><div className="segmented"><button type="button" aria-pressed={a.spacing === 'comfortable'} className={a.spacing === 'comfortable' ? 'selected' : ''} onClick={() => a.setSpacing('comfortable')}>Comfortable</button><button type="button" aria-pressed={a.spacing === 'spacious'} className={a.spacing === 'spacious' ? 'selected' : ''} onClick={() => a.setSpacing('spacious')}>Spacious</button></div></div>
        </section>
        <section className="card access-card"><h2>Interaction</h2><p>Every mode can reach the same core journey.</p><div className="mode-proof"><div><Keyboard /><strong>Keyboard</strong><span>Full navigation</span></div><div><Mic /><strong>Voice</strong><span>Commands + dictation</span></div><div><Volume2 /><strong>Screen reader</strong><span>Semantic announcements</span></div></div><div className="privacy-banner"><Check /><div><strong>Separate by design.</strong><p>Interface preferences are never treated as disability disclosure.</p></div></div></section>
      </div>

      <section className="card shortcut-settings">
        <div className="page-head"><div><p className="eyebrow">Keyboard map</p><h2>Choose your shortcuts.</h2><p className="page-sub">Shortcuts are suspended while typing. Use simple combinations such as Alt+N or ?.</p></div><button className="btn secondary" onClick={k.resetShortcuts}>Reset defaults</button></div>
        <div className="shortcut-grid">
          {(Object.keys(defaultShortcuts) as ShortcutAction[]).map((action) => <label key={action}><span>{shortcutLabels[action]}</span><input value={k.shortcuts[action]} onChange={(e) => k.setShortcut(action, e.target.value)} aria-label={`${shortcutLabels[action]} shortcut`} /></label>)}
        </div>
      </section>
    </div>
  );
}
