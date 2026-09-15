/* Log an event attended — feeds the Engagement score pillar only. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { todayInput, displayName } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function EventModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({ n: '', d: todayInput() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/events`, draft, 'POST');
      toast.success('Event logged', `${draft.n} added to ${customer.name}'s record.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Log event"
      subtitle={`${displayName(customer)} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log event'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Event name</label>
          <input value={draft.n} onChange={set('n')} className={formInputCls(!!errors.n)} placeholder="e.g. Owners meet" />
          {errors.n && <div className={formErrorCls}>{errors.n}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Date</label>
          <ThemedDate value={draft.d} onChange={setVal('d')} invalid={!!errors.d} />
          {errors.d && <div className={formErrorCls}>{errors.d}</div>}
        </div>
      </div>
    </Modal>
  );
}
