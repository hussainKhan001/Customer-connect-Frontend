/* Edit one unit's agreement/registry/possession dates — these are
   exactly what the Document Vault checklist (docsFor() in derived.js)
   reads to decide a document is "on file", so this is what actually
   makes that checklist reflect reality. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { toDateInput } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function MilestonesModal({ customer, unitIndex, unit, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({
    agrDate: toDateInput(unit.agrDate),
    regDate: toDateInput(unit.regDate),
    possDate: toDateInput(unit.possDate),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units/${unitIndex}/milestones`, {
        ...draft, unit: unit.unit, project: unit.project,
      });
      toast.success('Milestones updated', `${unit.unit || 'This unit'} — dates saved.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit milestones"
      subtitle={`${unit.unit || 'no unit number yet'} · ${unit.project}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save dates'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Agreement date</label>
          <ThemedDate value={draft.agrDate} onChange={setVal('agrDate')} invalid={!!errors.agrDate} />
          {errors.agrDate && <div className={formErrorCls}>{errors.agrDate}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Registry date</label>
          <ThemedDate value={draft.regDate} onChange={setVal('regDate')} invalid={!!errors.regDate} />
          {errors.regDate && <div className={formErrorCls}>{errors.regDate}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Possession date</label>
          <ThemedDate value={draft.possDate} onChange={setVal('possDate')} invalid={!!errors.possDate} />
          {errors.possDate && <div className={formErrorCls}>{errors.possDate}</div>}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          These are also what the Document Vault checklist reads — filling registry/possession here marks
          the corresponding document "on file" there.
        </div>
      </div>
    </Modal>
  );
}
