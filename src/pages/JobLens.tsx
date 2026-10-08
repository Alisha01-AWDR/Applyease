import { ArrowLeft, ArrowRight, Check, ChevronDown, FileText, Info, MapPin, Sparkles, Target, BriefcaseBusiness } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { apiAnalyzeJob, apiGetJob } from '../lib/api';
import { findJob, Job } from '../data/jobs';
import JobNotFound from '../components/JobNotFound';
import SignatureScene from '../components/SignatureScene';
import { applyPath, loadDraft } from '../lib/drafts';
import { getProfile, hydrateProfile, profileAreaStatus } from '../lib/profile';

function matchingSourcePassage(originalText: string, summary: string): string {
  const sentences = originalText.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
  const terms = summary.toLowerCase().split(/\W+/).filter((x) => x.length > 4).slice(0, 10);
  const scored = sentences.map((sentence) => ({ sentence, score: terms.reduce((score, term) => score + (sentence.toLowerCase().includes(term) ? 1 : 0), 0) }));
  return (scored.sort((a, b) => b.score - a.score)[0]?.sentence || originalText).trim();
}
function ClaimSource({ text, span }: { text: string; span?: { start:number; end:number; text:string } }) {
  if (!span) return null;
  return <details className="claim-source"><summary>Source truth</summary><blockquote>{span.text || text}</blockquote></details>;
}

export default function JobLens() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(() => findJob(id) || null);
  const [source, setSource] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'idle'|'analyzing'|'ai'|'fallback'|'error'>('idle');
  const [profile, setProfile] = useState(getProfile);
  const status = profileAreaStatus(profile);
  useEffect(() => { void hydrateProfile().then(setProfile); }, []);

  useEffect(() => {
    let active = true;
    if (!id) return;
    void (async () => {
      try {
        const remote = await apiGetJob(id);
        if (active) setJob(remote);
        setAnalysisStatus('analyzing');
        const result = await apiAnalyzeJob(id);
        if (active) { setJob(result.job); setAnalysisStatus(result.status === 'ai' ? 'ai' : 'fallback'); }
      } catch {
        if (active && !job) setAnalysisStatus('error');
      }
    })();
    return () => { active = false; };
  }, [id]);

  const readinessItems = useMemo(() => [
    { key: 'profile', label: 'Basic profile details ready', ready: status.personal },
    { key: 'resume', label: 'Resume ready to share', ready: status.resume },
    { key: 'experience', label: 'Skills and experience prepared', ready: status.skills && status.experience },
    { key: 'process', label: 'Application process reviewed', ready: Boolean(job?.process.length) },
    { key: 'deadline', label: job?.deadline && job.deadline.toLowerCase() !== 'not stated' ? `Deadline checked: ${job.deadline}` : 'No application deadline stated', ready: true },
  ], [job, status]);
  const readiness = useMemo(() => { const ready = readinessItems.filter((item) => item.ready).length; return { ready, total: readinessItems.length, percent: Math.round((ready / readinessItems.length) * 100) }; }, [readinessItems]);
  if (!job) return <JobNotFound />;
  const hasDraft = !!loadDraft(job.id, job);
  const applyHref = applyPath(job.id, job);
  const isExternal = job.applyMode === 'external';
  const primaryHref = isExternal ? `/application-kit/${job.id}` : applyHref;
  const primaryLabel = isExternal ? 'Open Application Kit' : hasDraft ? 'Continue application' : 'Apply with ApplyEase';
  const summarySpan = job.sourceSpans?.summary;
  const sourcePassage = summarySpan && job.originalText.slice(summarySpan.start, summarySpan.end) === summarySpan.text
    ? summarySpan.text
    : matchingSourcePassage(job.originalText, job.summary);

  return <div className="page lens-page">
    <Link to="/jobs" className="back-link"><ArrowLeft size={16} /> Back to jobs</Link>
    <div className="lens-hero"><SignatureScene variant="job" label="Job Lens" /><div><div className="eyebrow"><span className="ai-star">✦</span> ApplyEase Job Lens</div><h1>{job.title}</h1><p className="lens-company">{job.company} · {job.location} · {job.type}</p></div><Link to={primaryHref} className="btn primary">{primaryLabel} <ArrowRight size={17} /></Link></div>
    <div className="lens-meta"><span><MapPin size={15} />{job.location}</span><span><BriefcaseBusiness size={15} />{job.type}</span><span><Check size={15} /> Source: {job.source}</span><span><Info size={15} /> {isExternal ? 'External application' : 'ApplyEase partner demo'}</span></div>
    {analysisStatus === 'analyzing' && <motion.div className="analysis-state" initial={{opacity:0}} animate={{opacity:1}}><div className="analysis-spinner"/><h2>Understanding this job…</h2><p>Extracting grounded responsibilities, requirements and application steps.</p></motion.div>}
    <div className="lens-grid"><main className="lens-main">
      {analysisStatus === 'fallback' && <section className="card fallback-card"><div className="card-label"><span className="ai-chip"><FileText size={13} /> Original job text</span><span className="grounded"><Check size={14}/> AI unavailable</span></div><h2>Source text</h2><div className="original-job-text">{job.originalText.split(/\n+/).map((line,i)=><p key={`${line}-${i}`}>{line || ' '}</p>)}</div></section>}
      <section className="ai-summary card"><div className="card-label"><span className="ai-chip"><Sparkles size={13} /> {analysisStatus === 'ai' ? 'Summary by AI' : 'Prepared summary (demo)'}</span><span className="grounded"><Check size={14} /> {analysisStatus === 'ai' ? 'Grounding validated' : 'Original text fallback'}</span></div><h2>What this role is about</h2><p>{job.summary}</p><button className="source-toggle" onClick={() => setSource(!source)} aria-expanded={source}><FileText size={16} />{source ? 'Hide source truth' : 'See source truth'}<ChevronDown size={16} className={source ? 'rotated' : ''} /></button>{source && <motion.div className="source-box" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}><p>“{sourcePassage}”</p><small>Source: {job.source}</small></motion.div>}</section>
      <section className="split-cards"><div className="card"><div className="section-icon orange"><Target /></div><h2>What you'll do</h2><ul className="check-list">{job.responsibilities.map((x, i) => <li key={x}><div className="claim-line"><Check />{x}</div><ClaimSource text={x} span={job.sourceSpans?.responsibilities?.[i]} /></li>)}</ul></div><div className="card"><div className="section-icon purple"><Sparkles /></div><h2>What you need</h2><h4>Required</h4><ul className="check-list">{job.required.map((x, i) => <li key={x}><div className="claim-line"><Check />{x}</div><ClaimSource text={x} span={job.sourceSpans?.required?.[i]} /></li>)}</ul><h4 className="preferred">Preferred</h4><ul className="check-list muted-list">{job.preferred.map((x, i) => <li key={x}><div className="claim-line"><span className="dot" />{x}</div><ClaimSource text={x} span={job.sourceSpans?.preferred?.[i]} /></li>)}</ul></div></section>
      <section className="card"><div className="section-icon blue"><FileText /></div><h2>How to apply</h2><div className="process-row">{job.process.map((x,i)=><div key={x} className="process-step"><span>{i+1}</span><div><strong>{x}</strong><ClaimSource text={x} span={job.sourceSpans?.process?.[i]} /></div></div>)}</div></section>
      {job.deadline && job.deadline.toLowerCase() !== 'not stated' && <section className="card deadline-card"><div className="section-icon orange"><FileText /></div><h2>Deadline</h2><p>{job.deadline}</p><ClaimSource text={job.deadline} span={job.sourceSpans?.deadline || undefined} /></section>}
    </main><aside className="lens-side"><section className="readiness card"><div className="readiness-top"><div><p className="eyebrow">Application readiness</p><h2>{readiness.ready} of {readiness.total} ready</h2></div><div className="readiness-score">{readiness.percent}%</div></div><div className="readiness-bar"><span style={{width:`${readiness.percent}%`}}/></div><ul>{readinessItems.map((item)=><li key={item.key} className={item.ready?'':'missing'}>{item.ready?<Check/>:<Info/>}{item.label}</li>)}</ul><Link to={primaryHref} className="btn dark full">{isExternal?'Open Application Kit':hasDraft?'Continue application':'Start application'} <ArrowRight size={16}/></Link></section><section className="card truth-card"><p className="eyebrow">AI transparency</p><h3>{analysisStatus === 'ai' ? 'Grounded to source.' : 'Fallback is honest.'}</h3><p>{analysisStatus === 'ai' ? 'Claims shown here were validated against exact source spans from the original job text.' : 'If AI is unavailable, ApplyEase keeps the original job text available instead of inventing facts.'}</p><div className="truth-row"><Check/>Requirements linked to source</div><div className="truth-row"><Check/>No hiring prediction</div></section><div className="ai-note"><Sparkles size={16}/><span><strong>AI can help explain.</strong> You make the decisions.</span></div></aside></div>
  </div>;
}
