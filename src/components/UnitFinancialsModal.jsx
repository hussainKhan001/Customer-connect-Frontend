/* Corrects a unit's own number, area and rate — Intake (or a raw-list
   import) is the normal way these get captured, but this is the fix
   path for whatever it got wrong, on a unit that's already part of a
   complete, scored owner record (CompleteRecordModal covers the same
   fields for a still-incomplete shell record). */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { PROJECTS } from '../constants/projects.js';
import { toast } from '../utils/toast.js';

const PROJ_OPTS = PROJECTS.map((p) => ({ value: p.name, label: p.name }));

export default function UnitFinancialsModal({ customer, unitIndex, unit, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({
    project: unit.project || '', unit: unit.unit || '', saleable: unit.saleable ?? '', carpet: unit.carpet ?? '',
    loading: unit.loading ?? 0, rate: unit.rate ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units/${unitIndex}/financials`, {
        unit: unit.unit, project: unit.project, newUnit: draft.unit, newProject: draft.project,
        saleable: draft.saleable, carpet: draft.carpet, loading: draft.loading, rate: draft.rate,
      });
      toast.success('Unit updated', `${draft.unit} — area and rate saved.`);
      onClose();
    } catch (err) {
      const fieldErrors = err.errors || {};
      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      setErrors(fieldErrors);
      toast.error(
        hasFieldErrors ? 'Could not save' : 'Could not reach the server',
        hasFieldErrors ? 'Fix the highlighted field and try again.' : 'Confirm the backend is running and reachable, then try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit unit"
      subtitle={`${unit.unit} · ${unit.project}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save unit'}</BtnPrimary>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={formLabelCls}>Project</label>
          <ThemedSelect
            value={draft.project}
            onChange={setVal('project')}
            options={PROJ_OPTS}
            className={errors.newProject ? '[&>button]:border-red-400' : ''}
          />
          {errors.newProject && <div className={formErrorCls}>{errors.newProject}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Unit number</label>
          <input value={draft.unit} onChange={set('unit')} className={formInputCls(!!errors.newUnit)} placeholder="e.g. A-188" />
          {errors.newUnit && <div className={formErrorCls}>{errors.newUnit}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Saleable sq.ft.</label>
          <input type="number" min="0" value={draft.saleable} onChange={set('saleable')} className={formInputCls(!!errors.saleable)} />
          {errors.saleable && <div className={formErrorCls}>{errors.saleable}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Carpet sq.ft.</label>
          <input type="number" min="0" value={draft.carpet} onChange={set('carpet')} className={formInputCls(!!errors.carpet)} />
          {errors.carpet && <div className={formErrorCls}>{errors.carpet}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Loading %</label>
          <input type="number" min="0" value={draft.loading} onChange={set('loading')} className={formInputCls(!!errors.loading)} />
          {errors.loading && <div className={formErrorCls}>{errors.loading}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Rate paid (₹/sq.ft.)</label>
          <input type="number" min="0" value={draft.rate} onChange={set('rate')} className={formInputCls(!!errors.rate)} />
          {errors.rate && <div className={formErrorCls}>{errors.rate}</div>}
        </div>
      </div>
    </Modal>
  );
}
