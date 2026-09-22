/* One combined, chronological timeline for the owner: system-computed
   dated reasons to reach out (birthdays, anniversaries, loan closure,
   LTCG/54F windows — what used to be its own "Trigger dates" tab) plus
   manual, staff-written notes (see FollowUpSchema), sorted together,
   oldest/most-overdue first. Triggers are read-only here; notes keep
   full add/done/undo/delete. A done note stays in its own trailing
   "Completed" section as the record that the contact actually
   happened — same reasoning as complaints/activity log never deleting
   history — rather than vanishing the moment it's checked off. Notes
   still surface in the header Notification Bell once due (see
   followUpsDue() in derived.js). */
import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Card, Banner, BtnPrimary, Timeline, Dot, Chip, rowActionCls, formLabelCls, formInputCls, formErrorCls, Req } from '../../components/Ui.jsx';
import ThemedDate from '../../components/theme/ThemedDate.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { toast } from '../../utils/toast.js';
import { fmtDT, hasCoApplicant } from '../../utils/core.js';
import { timelineItems } from '../../utils/derived.js';

const when = (d) =>
  d < 0 ? Math.abs(Math.round(d / 365)) + ' yr ago'
  : d === 0 ? 'today'
  : d < 400 ? 'in ' + Math.round(d) + 'd'
  : 'in ' + (d / 365).toFixed(1) + ' yr';

export default function MFollowUps({ c }) {
  const { mutateCustomer } = useApp();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const g = c._g;

  const miss = [
    !c.captured.dob && 'date of birth',
    !c.captured.anniv && hasCoApplicant(c) && 'wedding anniversary',
    !c.captured.kid && "children's dates of birth",
  ].filter(Boolean);

  const all = c.followUps || [];
  const doneNotes = all.filter((f) => f.done).sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt));

  /* see derived.js's timelineItems() — shared with CustomerMaster.jsx's
     own "Next Follow-up" sidebar card, so both read the exact same
     merged, sorted list rather than two copies that could drift. */
  const items = timelineItems(c);

  const add = async () => {
    setSaving(true);
    try {
      await mutateCustomer(`/api/customers/${c.id}/followups`, { note, dueAt }, 'POST');
      setNote(''); setDueAt(''); setAdding(false); setErrors({});
      toast.success('Note added', 'Will notify in the header bell once due.');
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
    <>
      {!g.open && (
        <Banner kind="block">
          <b>All triggers suppressed.</b> The dates are still tracked, but nothing fires while the gate is
          closed. A birthday message to someone with an open seepage complaint is worse than silence.
        </Banner>
      )}

      <Card
        title="Timeline"
        hint={
          <span className="inline-flex items-center gap-3">
            <span>{items.length} tracked</span>
            {!adding && (
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold">
                <Plus className="w-3 h-3" />Add note
              </button>
            )}
          </span>
        }
      >
        {adding && (
          <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={formLabelCls}>Note<Req /></label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} aria-required="true" className={formInputCls(!!errors.note)} placeholder="e.g. Call back about the loan closure documents" />
              {errors.note && <div className={formErrorCls}>{errors.note}</div>}
            </div>
            <div>
              <label className={formLabelCls}>Date &amp; time<Req /></label>
              <ThemedDate withTime value={dueAt} onChange={setDueAt} placeholder="Choose date & time" invalid={!!errors.dueAt} />
              {errors.dueAt && <div className={formErrorCls}>{errors.dueAt}</div>}
            </div>
            <div className="flex items-end gap-2">
              <BtnPrimary onClick={add} disabled={saving} className="text-xs px-3 py-2">{saving ? 'Saving…' : 'Save note'}</BtnPrimary>
              <button className="text-xs text-gray-500 dark:text-gray-400 px-2" onClick={() => { setAdding(false); setErrors({}); }} disabled={saving}>Cancel</button>
            </div>
          </div>
        )}

        {items.length ? (
          <Timeline>
            {items.map((it) => (
              <li key={it.key} className="flex flex-wrap sm:flex-nowrap items-start gap-2.5 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                <span className="w-full sm:w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{when(it.days)}</span>
                <span className="flex-1 min-w-0">
                  <Dot tone={it.tone} />
                  <span className="text-gray-800 dark:text-gray-100">{it.label}</span>
                  {it.ack && <Chip cls="g">done</Chip>}
                  <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">{it.sub}</div>
                  {it.ack && (
                    <div className="text-[10.5px] text-green-700 dark:text-green-400 mt-0.5">
                      <Check className="w-3 h-3 inline -mt-0.5 mr-1" />
                      Done{it.ack.by ? ` by ${it.ack.by}` : ''}{it.ack.remark ? ` — ${it.ack.remark}` : ''}
                    </div>
                  )}
                </span>
                {it.isNote && (
                  <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                    <button className={rowActionCls('green')} disabled={busyId === it.f._id} onClick={() => setDone(it.f, true)}>
                      <Check className="w-3 h-3" />Done
                    </button>
                    <button className={rowActionCls('red')} disabled={busyId === it.f._id} onClick={() => remove(it.f)} title="Delete this note">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </Timeline>
        ) : (
          !adding && <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Nothing on the timeline yet.</div>
        )}

        {!!doneNotes.length && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-1">Completed notes</div>
            <Timeline>
              {doneNotes.map((f) => (
                <li key={f._id} className="flex flex-wrap sm:flex-nowrap items-start gap-2.5 py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                  <span className="w-full sm:w-32 flex-shrink-0 text-gray-400 dark:text-gray-500 text-[11px] tabular-nums">{fmtDT(f.dueAt)}</span>
                  <span className="flex-1 min-w-0">
                    <Dot tone="g" />
                    <span className="text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-600">{f.note}</span>
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">Done{f.createdBy ? ` · added by ${f.createdBy}` : ''}</div>
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                    <button className={rowActionCls('primary')} disabled={busyId === f._id} onClick={() => setDone(f, false)}>Undo</button>
                    <button className={rowActionCls('red')} disabled={busyId === f._id} onClick={() => remove(f)} title="Delete this note"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </li>
              ))}
            </Timeline>
          </>
        )}

        {!!miss.length && (
          <Banner kind="warn" style={{ margin: '12px 0 0' }}>
            <b>Not captured: {miss.join(', ')}.</b> These come from the owner profile, and the owner
            profile is unlocked by the portfolio statement. Do not run a separate data-collection drive.
          </Banner>
        )}
      </Card>
    </>
  );
}
