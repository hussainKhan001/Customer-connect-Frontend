/* Mark a unit exited — a resale that happened without going through
   the exit desk (see ExitRegister.jsx). Effectively irreversible in
   practice, so the modal itself carries the warning rather than a
   separate confirm step. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls, Banner } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { todayInput } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function ExitModal({ customer, unitIndex, unit, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({ exitDate: todayInput(), exitRate: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units/${unitIndex}/exit`, {
        ...draft, unit: unit.unit, project: unit.project,
      });
      toast.success('Unit marked exited', `${unit.unit || 'This unit'} now appears in the Exit Register.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Mark unit exited"
      subtitle={`${unit.unit || 'no unit number yet'} · ${unit.project}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Mark exited'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <Banner kind="block">
          This records a resale that happened without you — it moves this unit into the Exit Register and,
          if it's the owner's last live unit, sets their status to Exited.
        </Banner>
        <div>
          <label className={formLabelCls}>Exit date</label>
          <ThemedDate value={draft.exitDate} onChange={setVal('exitDate')} invalid={!!errors.exitDate} />
          {errors.exitDate && <div className={formErrorCls}>{errors.exitDate}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Sold at (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.exitRate} onChange={set('exitRate')} className={formInputCls(!!errors.exitRate)} />
          {errors.exitRate && <div className={formErrorCls}>{errors.exitRate}</div>}
        </div>
      </div>
    </Modal>
  );
}
