import { AlertCircle, Mic, MicOff, Volume2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAnnounce } from './Announcer';
import { useVoice } from '../lib/VoiceContext';

export default function VoiceControl({ onTranscript, hotkey = false }: { onTranscript?: (text: string) => void; hotkey?: boolean }) {
  const v = useVoice();
  const announce = useAnnounce();
  const last = useRef('');

  useEffect(() => {
    if (v.transcript && v.transcript !== last.current) {
      last.current = v.transcript;
      if (v.status === 'heard') { announce(`Heard: ${v.transcript}`); onTranscript?.(v.transcript); }
      else announce(`Did you say: ${v.transcript}?`, 'assertive');
    }
  }, [v.transcript, onTranscript, announce]);

  useEffect(() => {
    if (v.status === 'listening') announce('Listening');
    if (v.status === 'not-understood') announce('Not understood', 'assertive');
  }, [v.status, announce]);

  const start = () => v.start();
  const stop = () => v.stop();

  useEffect(() => {
    if (!hotkey) return;
    const down = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === 'v' && !v.listening) { e.preventDefault(); start(); } };
    const up = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === 'v' && v.listening) { e.preventDefault(); stop(); } };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [hotkey, v.listening]);

  return (
    <section className={'voice-control ' + (v.listening ? 'listening' : '')} aria-label="Voice input">
      <div className="voice-main">
        <button
          type="button"
          className={'voice-button ' + (v.listening ? 'active' : '')}
          onPointerDown={start}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={() => { if (v.listening) stop(); }}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !v.listening) { e.preventDefault(); start(); } }}
          onKeyUp={(e) => { if ((e.key === ' ' || e.key === 'Enter') && v.listening) { e.preventDefault(); stop(); } }}
          aria-label={v.listening ? 'Release to stop listening' : 'Hold to speak'}
        >{v.listening ? <MicOff /> : <Mic />}</button>
        <div>
          <strong>{v.listening ? 'Listening' : v.status === 'heard' ? 'Heard' : v.status === 'not-understood' ? 'Not understood' : 'Voice input'}</strong>
          <span>{v.listening ? 'Hold the button while you speak.' : 'Hold the microphone to speak.'}</span>
        </div>
        <span className="voice-status">{v.supported ? 'Available' : 'Keyboard fallback'}</span>
      </div>
      {v.transcript && <div className="voice-transcript"><Volume2 size={15} /><span>“{v.transcript}”</span></div>}
      {v.status === 'not-understood' && !v.error && <div className="voice-error" role="status"><AlertCircle size={15} />{v.transcript ? `Did you say: “${v.transcript}”?` : 'Not understood. Please try again.'}</div>}
      {v.error && <div className="voice-error" role="alert"><AlertCircle size={15} />{v.error}</div>}
    </section>
  );
}
