import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type Priority = 'polite' | 'assertive';
type Announce = (message: string, priority?: Priority) => void;
const C = createContext<Announce>(() => undefined);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');

  const announce = useCallback<Announce>((message, priority = 'polite') => {
    if (priority === 'assertive') {
      setAssertive('');
      requestAnimationFrame(() => setAssertive(message));
    } else {
      setPolite('');
      requestAnimationFrame(() => setPolite(message));
    }
  }, []);

  return <C.Provider value={announce}>{children}<div className="sr-only" aria-live="polite" aria-atomic="true">{polite}</div><div className="sr-only" aria-live="assertive" aria-atomic="true">{assertive}</div></C.Provider>;
}

export const useAnnounce = () => useContext(C);
