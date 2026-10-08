import { ArrowLeft, ClipboardPaste, Link as LinkIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiImportJob, apiImportJobUrl } from '../lib/api';

type Kind = 'link' | 'text';

export default function ImportJob() {
  const nav = useNavigate();
  const [kind, setKind] = useState<Kind>('link');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const [busy, setBusy] = useState(false);

  const importJob = async () => {
    const value = text.trim();
    if (kind === 'link' && !/^https?:\/\/\S+\.\S+/i.test(value)) {
      setError('Paste a full job link that starts with http:// or https://.');
      return;
    }
    if (kind === 'text' && value.length < 20) {
      setError('Paste enough of the job posting for ApplyEase to analyze (at least a few sentences).');
      return;
    }
    setBusy(true);
    try {
      const result = kind === 'link' ? await apiImportJobUrl(value) : await apiImportJob(value);
      nav(`/jobs/${result.job.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not import this job.'); } finally { setBusy(false); }
  };

  const pick = (k: Kind) => {
    setKind(k);
    setError('');
  };

  return (
    <div className="page">
      <button className="back-link button-link" onClick={() => nav('/jobs')}>
        <ArrowLeft size={16} /> Back to jobs
      </button>
      <div className="import-layout">
        <div>
          <p className="eyebrow">Bring your own job</p>
          <h1>Paste a job link or the posting text.</h1>
          <p className="page-sub">
            ApplyEase normalizes approved job sources or the text you provide into the same Job Lens experience. Unapproved URLs are rejected rather than scraped.
          </p>
        </div>

        <section className="card import-card">
          <div className="import-tabs">
            <button className={kind === 'link' ? 'selected' : ''} type="button" aria-pressed={kind === 'link'} onClick={() => pick('link')}>
              <LinkIcon /> Job link
            </button>
            <button className={kind === 'text' ? 'selected' : ''} type="button" aria-pressed={kind === 'text'} onClick={() => pick('text')}>
              <ClipboardPaste /> Job text
            </button>
          </div>

          <label htmlFor="job-import">{kind === 'link' ? 'Job URL' : 'Job posting text'}</label>
          <textarea
            id="job-import"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
            placeholder={kind === 'link' ? 'Paste a public job link…' : 'Paste the job description here…'}
            aria-invalid={!!error}
            aria-describedby={error ? 'import-error' : undefined}
          />

          <div className="import-note">
            <Sparkles />
            <span>
              <strong>AI stays grounded.</strong> ApplyEase analyzes only the text you provide; every AI claim must point to
              an exact source span.
            </span>
          </div>
          {error && (
            <div id="import-error" className="field-error" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary full" onClick={() => void importJob()} disabled={busy}>
            {busy ? 'Analyzing…' : 'Open in Job Lens'} <Sparkles size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}
