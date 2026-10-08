import { ArrowRight, CheckCircle2, Copy, Download, Search } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAnnounce } from '../components/Announcer';
import JobNotFound from '../components/JobNotFound';
import SignatureScene from '../components/SignatureScene';
import LottieState from '../components/LottieState';
import { findJob } from '../data/jobs';
import { getSubmission, hydrateSubmission } from '../lib/submissionStore';
import { apiGetJob } from '../lib/api';
import type { Job } from '../data/jobs';
import { useEffect, useState } from 'react';

export default function Receipt() {
  const { id } = useParams();
  const nav = useNavigate();
  const announce = useAnnounce();
  const [remoteJob, setRemoteJob] = useState<Job | null>(null);
  const localJob = findJob(id);
  const [checked, setChecked] = useState(!!localJob);
  const job = localJob || remoteJob;
  useEffect(() => { if (!localJob && id) void apiGetJob(id).then(setRemoteJob).catch(() => undefined).finally(() => setChecked(true)); else setChecked(true); }, [id, localJob]);
  const [submission, setSubmission] = useState(() => (job ? getSubmission(job.id) : undefined));
  useEffect(() => { if (job) void hydrateSubmission(job.id).then(setSubmission); }, [job?.id]);
  if (!job && !checked) return <div className="page"><div className="card"><h1>Loading receipt…</h1><p className="page-sub">Checking the secure ApplyEase record.</p></div></div>;
  if (!job) return <div className="page"><div className="card"><h1>We could not find that job.</h1><p className="page-sub">The application record may have been removed.</p><Link className="btn primary" to="/jobs">Back to jobs</Link></div></div>;
  if (!submission) return <div className="page"><div className="card"><h1>Loading receipt…</h1><p className="page-sub">Checking the secure ApplyEase record.</p></div></div>;
  const reference = submission.reference;

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      announce('Reference number copied.');
    } catch {
      announce('Could not copy. The reference number is shown on the page.');
    }
  };

  const saveReceipt = () => {
    const text = [
      'ApplyEase receipt',
      '',
      `${job.title} — ${job.company}`,
      `Reference: ${reference}`,
      `Submitted: ${new Date(submission.submittedAt).toLocaleString()}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApplyEase-${job.id}-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page receipt-page">
      <div className="receipt-card">
        <div className="receipt-success"><CheckCircle2 /><LottieState type="success" label="Application success" /></div>
        <SignatureScene variant="success" label="Application complete" />
        <p className="eyebrow">Application submitted</p>
        <h1 tabIndex={-1}>Your application is on its way.</h1>
        <p className="page-sub">
          ApplyEase recorded the confirmation and saved a receipt so you can return to it later.
        </p>

        <div className="receipt-job">
          <span className="company-mark large">{job.company.slice(0, 1)}</span>
          <div>
            <strong>{job.title}</strong>
            <span>
              {job.company} · {job.location}
            </span>
          </div>
        </div>

        <div className="reference">
          <span>Reference number</span>
          <strong>{reference}</strong>
          <button className="icon-btn" aria-label="Copy reference number" onClick={copyReference}>
            <Copy size={16} />
          </button>
        </div>

        <div className="receipt-actions">
          <button className="btn primary" onClick={() => nav('/applications')}>
            View application <ArrowRight size={16} />
          </button>
          <button className="btn secondary" onClick={saveReceipt}>
            <Download size={16} /> Save receipt
          </button>
          <Link className="btn secondary" to="/jobs">
            <Search size={16} /> Find another job
          </Link>
        </div>
      </div>
    </div>
  );
}
