import { useState, useEffect } from 'react';

import Swal from 'sweetalert2';
import { Card, Chip, Banner, Row, KV, Timeline, TableWrap, rowActionCls, formLabelCls, formInputCls, Req, EmptyState } from '../../components/Ui.jsx';
import { useApp } from '../../context/AppContext.jsx';
import ThemedDate from '../../components/theme/ThemedDate.jsx';
import { fmtD, todayInput } from '../../utils/core.js';
import { toast, CONFIRM_COLOR } from '../../utils/toast.js';
import ReferralModal from '../../components/ReferralModal.jsx';
import EventModal from '../../components/EventModal.jsx';
import ComplaintModal from '../../components/ComplaintModal.jsx';
import { useEvents } from '../../hooks/useEvents.js';
import { CalendarDays, Check } from 'lucide-react';

export default function MRelationship({ c }) {
  const { mutateCustomer } = useApp();
  const { events } = useEvents();
  /* the invite-list system (Events page) is a separate collection from
     this owner's own `events`/siteVisits counters above — this cross-
     references it so "which events was THIS owner invited to, and did
     they attend" shows up here instead of only being visible from the
     Events page's own per-event drawer. */
  const myEvents = (events || [])
    .map((ev) => ({ ev, invite: ev.invites.find((i) => i.customerId === c.id) }))
    .filter((x) => x.invite)
    .sort((a, b) => new Date(b.ev.date) - new Date(a.ev.date));
  const hasOpenRef = c.referrals.some((x) => x.status.startsWith('Open'));
  const avgClose = c.complaints.length
    ? Math.round(c.complaints.reduce((s, x) => s + x.days, 0) / c.complaints.length) + ' days'
    : '—';

  const [referralOpen, setReferralOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [nps, setNps] = useState(c.nps ?? '');
  const [npsDate, setNpsDate] = useState(c.npsDate ? String(c.npsDate).slice(0, 10) : todayInput());
  const [npsReason, setNpsReason] = useState(c.npsReason ?? '');
  const [savingNps, setSavingNps] = useState(false);

  // Sync local input state if customer prop updates from server
  useEffect(() => {
    if (c.nps != null) setNps(c.nps);
    if (c.npsDate) setNpsDate(String(c.npsDate).slice(0, 10));
    if (c.npsReason != null) setNpsReason(c.npsReason);
  }, [c.nps, c.npsDate, c.npsReason]);

  const saveNps = async () => {
    if (nps === '' || nps === null) {
      toast.error('Choose a score', 'Click a number from 0 to 10 first.');
      return;
    }
    setSavingNps(true);
    try {
      await mutateCustomer(`/api/customers/${c.id}/nps`, { nps: Number(nps), npsDate, npsReason });
      toast.success('NPS recorded', `${nps}/10 for ${c.name}.`);
    } catch (err) {
      toast.error('Could not save', err.message || 'Enter a whole number from 0 to 10.');
    } finally {
      setSavingNps(false);
    }
  };



  const closeComplaint = async (o) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Close this complaint?',
      html: `${o.ncr}${o.unit ? ` · unit ${o.unit}` : ''} — the contact gate reopens automatically once every open complaint is closed.`,
      input: 'textarea',
      inputLabel: 'How was it resolved?',
      inputPlaceholder: 'e.g. Repainted and inspected on site — owner confirmed satisfied.',
      inputValidator: (v) => (!v.trim() ? 'Record how this was resolved.' : undefined),
      showCancelButton: true,
      confirmButtonText: 'Close it',
      confirmButtonColor: CONFIRM_COLOR.approve,
    });
    if (!result.isConfirmed) return;
    const idx = c.openComplaints.findIndex((x) => x.ncr === o.ncr);
    try {
      await mutateCustomer(`/api/customers/${c.id}/complaints/${idx}/close`, { ncr: o.ncr, reason: result.value }, 'POST');
      toast.success('Complaint closed', o.ncr);
    } catch {
      toast.error('Could not close', 'Reload and try again.');
    }
  };

  const siteVisit = async (delta) => {
    try {
      await mutateCustomer(`/api/customers/${c.id}/site-visits`, { delta }, 'POST');
    } catch {
      toast.error('Could not save', 'Try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card
        title="Referrals given"
        hint={
          <button className={rowActionCls('primary')} onClick={() => setReferralOpen(true)}>Add referral</button>
        }
      >
        {c.referrals.length ? (
          <>
            <TableWrap>
              <table className="w-full border-collapse">
                <tbody>
                  {c.referrals.map((x, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                        <b>{x.n}</b><div className="text-[10.5px] text-gray-400 dark:text-gray-500">{fmtD(x.date)}</div>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right">
                        {x.status.startsWith('Booked') ? <Chip cls="g">booked</Chip>
                          : x.status.startsWith('Open') ? <Chip cls="w">open</Chip>
                          : <Chip cls="m">lost</Chip>}
                        <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{x.status}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {hasOpenRef && (
              <Banner kind="warn" style={{ margin: '12px 0 0' }}>
                <b>A referral is sitting unworked</b>, and nobody has gone back to the referrer either.
                That silence is what stops the next referral — close the loop even when the answer is no.
              </Banner>
            )}
          </>
        ) : <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">No referrals given.</div>}

        {c.referredBy && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
            This owner was introduced by <b>{c.referredBy.n}</b>.
          </div>
        )}
      </Card>

      <Card
        title="Service history"
        hint={
          <button className={rowActionCls('red')} onClick={() => setComplaintOpen(true)}>Log complaint</button>
        }
      >
        <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center justify-between mb-2">
            <label className={formLabelCls}>Net Promoter Score (NPS 0-10)</label>
            {nps !== '' && nps !== null && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                Number(nps) >= 9 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                  : Number(nps) >= 7 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                  : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}>
                {Number(nps) >= 9 ? '🟢 Promoter (Super Fan)' : Number(nps) >= 7 ? '🟡 Passive (Neutral)' : '🔴 Detractor (Unhappy)'} 
                <span className="opacity-75 font-normal ml-1">(+{Math.round((Number(nps)/10)*30)} pts Trust)</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
              const active = Number(nps) === val && nps !== '';
              const isPromoter = val >= 9;
              const isPassive = val >= 7 && val <= 8;
              let cls = 'w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ';
              if (active) {
                cls += isPromoter 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30 scale-105' 
                  : isPassive 
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30 scale-105' 
                  : 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/30 scale-105';
              } else {
                cls += isPromoter
                  ? 'border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  : isPassive
                  ? 'border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  : 'border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40';
              }
              return (
                <button key={val} type="button" onClick={() => setNps(val)} className={cls}>
                  {val}
                </button>
              );
            })}
          </div>

          <div className="mb-3">
            <label className={formLabelCls}>Reason / Feedback Comment</label>
            <input
              type="text"
              placeholder="e.g. Timely possession & great quality / Water seepage issue"
              value={npsReason}
              onChange={(e) => setNpsReason(e.target.value)}
              className={formInputCls(false)}
            />
            {nps !== '' && nps !== null && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(Number(nps) >= 9 ? [
                  'Timely possession & superior construction quality',
                  'Smooth loan processing & helpful CRM team',
                  'Transparent dealing & excellent capital appreciation',
                ] : Number(nps) >= 7 ? [
                  'Decent construction quality, minor possession delay',
                  'Good property location, but parking availability is tight',
                  'Satisfactory overall experience, room for maintenance improvement',
                ] : [
                  'Water seepage & construction quality issues on site',
                  'Delayed registry documentation & unfulfilled promises',
                  'Unresponsive CRM support regarding complaint resolution',
                ]).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNpsReason(tag)}
                    className="text-[10px] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-primary-500 hover:text-primary-600 transition-all"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={formLabelCls}>Survey Date<Req /></label>
              <ThemedDate value={npsDate} onChange={setNpsDate} />
            </div>
            <button className={rowActionCls('primary')} disabled={savingNps} onClick={saveNps}>
              {savingNps ? 'Saving…' : 'Record NPS'}
            </button>
          </div>
        </div>

        <KV>
          <Row k="NPS" miss={c.nps == null && (nps === '' || nps === null)}
               v={(c.nps != null || nps !== '') ? (
                 <span className="inline-flex items-center gap-1.5">
                   <span className={`font-semibold ${
                     (c.nps ?? Number(nps)) >= 9 ? 'text-emerald-600 dark:text-emerald-400' : (c.nps ?? Number(nps)) >= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                   }`}>
                     {c.nps ?? nps}/10
                   </span>
                   <span className="text-[10.5px] text-gray-400 dark:text-gray-500">({fmtD(c.npsDate || npsDate)})</span>
                 </span>
               ) : null} />

          <Row k="Primary Reason" miss={!c.npsReason && !npsReason}
               v={c.npsReason || npsReason || null} />



          <Row k="Open complaints" v={c.openComplaints.length
            ? <span className="text-red-600 dark:text-red-400">{c.openComplaints.length}</span>
            : '0'} />
          <Row k="Closed complaints" v={c.complaints.length} />
          <Row k="Average closure time" v={avgClose} />
          <Row k="Events attended" v={
            <>
              {c.events.length}{' '}
              <button className={rowActionCls('primary')} onClick={() => setEventOpen(true)}>Log event</button>
            </>
          } />
          <Row k="Site visits since booking" v={
            <span className="inline-flex items-center gap-1.5">
              {c.siteVisits}
              <button className={rowActionCls('primary')} onClick={() => siteVisit(-1)} disabled={!c.siteVisits}>-1</button>
              <button className={rowActionCls('primary')} onClick={() => siteVisit(1)}>+1</button>
            </span>
          } />
          <Row k="Portal" v={c.portalLast ? 'last seen ' + fmtD(c.portalLast) : 'never logged in'} />
        </KV>

        {c.openComplaints.map((o) => (
          <Banner key={o.ncr} kind="block" style={{ margin: '12px 0 0' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <b>{o.t}</b>{o.unit && <span className="ml-1.5"><Chip cls="m">{o.unit}</Chip></span>}<br />
                Raised {fmtD(o.raised)} · ageing <b>{o.days} days</b> · {o.ncr} · owner {o.owner}
              </div>
              <button className={rowActionCls('green')} onClick={() => closeComplaint(o)}>Close</button>
            </div>
          </Banner>
        ))}

        {!!c.complaints.length && (
          <div className="mt-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Closed</div>
            <Timeline>
              {c.complaints.map((x, i) => (
                <li key={i} className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                  <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{fmtD(x.raised)}</span>
                  <span className="flex-1">
                    {x.t}{x.unit && <span className="ml-1.5"><Chip cls="m">{x.unit}</Chip></span>}
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                      closed in {x.days} days{x.closeReason ? ` — ${x.closeReason}` : ''}
                    </div>
                  </span>
                </li>
              ))}
            </Timeline>
          </div>
        )}
      </Card>

      <Card title="Event invitations" hint={events ? `${myEvents.length} of ${events.length} events` : ''}>
        {!events ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">Loading…</div>
        ) : myEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Not invited to any events yet." />
        ) : (
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-100 dark:border-gray-700/60">Event</th>
                  <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-100 dark:border-gray-700/60">Date</th>
                  <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-100 dark:border-gray-700/60">Invited by</th>
                  <th className="text-center text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-100 dark:border-gray-700/60">Attended</th>
                </tr>
              </thead>
              <tbody>
                {myEvents.map(({ ev, invite }) => (
                  <tr key={ev.id} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">{ev.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{fmtD(ev.date)}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{invite.invitedBy || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <div
                        className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center ${
                          invite.attended
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-transparent'
                        }`}
                        title={invite.attended ? 'Attended' : 'Did not attend'}
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      {referralOpen && <ReferralModal customer={c} onClose={() => setReferralOpen(false)} />}
      {eventOpen && <EventModal customer={c} onClose={() => setEventOpen(false)} />}
      {complaintOpen && <ComplaintModal customer={c} onClose={() => setComplaintOpen(false)} />}
    </div>
  );
}
