import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginAccount, registerAccount } from '../lib/auth';
import { demoProfile, getProfile, saveProfile } from '../lib/profile';
import { isValidEmail } from '../lib/wizard';

const DEMO_PASSWORD = 'ApplyEase123!';

type FieldError = { id: string; message: string };

export default function Auth({ mode = 'signup' }: { mode?: 'signup' | 'login' }) {
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from || '/dashboard';
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldError[]>([]);

  const useDemo = () => {
    setName(demoProfile.name);
    setEmail(demoProfile.email);
    setPassword(DEMO_PASSWORD);
    setErrors([]);
  };

  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: FieldError[] = [];
    if (mode === 'signup' && !name.trim()) found.push({ id: 'auth-name', message: 'Enter your full name.' });
    if (!isValidEmail(email)) found.push({ id: 'auth-email', message: 'Enter a valid email, like name@example.com.' });
    if (password.length < 12) found.push({ id: 'auth-password', message: 'Use a password with at least 12 characters.' });
    if (found.length) {
      setErrors(found);
      document.getElementById(found[0].id)?.focus();
      return;
    }
    const cleanEmail = email.trim();
    const displayName = name.trim() || getProfile().name || cleanEmail.split('@')[0];
    setBusy(true);
    try {
      if (mode === 'signup') await registerAccount(displayName, cleanEmail, password);
      else await loginAccount(cleanEmail, password);
      if (cleanEmail === demoProfile.email) saveProfile(demoProfile);
      nav(from, { replace: true });
    } catch (err) {
      setErrors([{ id: 'auth-password', message: err instanceof Error ? err.message : 'Could not sign in. Make sure the ApplyEase API is running.' }]);
      document.getElementById('auth-password')?.focus();
    } finally { setBusy(false); }
  };

  const errorFor = (id: string) => errors.find((x) => x.id === id)?.message;

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Link to="/" className="brand">
          <span className="brand-mark">A</span>
          <span>
            Apply<span>Ease</span>
          </span>
        </Link>
      </div>
      <main className="auth-card">
        <div className="auth-icon">
          <ShieldCheck />
        </div>
        <p className="eyebrow">{mode === 'signup' ? 'Create your candidate account' : 'Welcome back'}</p>
        <h1>{mode === 'signup' ? 'Start with one calm profile.' : 'Continue your application journey.'}</h1>
        <p className="page-sub">
          No CAPTCHA. Your profile is reusable, autosaved and under your control. This prototype keeps your account
          in the ApplyEase backend. Drafts also keep an offline browser cache.
        </p>

        <button type="button" className="btn secondary full" onClick={useDemo}>
          <Sparkles size={16} /> Use demo candidate
        </button>

        <form onSubmit={submit} className="auth-form" noValidate>
          {errors.length > 0 && (
            <div className="field-error" role="alert">
              <strong>Please fix {errors.length === 1 ? 'one thing' : `${errors.length} things`}:</strong>
              <ul>
                {errors.map((x) => (
                  <li key={x.id}>{x.message}</li>
                ))}
              </ul>
            </div>
          )}

          {mode === 'signup' && (
            <div className="form-field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                aria-invalid={!!errorFor('auth-name')}
              />
            </div>
          )}
          <div className="form-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!errorFor('auth-email')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="auth-password">Password</label>
            <div className="password-field">
              <input
                id="auth-password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                aria-invalid={!!errorFor('auth-password')}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <button className="btn primary full" type="submit" disabled={busy}>
            {busy ? 'Connecting…' : mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16} />
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
          <Link to={mode === 'signup' ? '/login' : '/signup'} state={loc.state}>
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </Link>
        </p>
        <Link to="/" className="back-link">
          Back to home
        </Link>
      </main>
    </div>
  );
}
