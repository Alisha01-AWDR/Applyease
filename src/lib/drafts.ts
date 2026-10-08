import { findJob, Job } from '../data/jobs';
import { getProfile } from './profile';
import { KEYS, keysWithPrefix, readJSON, removeKey, writeJSON } from './storage';
import { apiGetDraft, apiSaveDraft } from './api';
import { AnswerMap, getWizardSteps, totalSteps } from './wizard';

export type Draft = {
  jobId: string;
  step: number;
  answers: AnswerMap;
  savedAt: string;
};

const draftKey = (jobId: string) => KEYS.draftPrefix + jobId;

/** Answers are derived from the current profile and a job's prefill schema. */
export function initialAnswers(jobId?: string, suppliedJob?: Pick<Job, 'form'>): AnswerMap {
  const p = getProfile();
  const job = suppliedJob ?? (jobId ? findJob(jobId) : undefined);
  const out: AnswerMap = {};
  for (const step of getWizardSteps(job)) {
    // Sensitive questions intentionally never receive a profile prefill.
    if (step.sensitive) {
      out[step.key] = '';
      continue;
    }
    if (step.prefillKey) out[step.key] = String((p as Record<string, unknown>)[step.prefillKey] ?? '');
    else out[step.key] = '';
  }
  return out;
}

export function loadDraft(jobId: string, suppliedJob?: Pick<Job, 'form'>): Draft | null {
  const d = readJSON<Draft | null>(draftKey(jobId), null);
  if (!d || typeof d !== 'object' || !d.answers) return null;
  const job = suppliedJob ?? findJob(jobId);
  const step = Math.min(Math.max(Number(d.step) || 1, 1), totalSteps(job));
  return { jobId, step, answers: d.answers, savedAt: d.savedAt || new Date().toISOString() };
}

export function saveDraft(draft: Draft): boolean {
  const ok = writeJSON(draftKey(draft.jobId), draft);
  void apiSaveDraft(draft.jobId, draft.step, draft.answers).catch(() => undefined);
  return ok;
}

export async function hydrateDraft(jobId: string, suppliedJob?: Pick<Job, 'form'>): Promise<Draft | null> {
  const local = loadDraft(jobId, suppliedJob);
  try {
    const remote = await apiGetDraft(jobId);
    const hasRemote = !!remote.answers && Object.keys(remote.answers).length > 0;
    if (!hasRemote) {
      if (local) {
        await apiSaveDraft(jobId, local.step, local.answers).catch(() => undefined);
        return local;
      }
      return null;
    }
    const remoteSavedAt = remote.savedAt || '';
    // Prefer a newer offline edit, then sync it back to the server.
    if (local && local.savedAt && remoteSavedAt && local.savedAt > remoteSavedAt) {
      await apiSaveDraft(jobId, local.step, local.answers).catch(() => undefined);
      return local;
    }
    const d: Draft = { jobId, step: remote.step, answers: remote.answers, savedAt: remoteSavedAt || new Date().toISOString() };
    writeJSON(draftKey(jobId), d);
    return d;
  } catch { return local; }
}

export function deleteDraft(jobId: string): void {
  removeKey(draftKey(jobId));
}

export function clearAllDrafts(): void {
  keysWithPrefix(KEYS.draftPrefix).forEach(removeKey);
}

export function listDrafts(): Draft[] {
  return keysWithPrefix(KEYS.draftPrefix)
    .map((k) => loadDraft(k.slice(KEYS.draftPrefix.length)))
    .filter((d): d is Draft => d !== null)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function mergeAnswers(base: AnswerMap, saved: AnswerMap): AnswerMap {
  const out: AnswerMap = { ...base };
  for (const [k, v] of Object.entries(saved)) {
    if (v !== '' || out[k] === undefined) out[k] = v;
  }
  return out;
}

export function answersFor(jobId: string, suppliedJob?: Pick<Job, 'form'>): AnswerMap {
  const d = loadDraft(jobId, suppliedJob);
  return mergeAnswers(initialAnswers(jobId, suppliedJob), d ? d.answers : {});
}

export function applyPath(jobId: string, suppliedJob?: Pick<Job, 'form'>): string {
  const d = loadDraft(jobId, suppliedJob);
  return `/apply/${jobId}/${d ? d.step : 1}`;
}
