/* The "Company profile" section of the Settings hub — the letterhead
   fields used on the Portfolio Statement, plus the one destructive,
   whole-database action (delete all customer data). Self-contained
   (reads/writes useApp() directly) since nothing else in the Settings
   hub needs this state. */
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { AlertTriangle } from 'lucide-react';
import { Card, BtnPrimary, formLabelCls, formInputCls, formErrorCls } from '../Ui.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { toast, CONFIRM_COLOR } from '../../utils/toast.js';

export default function CompanyProfileSection() {
  const { raw, deleteAllCustomers, settings, updateSettings } = useApp();
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [settingsErrors, setSettingsErrors] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  /* the draft only ever seeds from the fetched settings once they
     arrive (and again if they're edited elsewhere) — typing shouldn't
     get stomped by AppContext re-rendering for an unrelated reason. */
  useEffect(() => { if (settings) setSettingsDraft((d) => d ?? settings); }, [settings]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings(settingsDraft);
      setSettingsErrors({});
      toast.success('Settings saved', 'The new details apply everywhere they\'re used, like the Portfolio Statement letterhead.');
    } catch (err) {
      setSettingsErrors(err.errors || {});
      toast.error('Could not save', err.message || 'Fix the highlighted field and try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  /* type-to-confirm, same reasoning as GitHub's own repo-delete flow —
     this wipes every customer record at once and cannot be undone.
     The server independently requires the exact same phrase in the
     request body, so this dialog isn't the only thing standing
     between a stray click and the whole owner base disappearing. */
  const deleteAllData = async () => {
    const total = raw.length;
    const { value: typed } = await Swal.fire({
      icon: 'error',
      title: `Delete all ${total} customer record${total === 1 ? '' : 's'}?`,
      html: `This permanently removes <b>every owner</b> — complete and incomplete — and cannot be undone.<br/>Type <code>DELETE ALL</code> to confirm.`,
      input: 'text',
      inputPlaceholder: 'DELETE ALL',
      showCancelButton: true,
      confirmButtonText: 'Delete everything',
      confirmButtonColor: CONFIRM_COLOR.destructive,
      inputValidator: (v) => (v !== 'DELETE ALL' ? 'Type DELETE ALL exactly to confirm' : undefined),
    });
    if (typed !== 'DELETE ALL') return;
    setDeletingAll(true);
    try {
      const body = await deleteAllCustomers();
      toast.success('All customer data deleted', `${body.deletedCount} record(s) removed.`);
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Company / letterhead settings" hint="Used on the Portfolio Statement">
        {!settingsDraft ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={formLabelCls}>Company name</label>
              <input
                value={settingsDraft.companyName || ''}
                onChange={(e) => setSettingsDraft((d) => ({ ...d, companyName: e.target.value }))}
                className={formInputCls(!!settingsErrors.companyName)}
              />
              {settingsErrors.companyName && <div className={formErrorCls}>{settingsErrors.companyName}</div>}
            </div>
            <div className="sm:col-span-2">
              <label className={formLabelCls}>Group / subsidiary line</label>
              <input
                value={settingsDraft.groupLine || ''}
                onChange={(e) => setSettingsDraft((d) => ({ ...d, groupLine: e.target.value }))}
                className={formInputCls(!!settingsErrors.groupLine)}
                placeholder="e.g. A Neoteric Group Company · Navayan Realty · Heaven Heights"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={formLabelCls}>Registered office address</label>
              <input
                value={settingsDraft.regdOffice || ''}
                onChange={(e) => setSettingsDraft((d) => ({ ...d, regdOffice: e.target.value }))}
                className={formInputCls(!!settingsErrors.regdOffice)}
              />
            </div>
            <div>
              <label className={formLabelCls}>CIN</label>
              <input
                value={settingsDraft.cin || ''}
                onChange={(e) => setSettingsDraft((d) => ({ ...d, cin: e.target.value }))}
                className={formInputCls(!!settingsErrors.cin)}
              />
            </div>
            <div>
              <label className={formLabelCls}>GSTIN</label>
              <input
                value={settingsDraft.gstin || ''}
                onChange={(e) => setSettingsDraft((d) => ({ ...d, gstin: e.target.value }))}
                className={formInputCls(!!settingsErrors.gstin)}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <BtnPrimary onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? 'Saving…' : 'Save settings'}
              </BtnPrimary>
            </div>
          </div>
        )}
      </Card>

      <Card title="Danger zone" hint="Irreversible">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-2.5 max-w-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-gray-600 dark:text-gray-400">
              Permanently deletes every customer record — complete and incomplete — from the database.
              This cannot be undone. Use only to clear test/import data before a fresh upload.
            </p>
          </div>
          <button
            className="shrink-0 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={deleteAllData}
            disabled={deletingAll || !raw.length}
          >
            {deletingAll ? 'Deleting…' : `Delete all customer data${raw.length ? ` (${raw.length})` : ''}`}
          </button>
        </div>
      </Card>
    </div>
  );
}
