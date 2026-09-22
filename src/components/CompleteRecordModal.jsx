/* Fills in the PAN + unit financials a "shell" record (raw allotment
   list import — see validateIncomplete.js) was missing. Every field
   here is mandatory — this is the moment the record becomes a real,
   scoreable customer, so it uses the same reject-don't-guess rules as
   the normal Add Owner form, not the relaxed shell-import ones. */
import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls, formInputCls, formErrorCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import { toast, mutationErrorToast } from '../utils/toast.js';

export default function CompleteRecordModal({ customer, onClose }) {
  const { mutateCustomer } = useApp();
  const u = customer.units[0];
  const [draft, setDraft] = useState({
    pan: customer.pan || '',
    saleable: u.saleable ?? '', rate: u.rate ?? '', discount: u.discount ?? 0,
    consideration: u.consideration ?? '', bookDate: u.bookDate ? String(u.bookDate).slice(0, 10) : '',
    paid: u.paid ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${customer.id}/complete`, draft);
      toast.success('Record completed', `${customer.name} is now a scored, gated owner.`);
      onClose();
    } catch (err) {
      mutationErrorToast(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      drawer
      title="Complete this record"
      subtitle={`${customer.name} · ${u.unit}, ${u.project}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Complete record'}</BtnPrimary>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={formLabelCls}>PAN</label>
          <input value={draft.pan} onChange={set('pan')} className={formInputCls(!!errors.pan)} placeholder="ABCPD1234E" />
          {errors.pan && <div className={formErrorCls}>{errors.pan}</div>}
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
