/* "Complete profile" — the one write path (besides adding an owner and
   sending a statement) for the fields the Data Confidence checklist
   flags as missing: DOB, anniversary, address, occupation, consent,
   plus the adjacent identity fields shown alongside them in the
   Customer Master rail (co-applicant, email, city, community). */
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext.jsx';
import { BtnPrimary, btnGhost, formLabelCls as lblCls, formInputCls as inputCls, formErrorCls as errCls } from './Ui.jsx';
import Modal from './Modal.jsx';
import ThemedSelect from './theme/ThemedSelect.jsx';
import ThemedDate from './theme/ThemedDate.jsx';
import ThemedCheckbox from './theme/ThemedCheckbox.jsx';
import { toDateInput, displayName } from '../utils/core.js';
import { OCC, COMM } from '../constants/seedData.js';
import { STATUSLBL } from '../constants/segments.js';
import { toast, CONFIRM_COLOR } from '../utils/toast.js';

const STATUS_OPTIONS = Object.entries(STATUSLBL).map(([value, label]) => ({ value, label }));

const RELATIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Other'];
const CONSENT_ROWS = [
  ['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email'],
  ['marketing', 'Marketing'], ['children', "Children's data"],
];

const OWNER_TYPE_OPTS = [
  { value: '', label: 'Not captured' },
  { value: 'INVESTOR', label: 'Investor' },
  { value: 'END_USER', label: 'End user' },
];

function draftFrom(c) {
  return {
    salutation: c.salutation || '',
    name: c.name || '',
    mobile: c.mobile || '',
    pan: c.pan || '',
    aadhaarHeld: !!c.aadhaarHeld,
    aadhaarNo: c.aadhaarNo || '',
    ownerType: c.ownerType || '',
    source: c.source || '',
    dob: toDateInput(c.dob),
    spouseDob: toDateInput(c.spouseDob),
    kycDate: toDateInput(c.kycDate),
    coApplicant: c.coApplicant || '',
    coRelation: c.coRelation || 'Spouse',
    coOnAgreement: !!c.coOnAgreement,
    email: c.email || '',
    corrAddr: c.captured.addr ? c.corrAddr : '',
    city: c.city || '',
    occupation: c.captured.occ ? c.occupation : '',
    community: c.community || '',
    consent: {
      whatsapp: !!c.consent.whatsapp, sms: !!c.consent.sms, email: !!c.consent.email,
      marketing: !!c.consent.marketing, children: !!c.consent.children, purpose: c.consent.purpose || '',
    },
    status: c.status,
    statusNote: c.statusNote || '',
    litigation: !!c.litigation,
  };
}

export default function EditProfileModal({ customer, onClose }) {
  const { updateProfile, mutateCustomer } = useApp();
  const [draft, setDraft] = useState(() => draftFrom(customer));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(draftFrom(customer)); setErrors({}); }, [customer.id]);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  /* only the free-text "purpose" field still routes through here — the
     consent toggles are ThemedCheckboxes, which hand back a boolean */
  const setConsent = (k) => (e) =>
    setDraft((d) => ({ ...d, consent: { ...d.consent, [k]: e.target.value } }));

  const save = async () => {
    /* Status and litigation both close the Contact Gate the instant
       they save (see GATE_ORDER in derived.js) — folded into this one
       form for convenience, but still worth one explicit confirmation
       naming exactly what's about to change, same as when each had its
       own dedicated modal/button. Declining leaves the whole save
       cancelled — the profile fields alone are a quick re-click away
       once status/litigation are reverted. */
    const statusChanged = draft.status !== customer.status || draft.statusNote !== (customer.statusNote || '');
    const litigationChanged = draft.litigation !== !!customer.litigation;
    if (statusChanged || litigationChanged) {
      const warnings = [];
      if (statusChanged && draft.status !== 'ACTIVE') warnings.push(`Status → <b>${STATUSLBL[draft.status]}</b> immediately closes the contact gate.`);
      if (statusChanged && draft.status === 'ACTIVE' && customer.status !== 'ACTIVE') warnings.push('Status → <b>Active</b> reopens the contact gate (unless something else still blocks it).');
      if (litigationChanged && draft.litigation) warnings.push('Flagging <b>litigation</b> immediately closes the contact gate.');
      if (litigationChanged && !draft.litigation) warnings.push('Clearing <b>litigation</b> reopens contact — confirm it is actually resolved.');
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Confirm gate-affecting changes',
        html: warnings.map((w) => `• ${w}`).join('<br/>'),
        showCancelButton: true,
        confirmButtonText: 'Save all changes',
        confirmButtonColor: CONFIRM_COLOR.destructive,
      });
      if (!result.isConfirmed) return;
    }

    setSaving(true);
    try {
      await updateProfile(customer.id, draft);
      if (statusChanged) await mutateCustomer(`/api/customers/${customer.id}/status`, { status: draft.status, statusNote: draft.statusNote });
      if (litigationChanged) await mutateCustomer(`/api/customers/${customer.id}/litigation`, { litigation: draft.litigation });
      toast.success('Profile updated', `${customer.name}'s details are saved.`);
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
      drawer
      title="Complete profile"
      subtitle={`${displayName(customer)} · ${customer.id}`}
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <BtnPrimary onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</BtnPrimary>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lblCls}>Salutation</label>
            <input value={draft.salutation} onChange={set('salutation')} className={inputCls(false)} placeholder="e.g. Mr., Mrs., Dr." />
          </div>
          <div>
            <label className={lblCls}>Full name</label>
            <input value={draft.name} onChange={set('name')} className={inputCls(!!errors.name)} />
            {errors.name && <div className={errCls}>{errors.name}</div>}
          </div>

          <div>
            <label className={lblCls}>Mobile</label>
            <input value={draft.mobile} onChange={set('mobile')} className={inputCls(!!errors.mobile)} placeholder="Not captured" />
            {errors.mobile && <div className={errCls}>{errors.mobile}</div>}
          </div>
          <div>
            <label className={lblCls}>PAN</label>
            <input value={draft.pan} onChange={set('pan')} className={inputCls(!!errors.pan)} placeholder="Not captured" />
            {errors.pan && <div className={errCls}>{errors.pan}</div>}
          </div>

          <div>
            <label className={lblCls}>Owner type</label>
            <ThemedSelect value={draft.ownerType} onChange={setVal('ownerType')} options={OWNER_TYPE_OPTS} placeholder="Not captured" />
          </div>
          <div>
            <label className={lblCls}>Source</label>
            <input value={draft.source} onChange={set('source')} className={inputCls(false)} placeholder="e.g. Referral, Walk-in, Broker" />
          </div>

          <div>
            <label className={lblCls}>Aadhaar number</label>
            <input
              value={draft.aadhaarNo}
              onChange={set('aadhaarNo')}
              className={inputCls(!!errors.aadhaarNo)}
              placeholder="Not captured"
              maxLength={14}
            />
            {errors.aadhaarNo && <div className={errCls}>{errors.aadhaarNo}</div>}
          </div>
          <div className="flex items-end pb-2">
            <ThemedCheckbox
              checked={draft.aadhaarHeld}
              onChange={(v) => setDraft((d) => ({ ...d, aadhaarHeld: v }))}
              label="Aadhaar on file"
            />
          </div>

          <div className="sm:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4" />

          <div>
            <label className={lblCls}>Date of birth</label>
            <ThemedDate value={draft.dob} onChange={setVal('dob')} invalid={!!errors.dob} />
            {errors.dob && <div className={errCls}>{errors.dob}</div>}
          </div>
          <div>
            <label className={lblCls}>Anniversary</label>
            <ThemedDate value={draft.spouseDob} onChange={setVal('spouseDob')} invalid={!!errors.spouseDob} />
            {errors.spouseDob && <div className={errCls}>{errors.spouseDob}</div>}
          </div>

          <div>
            <label className={lblCls}>KYC completed</label>
            <ThemedDate value={draft.kycDate} onChange={setVal('kycDate')} invalid={!!errors.kycDate} />
            {errors.kycDate && <div className={errCls}>{errors.kycDate}</div>}
          </div>

          <div>
            <label className={lblCls}>Co-applicant name</label>
            <input value={draft.coApplicant} onChange={set('coApplicant')} className={inputCls(false)} placeholder="Not captured" />
          </div>
          <div>
            <label className={lblCls}>Relation</label>
            <ThemedSelect value={draft.coRelation} onChange={setVal('coRelation')} options={RELATIONS.map((r) => ({ value: r, label: r }))} />
          </div>

          <div className="sm:col-span-2">
            <ThemedCheckbox
              checked={draft.coOnAgreement}
              onChange={(v) => setDraft((d) => ({ ...d, coOnAgreement: v }))}
              label="Co-applicant is on the sale agreement"
            />
          </div>

          <div>
            <label className={lblCls}>Email</label>
            <input value={draft.email} onChange={set('email')} className={inputCls(!!errors.email)} placeholder="Not captured" />
            {errors.email && <div className={errCls}>{errors.email}</div>}
          </div>
          <div>
            <label className={lblCls}>City</label>
            <input value={draft.city} onChange={set('city')} className={inputCls(false)} />
          </div>

          <div className="sm:col-span-2">
            <label className={lblCls}>Current address</label>
            <textarea value={draft.corrAddr} onChange={set('corrAddr')} rows={2} className={inputCls(!!errors.corrAddr)} placeholder="Not updated since booking" />
            {errors.corrAddr && <div className={errCls}>{errors.corrAddr}</div>}
          </div>

          <div>
            <label className={lblCls}>Occupation</label>
            <ThemedSelect
              value={draft.occupation}
              onChange={setVal('occupation')}
              options={OCC.map((o) => ({ value: o.k, label: o.k }))}
              placeholder="Not captured"
              className={errors.occupation ? '[&>button]:border-red-400' : ''}
            />
            {errors.occupation && <div className={errCls}>{errors.occupation}</div>}
          </div>
          <div>
            <label className={lblCls}>Community</label>
            <ThemedSelect value={draft.community} onChange={setVal('community')} options={COMM.map((x) => ({ value: x, label: x }))} placeholder="Not captured" />
          </div>

          <div className="sm:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-1">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-2">DPDP consent</div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-3">
              {CONSENT_ROWS.map(([k, l]) => (
                <ThemedCheckbox
                  key={k}
                  checked={draft.consent[k]}
                  onChange={(v) => setDraft((d) => ({ ...d, consent: { ...d.consent, [k]: v } }))}
                  label={l}
                />
              ))}
            </div>
            <label className={lblCls}>Purpose captured</label>
            <input
              value={draft.consent.purpose}
              onChange={setConsent('purpose')}
              className={inputCls(false)}
              placeholder="e.g. Portfolio statements and re-investment offers"
            />
          </div>

          <div className="sm:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4 mt-1">
            <div className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-2">Status &amp; legal</div>
          </div>
          <div>
            <label className={lblCls}>Status</label>
            <ThemedSelect value={draft.status} onChange={setVal('status')} options={STATUS_OPTIONS} />
          </div>
          <div>
            <label className={lblCls}>Status note {draft.status !== 'ACTIVE' && '(required)'}</label>
            <input
              value={draft.statusNote}
              onChange={set('statusNote')}
              className={inputCls(!!errors.statusNote)}
              placeholder="Why is this changing — registry search finding, family communication, etc."
            />
            {errors.statusNote && <div className={errCls}>{errors.statusNote}</div>}
          </div>

          <div className="sm:col-span-2">
            <ThemedCheckbox
              checked={draft.litigation}
              onChange={(v) => setDraft((d) => ({ ...d, litigation: v }))}
              label="Litigation flag"
            />
          </div>
          {(draft.status !== 'ACTIVE' || draft.litigation) && (
            <div className="sm:col-span-2 text-xs text-amber-600 dark:text-amber-400 leading-relaxed -mt-2">
              This immediately closes the contact gate — no role can override it.
            </div>
          )}
      </div>
    </Modal>
  );
}
