import { ArrowRight, Check, Edit3, Info, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ApplicationRoute, useApplication } from '../lib/ApplicationContext';
import ErrorSummary from '../components/ErrorSummary';
import { findProblems, getWizardSteps } from '../lib/wizard';
import { useShortcutAction } from '../lib/KeyboardShortcutsContext';

function ReviewView() {
  const { job, answers } = useApplication();
  const nav = useNavigate();
  const steps = getWizardSteps(job);
  const problems = findProblems(answers, steps);
  const ready = problems.length === 0;

  const goOn = () => ready ? nav(`/apply/${job.id}/confirm`) : nav(`/apply/${job.id}/${problems[0].step}`);
  useShortcutAction('back', () => nav(`/jobs/${job.id}`));

  return (
    <div className="page">
      <div className="review-head"><div><p className="eyebrow">Final review</p><h1>Check everything before you submit.</h1><p className="page-sub">ApplyEase will not send anything until you explicitly confirm.</p></div><div className="review-safe"><ShieldCheck /> Nothing submitted yet</div></div>
      <ErrorSummary items={problems.map((p) => ({ label: `Step ${p.step}: ${p.label}`, message: p.message }))} title={`${problems.length} answer${problems.length === 1 ? '' : 's'} need attention.`} />
      <section className="review-layout">
        <main className="review-card">
          {steps.map((s, i) => {
            const problem = problems.find((p) => p.step === i + 1);
            return <article className="review-row" key={s.key}><div className="review-number">{i + 1}</div><div><span>{s.label}</span><strong>{answers[s.key] || 'Not provided'}</strong>{!s.required && <small>Optional</small>}{problem && <small className="needs-attention">Needs attention: {problem.message}</small>}</div><Link className="icon-btn" aria-label={`Edit answer: ${s.label}`} to={`/apply/${job.id}/${i + 1}`}><Edit3 size={17} /></Link></article>;
          })}
        </main>
        <aside className="review-side">
          <div className="review-company"><span className="company-mark large">{job.company.slice(0, 1)}</span><div><strong>{job.title}</strong><span>{job.company} · {job.location}</span></div></div>
          <div className="review-checks"><p className="eyebrow">{ready ? 'Ready to submit' : 'Almost ready'}</p><div>{ready ? <Check /> : <Info />}{' '}{ready ? `All ${steps.length} questions answered` : `${problems.length} ${problems.length === 1 ? 'answer needs' : 'answers need'} attention`}</div><div><Check /> Explicit confirmation required</div></div>
          <button className="btn primary full" onClick={goOn}>{ready ? <>Continue to confirmation <ArrowRight size={16} /></> : <>Fix {problems.length === 1 ? 'the missing answer' : `${problems.length} answers`}</>}</button>
          <Link to={`/jobs/${job.id}`} className="btn secondary full">Back to job</Link>
        </aside>
      </section>
    </div>
  );
}

export default function Review() { return <ApplicationRoute><ReviewView /></ApplicationRoute>; }
