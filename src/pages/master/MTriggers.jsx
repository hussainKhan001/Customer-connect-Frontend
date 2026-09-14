import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Card, Banner, Timeline, Dot, BtnPrimary, rowActionCls, formLabelCls, formInputCls, formErrorCls } from '../../components/Ui.jsx';
import ThemedDate from '../../components/theme/ThemedDate.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtD, fmtDM, annivIn, daysTo } from '../../utils/core.js';
import { roll } from '../../utils/derived.js';
import { toast } from '../../utils/toast.js';

const when = (d) =>
  d < 0 ? Math.abs(Math.round(d / 365)) + ' yr ago'
  : d === 0 ? 'today'
  : d < 400 ? 'in ' + d + 'd'
  : 'in ' + (d / 365).toFixed(1) + ' yr';

const fmtDT = (d) => new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

/* Manual, staff-written reminders (see FollowUpSchema) — distinct from
   the system-computed list below: only ever created by a person, about
   whatever only they know to check back on. Surfaces in the header
   Notification Bell once its time arrives (see followUpsDue() in
   derived.js), same as this page's own "Dated reasons" do. */
function FollowUps({ c }) {
  const { mutateCustomer } = useApp();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const open = (c.followUps || []).filter((f) => !f.done).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

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

  const markDone = async (f) => {
    setBusyId(f._id);
    try { await mutateCustomer(`/api/customers/${c.id}/followups/${f._id}`, { done: true }, 'PATCH'); }
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

      {open.length ? (
        <ul className="list-none m-0 p-0">
          {open.map((f) => (
            <li key={f._id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
              <div className="min-w-0">
                <div className="text-gray-800 dark:text-gray-100">{f.note}</div>
                <div className={`text-[10.5px] mt-0.5 ${new Date(f.dueAt) <= new Date() ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                  {fmtDT(f.dueAt)}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className={rowActionCls('green')} disabled={busyId === f._id} onClick={() => markDone(f)}>
                  <Check className="w-3 h-3" />Done
                </button>
                <button className={rowActionCls('red')} disabled={busyId === f._id} onClick={() => remove(f)}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !adding && <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">No open follow-ups.</div>
      )}
    </Card>
  );
}

export default function MTriggers({ c }) {
  const r = roll(c);
  const g = c._g;
  const t = [];

  if (c.captured.dob) t.push(['Birthday', annivIn(c.dob), fmtDM(c.dob), 'personal']);
  if (c.captured.anniv && c.spouseDob) t.push(['Wedding anniversary', annivIn(c.spouseDob), fmtDM(c.spouseDob), 'personal']);
  if (c.captured.kid) c.children.forEach((k) => t.push([`${k.n}'s birthday`, annivIn(k.dob), fmtDM(k.dob), 'personal']));

  r.units.forEach((u) => {
    t.push(['Booking anniversary — ' + u.unit, annivIn(u.bookDate), fmtDM(u.bookDate), 'portfolio']);
    if (u.regDate) t.push(['Registry anniversary — ' + u.unit, annivIn(u.regDate), fmtDM(u.regDate), 'portfolio']);
    if (!u.loan.closed && u.loan.closure) t.push(['Loan closure — ' + u.unit, daysTo(u.loan.closure), fmtD(u.loan.closure), 'money']);
    t.push(['LTCG / 54F window — ' + u.unit, daysTo(u.ltcg), fmtD(u.ltcg), 'money']);
  });
  t.sort((a, b) => a[1] - b[1]);

  const miss = [
    !c.captured.dob && 'date of birth',
    !c.captured.anniv && c.coApplicant && 'wedding anniversary',
    !c.captured.kid && "children's dates of birth",
  ].filter(Boolean);

  return (
    <>
      <FollowUps c={c} />

      {!g.open && (
        <Banner kind="block">
          <b>All triggers suppressed.</b> The dates are still tracked, but nothing fires while the gate is
          closed. A birthday message to someone with an open seepage complaint is worse than silence.
        </Banner>
      )}

      <Card title="Dated reasons to make contact" hint={`${t.length} tracked`}>
        <Timeline>
          {t.map(([l, d, dt, k], i) => (
            <li key={i} className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
              <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{when(d)}</span>
              <span className="flex-1">
                <Dot tone={k === 'money' ? 'g' : k === 'portfolio' ? 'o' : ''} />
                {l}
                <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{dt} · {k}</div>
              </span>
            </li>
          ))}
        </Timeline>

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
