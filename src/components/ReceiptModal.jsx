/* Logs one payment received against a unit — additive, never a raw
   "type the new paid-to-date total" field (see MLedger.jsx's own note:
   a hand-typed figure is how a reconciliation gap survives an audit).
   Defaults the amount to exactly what's still outstanding, since
   "record the balance being cleared" is the most common reason this
   gets opened — clearing that and typing a smaller figure logs a
   partial payment instead. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { todayInput, inrF } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function ReceiptModal({ customer, unitIndex, unit, outstanding, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({ amount: outstanding > 0 ? String(outstanding) : '', date: todayInput() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units/${unitIndex}/receipts`, {
        unit: unit.unit, project: unit.project, amount: draft.amount, date: draft.date,
      }, 'POST');
      toast.success('Receipt logged', `${inrF(Number(draft.amount) || 0)} added to ${unit.unit || 'this unit'}'s paid-to-date.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Log a receipt"
      subtitle={`${unit.unit || 'no unit number yet'} · ${unit.project}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log receipt'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Amount received</label>
          <input type="number" min="0" value={draft.amount} onChange={set('amount')} className={formInputCls(!!errors.amount)} />
          {errors.amount && <div className={formErrorCls}>{errors.amount}</div>}
          {outstanding > 0 && (
            <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
              Outstanding on this unit: {inrF(outstanding)} — defaulted in above; change it for a partial payment.
            </div>
          )}
        </div>
        <div>
          <label className={formLabelCls}>Date received</label>
          <ThemedDate value={draft.date} onChange={setVal('date')} invalid={!!errors.date} />
          {errors.date && <div className={formErrorCls}>{errors.date}</div>}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This adds to paid-to-date — it never replaces it. Logging the same payment twice by mistake?
          There's no delete here yet; reach Finance to correct the ledger directly.
        </div>
      </div>
    </Modal>
  );
}
