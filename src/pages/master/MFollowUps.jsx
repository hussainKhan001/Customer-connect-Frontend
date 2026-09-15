/* Manual, staff-written reminders (see FollowUpSchema) — its own tab
   rather than a card tucked inside Trigger Dates, since this is where
   someone adds and reviews every note, not just the ones still open.
   Surfaces in the header Notification Bell once its time arrives (see
   followUpsDue() in derived.js) the same way this tab's own entries
   do, and a done one stays here as the record that the contact
   actually happened — same reasoning as complaints/activity log never
   deleting history — rather than vanishing the moment it's checked
   off. */
import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Card, BtnPrimary, rowActionCls, formLabelCls, formInputCls, formErrorCls } from '../../components/Ui.jsx';
import ThemedDate from '../../components/theme/ThemedDate.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { toast } from '../../utils/toast.js';

const fmtDT = (d) => new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

export default function MFollowUps({ c }) {
  const { mutateCustomer } = useApp();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  /* Open ones lead (soonest first, so what still needs doing is what's
     seen first); done ones trail, most-recently finished first. */
  const all = c.followUps || [];
  const open = all.filter((f) => !f.done).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const done = all.filter((f) => f.done).sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt));
  const ordered = [...open, ...done];

  const add = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${c.id}/followups`, { note, dueAt }, 'POST');
      setNote(''); setDueAt(''); setAdding(false); setErrors({});
      toast.success('Follow-up added', 'Will notify in the header bell once due.');
    } catch (err) {
      setErrors(err.errors || {});
      if (!Object.keys(err.errors || {}).length) toast.error('Could not save', err.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const setDone = async (f, doneVal) => {
    setBusyId(f._id);
    try { await mutateCustomer(`/api/customers/${c.id}/followups/${f._id}`, { done: doneVal }, 'PATCH'); }
    catch (err) { toast.error('Could not update', err.message); }
    finally { setBusyId(null); }
  };

  const remove = async (f) => {
    setBusyId(f._id);
    try { await mutateCustomer(`/api/customers/${c.id}/followups/${f._id}`, {}, 'DELETE'); }
    catch (err) { toast.error('Could not delete', err.message); }
    finally { setBusyId(null); }
  };

  return (
    <Card
      title="Follow-ups"
      hint={adding ? undefined : (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold">
          <Plus className="w-3 h-3" />Add
        </button>
      )}
    >
      {adding && (
        <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={formLabelCls}>What to follow up on</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={formInputCls(!!errors.note)} placeholder="e.g. Call back about the loan closure documents" />
            {errors.note && <div className={formErrorCls}>{errors.note}</div>}
          </div>
          <div>
            <label className={formLabelCls}>Date &amp; time</label>
            <ThemedDate withTime value={dueAt} onChange={setDueAt} placeholder="Choose date & time" invalid={!!errors.dueAt} />
            {errors.dueAt && <div className={formErrorCls}>{errors.dueAt}</div>}
          </div>
          <div className="flex items-end gap-2">
            <BtnPrimary onClick={add} disabled={saving} className="text-xs px-3 py-2">{saving ? 'Saving…' : 'Save follow-up'}</BtnPrimary>
            <button className="text-xs text-gray-500 dark:text-gray-400 px-2" onClick={() => { setAdding(false); setErrors({}); }} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {ordered.length ? (
        <ul className="list-none m-0 p-0">
          {ordered.map((f) => (
            <li key={f._id} className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
              <div className="min-w-0">
                <div className="text-gray-800 dark:text-gray-100">{f.note}</div>
                <div className={`text-[10.5px] mt-0.5 ${
                  f.done ? 'text-gray-400 dark:text-gray-500'
                    : new Date(f.dueAt) <= new Date() ? 'text-red-600 dark:text-red-400 font-semibold'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {fmtDT(f.dueAt)}{f.createdBy ? ` · added by ${f.createdBy}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {f.done ? (
                  <button className={rowActionCls('primary')} disabled={busyId === f._id} onClick={() => setDone(f, false)}>
                    Undo
                  </button>
                ) : (
                  <button className={rowActionCls('green')} disabled={busyId === f._id} onClick={() => setDone(f, true)}>
                    <Check className="w-3 h-3" />Done
                  </button>
                )}
                <button className={rowActionCls('red')} disabled={busyId === f._id} onClick={() => remove(f)}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !adding && <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">No follow-ups yet.</div>
      )}
    </Card>
  );
}
