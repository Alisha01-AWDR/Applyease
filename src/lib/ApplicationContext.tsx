import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import JobNotFound from '../components/JobNotFound';
import { findJob, Job } from '../data/jobs';
import { initialAnswers, loadDraft, mergeAnswers, saveDraft, hydrateDraft } from './drafts';
import { getWizardSteps, totalSteps } from './wizard';
import type { AnswerMap } from './wizard';
import { apiGetJob } from './api';
import { hydrateProfile } from './profile';

type State = { answers: AnswerMap; savedAt: string | null; step: number };

type Ctx = {
  job: Job;
  answers: AnswerMap;
  /** ISO time of the last save, or null if nothing has been saved yet. */
  savedAt: string | null;
  /** Last step the person reached (used to resume). */
  lastStep: number;
  /** Merge answers into the draft, save immediately, optionally record the step. */
  commit: (patch: AnswerMap, step?: number) => void;
};

const ApplicationCtx = createContext<Ctx | null>(null);

export function ApplicationProvider({ job, children }: { job: Job; children: ReactNode }) {
  // Lazy initial state reads the saved draft synchronously. There is no load
  // effect, so a draft can never be overwritten by defaults on first render
  // (this was the StrictMode bug in the earlier build).
  const [state, setState] = useState<State>(() => {
    const draft = loadDraft(job.id, job);
    return {
      answers: mergeAnswers(initialAnswers(job.id, job), draft ? draft.answers : {}),
      savedAt: draft ? draft.savedAt : null,
      step: draft ? draft.step : 1,
    };
  });
  const ref = useRef(state);

  useEffect(() => {
    void hydrateProfile().then((profile) => {
      const prev = ref.current;
      const nextAnswers = { ...prev.answers };
      for (const step of getWizardSteps(job)) {
        if (!step.prefillKey || step.sensitive) continue;
        if (!nextAnswers[step.key] && profile[step.prefillKey as keyof typeof profile]) nextAnswers[step.key] = String(profile[step.prefillKey as keyof typeof profile]);
      }
      const next = { ...prev, answers: nextAnswers };
      ref.current = next; setState(next);
    }).catch(() => undefined);
    void hydrateDraft(job.id, job).then((remote) => {
      if (!remote) return;
      const next = { answers: mergeAnswers(initialAnswers(job.id, job), remote.answers), savedAt: remote.savedAt, step: Math.min(Math.max(remote.step || 1, 1), totalSteps(job)) };
      ref.current = next; setState(next);
    });
  }, [job.id, job]);

  const commit = useCallback(
    (patch: AnswerMap, step?: number) => {
      const prev = ref.current;
      const unchanged =
        prev.savedAt !== null &&
        (step === undefined || step === prev.step) &&
        Object.keys(patch).every((k) => prev.answers[k] === patch[k]);
      if (unchanged) return;
      const next: State = {
        answers: { ...prev.answers, ...patch },
        savedAt: new Date().toISOString(),
        step: step ?? prev.step,
      };
      ref.current = next;
      setState(next);
      saveDraft({ jobId: job.id, step: next.step, answers: next.answers, savedAt: next.savedAt! });
    },
    [job.id],
  );

  useEffect(() => {
    const sync = () => { void hydrateDraft(job.id, job).then((remote) => {
      if (!remote) return;
      const next = { answers: mergeAnswers(ref.current.answers, remote.answers), savedAt: remote.savedAt, step: Math.min(Math.max(remote.step || 1, 1), totalSteps(job)) };
      ref.current = next; setState(next);
    }).catch(() => undefined); };
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [job.id, job]);

  const value = useMemo<Ctx>(
    () => ({ job, answers: state.answers, savedAt: state.savedAt, lastStep: state.step, commit }),
    [job, state, commit],
  );
  return <ApplicationCtx.Provider value={value}>{children}</ApplicationCtx.Provider>;
}

export function useApplication(): Ctx {
  const c = useContext(ApplicationCtx);
  if (!c) throw new Error('ApplicationProvider missing');
  return c;
}

/** Route wrapper: resolves :id to a job (or shows "not found") and provides the draft. */
export function ApplicationRoute({ children }: { children: ReactNode }) {
  const { id } = useParams();
  const [job, setJob] = useState<Job | undefined>(() => findJob(id));
  const [checked, setChecked] = useState(!!job);
  useEffect(() => { if (!id || job) return; setChecked(false); void apiGetJob(id).then(setJob).catch(() => undefined).finally(() => setChecked(true)); }, [id, job]);
  if (!job && !checked) return <div className="page"><div className="card"><h1>Loading application…</h1><p className="page-sub">Checking the saved job.</p></div></div>;
  if (!job) return <JobNotFound />;
  return <ApplicationProvider key={job.id} job={job}>{children}</ApplicationProvider>;
}
