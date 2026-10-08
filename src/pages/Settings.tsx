import { Bell, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutAccount } from '../lib/auth';
import { apiDeleteAccount, apiExportAccount, apiGetDisclosure, apiSaveDisclosure } from '../lib/api';
import { clearAllDrafts } from '../lib/drafts';

export default function Settings() {
  const nav = useNavigate();
  const [notice, setNotice] = useState('');
  const [disclosureEnabled, setDisclosureEnabled] = useState(false);
  const [disclosureText, setDisclosureText] = useState('');
  const [shareDisclosure, setShareDisclosure] = useState(false);
  useEffect(() => { void apiGetDisclosure().then((x) => { setDisclosureEnabled(x.enabled); setShareDisclosure(!!x.sharedWithEmployer); setDisclosureText(typeof x.payload?.note === 'string' ? x.payload.note : ''); }).catch(() => undefined); }, []);

  const clearDrafts = () => {
    clearAllDrafts();
    setNotice('Saved application drafts cleared from this browser.');
  };

  const saveDisclosure = async () => { try { await apiSaveDisclosure(disclosureEnabled, { note: disclosureText }, shareDisclosure); setNotice('Optional disclosure preference saved separately.'); } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not save disclosure.'); } };

  const deleteAccount = async () => { if (!window.confirm('Delete your ApplyEase account and stored application data? This cannot be undone.')) return; try { await apiDeleteAccount(); await logoutAccount(); nav('/login', { replace: true }); } catch (e) { setNotice(e instanceof Error ? e.message : 'Account deletion failed.'); } };

  const handleSignOut = async () => {
    await logoutAccount();
    nav('/login', { replace: true });
  };

  const downloadData = async () => {
    try {
      const data = await apiExportAccount();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'ApplyEase-my-data.json'; a.click(); URL.revokeObjectURL(url);
      setNotice('Your account data export was downloaded.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not export your data.'); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Keep control of your data.</h1>
          <p className="page-sub">Settings for privacy, notifications and local application data.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="card settings-card">
          <ShieldCheck />
          <h2>Privacy</h2>
          <p>Accessibility preferences and optional disclosure remain separate.</p>
          <div className="privacy-banner">
            <LockKeyhole />
            <div>
              <strong>Local cache + server storage</strong>
              <p>Drafts are cached in this browser for offline recovery; signed-in profile and application data are also stored on the ApplyEase server.</p>
            </div>
          </div>
        </section>

        <section className="card settings-card">
          <LockKeyhole />
          <h2>Optional disclosure</h2>
          <p>Separate from accessibility preferences and off by default.</p>
          <label className="check-row"><input type="checkbox" checked={disclosureEnabled} onChange={(e) => setDisclosureEnabled(e.target.checked)} /> Enable disclosure</label>
          {disclosureEnabled && <><textarea className="big-input textarea" value={disclosureText} onChange={(e) => setDisclosureText(e.target.value)} placeholder="Optional information to share with supported applications." aria-label="Optional disclosure information" /><label className="check-row"><input type="checkbox" checked={shareDisclosure} onChange={(e) => setShareDisclosure(e.target.checked)} /> Allow supported applications to share this disclosure</label></>}
          <button className="btn secondary" onClick={saveDisclosure}>Save disclosure</button>
        </section>

        <section className="card settings-card">
          <Bell />
          <h2>Notifications</h2>
          <p>Notifications are not connected in this prototype. These options are placeholders.</p>
          <label className="check-row">
            <input type="checkbox" defaultChecked /> Application reminders
          </label>
          <label className="check-row">
            <input type="checkbox" /> Employer updates
          </label>
        </section>

        <section className="card settings-card danger-zone">
          <Trash2 />
          <h2>Data controls</h2>
          <p>Remove local prototype data without affecting any external employer system.</p>
          <button className="btn secondary" onClick={downloadData}>Download my data</button>
          <button className="btn secondary" onClick={clearDrafts}>
            Clear saved drafts
          </button>
          <button className="btn secondary" onClick={handleSignOut}>Sign out</button>
          <button className="btn secondary danger" onClick={deleteAccount}>Delete account and data</button>
          {notice && (
            <div className="field-success" role="status">
              {notice}
            </div>
          )}
        </section>
      </div>

      <Link to="/dashboard" className="btn primary">
        Back to dashboard
      </Link>
    </div>
  );
}
