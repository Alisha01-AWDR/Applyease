import { Accessibility, BriefcaseBusiness, Command, Home, Menu, Search, Settings, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { modeLabels, useAccessibility } from '../lib/AccessibilityContext';
import { getAuth, initials } from '../lib/auth';
import AccessibilityPanel from './AccessibilityPanel';
import Logo from './Logo';
import VoiceCommandBar from './VoiceCommandBar';
import SkipLinks from './SkipLinks';

const nav = [
  ['/dashboard', 'Home', Home],
  ['/jobs', 'Find jobs', Search],
  ['/applications', 'Applications', BriefcaseBusiness],
  ['/profile', 'Profile', UserRound],
] as const;

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const { mode } = useAccessibility();
  const auth = getAuth();

  return (
    <>
      <SkipLinks />
      <div className="app-shell">
        <aside className={'sidebar ' + (open ? 'mobile-open' : '')}>
          <div className="side-top">
            <Logo />
            <button className="icon-btn mobile-only" onClick={() => setOpen(false)} aria-label="Close navigation">
              <X />
            </button>
          </div>
          <nav aria-label="Main navigation">
            <p className="nav-label">Workspace</p>
            {nav.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="side-bottom">
            <NavLink to="/accessibility" className="nav-item" onClick={() => setOpen(false)}>
              <Accessibility size={18} />
              <span>Accessibility</span>
            </NavLink>
            <NavLink to="/settings" className="nav-item" onClick={() => setOpen(false)}>
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <button className="icon-btn mobile-only" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu />
            </button>
            <div className="crumb">
              <Command size={15} /> <span>Candidate workspace</span>
            </div>
            <div className="top-actions">
              <VoiceCommandBar />
              <button
                className="mode-pill"
                onClick={() => setPanel(true)}
                aria-haspopup="dialog"
                aria-label={`${modeLabels[mode]}. Open accessibility controls`}
              >
                <span className="live-dot" /> {modeLabels[mode]}
              </button>
              <Link className="avatar" to="/profile" aria-label="Open profile">
                {initials(auth?.name)}
              </Link>
            </div>
          </header>
          <div id="main" tabIndex={-1} className="content">
            <Outlet />
          </div>
        </main>
      </div>
      <AccessibilityPanel open={panel} onClose={() => setPanel(false)} />
    </>
  );
}
