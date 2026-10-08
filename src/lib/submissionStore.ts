import { KEYS, readJSON, writeJSON } from './storage';
import { apiGetSubmission, apiSubmit } from './api';

export type Submission = {
  jobId: string;
  reference: string;
  submittedAt: string;
  status: 'Submitted';
};

export function getSubmissions(): Submission[] {
  return readJSON<Submission[]>(KEYS.submissions, []);
}

export function saveSubmission(s: Submission): Submission {
  const next = [s, ...getSubmissions().filter((x) => x.jobId !== s.jobId)];
  writeJSON(KEYS.submissions, next);
  return s;
}

export async function submitServer(jobId: string): Promise<Submission> {
  const remote = await apiSubmit(jobId);
  const s: Submission = { jobId: remote.jobId, reference: remote.reference, submittedAt: remote.submittedAt, status: 'Submitted' };
  saveSubmission(s);
  return s;
}

export async function hydrateSubmission(jobId: string): Promise<Submission | undefined> {
  try { const remote = await apiGetSubmission(jobId); const s: Submission = { jobId: remote.jobId, reference: remote.reference, submittedAt: remote.submittedAt, status: 'Submitted' }; saveSubmission(s); return s; } catch { return getSubmission(jobId); }
}

export function getSubmission(jobId: string): Submission | undefined {
  return getSubmissions().find((x) => x.jobId === jobId);
}

export function makeReference(now: Date = new Date()): string {
  const tail = String(now.getTime()).slice(-5);
  return `AE-${now.getFullYear()}-${tail}`;
}
