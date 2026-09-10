/* Owner status change — the single most gate-critical write in the
   app (see GATE_ORDER in derived.js): EXITED/TRANSFER_IN_PROGRESS/
   DECEASED all close the Contact Gate immediately on save. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { STATUSLBL } from '../constants/segments.js';
import { toast } from '../utils/toast.js';
import { displayName } from '../utils/core.js';

const STATUS_OPTIONS = Object.entries(STATUSLBL).map(([value, label]) => ({ value, label }));

export default function StatusModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const [status, setStatus] = useState(customer.status);
  const [statusNote, setStatusNote] = useState(customer.statusNote || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/status`, { status, statusNote });
      toast.success('Status updated', `${customer.name} is now ${STATUSLBL[status]}.`);
      onClose();
    } catch (err) {
      const fieldErrors = err.errors || {};
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      setErrors(fieldErrors);
      toast.error(
        hasFieldErrors ? 'Could not save' : 'Could not reach the server',
        hasFieldErrors ? 'Fix the highlighted field and try again.' : 'Confirm the backend is running and reachable, then try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Change owner status"
      subtitle={`${displayName(customer)} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save status'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Status</label>
          <ThemedSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          {errors.status && <div className={formErrorCls}>{errors.status}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Status note {status !== 'ACTIVE' && '(required)'}</label>
          <textarea
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            rows={3}
            className={formInputCls(!!errors.statusNote)}
            placeholder="Why is this changing — registry search finding, family communication, etc."
          />
          {errors.statusNote && <div className={formErrorCls}>{errors.statusNote}</div>}
        </div>
        {status !== 'ACTIVE' && (
          <div className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            This immediately closes the contact gate — no role can override it.
          </div>
        )}
      </div>
    </Modal>
  );
}
