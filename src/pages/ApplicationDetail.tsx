import { ArrowLeft, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import JobNotFound from '../components/JobNotFound';
import { apiGetApplications } from '../lib/api';

type Item = {
  id: number;
  jobId: string;
  status: string;
  lastStep: number;
  updatedAt: string;
  submittedAt: string | null;
  reference: string | null;
  job: { title: string; company: string; location: string; type: string; applyMode: string; externalUrl?: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed, not yet submitted',
  submitted: 'Submitted',
  submitted_external: 'Submitted on the employer site',
};

/** Application detail for one job (the :id in /applications/:id is the job id). */
export default function ApplicationDetail() {
  const { id = '' } = useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let active = true;
    apiGetApplications()
      .then((items: Item[]) => {
        if (!active) return;
        const found = items.find((x) => x.jobId === id) ?? null;
        setItem(found);
        setState(found ? 'ready' : 'missing');
      })
      .catch(() => active && setState('missing'));
    return () => {
      active = false;
    };
  }, [id]);

  if (state === 'loading') return <div className="page"><h1>Loading application…</h1></div>;
  if (state === 'missing' || !item || !item.job) return <JobNotFound />;

  const submitted = item.status === 'submitted' || item.status === 'submitted_external';
  const next = item.status === 'submitted'
    ? { to: `/apply/${item.jobId}/receipt`, text: 'View receipt' }
    : item.job.applyMode === 'partner'
      ? { to: `/apply/${item.jobId}/${item.lastStep || 1}`, text: 'Continue application' }
      : { to: `/application-kit/${item.jobId}`, text: 'Open Application Kit' };

  return (
    <div className="page">
      <Link className="back-link button-link" to="/applications"><ArrowLeft size={16} /> Back to applications</Link>
      <p className="eyebrow">Application detail</p>
      <h1>{item.job.title}</h1>
      <p className="page-sub">{item.job.company} · {item.job.location} · {item.job.type}</p>
      <section aria-label="Application status" className="source-note">
        {submitted ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
        <span>
          <strong>Status:</strong> {STATUS_LABEL[item.status] ?? item.status}
          {item.reference && <> · Reference {item.reference}</>}
          {item.submittedAt && <> · Submitted {new Date(item.submittedAt).toLocaleString()}</>}
          {!submitted && <> · Last step {item.lastStep}</>}
        </span>
      </section>
      <p><Link className="btn primary" to={next.to}>{next.text} <ArrowRight size={16} /></Link></p>
    </div>
  );
}
