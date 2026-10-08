import { useLocation, useNavigate } from 'react-router-dom';
import VoiceControl from './VoiceControl';
import { useAnnounce } from './Announcer';
import { useAccessibility } from '../lib/AccessibilityContext';

export default function VoiceCommandBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const announce = useAnnounce();
  const { mode } = useAccessibility();

  const command = (raw: string) => {
    const text = raw.trim().replace(/[.!?]+$/, '');
    const lower = text.toLowerCase();

    const destinations: Record<string, string> = {
      'go to jobs': '/jobs',
      'go to dashboard': '/dashboard',
      'go to tracker': '/applications',
      'go to applications': '/applications',
      'go to profile': '/profile',
      'go to settings': '/settings',
      'go to accessibility': '/accessibility',
    };
    if (destinations[lower]) {
      navigate(destinations[lower]);
      announce(`Going to ${lower.replace('go to ', '')}.`);
      return;
    }
    if (lower === 'help') {
      announce('Voice commands: go to jobs, go to dashboard, go to tracker, search for a job, open result two, next, back, read this question, save draft, and review.');
      return;
    }

    const search = lower.match(/^search for (.+)$/i);
    if (search) {
      navigate(`/jobs?query=${encodeURIComponent(search[1])}`);
      announce(`Searching jobs for ${search[1]}`);
      return;
    }
    const open = lower.match(/^open result (\d+)$/i);
    if (open) {
      const index = Number(open[1]) - 1;
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.job-card .text-action'));
      if (links[index]) links[index].click();
      else announce(`There is no result ${open[1]}.`, 'assertive');
      return;
    }
    if (lower === 'next' || lower === 'go next') {
      document.dispatchEvent(new CustomEvent('applyease:shortcut', { detail: { action: 'next' } }));
      return;
    }
    if (lower === 'back' || lower === 'go back') {
      if (location.pathname.startsWith('/apply/')) document.dispatchEvent(new CustomEvent('applyease:shortcut', { detail: { action: 'back' } }));
      else navigate(-1);
      return;
    }
    if (lower === 'review' || lower === 'review application') {
      document.dispatchEvent(new CustomEvent('applyease:shortcut', { detail: { action: 'review' } }));
      return;
    }
    if (lower === 'save draft' || lower === 'save') {
      document.dispatchEvent(new CustomEvent('applyease:shortcut', { detail: { action: 'save' } }));
      return;
    }
    if (lower === 'read this question' || lower === 'read question') {
      const heading = document.querySelector('#wizard-heading');
      announce(heading?.textContent?.trim() || 'There is no active question.');
      return;
    }
    if (mode === 'voice') announce('Not understood. Try search for, open result, next, back, read this question, save draft, or review.', 'assertive');
  };

  return (
    <div className="voice-command-bar" aria-label="Voice commands">
      <span className="voice-command-label">Voice commands</span>
      <VoiceControl onTranscript={command} hotkey />
    </div>
  );
}
