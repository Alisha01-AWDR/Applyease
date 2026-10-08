import type { Job } from '../data/jobs';
import { AnswerMap, getWizardSteps } from './wizard';

/** Plain-text hand-off for external employer forms. */
export function buildKitText(job: Job, answers: AnswerMap): string {
  const lines = [
    `ApplyEase Application Kit`,
    ``,
    `${job.title} — ${job.company}`,
    ``,
    `Candidate: ${answers.name || '(not provided)'}`,
    `Email: ${answers.email || '(not provided)'}`,
    `Phone: ${answers.phone || '(not provided)'}`,
    `Resume: ${answers.resume || '(not provided)'}`,
    ``,
    `Prepared answers`,
  ];
  for (const s of getWizardSteps(job)) {
    if (['name', 'email', 'phone', 'resume'].includes(s.key)) continue;
    const v = (answers[s.key] || '').trim();
    lines.push(``, s.label, v || '(not answered)');
  }
  lines.push(``, `Prepared by ApplyEase. Submit on the employer site.`);
  return lines.join('\n');
}

export function countAnswered(answers: AnswerMap, job?: Job): number {
  return getWizardSteps(job).filter((s) => (answers[s.key] || '').trim()).length;
}
