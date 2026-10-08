import { ArrowUpRight, MapPin, Clock3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Job } from '../data/jobs';
export default function JobCard({ job }: {
    job: Job;
}) { return <article className="job-card"><div className="company-mark">{job.company.slice(0, 1)}</div><div className="job-card-main"><div className="job-title-row"><div><h3>{job.title}</h3><p>{job.company}</p></div><span className="ai-chip"><Sparkles size={13}/> AI understood</span></div><div className="meta"><span><MapPin size={14}/>{job.location}</span><span><Clock3 size={14}/>{job.type}</span></div><p className="job-summary">{job.summary}</p><div className="chips">{job.skills.slice(0, 3).map(s => <span key={s}>{s}</span>)}</div><Link className="text-action" to={'/jobs/' + job.id}>Understand this job <ArrowUpRight size={16}/></Link></div></article>; }
