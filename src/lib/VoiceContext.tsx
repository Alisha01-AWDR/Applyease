import { createContext, useContext, useMemo, useRef, useState, ReactNode } from 'react';

type VoiceStatus = 'idle' | 'listening' | 'heard' | 'not-understood';
type VoiceCtx = {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string;
  status: VoiceStatus;
  start: () => void;
  stop: () => void;
  clear: () => void;
};
const C = createContext<VoiceCtx | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const ref = useRef<any>(null);
  const supported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const start = () => {
    setError('');
    setTranscript('');
    setStatus('listening');
    if (!supported) {
      setError('Voice recognition is not available in this browser. Keyboard input remains available.');
      setStatus('not-understood');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    ref.current = r;
    r.lang = 'en-IN';
    r.interimResults = false;
    r.continuous = false;
    r.onstart = () => { setListening(true); setStatus('listening'); };
    r.onresult = (e: any) => {
      const text = Array.from(e.results).map((x: any) => x[0].transcript).join(' ').trim();
      const confidence = Number(e.results?.[0]?.[0]?.confidence ?? 1);
      setTranscript(text);
      setStatus(confidence > 0 && confidence < 0.75 ? 'not-understood' : text ? 'heard' : 'not-understood');
    };
    r.onerror = (e: any) => {
      setError(e.error === 'not-allowed' ? 'Microphone permission was not granted.' : `Voice recognition could not complete (${e.error}).`);
      setStatus('not-understood');
      setListening(false);
    };
    r.onend = () => setListening(false);
    try { r.start(); } catch { setListening(false); setStatus('not-understood'); }
  };

  const stop = () => { try { ref.current?.stop(); } catch { /* already stopped */ } setListening(false); };
  const clear = () => { setTranscript(''); setError(''); setStatus('idle'); };
  return <C.Provider value={useMemo(() => ({ supported, listening, transcript, error, status, start, stop, clear }), [supported, listening, transcript, error, status])}>{children}</C.Provider>;
}
export const useVoice = () => { const c = useContext(C); if (!c) throw Error('VoiceProvider missing'); return c; };
