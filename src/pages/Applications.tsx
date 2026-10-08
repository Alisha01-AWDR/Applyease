import { ArrowRight, CheckCircle2, Clock3, ExternalLink, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findJob } from '../data/jobs';
import { listDrafts } from '../lib/drafts';
import { getSubmissions } from '../lib/submissionStore';
import { totalSteps } from '../lib/wizard';
import { apiGetApplications } from '../lib/api';
import LottieState from '../components/LottieState';

type Row = {
  key: string;
  title: string;
  company: string;
  when: string;
  at: string;
  status: string;
  reference?: string;
  kind: 'submitted' | 'draft';
  href: string;
  detailHref?: string;
};

function buildRows(): Row[] {
  const rows: Row[] = [];
  for (const s of getSubmissions()) {
    const job = findJob(s.jobId);
    if (!job) continue;
    rows.push({
      key: `s-${s.jobId}`,
      title: job.title,
      company: job.company,
      when: new Date(s.submittedAt).toLocaleDateString(),
      at: s.submittedAt,
      status: 'Submitted',
      reference: s.reference,
      kind: 'submitted',
      href: `/apply/${job.id}/receipt`,
      detailHref: `/applications/${job.id}`,
    });
  }
  for (const d of listDrafts()) {
    const job = findJob(d.jobId);
    if (!job) continue;
    rows.push({
      key: `d-${d.jobId}`,
      title: job.title,
      company: job.company,
      when: new Date(d.savedAt).toLocaleDateString(),
      at: d.savedAt,
      status: `Draft · Step ${d.step} of ${totalSteps(job)}`,
      kind: 'draft',
      href: `/apply/${job.id}/${d.step}`,
      detailHref: `/applications/${job.id}`,
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

export default function Applications() {
  const [serverRows, setServerRows] = useState<Row[] | null>(null);
  useEffect(() => { void apiGetApplications().then((items) => setServerRows(items.map((x: any) => ({ key: `server-${x.id}`, title: x.job?.title || x.jobId, company: x.job?.company || 'Employer', when: new Date(x.submittedAt || x.updatedAt).toLocaleDateString(), at: x.submittedAt || x.updatedAt, status: x.status === 'submitted' ? 'Submitted' : x.status === 'submitted_external' ? 'Submitted externally' : `Draft · Step ${x.lastStep}`, reference: x.reference || undefined, kind: x.status === 'submitted' ? 'submitted' : x.status === 'submitted_external' ? 'submitted' : 'draft', href: x.status === 'submitted' ? `/apply/${x.jobId}/receipt` : x.job?.applyMode === 'partner' ? `/apply/${x.jobId}/${x.lastStep || 1}` : `/application-kit/${x.jobId}`, detailHref: `/applications/${x.jobId}` })))).catch(() => setServerRows(null)); }, []);
  const localRows = useMemo(buildRows, []);
  const rows = serverRows ?? localRows;
  const submitted = rows.filter((r) => r.kind === 'submitted').length;
  const drafts = rows.length - submitted;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Your application history</p>
          <h1>Keep every application in one place.</h1>
          <p className="page-sub">Drafts, confirmations and prepared external applications stay easy to find.</p>
        </div>
        <Link className="btn primary" to="/jobs">
          Find another job <ArrowRight size={16} />
        </Link>
      </div>

      <div className="tracker-stats">
        <div>
          <strong>{submitted}</strong>
          <span>Submitted</span>
        </div>
        <div>
          <strong>{drafts}</strong>
          <span>Draft</span>
        </div>
        <div>
          <strong>{rows.length}</strong>
          <span>Total</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state"><LottieState type="empty" label="No applications" />
          <h2>No applications yet</h2>
          <p>Applications you start or submit will appear here.</p>
          <Link className="btn primary" to="/jobs">
            Find a job
          </Link>
        </div>
      ) : (
        <section className="application-list" aria-label="Your applications">
          {rows.map((r) => (
            <article className="application-row" key={r.key}>
              <div className={'status-icon ' + r.kind}>{r.kind === 'submitted' ? <CheckCircle2 /> : <Clock3 />}</div>
              <div className="application-main">
                <div className="application-title">
                  <div>
                    <h2>{r.title}</h2>
                    <p>{r.company}</p>
                  </div>
                  <span className="status-badge">{r.status}</span>
                </div>
                <div className="application-meta">
                  <span>
                    <FileText size={14} /> {r.when}
                  </span>
                  {r.reference && <span>Reference {r.reference}</span>}
                  {r.detailHref && <Link to={r.detailHref}>Details</Link>}
                </div>
              </div>
              <Link to={r.href} className="icon-btn" aria-label={`Open ${r.title} at ${r.company}`}>
                <ArrowRight />
              </Link>
            </article>
          ))}
        </section>
      )}

      <div className="source-note">
        <ExternalLink size={16} />
        <span>
          <strong>External jobs</strong> can use the Application Kit when ApplyEase cannot mirror the employer form.
        </span>
      </div>
    </div>
  );
}
