import { ArrowLeft, Check, Copy, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { apiGetJob, apiGetApplicationKit, apiGetFileAccess, apiMarkExternalSubmitted } from '../lib/api';
import type { Job } from '../data/jobs';
import { useAnnounce } from '../components/Announcer';
import JobNotFound from '../components/JobNotFound';
import { findJob } from '../data/jobs';
import { answersFor } from '../lib/drafts';
import { buildKitText, countAnswered } from '../lib/kit';
import { getWizardSteps } from '../lib/wizard';

export default function ApplicationKit() {
  const { id } = useParams();
  const nav = useNavigate();
  const announce = useAnnounce();
  const [copied, setCopied] = useState(false);
  const [remoteJob, setRemoteJob] = useState<Job | null>(null);
  const [serverAnswers, setServerAnswers] = useState<Record<string,string>>({});
  const [applicationStatus, setApplicationStatus] = useState<string>('');
  const [resumeFileId, setResumeFileId] = useState<string | null>(null);
  const [openingResume, setOpeningResume] = useState(false);
  const [markedSubmitted, setMarkedSubmitted] = useState(false);
  const localJob = findJob(id);
  const [checked, setChecked] = useState(!!localJob);
  const job = localJob || remoteJob;
  useEffect(() => { if (!localJob && id) void apiGetJob(id).then(setRemoteJob).catch(() => undefined).finally(() => setChecked(true)); else setChecked(true); if (id) void apiGetApplicationKit(id).then((x) => { setServerAnswers(x.answers); setResumeFileId(x.resumeFileId); setApplicationStatus(x.status || ''); }).catch(() => undefined); }, [id, localJob]);
  if (!job && !checked) return <div className="page"><div className="card"><h1>Loading job…</h1></div></div>;
  if (!job) return <JobNotFound />;
  if (job.applyMode === 'partner') return <Navigate to={`/jobs/${job.id}`} replace />;

  const answers = Object.keys(serverAnswers).length ? serverAnswers : answersFor(job.id, job);
  const text = buildKitText(job, answers);
  const answered = countAnswered(answers, job);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      announce('Prepared answers copied.');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      announce('Could not copy. Use Download kit instead.');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApplyEase-${job.id}-application-kit.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <button className="back-link button-link" onClick={() => nav(`/jobs/${job.id}`)}>
        <ArrowLeft size={16} /> Back to job
      </button>
      <div className="kit-head">
        <div>
          <p className="eyebrow">External application</p>
          <h1>Your ApplyEase Application Kit.</h1>
          <p className="page-sub">
            This employer form stays outside ApplyEase. We prepare your information; you remain in control of the
            final submission.
          </p>
        </div>
        <span className="external-badge">
          <ExternalLink size={14} /> External form
        </span>
      </div>

      <div className="kit-grid">
        <main className="kit-card">
          <div className="kit-target">
            <span className="company-mark large">{job.company.slice(0, 1)}</span>
            <div>
              <strong>{job.title}</strong>
              <span>{job.company}</span>
            </div>
          </div>
          <div className="kit-item">
            <Check />
            <div>
              <strong>Resume</strong>
              <span>{answers.resume || 'No resume saved yet. Add one in your profile.'}</span>
              {resumeFileId && <button className="text-action button-link" disabled={openingResume} onClick={async () => { setOpeningResume(true); try { const access=await apiGetFileAccess(resumeFileId); const url=`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/files/${encodeURIComponent(resumeFileId)}/download?token=${encodeURIComponent(access.token)}`; window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { announce(e instanceof Error ? e.message : 'Could not open saved resume.', 'assertive'); } finally { setOpeningResume(false); } }}>{openingResume ? 'Opening…' : 'View saved resume'}</button>}
            </div>
            <Link className="btn secondary" to="/profile">
              Profile
            </Link>
          </div>
          <div className="kit-item">
            <Check />
            <div>
              <strong>Prepared answers</strong>
              <span>
                {answered} of {getWizardSteps(job).length} answers are ready to copy into the employer form.
              </span>
            </div>
            <button className="btn secondary" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {job.externalUrl ? <button
            className="btn primary full"
            onClick={() => window.open(job.externalUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={16} /> Open employer application
          </button> : <p className="field-error" role="status">No approved employer application link is configured for this job.</p>}
          <Link className="btn secondary full" to={`/apply/${job.id}/1`}>
            Prepare or edit application answers
          </Link>
          <button className="btn secondary full" disabled={markedSubmitted || applicationStatus === 'submitted_external'} onClick={async () => { try { await apiMarkExternalSubmitted(job.id); setMarkedSubmitted(true); announce('Marked as submitted externally.'); } catch (e) { announce(e instanceof Error ? e.message : 'Could not update the tracker.', 'assertive'); } }}>
            {markedSubmitted || applicationStatus === 'submitted_external' ? 'Marked as submitted externally' : 'I submitted on the employer site'}
          </button>
        </main>

        <aside className="kit-side">
          <ShieldCheck />
          <h2>Clear boundary</h2>
          <p>
            ApplyEase does not pretend to submit to arbitrary employer systems. When a form cannot be mirrored, you
            get a prepared kit and a clear hand-off.
          </p>
          <button className="btn secondary full" onClick={download}>
            <Download size={16} /> Download kit
          </button>
        </aside>
      </div>
    </div>
  );
}
