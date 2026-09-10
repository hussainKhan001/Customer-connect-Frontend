import { useState } from 'react';
import Swal from 'sweetalert2';
import { Card, Chip, Banner, Row, KV, Timeline, TableWrap, rowActionCls, formLabelCls, formInputCls } from '../../components/Ui.jsx';
import { useApp } from '../../context/AppContext.jsx';
import ThemedDate from '../../components/theme/ThemedDate.jsx';
import { fmtD, todayInput } from '../../utils/core.js';
import { toast, CONFIRM_COLOR } from '../../utils/toast.js';
import ReferralModal from '../../components/ReferralModal.jsx';
import EventModal from '../../components/EventModal.jsx';
import ComplaintModal from '../../components/ComplaintModal.jsx';

export default function MRelationship({ c }) {
  const { mutateCustomer } = useApp();
  const hasOpenRef = c.referrals.some((x) => x.status.startsWith('Open'));
  const avgClose = c.complaints.length
    ? Math.round(c.complaints.reduce((s, x) => s + x.days, 0) / c.complaints.length) + ' days'
    : '—';

  const [referralOpen, setReferralOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [nps, setNps] = useState(c.nps ?? '');
  const [npsDate, setNpsDate] = useState(c.npsDate ? String(c.npsDate).slice(0, 10) : todayInput());
  const [savingNps, setSavingNps] = useState(false);

  const saveNps = async () => {
    setSavingNps(true);
    try {
      await mutateCustomer(`/api/customers/${c.id}/nps`, { nps, npsDate });
      toast.success('NPS recorded', `${nps}/10 for ${c.name}.`);
    } catch {
      toast.error('Could not save', 'Enter a whole number from 0 to 10.');
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
        <div className="flex items-end gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
          <div className="flex-1">
            <label className={formLabelCls}>NPS</label>
            <input type="number" min="0" max="10" value={nps} onChange={(e) => setNps(e.target.value)} className={formInputCls(false)} />
          </div>
          <div className="flex-1">
            <label className={formLabelCls}>Date</label>
            <ThemedDate value={npsDate} onChange={setNpsDate} />
          </div>
          <button className={rowActionCls('primary')} disabled={savingNps} onClick={saveNps}>
            {savingNps ? 'Saving…' : 'Record NPS'}
          </button>
        </div>

        <KV>
          <Row k="NPS" miss={!c.nps}
               v={c.nps ? <>{c.nps}/10 <span className="text-[10.5px] text-gray-400 dark:text-gray-500">({fmtD(c.npsDate)})</span></> : null} />
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

      {referralOpen && <ReferralModal customer={c} onClose={() => setReferralOpen(false)} />}
      {eventOpen && <EventModal customer={c} onClose={() => setEventOpen(false)} />}
      {complaintOpen && <ComplaintModal customer={c} onClose={() => setComplaintOpen(false)} />}
    </div>
  );
}
