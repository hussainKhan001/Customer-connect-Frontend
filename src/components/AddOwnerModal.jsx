/* Add one new owner from Owner Base — same fields, same validated-live
   submit (addCustomer -> POST /api/customers) as Intake.jsx's own
   "Add an owner" card, just packaged as a drawer for use right where
   you're looking at the owner list instead of only from the Intake
   page. Both read the same FORM_FIELDS/SAMPLE_DRAFT (utils/intake.js,
   constants/intakeFields.js) so the two forms can't quietly drift.

   This only covers the booking itself (name, unit, consideration, ...)
   — the fields that actually make it a customer record. Everything
   else about the owner (DOB, anniversary, occupation, address,
   consent, co-applicant, ...) is EditProfileModal's job, not this
   form's; OwnerBase.jsx opens that automatically right after this one
   succeeds (onCreated), so adding an owner is a two-step "booking,
   then full profile" flow rather than one form trying to hold both. */
import { useState } from 'react';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import { BtnPrimary, btnGhost } from './Ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { validateDraft } from '../utils/intake.js';
import { FORM_FIELDS } from '../constants/intakeFields.js';

const EMPTY = Object.fromEntries(FORM_FIELDS.map(([k]) => [k, '']));

const lblCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';
const inputCls = (bad) =>
  `w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${bad ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`;
const errCls = 'text-xs text-red-500 mt-1';

export default function AddOwnerModal({ onClose, onCreated }) {
  const { base, addCustomer, masterData } = useApp();
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    const errs = validateDraft(draft, base);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      const c = await addCustomer(draft);
      onCreated(c);
      onClose();
    } catch (err) {
      setErrors(err.errors || { name: 'Could not save this owner. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      drawer
      title="Add an owner"
      subtitle="Step 1 of 2 — booking details. The full profile opens next."
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={submitting}>Cancel</button>
          <BtnPrimary onClick={submit} disabled={submitting}>{submitting ? 'Saving…' : 'Validate and add'}</BtnPrimary>
        </>
      }
    >
      {FORM_FIELDS.map(([k, l, t]) => (
        <div className="mb-3.5" key={k}>
          <label htmlFor={`add-owner-${k}`} className={lblCls}>{l}</label>
          {t === 'select' ? (
            <ThemedSelect
              value={draft[k] ?? ''}
              onChange={setVal(k)}
              options={masterData.projects.map((p) => ({ value: p.name, label: p.name }))}
              placeholder="Choose"
              className={errors[k] ? '[&>button]:border-red-400' : ''}
            />
          ) : (
            <input
              id={`add-owner-${k}`}
              type={t}
              value={draft[k] ?? ''}
              onChange={set(k)}
              className={inputCls(!!errors[k])}
            />
          )}
          {errors[k] && <div className={errCls}>{errors[k]}</div>}
        </div>
      ))}
    </Modal>
  );
}
