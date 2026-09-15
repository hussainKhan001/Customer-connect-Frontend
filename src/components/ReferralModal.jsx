/* Add a referral given by this owner — feeds the Engagement score
   pillar only, never the Contact Gate. Status is restricted to the
   exact 3 literal strings other code already matches on
   (ReferralTree.jsx's `.startsWith('Open'|'Booked')`). */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { todayInput, displayName } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

const STATUS_OPTIONS = [
  { value: 'Booked', label: 'Booked' },
  { value: 'Open — no follow-up logged', label: 'Open — no follow-up logged' },
  { value: 'Lost — budget', label: 'Lost — budget' },
];

export default function ReferralModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({ n: '', date: todayInput(), status: 'Open — no follow-up logged' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/referrals`, draft, 'POST');
      toast.success('Referral added', `${draft.n} logged against ${customer.name}.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add referral"
      subtitle={`${displayName(customer)} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add referral'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Referred person's name</label>
          <input value={draft.n} onChange={set('n')} className={formInputCls(!!errors.n)} />
          {errors.n && <div className={formErrorCls}>{errors.n}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Date</label>
          <ThemedDate value={draft.date} onChange={setVal('date')} invalid={!!errors.date} />
          {errors.date && <div className={formErrorCls}>{errors.date}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Status</label>
          <ThemedSelect value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} options={STATUS_OPTIONS} />
          {errors.status && <div className={formErrorCls}>{errors.status}</div>}
        </div>
      </div>
    </Modal>
  );
}
