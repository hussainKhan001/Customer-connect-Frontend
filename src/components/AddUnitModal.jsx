/* Adds a second (or third) unit to an owner already on file — the
   direct path for a real repeat booking, instead of the only other way
   this happens today (re-running the bulk owner import with the same
   name+mobile, which merges the new row in). Same required-field shape
   as CompleteRecordModal (reject, don't guess — this is a fresh
   booking record, not a relaxed shell import), plus the Project/Unit
   number pair a brand-new unit actually needs that a completion never
   does (the unit already exists there). */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { PROJECTS } from '../constants/projects.js';
import { toast, mutationErrorToast } from '../utils/toast.js';

const PROJ_OPTS = PROJECTS.map((p) => ({ value: p.name, label: p.name }));

export default function AddUnitModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const [draft, setDraft] = useState({
    project: '', unit: '', saleable: '', rate: '', discount: 0, consideration: '', bookDate: '', paid: 0,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    const e = {};
    if (!draft.project) e.project = 'Choose a project.';
    if (!draft.unit.trim()) e.unit = 'Enter a unit number.';
    if (!(Number(draft.saleable) > 0)) e.saleable = 'Enter the saleable area.';
    if (!(Number(draft.rate) > 0)) e.rate = 'Enter the booking rate.';
    if (!(Number(draft.consideration) > 0)) e.consideration = 'Enter the total consideration.';
    if (!draft.bookDate) e.bookDate = 'Enter the booking date.';
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/units`, draft, 'POST');
      toast.success('Unit added', `${draft.unit} (${draft.project}) added to ${customer.name}'s record.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add a unit"
      subtitle={`${customer.name} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add unit'}</BtnPrimary>
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
            placeholder="Choose a project"
            className={errors.project ? '[&>button]:border-red-400' : ''}
          />
          {errors.project && <div className={formErrorCls}>{errors.project}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Unit number</label>
          <input value={draft.unit} onChange={set('unit')} className={formInputCls(!!errors.unit)} placeholder="e.g. A-26" />
          {errors.unit && <div className={formErrorCls}>{errors.unit}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Saleable sq.ft.</label>
          <input type="number" min="0" value={draft.saleable} onChange={set('saleable')} className={formInputCls(!!errors.saleable)} />
          {errors.saleable && <div className={formErrorCls}>{errors.saleable}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Booking rate per sq.ft.</label>
          <input type="number" min="0" value={draft.rate} onChange={set('rate')} className={formInputCls(!!errors.rate)} />
          {errors.rate && <div className={formErrorCls}>{errors.rate}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Discount</label>
          <input type="number" min="0" value={draft.discount} onChange={set('discount')} className={formInputCls(false)} />
        </div>
        <div>
          <label className={formLabelCls}>Total consideration</label>
          <input type="number" min="0" value={draft.consideration} onChange={set('consideration')} className={formInputCls(!!errors.consideration)} />
          {errors.consideration && <div className={formErrorCls}>{errors.consideration}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Booking date</label>
          <ThemedDate value={draft.bookDate} onChange={setVal('bookDate')} invalid={!!errors.bookDate} />
          {errors.bookDate && <div className={formErrorCls}>{errors.bookDate}</div>}
        </div>
        <div>
          <label className={formLabelCls}>Received to date</label>
          <input type="number" min="0" value={draft.paid} onChange={set('paid')} className={formInputCls(!!errors.paid)} />
          {errors.paid && <div className={formErrorCls}>{errors.paid}</div>}
        </div>
      </div>
    </Modal>
  );
}
