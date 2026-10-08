import { ArrowRight, BriefcaseBusiness, Check, Edit3, FileText, GraduationCap, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnnounce } from '../components/Announcer';
import ErrorSummary from '../components/ErrorSummary';
import {
  getProfile,
  hydrateProfile,
  ProfileArea,
  ProfileData,
  profileAreaStatus,
  profileCompletion,
  saveProfile,
} from '../lib/profile';
import { isValidEmail } from '../lib/wizard';
import { apiUploadResume } from '../lib/api';

const fields: { key: keyof ProfileData; label: string; type?: string; autoComplete?: string }[] = [
  { key: 'name', label: 'Full name', autoComplete: 'name' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience' },
  { key: 'resume', label: 'Resume filename' },
];

export default function Profile() {
  const announce = useAnnounce();
  const [data, setData] = useState<ProfileData>(getProfile);
  const [editing, setEditing] = useState(false);
  const [focusField, setFocusField] = useState<keyof ProfileData | null>(null);
  const [error, setError] = useState('');

  // After the editor opens, move focus to the field the person asked to edit.
  useEffect(() => { void hydrateProfile().then((remote) => setData(remote)); }, []);

  useEffect(() => {
    if (editing && focusField) {
      document.getElementById(`profile-${focusField}`)?.focus();
      setFocusField(null);
    }
  }, [editing, focusField]);

  const status = profileAreaStatus(data);
  const { ready, total, percent } = profileCompletion(data);

  const startEdit = (field: keyof ProfileData) => {
    setEditing(true);
    setFocusField(field);
  };

  const save = () => {
    if (data.email.trim() && !isValidEmail(data.email)) {
      setError('That email does not look right. It should look like name@example.com.');
      announce('That email does not look right.');
      document.getElementById('profile-email')?.focus();
      return;
    }
    setError('');
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.trim()])) as ProfileData;
    saveProfile(clean);
    setData(clean);
    setEditing(false);
    announce('Profile saved.');
  };

  const rows: { area: ProfileArea; title: string; desc: string; Icon: typeof UserRound; field: keyof ProfileData }[] = [
    {
      area: 'personal',
      title: 'Personal information',
      desc: data.name || data.email ? `${data.name} · ${data.email}` : 'Add your name and email.',
      Icon: UserRound,
      field: 'name',
    },
    { area: 'education', title: 'Education', desc: data.education || 'Add education.', Icon: GraduationCap, field: 'education' },
    { area: 'skills', title: 'Skills', desc: data.skills || 'Add skills.', Icon: BriefcaseBusiness, field: 'skills' },
    {
      area: 'experience',
      title: 'Experience',
      desc: data.experience || 'Add work experience when ready.',
      Icon: BriefcaseBusiness,
      field: 'experience',
    },
    { area: 'resume', title: 'Resume', desc: data.resume || 'Add your resume filename.', Icon: FileText, field: 'resume' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Your reusable profile</p>
          <h1>Enter it once. Reuse it everywhere.</h1>
          <p className="page-sub">ApplyEase keeps your application details ready so you don't have to retype them.</p>
        </div>
        <div className="completion">
          <strong>{percent}%</strong>
          <span>profile ready</span>
        </div>
      </div>

      <section className="profile-progress">
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Profile completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="progress-copy">
          <span>
            {ready} of {total} areas ready
          </span>
          <button className="btn secondary" onClick={() => (editing ? save() : setEditing(true))}>
            {editing ? (
              <>
                <Save size={15} /> Save profile
              </>
            ) : (
              <>
                <Edit3 size={15} /> Edit profile
              </>
            )}
          </button>
        </div>
      </section>

      {editing && (
        <section className="card profile-editor" aria-label="Edit profile">
          <div className="form-grid">
            {fields.map((f) => (
              <div className="form-field" key={f.key}>
                <label htmlFor={`profile-${f.key}`}>{f.label}</label>
                {f.key === 'resume' ? <><input id="profile-resume" className="sr-only" type="file" accept=".pdf,.doc,.docx" onChange={async (e) => { const file=e.target.files?.[0]; if(!file) return; try { const uploaded=await apiUploadResume(undefined, file); setData({ ...data, resume: uploaded.name }); announce(`Resume ${uploaded.name} uploaded securely.`); } catch(err){ setError(err instanceof Error ? err.message : 'Resume upload failed.'); } }} /><label className="btn secondary file-button" htmlFor="profile-resume">{data.resume ? 'Replace resume' : 'Upload resume'}</label><span className="muted">{data.resume || 'PDF, DOC or DOCX, up to 5 MB.'}</span></> : <input
                  id={`profile-${f.key}`}
                  type={f.type || 'text'}
                  autoComplete={f.autoComplete}
                  value={data[f.key]}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                  aria-invalid={f.key === 'email' && !!error}
                />}
              </div>
            ))}
          </div>
          <ErrorSummary items={error ? [{ label: 'Email', message: error }] : []} />
        </section>
      )}

      <div className="profile-list">
        {rows.map(({ area, title, desc, Icon, field }) => (
          <article className="profile-row" key={area}>
            <span className={'profile-icon ' + (status[area] ? 'done' : '')}>
              <Icon />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{desc}</p>
            </div>
            <div className="profile-action">
              {status[area] ? (
                <span className="done-text">
                  <Check /> Ready
                </span>
              ) : (
                <button className="btn secondary" onClick={() => startEdit(field)}>
                  Add<span className="sr-only"> {title.toLowerCase()}</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="privacy-banner">
        <Check />
        <div>
          <strong>Your accessibility preferences stay separate.</strong>
          <p>Choosing high contrast or voice mode never creates or implies a disability record.</p>
        </div>
      </div>
      <Link to="/jobs" className="btn primary">
        Find a job <ArrowRight size={17} />
      </Link>
    </div>
  );
}
