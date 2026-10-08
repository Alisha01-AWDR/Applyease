import { ArrowLeft, ArrowRight, FileText, LockKeyhole, Mic, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAnnounce } from '../components/Announcer';
import { apiUploadResume } from '../lib/api';
import ErrorSummary from '../components/ErrorSummary';
import VoiceControl from '../components/VoiceControl';
import { ApplicationRoute, useApplication } from '../lib/ApplicationContext';
import { useShortcutAction } from '../lib/KeyboardShortcutsContext';
import { getWizardSteps, parseStep, totalSteps, validateAnswer } from '../lib/wizard';

function StepRouter() {
  const { step } = useParams();
  const { job } = useApplication();
  const steps = getWizardSteps(job);
  const n = parseStep(step, steps);
  if (n === null) return <Navigate to={`/apply/${job.id}/1`} replace />;
  return <StepView key={n} step={n} />;
}

function StepView({ step }: { step: number }) {
  const nav = useNavigate();
  const announce = useAnnounce();
  const app = useApplication();
  const steps = getWizardSteps(app.job);
  const total = steps.length;
  const current = steps[step - 1];
  const [value, setValue] = useState(app.answers[current.key] || '');
  const [error, setError] = useState('');
  const [replaceNextDictation, setReplaceNextDictation] = useState(false);
  const latest = useRef({ value, app, key: current.key });
  latest.current = { value, app, key: current.key };

  useEffect(() => {
    announce(`Step ${step} of ${total}. ${current.label}`);
  }, [step, total, current.label, announce]);

  useEffect(() => {
    if (value === (app.answers[current.key] || '')) return;
    const t = setTimeout(() => app.commit({ [current.key]: value }), 500);
    return () => clearTimeout(t);
  }, [value, app, current.key]);

  useEffect(() => {
    const flush = () => {
      const { value: v, app: a, key } = latest.current;
      if (v !== (a.answers[key] || '')) a.commit({ [key]: v });
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);

  const focusAnswer = useCallback(() => {
    document.getElementById('wizard-answer')?.focus();
    (document.querySelector('.choice input') as HTMLElement | null)?.focus();
  }, []);

  const goNext = useCallback(() => {
    const message = validateAnswer(current, value);
    if (message) {
      setError(message);
      focusAnswer();
      return;
    }
    const answer = value.trim();
    if (step === total) {
      app.commit({ [current.key]: answer }, step);
      nav(`/apply/${app.job.id}/review`);
    } else {
      app.commit({ [current.key]: answer }, step + 1);
      nav(`/apply/${app.job.id}/${step + 1}`);
    }
  }, [app, current, focusAnswer, nav, step, total, value]);

  const goBack = useCallback(() => {
    if (step === 1) {
      nav(`/jobs/${app.job.id}`);
      return;
    }
    app.commit({ [current.key]: value.trim() }, step - 1);
    nav(`/apply/${app.job.id}/${step - 1}`);
  }, [app, current.key, nav, step, value]);

  const save = useCallback(() => {
    app.commit({ [current.key]: value }, step);
    announce('Draft saved.');
  }, [app, current.key, value, step, announce]);

  const goReview = useCallback(() => {
    app.commit({ [current.key]: value }, step);
    nav(`/apply/${app.job.id}/review`);
  }, [app, current.key, nav, step, value]);

  useShortcutAction('next', goNext);
  useShortcutAction('back', goBack);
  useShortcutAction('save', save);
  useShortcutAction('review', goReview);

  const onVoice = useCallback((text: string) => {
    setValue((previous) => replaceNextDictation ? text : previous ? `${previous} ${text}` : text);
    setReplaceNextDictation(false);
    setError('');
  }, [replaceNextDictation]);

  const describedBy = error ? 'question-hint wizard-error-summary' : 'question-hint';

  return (
    <div className="page">
      <Link to={`/jobs/${app.job.id}`} className="back-link"><ArrowLeft size={16} /> Back to job</Link>
      <div className="wizard-shell">
        <div className="wizard-progress">
          <span>Application</span>
          <strong>Step {step} of {total}</strong>
          <div aria-hidden="true">{steps.map((_, i) => <i key={i} className={i < step ? 'filled' : ''} />)}</div>
        </div>

        <main className="wizard-card" aria-labelledby="wizard-heading">
          <p className="eyebrow">{current.type === 'choice' ? 'One choice' : 'One question'} · autosaved</p>
          <h1 id="wizard-heading">{current.label}</h1>
          <p id="question-hint">{current.hint}</p>

          {current.type === 'file' ? (
            <div className="resume-picker">
              <FileText />
              <div><strong>{value || 'Choose a resume file'}</strong><span>{value ? 'Saved resume. Choose another file to replace it.' : 'PDF, DOC or DOCX.'}</span></div>
              <label className="btn secondary file-button" htmlFor="wizard-file">{value ? 'Replace resume' : 'Choose file'}</label>
              <input id="wizard-file" className="sr-only" type="file" accept={current.accept} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setError(''); try { const uploaded = await apiUploadResume(app.job.id, file); setValue(uploaded.name); announce(`Resume ${uploaded.name} uploaded securely.`); } catch (err) { setError(err instanceof Error ? err.message : 'Resume upload failed.'); announce('Resume upload failed.', 'assertive'); } }} aria-describedby={describedBy} />
            </div>
          ) : current.type === 'choice' ? (
            <fieldset className="choice-group" aria-describedby={describedBy}>
              <legend className="sr-only">{current.label}</legend>
              {(current.choices || []).map((choice) => <label key={choice} className={'choice ' + (value === choice ? 'selected' : '')}><input type="radio" name={current.key} checked={value === choice} onChange={() => { setValue(choice); setError(''); }} /><span>{choice}</span></label>)}
            </fieldset>
          ) : (
            <>
              <label className="sr-only" htmlFor="wizard-answer">{current.label}</label>
              {current.type === 'textarea' || current.type === 'note' ? (
                <textarea id="wizard-answer" className="big-input textarea" value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} aria-describedby={describedBy} aria-invalid={!!error} />
              ) : (
                <input id="wizard-answer" className="big-input" type={current.type} autoComplete={current.autoComplete} value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} aria-describedby={describedBy} aria-invalid={!!error} />
              )}
              <div className="dictation-options">
                <VoiceControl onTranscript={onVoice} />
                <label><input type="checkbox" checked={replaceNextDictation} onChange={(e) => setReplaceNextDictation(e.target.checked)} /> Replace existing text with next dictation</label>
              </div>
            </>
          )}

          <ErrorSummary items={error ? [{ label: current.label, message: error }] : []} />

          <div className="saved"><Save size={15} /> {app.savedAt ? `Saved automatically at ${new Date(app.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Your answers save automatically as you type.'}</div>
          <div className="wizard-actions">
            <button className="btn secondary" type="button" onClick={goBack}>{step === 1 ? 'Cancel' : 'Back'}</button>
            <button className="btn primary" type="button" onClick={goNext}>{step === total ? 'Review application' : <><span>Next</span><ArrowRight size={16} /></>}</button>
          </div>
        </main>

        <aside className="wizard-trust">
          <div><ShieldCheck /><strong>You're in control</strong></div><p>Nothing is submitted while you're filling this application.</p>
          <div><LockKeyhole /><strong>Private by default</strong></div><p>Your accessibility preferences stay separate from optional disclosure.</p>
          <div><Mic /><strong>Voice is optional</strong></div><p>Spoken answers are shown for review before they are saved.</p>
        </aside>
      </div>
    </div>
  );
}

export default function Application() { return <ApplicationRoute><StepRouter /></ApplicationRoute>; }
