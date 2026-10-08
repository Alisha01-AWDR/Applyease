/** Schema-driven application wizard and plain-language validation. */
export type AnswerMap = Record<string, string>;

export type WizardStep = {
  key: string;
  label: string;
  hint: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'choice' | 'file' | 'note';
  required: boolean;
  autoComplete?: string;
  choices?: string[];
  prefillKey?: string;
  sensitive?: boolean;
  accept?: string;
  validation?: {
    minLength?: number;
    url?: boolean;
  };
};

/** Default schema retained for compatibility with older callers and tests. */
export const wizardSteps: WizardStep[] = [
  { key: 'name', label: 'What is your full name?', hint: 'We will use this exactly as it appears on your application.', type: 'text', required: true, autoComplete: 'name', prefillKey: 'name' },
  { key: 'email', label: 'What email should the employer use?', hint: 'Use an address you check regularly.', type: 'email', required: true, autoComplete: 'email', prefillKey: 'email' },
  { key: 'phone', label: 'What is your phone number?', hint: 'Enter a 10-digit number so the employer can contact you.', type: 'tel', required: true, autoComplete: 'tel', prefillKey: 'phone' },
  { key: 'resume', label: 'Which resume should we use?', hint: 'Upload the resume you want to send with this application.', type: 'file', required: true, prefillKey: 'resume', accept: '.pdf,.doc,.docx' },
  { key: 'authorization', label: 'Are you authorized to work in India?', hint: 'Choose the answer that matches your current situation.', type: 'choice', required: true, sensitive: true, choices: ['Yes', 'No', 'I am not sure', 'Prefer not to say'] },
  { key: 'why', label: 'Why are you interested in this role?', hint: 'Write in your own words. You can dictate it with the microphone.', type: 'textarea', required: true, validation: { minLength: 20 } },
  { key: 'support', label: 'Would you like to add an optional support request?', hint: 'This note is optional and is separate from your accessibility preferences.', type: 'note', required: false },
];

export const TOTAL_STEPS = wizardSteps.length;

export function getWizardSteps(job?: { form?: WizardStep[] }): WizardStep[] {
  return job?.form?.length ? job.form : wizardSteps;
}

export function totalSteps(job?: { form?: WizardStep[] }): number {
  return getWizardSteps(job).length;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('0')) return true;
  if (digits.length === 12 && digits.startsWith('91')) return true;
  return false;
}

export function validateAnswer(step: WizardStep, rawValue: string): string {
  const value = (rawValue || '').trim();
  if (!value) {
    if (!step.required) return '';
    switch (step.type) {
      case 'file':
        return 'Please add a resume to your profile first.';
      case 'choice':
        return 'Please choose one of the answers.';
      case 'email':
        return 'Please enter your email address.';
      case 'tel':
        return 'Please enter a phone number.';
      default:
        return 'Please answer this question before continuing.';
    }
  }
  if (step.type === 'email' && !isValidEmail(value)) {
    return 'That email does not look right. It should look like name@example.com.';
  }
  if (step.type === 'tel' && !isValidPhone(value)) {
    return 'Enter a 10-digit phone number, for example 98765 43210.';
  }
  if (step.type === 'choice' && step.choices && !step.choices.includes(value)) {
    return 'Please choose one of the answers.';
  }
  if (step.validation?.minLength && value.length < step.validation.minLength) {
    return `Please write a full sentence (${step.validation.minLength} characters or more).`;
  }
  if (step.validation?.url && !URL_RE.test(value)) {
    return 'Please enter a full link starting with https://, or leave this optional field blank.';
  }
  return '';
}

export type StepProblem = { step: number; key: string; label: string; message: string };

export function findProblems(answers: AnswerMap, steps: WizardStep[] = wizardSteps): StepProblem[] {
  const problems: StepProblem[] = [];
  steps.forEach((s, i) => {
    const message = validateAnswer(s, answers[s.key] || '');
    if (message) problems.push({ step: i + 1, key: s.key, label: s.label, message });
  });
  return problems;
}

export function parseStep(param: string | undefined, stepsOrTotal: WizardStep[] | number = wizardSteps): number | null {
  if (!param || !/^\d+$/.test(param)) return null;
  const total = typeof stepsOrTotal === 'number' ? stepsOrTotal : stepsOrTotal.length;
  const n = Number(param);
  return n >= 1 && n <= total ? n : null;
}
