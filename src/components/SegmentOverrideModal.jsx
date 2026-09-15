/* Forces the segment chip to a specific A/B/C/D instead of whatever
   segOf() computes from the score (see utils/derived.js) — a
   documented exception, not a way around the scoring rules: every
   override needs a reason, and it has no effect at all while the
   Contact Gate is closed (segOf() already forces 'C' there regardless
   of any override). */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { SEGLBL, SEGMETA } from '../constants/segments.js';
import { toast, mutationErrorToast } from '../utils/toast.js';
import { displayName, fmtD } from '../utils/core.js';

const SEG_OPTIONS = ['A', 'B', 'C', 'D'].map((v) => ({ value: v, label: SEGLBL[v] }));

export default function SegmentOverrideModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const existing = customer.segmentOverride?.seg || '';
  const [seg, setSeg] = useState(existing);
  const [reason, setReason] = useState(customer.segmentOverride?.reason || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/segment-override`, { seg, reason });
      toast.success(
        seg ? 'Segment overridden' : 'Override cleared',
        seg ? `${customer.name} now shows as ${SEGLBL[seg]} regardless of score.` : `${customer.name} is back to the computed segment.`
      );
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Override segment"
      subtitle={`${displayName(customer)} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</BtnPrimary>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3">
          <b>Computed from score: {SEGLBL[customer._segRaw]}.</b> {SEGMETA[customer._segRaw]?.w}
        </div>

        <div>
          <label className={formLabelCls}>Segment</label>
          <ThemedSelect
            value={seg}
            onChange={setSeg}
            options={[{ value: '', label: `Use computed value (${SEGLBL[customer._segRaw]})` }, ...SEG_OPTIONS]}
          />
          {errors.seg && <div className={formErrorCls}>{errors.seg}</div>}
        </div>

        {seg && (
          <div>
            <label className={formLabelCls}>Why override the score</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={formInputCls(!!errors.reason)}
              placeholder="e.g. Family confirmed a second purchase is imminent despite the current capacity score."
            />
            {errors.reason && <div className={formErrorCls}>{errors.reason}</div>}
          </div>
        )}

        {!customer._g.open && (
          <div className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            The contact gate is closed for this owner, so this has no visible effect until it reopens —
            the chip stays {SEGLBL.C} either way.
          </div>
        )}

        {existing && (
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
            Currently overridden by {customer.segmentOverride.by || 'someone'}
            {customer.segmentOverride.date ? ` on ${fmtD(customer.segmentOverride.date)}` : ''}.
          </div>
        )}
      </div>
    </Modal>
  );
}
