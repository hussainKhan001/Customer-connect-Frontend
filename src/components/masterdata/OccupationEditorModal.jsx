/* Add/edit one row of the Occupations master list — `b` (0-100) is
   the capacity-score contribution the Propensity score reads (see
   score() in utils/derived.js), `band` is just the display text shown
   alongside it. `occupation` is `{}` for a new row, or the existing
   row when editing one. */
import { useState } from 'react';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from '../Ui.jsx';
import Modal from '../Modal.jsx';

export default function OccupationEditorModal({ occupation, onSave, onClose, saving }) {
  const isNew = !occupation.k;
  const [draft, setDraft] = useState({
    k: occupation.k || '', b: occupation.b ?? 50, band: occupation.band || '',
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = () => {
    const e = {};
    if (!draft.k.trim()) e.k = 'Enter a label.';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({
      k: draft.k.trim(),
      b: Math.max(0, Math.min(100, Number(draft.b) || 0)),
      band: draft.band.trim() || null,
    }, occupation.k || null);
  };

  return (
    <Modal
      title={isNew ? 'Add occupation' : 'Edit occupation'}
      subtitle={isNew ? undefined : occupation.k}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save occupation'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={formLabelCls}>Label</label>
          <input value={draft.k} onChange={set('k')} className={formInputCls(!!errors.k)} placeholder="e.g. Doctor" />
          {errors.k && <div className={formErrorCls}>{errors.k}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Capacity score (0–100)</label>
          <input type="number" min="0" max="100" value={draft.b} onChange={set('b')} className={formInputCls(false)} />
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
            Feeds the owner's Propensity → Capacity component whenever this occupation is picked.
          </div>
        </div>
        <div>
          <label className={formLabelCls}>Income band (display only)</label>
          <input value={draft.band} onChange={set('band')} className={formInputCls(false)} placeholder="e.g. ₹15 L – ₹50 L" />
        </div>
      </div>
    </Modal>
  );
}
