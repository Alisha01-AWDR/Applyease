import { Filter, Link as LinkIcon, MapPin, Search, Sparkles, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAnnounce } from '../components/Announcer';
import { useShortcutAction } from '../lib/KeyboardShortcutsContext';
import JobCard from '../components/JobCard';
import { Job, jobs } from '../data/jobs';
import { apiGetJobs } from '../lib/api';



function matches(j: Job, q: string, loc: string, types: string[]): boolean {
  const haystack = `${j.title} ${j.company} ${j.skills.join(' ')}`.toLowerCase();
  const okQuery = !q.trim() || haystack.includes(q.trim().toLowerCase());
  const okLoc = !loc.trim() || j.location.toLowerCase().includes(loc.trim().toLowerCase());
  const okType = types.length === 0 || types.includes(j.type);
  return okQuery && okLoc && okType;
}

export default function Jobs() {
  const announce = useAnnounce();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('query') || '');
  const [loc, setLoc] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>(jobs);
  useEffect(() => { const timer = window.setTimeout(() => { void apiGetJobs({ query: q, location: loc, jobType: types.length === 1 ? types[0] : undefined }).then(setAllJobs).catch(() => setAllJobs(jobs)); }, 180); return () => window.clearTimeout(timer); }, [q, loc, types]);
  useEffect(() => { setQ(params.get('query') || ''); }, [params]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  const jobTypes = useMemo(() => Array.from(new Set(allJobs.map((j) => j.type))), [allJobs]);
  const filtered = useMemo(() => allJobs.filter((j) => matches(j, q, loc, types)), [allJobs, q, loc, types]);
  const countText = `${filtered.length} ${filtered.length === 1 ? 'job' : 'jobs'}`;
  useShortcutAction('search', () => document.getElementById('job-search')?.focus());

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) setParams({ query: q.trim() }); else setParams({});
    announce(`${countText} found.`);
    resultsRef.current?.focus();
  };

  const toggleType = (t: string) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const clearAll = () => {
    setQ('');
    setLoc('');
    setTypes([]);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Discover</p>
          <h1>Find a job that makes sense.</h1>
          <p className="page-sub">Search a calmer job list. Open any result to see it through Job Lens.</p>
        </div>
        <Link className="btn secondary" to="/jobs/import">
          <LinkIcon size={16} /> Import job
        </Link>
      </div>

      <form className="search-panel" role="search" onSubmit={onSearch}>
        <div className="search-field">
          <Search />
          <label htmlFor="job-search">What kind of work are you looking for?</label>
          <input id="job-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Data Analyst" />
        </div>
        <div className="search-field">
          <MapPin />
          <label htmlFor="location">Where?</label>
          <input id="location" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Mumbai" />
        </div>
        <button className="btn primary search-btn" type="submit">
          <Search size={17} /> Search jobs
        </button>
      </form>

      <div className="results-head">
        <div>
          <h2 className="results-count" tabIndex={-1} ref={resultsRef} role="status">
            <strong>{countText}</strong>
            <span> from approved demo sources</span>
          </h2>
        </div>
        <button
          type="button"
          className="filter-btn"
          aria-expanded={filtersOpen}
          aria-controls="job-filters"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter size={16} /> Simple filters{types.length > 0 ? ` (${types.length})` : ''}
        </button>
      </div>

      {filtersOpen && (
        <fieldset id="job-filters" className="filter-panel">
          <legend>Job type</legend>
          {jobTypes.map((t) => (
            <label key={t} className="check-row">
              <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} /> {t}
            </label>
          ))}
        </fieldset>
      )}

      {filtered.length ? (
        <div className="jobs-list">
          {filtered.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div>
            <Search />
          </div>
          <h2>No jobs found</h2>
          <p>Try a broader role or location.</p>
          <button className="btn secondary" onClick={clearAll}>
            <X size={16} /> Clear search
          </button>
        </div>
      )}

      <div className="source-note">
        <Sparkles size={16} />
        <span>
          <strong>Why these jobs?</strong> This build uses seeded demo jobs. The production ingestion layer will
          connect only to approved/legal sources.
        </span>
      </div>
    </div>
  );
}
