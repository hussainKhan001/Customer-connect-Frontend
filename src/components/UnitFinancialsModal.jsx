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
import { toast, mutationErrorToast } from '../utils/toast.js';

const PROJ_OPTS = PROJECTS.map((p) => ({ value: p.name, label: p.name }));

const PROPERTY_TYPES = ['Villa', 'Plot', 'Flat', 'Other'];
const PROPERTY_TYPE_OPTS = [{ value: '', label: 'Select' }, ...PROPERTY_TYPES.map((v) => ({ value: v, label: v }))];
const FLAT_SUBTYPES = ['1RK', '1BHK', '2BHK', '3BHK', '4BHK', 'Other'];
const FLAT_SUBTYPE_OPTS = [{ value: '', label: 'Select' }, ...FLAT_SUBTYPES.map((v) => ({ value: v, label: v }))];

/* `unit.type` is one plain string in the database (see UnitSchema) —
   the nested Villa/Plot/Flat(+BHK)/Other picker is purely a data-entry
   convenience over that single field, so a value like "Flat - 2BHK"
   round-trips back into the two dropdowns on re-open, and anything
   that isn't one of the known shapes (the "—" default included) just
   lands in "Other" with its raw text preserved rather than lost. */
function parseType(raw) {
  const v = String(raw || '').trim();
  if (!v || v === '—') return { top: '', flatSub: '', customTop: '', customFlat: '' };
  if (v === 'Villa' || v === 'Plot') return { top: v, flatSub: '', customTop: '', customFlat: '' };
  if (v === 'Flat') return { top: 'Flat', flatSub: '', customTop: '', customFlat: '' };
  const flatMatch = /^Flat - (.+)$/.exec(v);
  if (flatMatch) {
    const sub = flatMatch[1];
    if (FLAT_SUBTYPES.includes(sub) && sub !== 'Other') return { top: 'Flat', flatSub: sub, customTop: '', customFlat: '' };
    return { top: 'Flat', flatSub: 'Other', customTop: '', customFlat: sub };
  }
  return { top: 'Other', flatSub: '', customTop: v, customFlat: '' };
}
function buildType({ top, flatSub, customTop, customFlat }) {
  if (top === 'Flat') {
    if (flatSub === 'Other') return customFlat.trim() ? `Flat - ${customFlat.trim()}` : 'Flat';
    return flatSub ? `Flat - ${flatSub}` : 'Flat';
  }
  if (top === 'Other') return customTop.trim();
  return top;
}

export default function UnitFinancialsModal({ customer, unitIndex, unit, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({
    project: unit.project || '', unit: unit.unit || '', saleable: unit.saleable ?? '', carpet: unit.carpet ?? '',
    loading: unit.loading ?? 0, rate: unit.rate ?? '', ...parseType(unit.type),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  /* picking a new top-level type drops whatever the flat sub-type/
     custom-text fields were holding for the previous choice — Villa
     shouldn't inherit "2BHK" left over from when Flat was selected. */
  const setTop = (v) => setDraft((d) => ({ ...d, top: v, flatSub: '', customTop: '', customFlat: '' }));
  const setFlatSub = (v) => setDraft((d) => ({ ...d, flatSub: v, customFlat: '' }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units/${unitIndex}/financials`, {
        unit: unit.unit, project: unit.project, newUnit: draft.unit, newProject: draft.project,
        saleable: draft.saleable, carpet: draft.carpet, loading: draft.loading, rate: draft.rate,
        propertyType: buildType(draft),
      });
      toast.success('Unit updated', `${draft.unit} — area and rate saved.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit unit"
      subtitle={`${unit.unit || 'no unit number yet'} · ${unit.project}`}
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
          <label className={formLabelCls}>Property type</label>
          <ThemedSelect value={draft.top} onChange={setTop} options={PROPERTY_TYPE_OPTS} placeholder="Choose a type" />
        </div>
        {draft.top === 'Other' && (
          <div>
            <label className={formLabelCls}>Specify type</label>
            <input value={draft.customTop} onChange={set('customTop')} className={formInputCls(false)} placeholder="e.g. Duplex, Studio" />
          </div>
        )}
        {draft.top === 'Flat' && (
          <div>
            <label className={formLabelCls}>Flat configuration</label>
            <ThemedSelect value={draft.flatSub} onChange={setFlatSub} options={FLAT_SUBTYPE_OPTS} placeholder="Choose a configuration" />
          </div>
        )}
        {draft.top === 'Flat' && draft.flatSub === 'Other' && (
          <div>
            <label className={formLabelCls}>Specify configuration</label>
            <input value={draft.customFlat} onChange={set('customFlat')} className={formInputCls(false)} placeholder="e.g. 5BHK, Duplex" />
          </div>
        )}

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
