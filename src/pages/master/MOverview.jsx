import { Card, Banner, Row, KV } from '../../components/Ui.jsx';
import RateLadder from '../../components/RateLadder.jsx';
import { inr, fmtD } from '../../utils/core.js';
import { roll } from '../../utils/derived.js';
import { STATUSLBL } from '../../constants/segments.js';

const segNote = (seg) =>
  seg === 'A' ? 'this call is made by the CEO or GM personally, not by a telecaller.'
  : seg === 'D' ? 'no second-purchase capacity; work as a referral source.'
  : 'quarterly statement and event circuit until capacity or timing moves.';

const fixAction = (g, c) =>
  g.code === 'OPEN_COMPLAINT' ? 'Close ' + c.openComplaints[0].ncr + (c.openComplaints[0].unit ? ` (${c.openComplaints[0].unit})` : '')
  : g.code === 'TRANSFER_IN_PROGRESS' ? 'Collect succession documents and nominee KYC'
  : g.code === 'NO_MARKETING_CONSENT' ? 'Seek marketing consent at next service touch'
  : g.code === 'STALE_VALUATION' ? 'Refresh the valuation note for this project'
  : 'Suppress from all lists';

const fixOwner = (g, c) =>
  g.code === 'OPEN_COMPLAINT' ? c.openComplaints[0].owner
  : g.code === 'TRANSFER_IN_PROGRESS' ? 'Legal'
  : g.code === 'STALE_VALUATION' ? 'Finance'
  : 'CRM';

export default function MOverview({ c }) {
  const g = c._g;
  const r = roll(c);

  return (
    <>
      {g.open ? (
        <Banner kind="ok">
          <b>Contact open.</b> {g.why} Segment {c._seg} — {segNote(c._seg)}
        </Banner>
      ) : (
        <Banner kind="block">
          <b>Do not contact.</b>{' '}
          <code className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded font-mono text-[11px]">{g.code}</code> {g.why}
        </Banner>
      )}

      {c.statusNote && (
        <Banner kind="warn">
          <b>{STATUSLBL[c.status]}{c.statusSince ? ', ' + fmtD(c.statusSince) : ''}.</b> {c.statusNote}
        </Banner>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Position" hint={`${r.units.length} live unit${r.units.length === 1 ? '' : 's'}`}>
          {r.units.length ? r.units.map((u) => (
            <div key={u.unit} className="mb-4 last:mb-0">
              <div className="flex justify-between">
                <b>{u.unit}</b>
                <span className="text-[10.5px] text-gray-400 dark:text-gray-500">{u.project} · {u.type} · {u.saleable} sq.ft.</span>
              </div>
              <RateLadder u={u} style={{ marginTop: 7 }} />
              <div className="tabular-nums mt-2 text-[19px] font-bold text-green-600 dark:text-green-400">
                {inr(u.gain)}
                <span className="text-[11.5px] text-gray-400 dark:text-gray-500 font-normal">
                  {' '}· {u.gainPct.toFixed(0)}% over {u.heldYrs.toFixed(1)} yrs · {u.cagr.toFixed(1)}% p.a.
                </span>
              </div>
            </div>
          )) : <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">No live units held.</div>}
        </Card>

        <Card title="Next action">
          {g.open ? (
            <>
              <KV>
                <Row k="Action" v={
                  c._seg === 'A' ? 'Personal call — CEO or GM'
                  : c._seg === 'D' ? 'Referral programme invite'
                  : 'Quarterly statement + event invite'} />
                <Row k="Owner" v="Rahul / GM Sales" />
                <Row k="Due" v="Within 14 days" />
                <Row k="Lead with" v={`${inr(r.gain)} unrealised gain`} />
                <Row k="Do not lead with" v="A discount" />
              </KV>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
                Every action here writes to the activity log. Without outcome data the four weights stay a
                guess and can never be re-fit against real second purchases.
              </div>
            </>
          ) : (
            <>
              <KV>
                <Row k="Action" v={fixAction(g, c)} />
                <Row k="Owner" v={fixOwner(g, c)} />
                <Row k="Sales may contact" v="No" />
              </KV>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
                This record returns to outreach lists automatically once the block clears. No manual
                re-entry, and no way for a keen RM to override it.
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
