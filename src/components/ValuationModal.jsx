/* Edit one unit's signed monthly valuation note — this is what makes
   the gain figure defensible (DICT), and stale notes close the Contact
   Gate (GATE_ORDER's STALE_VALUATION rule), so saving a fresh
   `notedOn` reopens contact for that unit if it was the only blocker. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { todayInput } from '../utils/core.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function ValuationModal({ customer, unitIndex, unit, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({
    ask: unit.val.ask, resale: unit.val.resale, circle: unit.val.circle,
    notedOn: unit.val.notedOn ? String(unit.val.notedOn).slice(0, 10) : '',
    basis: unit.val.basis || '', by: unit.val.by || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  /* ask/resale/circle are exactly the numbers a fresh comparable
     resale or a government notification moves — notedOn exists so the
     stale-valuation gate can tell how old a rate is, so changing one
     without moving the date is how a rate quietly goes stale while
     looking freshly signed. Auto-bumps to today the moment any of the
     three actually differs from what's on file; a manual edit to the
     date afterward still wins, since it's whichever one was touched
     last. */
  const setRate = (k) => (e) => {
    const v = e.target.value;
    setDraft((d) => {
      const changed = v !== '' && Number(v) !== Number(unit.val[k] ?? '');
      return { ...d, [k]: v, ...(changed ? { notedOn: todayInput() } : {}) };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units/${unitIndex}/valuation`, {
        ...draft, unit: unit.unit, project: unit.project,
      });
      toast.success('Valuation note updated', `${unit.unit || 'This unit'} — signed for ${draft.notedOn}.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit valuation note"
      subtitle={`${unit.unit || 'no unit number yet'} · ${unit.project}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save note'}</BtnPrimary>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={formLabelCls}>Our ask (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.ask} onChange={setRate('ask')} className={formInputCls(!!errors.ask)} />
          {errors.ask && <div className={formErrorCls}>{errors.ask}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Recent resale (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.resale} onChange={setRate('resale')} className={formInputCls(!!errors.resale)} />
          {errors.resale && <div className={formErrorCls}>{errors.resale}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Circle rate (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.circle} onChange={setRate('circle')} className={formInputCls(!!errors.circle)} />
          {errors.circle && <div className={formErrorCls}>{errors.circle}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Note dated</label>
          <ThemedDate value={draft.notedOn} onChange={setVal('notedOn')} invalid={!!errors.notedOn} />
          {errors.notedOn && <div className={formErrorCls}>{errors.notedOn}</div>}
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
            Jumps to today automatically when ask/resale/circle changes — override it if the real notification is dated earlier.
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={formLabelCls}>Basis</label>
          <textarea value={draft.basis} onChange={set('basis')} rows={2} className={formInputCls(!!errors.basis)} placeholder="e.g. 6 registered resales, Towers A–C, Apr–Jun 2026" />
          {errors.basis && <div className={formErrorCls}>{errors.basis}</div>}
        </div>
        <div className="sm:col-span-2">
          <label className={formLabelCls}>Signed by</label>
          <input value={draft.by} onChange={set('by')} className={formInputCls(!!errors.by)} placeholder="e.g. Finance — Head of Accounts" />
          {errors.by && <div className={formErrorCls}>{errors.by}</div>}
        </div>
      </div>
    </Modal>
  );
}
