import { Accessibility, ArrowRight, Keyboard, Mic, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SignatureScene from '../components/SignatureScene';
import { findJob } from '../data/jobs';
import { firstName, getAuth } from '../lib/auth';
import { listDrafts } from '../lib/drafts';
import { greeting, timeAgo } from '../lib/format';
import { modeLabels, useAccessibility } from '../lib/AccessibilityContext';
import { totalSteps } from '../lib/wizard';
import { apiGetApplications } from '../lib/api';
import type { Job } from '../data/jobs';

export default function Dashboard() {
  const auth = getAuth();
  const { mode } = useAccessibility();
  // Most recent draft whose job still exists.
  const localDraft = listDrafts().find((d) => findJob(d.jobId));
  const [serverDraft, setServerDraft] = useState<{ job: Job; lastStep: number; updatedAt: string } | null>(null);
  useEffect(() => {
    void apiGetApplications().then((items) => {
      const candidate = items.find((item: any) => item.status === 'draft' && item.job);
      if (candidate) setServerDraft({ job: candidate.job, lastStep: candidate.lastStep || 1, updatedAt: candidate.updatedAt });
    }).catch(() => undefined);
  }, []);
  const draft = serverDraft ? { jobId: serverDraft.job.id, step: serverDraft.lastStep, savedAt: serverDraft.updatedAt } : localDraft;
  const draftJob = serverDraft?.job || (draft ? findJob(draft.jobId) : undefined);
  const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{weekday} · Candidate workspace</p>
          <h1>
            {greeting()}, {firstName(auth?.name)}.
          </h1>
          <p className="page-sub">
            {draft ? 'Pick up where you left off, or find something new.' : 'Find a job and apply one question at a time.'}
          </p>
        </div>
        <Link to="/jobs" className="btn primary">
          <Search size={17} /> Find a job
        </Link>
      </div>

      {draft && draftJob ? (
        <section className="continue-card" aria-labelledby="continue-heading">
          <div className="continue-copy">
            <div className="status-label">
              <span className="status-dot" /> Draft saved {timeAgo(draft.savedAt)}
            </div>
            <h2 id="continue-heading">
              {draftJob.title} at {draftJob.company}
            </h2>
            <p>
              You're on step {draft.step} of {totalSteps(draftJob)}. Your previous answers are already saved.
            </p>
            <Link to={`/apply/${draftJob.id}/${draft.step}`} className="btn dark">
              Continue application <ArrowRight size={17} />
            </Link>
          </div>
          <div className="progress-orbit" aria-hidden="true">
            <SignatureScene variant="progress" label="Application progress" />
          </div>
        </section>
      ) : (
        <section className="continue-card" aria-labelledby="continue-heading">
          <div className="continue-copy">
            <h2 id="continue-heading">No application in progress</h2>
            <p>When you start an application it is saved automatically, and you can continue it here.</p>
            <Link to="/jobs" className="btn dark">
              Find a job <ArrowRight size={17} />
            </Link>
          </div>
          <div className="progress-orbit" aria-hidden="true">
            <SignatureScene variant="progress" label="Application progress" />
          </div>
        </section>
      )}

      <div className="section-head">
        <div>
          <p className="eyebrow">Quick actions</p>
          <h2>What do you need?</h2>
        </div>
      </div>
      <div className="quick-grid">
        <Link to="/jobs" className="quick-card">
          <span className="quick-icon orange">
            <Search />
          </span>
          <div>
            <h3>Find jobs</h3>
            <p>Search approved job sources with simple filters.</p>
          </div>
          <ArrowRight />
        </Link>
        <Link to="/jobs/acme-data" className="quick-card">
          <span className="quick-icon purple">
            <Sparkles />
          </span>
          <div>
            <h3>Understand a job</h3>
            <p>See a plain-language AI explanation and source text.</p>
          </div>
          <ArrowRight />
        </Link>
        <Link to="/profile" className="quick-card">
          <span className="quick-icon green">
            <Accessibility />
          </span>
          <div>
            <h3>Complete profile</h3>
            <p>Reuse your details instead of typing them again.</p>
          </div>
          <ArrowRight />
        </Link>
      </div>

      <section className="mode-status">
        <div>
          <p className="eyebrow">Your accessibility setup</p>
          <h2>{modeLabels[mode]} is on.</h2>
        </div>
        <div className="mode-status-items">
          <span>
            <Keyboard /> Keyboard
          </span>
          <span>
            <Mic /> Voice
          </span>
          <span>
            <Accessibility /> Screen reader
          </span>
        </div>
      </section>
    </div>
  );
}
