/* Add/edit one row of the Projects master list — every field a
   valuation note or a new booking's rate lookup actually reads (see
   backend/src/lib/core.js's PROJECTS shape). `project` is `{}` for a
   brand-new row, or the existing row's data when editing one. */
import { useState } from 'react';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from '../Ui.jsx';
import Modal from '../Modal.jsx';
import ThemedDate from '../theme/ThemedDate.jsx';
import { todayInput } from '../../utils/core.js';

export default function ProjectEditorModal({ project, onSave, onClose, saving }) {
  const isNew = !project.name;
  const [draft, setDraft] = useState({
    code: project.code || '', name: project.name || '', entity: project.entity || '',
    launch: project.launch ?? '', lr: project.lr ?? '', ask: project.ask ?? '',
    resale: project.resale ?? '', circle: project.circle ?? '',
    noted: project.noted || '', by: project.by || '', basis: project.basis || '',
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  /* ask/resale/circle are exactly the numbers a real government
     notification or a fresh comparable resale moves — "Noted on"
     exists so the rest of the app (the stale-valuation gate, the
     Valuation Register) can tell how old a rate is, so changing one
     without also moving the date is how a rate quietly goes stale
     while looking freshly signed. Auto-bumps to today the moment any
     of the three actually differs from what's on file; a manual edit
     to the date afterward (a rate confirmed last week, say) still
     wins, since it's whichever one was touched last. */
  const setRate = (k) => (e) => {
    const v = e.target.value;
    setDraft((d) => {
      const changed = v !== '' && Number(v) !== Number(project[k] ?? '');
      return { ...d, [k]: v, ...(changed ? { noted: todayInput() } : {}) };
    });
  };

  const save = () => {
    const e = {};
    if (!draft.name.trim()) e.name = 'Enter a project name.';
    if (!draft.entity.trim()) e.entity = 'Enter the owning entity.';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({
      code: draft.code.trim(), name: draft.name.trim(), entity: draft.entity.trim(),
      launch: Number(draft.launch) || null, lr: Number(draft.lr) || null,
      ask: Number(draft.ask) || null, resale: Number(draft.resale) || null, circle: Number(draft.circle) || null,
      noted: draft.noted.trim() || null, by: draft.by.trim() || null, basis: draft.basis.trim() || null,
    }, project.name || null);
  };

  return (
    <Modal
      title={isNew ? 'Add project' : 'Edit project'}
      subtitle={isNew ? undefined : project.name}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save project'}</BtnPrimary>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={formLabelCls}>Project name</label>
          <input value={draft.name} onChange={set('name')} className={formInputCls(!!errors.name)} placeholder="e.g. Garden City" />
          {errors.name && <div className={formErrorCls}>{errors.name}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Code</label>
          <input value={draft.code} onChange={set('code')} className={formInputCls(false)} placeholder="e.g. GC — used for row keys" />
        </div>
        <div>
          <label className={formLabelCls}>Entity</label>
          <input value={draft.entity} onChange={set('entity')} className={formInputCls(!!errors.entity)} placeholder="e.g. Neoteric Properties" />
          {errors.entity && <div className={formErrorCls}>{errors.entity}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Launch year</label>
          <input type="number" value={draft.launch} onChange={set('launch')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Launch rate (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.lr} onChange={set('lr')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Ask rate today (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.ask} onChange={setRate('ask')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Resale rate (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.resale} onChange={setRate('resale')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Circle rate (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.circle} onChange={setRate('circle')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Valuation noted on</label>
          <ThemedDate value={draft.noted} onChange={setVal('noted')} />
          <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
            Jumps to today automatically when ask/resale/circle changes — override it if the real notification is dated earlier.
          </div>
        </div>
        <div>
          <label className={formLabelCls}>Signed by</label>
          <input value={draft.by} onChange={set('by')} className={formInputCls(false)} placeholder="e.g. Finance — Head of Accounts" />
        </div>
        <div className="sm:col-span-2">
          <label className={formLabelCls}>Basis</label>
          <input value={draft.basis} onChange={set('basis')} className={formInputCls(false)} placeholder="e.g. 6 registered resales, Apr–Jun 2026" />
        </div>
      </div>
    </Modal>
  );
}
