import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnnounce } from './Announcer';

const titles: Array<[RegExp, string]> = [
  [/^\/$/, 'Welcome · ApplyEase'],
  [/^\/welcome$/, 'Accessibility setup · ApplyEase'],
  [/^\/login$/, 'Sign in · ApplyEase'],
  [/^\/signup$/, 'Create account · ApplyEase'],
  [/^\/dashboard$/, 'Dashboard · ApplyEase'],
  [/^\/jobs$/, 'Find jobs · ApplyEase'],
  [/^\/jobs\/import$/, 'Import job · ApplyEase'],
  [/^\/jobs\/[^/]+$/, 'Job Lens · ApplyEase'],
  [/^\/profile$/, 'Profile · ApplyEase'],
  [/^\/applications$/, 'Applications · ApplyEase'],
  [/^\/application-kit\//, 'Application Kit · ApplyEase'],
  [/^\/accessibility$/, 'Accessibility Center · ApplyEase'],
  [/^\/settings$/, 'Settings · ApplyEase'],
  [/^\/apply\/[^/]+\/review$/, 'Review application · ApplyEase'],
  [/^\/apply\/[^/]+\/confirm$/, 'Confirm submission · ApplyEase'],
  [/^\/apply\/[^/]+\/receipt$/, 'Application receipt · ApplyEase'],
  [/^\/apply\//, 'Application · ApplyEase'],
];

export default function FocusManager() {
  const location = useLocation();
  const announce = useAnnounce();

  useEffect(() => {
    const title = titles.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? 'ApplyEase';
    document.title = title;
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#main h1, main h1, h1');
      if (!heading) return;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      announce(`${document.title}. ${heading.textContent?.trim() ?? ''}`, 'polite');
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.search, announce]);

  return null;
}
