/* Log the outcome of a call made off the Trigger Calendar — the one
   piece missing before the score weights can ever be re-fit against
   real outcomes (see MActivity.jsx's own footer note). Score-only,
   never touches the Contact Gate. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { todayInput, displayName } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

const OUTCOMES = ['Interested — follow up', 'Not interested', 'No answer', 'Call back later', 'Converted — re-invested'];
const OUTCOME_OPTIONS = [...OUTCOMES.map((o) => ({ value: o, label: o })), { value: 'Other', label: 'Other' }];

export default function CallModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({ outcome: OUTCOMES[0], outcomeOther: false, note: '', date: todayInput() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/calls`, draft, 'POST');
      toast.success('Call logged', `${customer.name} — ${draft.outcome}.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Log a call"
      subtitle={`${displayName(customer)} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log call'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Outcome</label>
          <ThemedSelect
            value={draft.outcomeOther ? 'Other' : draft.outcome}
            onChange={(v) => setDraft((d) => (v === 'Other'
              ? { ...d, outcomeOther: true, outcome: d.outcomeOther ? d.outcome : '' }
              : { ...d, outcomeOther: false, outcome: v }))}
            options={OUTCOME_OPTIONS}
          />
          {draft.outcomeOther && (
            <input
              value={draft.outcome}
              onChange={set('outcome')}
              className={`${formInputCls(!!errors.outcome)} mt-1.5`}
              placeholder="Describe the outcome"
              autoFocus
            />
          )}
          {errors.outcome && <div className={formErrorCls}>{errors.outcome}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Date</label>
          <ThemedDate value={draft.date} onChange={setVal('date')} invalid={!!errors.date} />
          {errors.date && <div className={formErrorCls}>{errors.date}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Note (optional)</label>
          <textarea value={draft.note} onChange={set('note')} rows={3} className={formInputCls(false)} placeholder="What was said, what's next" />
        </div>
      </div>
    </Modal>
  );
}
