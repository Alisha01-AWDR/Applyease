import type { WizardStep } from '../lib/wizard';

export type ApplyMode = 'partner' | 'external';

export type SourceSpan = { start: number; end: number; text: string };
export type SourceSpans = {
  summary?: SourceSpan | null;
  title?: SourceSpan | null;
  company?: SourceSpan | null;
  location?: SourceSpan | null;
  type?: SourceSpan | null;
  deadline?: SourceSpan | null;
  responsibilities?: SourceSpan[];
  required?: SourceSpan[];
  preferred?: SourceSpan[];
  process?: SourceSpan[];
  skills?: SourceSpan[];
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  summary: string;
  /** Original source text used by Source Truth. Demo jobs use prepared source text. */
  originalText: string;
  skills: string[];
  required: string[];
  preferred: string[];
  responsibilities: string[];
  process: string[];
  deadline?: string;
  source: string;
  externalUrl?: string;
  applyMode: ApplyMode;
  form: WizardStep[];
  sourceSpans?: SourceSpans;
};

const commonProfileQuestions = (): WizardStep[] => [
  {
    key: 'name',
    label: 'What is your full name?',
    hint: 'We will use this exactly as it appears on your application.',
    type: 'text',
    required: true,
    autoComplete: 'name',
    prefillKey: 'name',
  },
  {
    key: 'email',
    label: 'What email should the employer use?',
    hint: 'Use an address you check regularly.',
    type: 'email',
    required: true,
    autoComplete: 'email',
    prefillKey: 'email',
  },
];

const acmeForm: WizardStep[] = [
  ...commonProfileQuestions(),
  {
    key: 'phone',
    label: 'What is your phone number?',
    hint: 'Enter a 10-digit number so the employer can contact you.',
    type: 'tel',
    required: true,
    autoComplete: 'tel',
    prefillKey: 'phone',
  },
  {
    key: 'resume',
    label: 'Which resume should we use?',
    hint: 'Upload the resume you want to send with this application.',
    type: 'file',
    required: true,
    prefillKey: 'resume',
    accept: '.pdf,.doc,.docx',
  },
  {
    key: 'authorization',
    label: 'Are you authorized to work in India?',
    hint: 'Choose the answer that matches your current situation.',
    type: 'choice',
    required: true,
    sensitive: true,
    choices: ['Yes', 'No', 'I am not sure', 'Prefer not to say'],
  },
  {
    key: 'why',
    label: 'Why are you interested in this role?',
    hint: 'Write in your own words. You can dictate it with the microphone.',
    type: 'textarea',
    required: true,
    validation: { minLength: 20 },
  },
  {
    key: 'support',
    label: 'Would you like to add an optional support request?',
    hint: 'This note is optional and is separate from your accessibility preferences.',
    type: 'note',
    required: false,
  },
];

const northstarForm: WizardStep[] = [
  ...commonProfileQuestions(),
  {
    key: 'resume',
    label: 'Which resume should we use?',
    hint: 'Upload the resume you want to share with Northstar Labs.',
    type: 'file',
    required: true,
    prefillKey: 'resume',
    accept: '.pdf,.doc,.docx',
  },
  {
    key: 'studentStatus',
    label: 'Are you currently a student or recent graduate?',
    hint: 'This role is designed for students and recent graduates.',
    type: 'choice',
    required: true,
    choices: ['Current student', 'Recent graduate', 'Neither', 'Prefer not to say'],
    sensitive: true,
  },
  {
    key: 'portfolio',
    label: 'Where can the team view your portfolio?',
    hint: 'Optional. Add a portfolio link if you have one.',
    type: 'text',
    required: false,
    validation: { url: true },
  },
  {
    key: 'why',
    label: 'What interests you about UX research?',
    hint: 'Mention a research, interview or usability project if useful.',
    type: 'textarea',
    required: true,
    validation: { minLength: 20 },
  },
];

const orbitForm: WizardStep[] = [
  ...commonProfileQuestions(),
  {
    key: 'phone',
    label: 'What is your phone number?',
    hint: 'Use the number you want a recruiter to call.',
    type: 'tel',
    required: true,
    autoComplete: 'tel',
    prefillKey: 'phone',
  },
  {
    key: 'resume',
    label: 'Which resume should we use?',
    hint: 'Upload the resume you want to take to the external application.',
    type: 'file',
    required: true,
    prefillKey: 'resume',
    accept: '.pdf,.doc,.docx',
  },
  {
    key: 'authorization',
    label: 'Are you authorized to work in India?',
    hint: 'Choose the answer that matches your current situation.',
    type: 'choice',
    required: true,
    sensitive: true,
    choices: ['Yes', 'No', 'I am not sure', 'Prefer not to say'],
  },
  {
    key: 'scenario',
    label: 'How would you respond to a frustrated customer?',
    hint: 'Give a short example of how you would listen, troubleshoot and follow up.',
    type: 'textarea',
    required: true,
    validation: { minLength: 20 },
  },
  {
    key: 'support',
    label: 'Optional note for the employer',
    hint: 'Leave blank if you do not need to add anything.',
    type: 'note',
    required: false,
  },
];

export const jobs: Job[] = [
  {
    id: 'acme-data',
    title: 'Data Analyst',
    company: 'Acme Technologies',
    location: 'Mumbai · Hybrid',
    type: 'Full-time',
    summary: 'Turn business data into clear reports and practical insights for product and operations teams.',
    originalText:
      'Data Analyst — Acme Technologies\nLocation: Mumbai · Hybrid\nType: Full-time\n\nThe Data Analyst will turn business data into clear reports and practical insights for product and operations teams. Responsibilities include analyzing operational datasets, building recurring reports and dashboards, and partnering with business teams to explain findings. Required: 2+ years working with data, SQL, and Excel or spreadsheet analysis. Preferred: Python and experience with dashboards. Application process: Resume, application questions, short recruiter call. Deadline: Not stated.',
    skills: ['SQL', 'Excel', 'Data visualization', 'Python'],
    required: ['2+ years working with data', 'SQL', 'Excel or spreadsheet analysis'],
    preferred: ['Python', 'Experience with dashboards'],
    responsibilities: ['Analyze operational datasets', 'Build recurring reports and dashboards', 'Partner with business teams to explain findings'],
    process: ['Resume', 'Application questions', 'Short recruiter call'],
    deadline: 'Not stated',
    source: 'Company job description',
    applyMode: 'partner',
    form: acmeForm,
  },
  {
    id: 'northstar-ux',
    title: 'UX Research Intern',
    company: 'Northstar Labs',
    location: 'Mumbai · Remote',
    type: 'Internship',
    summary: 'Support user research, synthesize qualitative findings and help product teams make evidence-informed decisions.',
    originalText:
      'UX Research Intern — Northstar Labs\nLocation: Mumbai · Remote\nType: Internship\n\nSupport user research, synthesize qualitative findings and help product teams make evidence-informed decisions. Responsibilities include supporting interviews and usability studies, synthesizing notes into themes, and creating research readouts. Required: current student or recent graduate and strong written communication. Preferred: Figma and a prior research project. Application process: Resume, portfolio, application questions. Deadline: October 18, 2026.',
    skills: ['Research', 'Figma', 'Interviewing', 'Writing'],
    required: ['Current student or recent graduate', 'Strong written communication'],
    preferred: ['Figma', 'Prior research project'],
    responsibilities: ['Support interviews and usability studies', 'Synthesize notes into themes', 'Create research readouts'],
    process: ['Resume', 'Portfolio', 'Application questions'],
    deadline: 'October 18, 2026',
    source: 'Employer-submitted demo job',
    externalUrl: 'https://example.com/employer-demo/northstar-ux',
    applyMode: 'external',
    form: northstarForm,
  },
  {
    id: 'orbit-support',
    title: 'Customer Support Specialist',
    company: 'Orbit Cloud',
    location: 'Pune · Hybrid',
    type: 'Full-time',
    summary: 'Help customers solve product questions through clear communication, troubleshooting and thoughtful follow-up.',
    originalText:
      'Customer Support Specialist — Orbit Cloud\nLocation: Pune · Hybrid\nType: Full-time\n\nHelp customers solve product questions through clear communication, troubleshooting and thoughtful follow-up. Responsibilities include responding to customer questions, documenting recurring issues, and coordinating with product and engineering. Required: strong written communication and comfort with customer-facing work. Preferred: SaaS support experience and CRM familiarity. Application process: Resume, scenario questions, interview. Deadline: October 12, 2026.',
    skills: ['Communication', 'Troubleshooting', 'CRM'],
    required: ['Strong written communication', 'Comfort with customer-facing work'],
    preferred: ['SaaS support experience', 'CRM familiarity'],
    responsibilities: ['Respond to customer questions', 'Document recurring issues', 'Coordinate with product and engineering'],
    process: ['Resume', 'Scenario questions', 'Interview'],
    deadline: 'October 12, 2026',
    source: 'Public demo feed',
    externalUrl: 'https://example.com/employer-demo/orbit-support',
    applyMode: 'external',
    form: orbitForm,
  },
];

export const findJob = (id?: string): Job | undefined => jobs.find((j) => j.id === id);
