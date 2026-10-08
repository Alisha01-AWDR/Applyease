import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AnnouncerProvider } from './components/Announcer';
import AppShell from './components/AppShell';
import FocusManager from './components/FocusManager';
import { KeyboardShortcutsProvider } from './lib/KeyboardShortcutsContext';
import { AccessibilityProvider } from './lib/AccessibilityContext';
import { isSignedIn } from './lib/auth';
import { VoiceProvider } from './lib/VoiceContext';
import AccessibilityCenter from './pages/AccessibilityCenter';
import Application from './pages/Application';
import ApplicationKit from './pages/ApplicationKit';
import ApplicationDetail from './pages/ApplicationDetail';
import Applications from './pages/Applications';
import Auth from './pages/Auth';
import Confirm from './pages/Confirm';
import Dashboard from './pages/Dashboard';
import ImportJob from './pages/ImportJob';
import JobLens from './pages/JobLens';
import Jobs from './pages/Jobs';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import Receipt from './pages/Receipt';
import Review from './pages/Review';
import Settings from './pages/Settings';
import Welcome from './pages/Welcome';

/** Everything inside the app shell needs a signed-in (demo) account. */
function RequireAuth() {
  const location = useLocation();
  if (!isSignedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AnnouncerProvider>
        <KeyboardShortcutsProvider>
          <FocusManager />
          <VoiceProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/login" element={<Auth mode="login" />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/import" element={<ImportJob />} />
                <Route path="/jobs/:id" element={<JobLens />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/apply/:id/review" element={<Review />} />
                <Route path="/apply/:id/confirm" element={<Confirm />} />
                <Route path="/apply/:id/receipt" element={<Receipt />} />
                <Route path="/apply/:id/:step" element={<Application />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/applications/:id" element={<ApplicationDetail />} />
                <Route path="/application-kit/:id" element={<ApplicationKit />} />
                <Route path="/accessibility" element={<AccessibilityCenter />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </VoiceProvider>
        </KeyboardShortcutsProvider>
      </AnnouncerProvider>
    </AccessibilityProvider>
  );
}
