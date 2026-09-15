/* Log a new open complaint — any open complaint closes the Contact
   Gate immediately (see GATE_ORDER's OPEN_COMPLAINT rule). */
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { todayInput, displayName } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

const OWNERS = ['AGM Projects', 'AGM CRM', 'Site Engineering'];

const unitLabel = (u) => `${u.unit || '—'} · ${u.project || 'no project'}`;

/* defaults to this app's fixed TODAY (see core.js), not the real
   calendar date — the backend validates "not in the future" against
   that same fixed date, so a real-clock default would fail instantly */
export default function ComplaintModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const units = customer.units || [];
  const [draft, setDraft] = useState({
    t: '', raised: todayInput(), owner: OWNERS[0], ncr: '',
    /* a complaint is against one specific unit, not the owner in the
       abstract — required whenever there's a real choice; auto-picked
       when this owner holds just the one */
    unit: units.length === 1 ? units[0].unit : '',
    project: units.length === 1 ? units[0].project : '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  /* option value is the unit's index into `units`, not a joined
     project+unit string — both can contain spaces ("Eden Garden",
     "16-E pant house"), so joining and splitting them back is
     ambiguous; the index sidesteps that entirely */
  const unitOptions = units.map((u, i) => ({ value: String(i), label: unitLabel(u) }));
  const setUnit = (i) => {
    const u = units[Number(i)];
    setDraft((d) => ({ ...d, unit: u.unit, project: u.project }));
  };
  const selectedUnitIndex = units.findIndex((u) => u.unit === draft.unit && u.project === draft.project);

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/complaints`, draft, 'POST');
      toast.success('Complaint logged', `Now open on ${customer.name}'s record — the contact gate is closed.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      icon={AlertTriangle}
      title="Log complaint"
      subtitle={`${displayName(customer)} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log complaint'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Unit</label>
          {units.length <= 1 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              {units.length ? unitLabel(units[0]) : 'No units on file for this owner.'}
            </div>
          ) : (
            <ThemedSelect
              value={selectedUnitIndex >= 0 ? String(selectedUnitIndex) : ''}
              onChange={setUnit}
              options={unitOptions}
              placeholder="Which unit is this against?"
            />
          )}
          {errors.unit && <div className={formErrorCls}>{errors.unit}</div>}
        </div>
        <div>
          <label className={formLabelCls}>What happened</label>
          <textarea value={draft.t} onChange={set('t')} rows={2} className={formInputCls(!!errors.t)} placeholder="e.g. Seepage — master bathroom wall" />
          {errors.t && <div className={formErrorCls}>{errors.t}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Raised on</label>
          <ThemedDate value={draft.raised} onChange={setVal('raised')} invalid={!!errors.raised} />
          {errors.raised && <div className={formErrorCls}>{errors.raised}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Owner of the fix</label>
          <input value={draft.owner} onChange={set('owner')} className={formInputCls(!!errors.owner)} placeholder="e.g. AGM CRM" />
          {errors.owner && <div className={formErrorCls}>{errors.owner}</div>}
        </div>
        <div>
          <label className={formLabelCls}>NCR reference</label>
          <input value={draft.ncr} onChange={set('ncr')} className={formInputCls(!!errors.ncr)} placeholder="e.g. NCR-2026-0142" />
          {errors.ncr && <div className={formErrorCls}>{errors.ncr}</div>}
        </div>
        <div className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
          This closes the contact gate immediately until the complaint is closed.
        </div>
      </div>
    </Modal>
  );
}
