import { ArrowLeft, Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAnnounce } from '../components/Announcer';
import VoiceControl from '../components/VoiceControl';
import { ApplicationRoute, useApplication } from '../lib/ApplicationContext';
import { deleteDraft } from '../lib/drafts';
import { useAccessibility } from '../lib/AccessibilityContext';
import { submitServer } from '../lib/submissionStore';
import { apiConfirm } from '../lib/api';
import { countAnswered } from '../lib/kit';
import { findProblems, getWizardSteps } from '../lib/wizard';

function ConfirmView() {
  const { job, answers } = useApplication();
  const nav = useNavigate();
  const announce = useAnnounce();
  const { mode } = useAccessibility();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceArmed, setVoiceArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const steps = getWizardSteps(job);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (job.applyMode === 'external') return <Navigate to={`/application-kit/${job.id}`} replace />;
  if (findProblems(answers, steps).length > 0) return <Navigate to={`/apply/${job.id}/review`} replace />;

  const readBack = () => {
    const text = `You are about to submit ${job.title} to ${job.company}. Say confirm submit to continue. Any other phrase cancels.`;
    if (mode === 'screen') announce(text, 'assertive');
    else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      announce('Read-back started. Say confirm submit to continue.');
    } else announce(text, 'assertive');
  };

  const submit = async (voiceConfirmed = false) => {
    if ((!confirmed && !voiceConfirmed) || busy) return;
    setBusy(true);
    try {
      await apiConfirm(job.id, voiceConfirmed ? 'voice' : 'keyboard');
      await submitServer(job.id);
      deleteDraft(job.id);
      announce('Application submitted. Receipt saved.');
      timer.current = setTimeout(() => nav(`/apply/${job.id}/receipt`, { replace: true }), 350);
    } catch (err) {
      setBusy(false);
      announce(err instanceof Error ? err.message : 'The application could not be submitted.', 'assertive');
    }
  };

  const onVoice = (raw: string) => {
    const text = raw.trim().toLowerCase().replace(/[.!?]+$/, '');
    if (text === 'submit' || text === 'submit application') {
      setVoiceArmed(true);
      setConfirmed(false);
      readBack();
      return;
    }
    if (voiceArmed) {
      if (text === 'confirm submit' || text === 'confirm submission') {
        setVoiceArmed(false);
        setConfirmed(true);
        announce('Submission confirmed by voice. Sending application.');
        void submit(true);
      } else {
        setVoiceArmed(false);
        setConfirmed(false);
        announce('Voice confirmation cancelled. Nothing was submitted.', 'assertive');
      }
    }
  };

  return (
    <div className="page confirm-page">
      <button className="back-link button-link" onClick={() => nav(`/apply/${job.id}/review`)}><ArrowLeft size={16} /> Back to review</button>
      <div className="confirm-wrap">
        <div className="confirm-icon"><ShieldCheck /></div>
        <p className="eyebrow">Explicit confirmation</p>
        <h1>You are about to submit.</h1>
        <p className="confirm-lead">Review the destination and your application one last time. This is the only action that sends it.</p>
        <div className="submit-target"><span className="company-mark large">{job.company.slice(0, 1)}</span><div><strong>{job.title}</strong><span>{job.company}</span><small>{job.location} · {job.type}</small></div></div>
        <div className="confirm-summary"><div><Check /> {countAnswered(answers, job)} of {steps.length} application fields prepared</div><div><LockKeyhole /> Accessibility preferences are not shared as disability information</div><div><Check /> You reviewed every answer on the previous screen</div></div>
        <label className={'confirm-check ' + (confirmed ? 'selected' : '')}><input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setVoiceArmed(false); }} /><span><strong>Yes, I want to submit this application.</strong><small>I understand ApplyEase will send the reviewed application to the demo employer.</small></span></label>
        <VoiceControl onTranscript={onVoice} />
        {voiceArmed && <div className="voice-confirm-banner" role="status">Read-back complete. Say <strong>confirm submit</strong> to send. Any other phrase cancels.</div>}
        <button className="btn primary confirm-submit" disabled={!confirmed || busy} onClick={() => submit()}>{busy ? 'Submitting…' : 'Submit application'}</button>
        <p className="confirm-note">For this demo, partner submissions are stored on the ApplyEase server. External jobs use an Application Kit instead.</p>
      </div>
    </div>
  );
}

export default function Confirm() { return <ApplicationRoute><ConfirmView /></ApplicationRoute>; }
