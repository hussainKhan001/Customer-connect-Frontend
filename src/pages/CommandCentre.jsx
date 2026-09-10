import { Users, Wallet, TrendingUp, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { Card, Chip, Kpi, Kpis, Banner, ScoreBar, Timeline, Meter, healthMeterCls, TableWrap, btnGhost, Avatar, StatsCards } from '../components/Ui.jsx';
import ValueByProject from '../components/ValueByProject.jsx';
import { cr, inr, annivIn, daysTo, nextFest } from '../utils/core.js';
import { PROJECTS } from '../constants/projects.js';
import { VAL_STALE_DAYS } from '../constants/seedData.js';
import { GATE_ORDER, roll, triggerList } from '../utils/derived.js';
import { SEGLBL, SEGMETA } from '../constants/segments.js';
import { exceptions } from '../utils/intake.js';

/* Three of the six gate codes are things your own teams can close out; the other
   three are facts about the owner that no amount of service recovery changes. */
const CLEARABLE = new Set(['OPEN_COMPLAINT', 'NO_MARKETING_CONSENT', 'STALE_VALUATION']);

/* segment tile top-border colour, per the shared segment-tile convention */
const SEG_BORDER = { A: 'border-t-primary-500', B: 'border-t-blue-500', C: 'border-t-red-500', D: 'border-t-indigo-500' };

/* shared table cell classes */
const THL = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const THR = THL.replace('text-left', 'text-right');
const TD = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap';

/* the three strongest dated reasons to pick up the phone today */
function whyNow(c) {
  const r = [];
  const rr = roll(c);
  if (rr.units.every((u) => u.loan.closed || u.loan.selfFunded)) r.push('loan closed');
  else if (rr.units.some((u) => u.loan.prepaid)) r.push('prepaying');
  if (c._held >= 2) r.push('LTCG clear');
  if (c.referrals.length >= 2) r.push(c.referrals.length + ' referrals given');
  if (c.captured.dob && annivIn(c.dob) <= 45) r.push('birthday in ' + annivIn(c.dob) + 'd');
  if (c._paidPct >= 99) r.push('fully paid');
  return r.slice(0, 3).join(' · ') || 'score-led';
}

const HEALTH_FIELDS = [
  ['Date of birth', 'dob'],
  ['Anniversary', 'anniv'],
  ["Children's DOB", 'kid'],
  ['Occupation / income band', 'occ'],
  ['Address current', 'addr'],
];

export default function CommandCentre() {
  const { base, incompleteRecords } = useApp();
  const { openCustomer, openSegment } = useAppNavigation();
  const navigate = useNavigate();

  const tot = base.length;
  const live = base.filter((c) => c.status === 'ACTIVE');
  const inv = live.reduce((s, c) => s + c._consid, 0);
  const val = live.reduce((s, c) => s + c._value, 0);
  /* Not val - inv: a shell record can carry a real consideration with no
     confirmed area/rate yet, so its value is 0 while its consideration
     is real — subtracting the totals would show a large fake loss.
     _gain is already null-safe per record (see unitCalc in derived.js),
     so summing it keeps those records at 0 gain instead. */
  const gain = live.reduce((s, c) => s + c._gain, 0);
  const gainPct = inv ? (gain / inv) * 100 : 0;

  const segGain = (k) => base.filter((c) => c._seg === k).reduce((s, c) => s + c._gain, 0);
  const cnt = (k) => base.filter((c) => c._seg === k).length;

  const A = base.filter((c) => c._seg === 'A').sort((a, b) => b._total - a._total);
  const blk = base.filter((c) => c._blocked);
  const nf = nextFest();
  const ex = exceptions(base);
  const staleNotes = PROJECTS.filter((p) => daysTo(p.noted) < -VAL_STALE_DAYS);

  /* per gate code: how many owners, and how much unrealised gain is sitting behind it */
  const gateRows = GATE_ORDER.map(([code, label]) => {
    const hits = blk.filter((c) => c._g.code === code);
    return {
      code, label,
      n: hits.length,
      gain: hits.reduce((s, c) => s + c._gain, 0),
      clearable: CLEARABLE.has(code),
    };
  });
  const recoverable = gateRows.filter((r) => r.clearable).reduce((s, r) => s + r.gain, 0);
  const blockedGain = blk.reduce((s, c) => s + c._gain, 0);

  const sent = base.filter((c) => c.statements.length);
  const disputed = sent.filter((c) => c.statements[0].disputed).length;
  const noConsent = base.filter((c) => c.status === 'ACTIVE' && !c.consent.marketing).length;
  const exited = base.filter((c) => c.status === 'EXITED').length;
  const soon = triggerList(base, incompleteRecords).filter((t) => t.days <= 30).slice(0, 7);

  return (
    <>
      <Kpis>
        <Kpi label="Owners on book" value={tot} icon={Users} tone="b" highlight
             sub={`${live.length} active · ${tot - live.length} exited or in transfer`} />
        <Kpi label="Original consideration" value={`₹${cr(inv).toFixed(1)} Cr`} icon={Wallet} sub="what they paid us" />
        <Kpi label="Value held today" value={`₹${cr(val).toFixed(1)} Cr`} icon={TrendingUp} sub="at resale, floored at circle rate" />
        <Kpi label="Unrealised gain" value={`₹${cr(gain).toFixed(1)} Cr`} tone="g" icon={TrendingUp}
             sub={`${gainPct.toFixed(0)}% — and most of them have not been told`} />
        <Kpi label="Contact-blocked" value={blk.length} tone="r" icon={ShieldAlert}
             sub={`${((blk.length / tot) * 100).toFixed(0)}% of the base · ₹${cr(blockedGain).toFixed(1)} Cr of gain locked`} />
      </Kpis>

      <StatsCards
        className="mb-3.5"
        cards={['A', 'B', 'C', 'D'].map((k) => ({
          filterValue: k,
          label: SEGLBL[k],
          value: cnt(k),
          topBorderColor: SEG_BORDER[k],
          sub: (
            <>
              <div className="tabular-nums">{inr(segGain(k))} held</div>
              <div className="mt-2 leading-snug">{SEGMETA[k].w}</div>
              <div className="mt-1 font-semibold text-primary-600 dark:text-primary-400">{SEGMETA[k].o}</div>
            </>
          ),
        }))}
        /* this navigates to a different screen rather than toggling an
           in-place filter, so there's no "currently selected" segment
           to ring-highlight on this page — every click just opens it */
        onCardClick={(k) => openSegment(k)}
      />

      <Card
        title="Segment A — call list"
        hint={`${A.length} owners holding ₹${cr(segGain('A')).toFixed(1)} Cr of unrealised gain`}
        pad={false}
        className="mb-3.5 overflow-hidden"
      >
        <TableWrap>
          <table className="w-full">
            <thead>
              <tr>
                <th className={THL}>Owner</th>
                <th className={THL}>Holding</th>
                <th className={THR}>Paid</th>
                <th className={THR}>Gain</th>
                <th className={THR}>Score</th>
                <th className={THL}>Why now</th>
              </tr>
            </thead>
            <tbody>
              {A.slice(0, 9).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer" onClick={() => openCustomer(c.id)}>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white">{c.name}</div>
                        <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c.city} · {c.occupation}</div>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    {c._project}
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c._unit}{c._live > 1 ? ` +${c._live - 1} more` : ''}</div>
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{c._paidPct.toFixed(0)}%</td>
                  <td className={`${TD} text-right tabular-nums font-bold text-green-600 dark:text-green-400`}>{inr(c._gain)}</td>
                  <td className={`${TD} text-right`}><ScoreBar n={c._total} /></td>
                  <td className={`${TD} text-[11px]`}>{whyNow(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="px-3.5 pb-3.5 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 flex-wrap">
          <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={() => openSegment('A')}>
            See all {A.length} in the owner base →
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Showing the top 9 by score. These calls are made personally — never handed to a telecaller.
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4 mb-3.5">
        <ValueByProject base={base} />

        <Card title="Why records are blocked" hint="gate order, first match wins">
          <TableWrap>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={THL}>Block</th>
                  <th className={THR}>Owners</th>
                  <th className={THR}>Gain locked</th>
                  <th className={THR} />
                </tr>
              </thead>
              <tbody>
                {gateRows.map((r) => (
                  <tr key={r.code}>
                    <td className={TD}>
                      {r.label}
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500"><code>{r.code}</code></div>
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>{r.n}</td>
                    <td className={`${TD} text-right tabular-nums ${r.gain ? 'font-bold text-gray-900 dark:text-white' : ''}`}>
                      {r.gain ? inr(r.gain) : <span className="text-[10.5px] text-gray-400 dark:text-gray-500">—</span>}
                    </td>
                    <td className={`${TD} text-right`}>
                      {r.clearable ? <Chip cls="w">clearable</Chip> : <Chip cls="m">structural</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <Banner kind="ok" style={{ marginTop: 12 }}>
            <b>₹{cr(recoverable).toFixed(1)} Cr of gain sits behind blocks your own teams can clear.</b>{' '}
            Close the complaints, capture consent at the next service touch, refresh the valuation notes,
            and those owners return to every outreach list automatically. The structural rows will not
            move, and should not be worked.
          </Banner>

          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5">
            The gate returns a machine-readable code so the send layer enforces it independently. A rule
            that lives only in the screen gets overridden by a keen RM with an Excel export.
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Next 30 days" hint="post-gate">
          <Timeline>
            {soon.length ? soon.map((t, i) => (
              <li key={i}
                  className="flex items-center gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                  onClick={() => openCustomer(t.c.id)}>
                <span className="w-16 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs">{t.days === 0 ? 'today' : `in ${t.days}d`}</span>
                <Avatar name={t.c.name} size="xs" />
                <span className="min-w-0">
                  <b>{t.c.name}</b> — {t.label}
                  <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                    {t.c._seg ? (
                      <>{t.c._project} · <Chip cls={t.c._seg}>{t.c._seg}</Chip></>
                    ) : (
                      <>{t.c.units?.[0]?.project} · <Chip cls="m">incomplete record</Chip></>
                    )}
                  </div>
                </span>
              </li>
            )) : (
              <li className="flex gap-2.5 py-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Nothing dated in the next 30 days.</span>
              </li>
            )}
          </Timeline>
          <div className="mt-2.5">
            <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={() => navigate('/triggers')}>Open the trigger calendar →</button>
          </div>
        </Card>

        <Card title="Data health" hint="the real constraint">
          {HEALTH_FIELDS.map(([l, f]) => {
            const n = base.filter((c) => c.captured[f]).length;
            const p = Math.round((n / tot) * 100);
            return (
              <Meter key={f} label={l} value={`${p}%`} sub={`${n} of ${tot}`}
                     cls={healthMeterCls(p)} width={p} />
            );
          })}
          <Banner kind="ok" style={{ marginTop: 12 }}>
            <b>Do not run a data-collection drive.</b> Nobody fills a form for their builder. They will
            complete a profile to unlock a statement telling them their flat has appreciated{' '}
            {gainPct.toFixed(0)}%. Ship the statement first; the fields follow.
          </Banner>
        </Card>

        <Card title="What needs your decision">
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
            {!!ex.length && (
              <li><b>{ex.length} records are held in the exceptions queue</b> and cannot be shown to a
                customer until reconciled. Intake &amp; exceptions.</li>
            )}
            {!!staleNotes.length && (
              <li><b>{staleNotes.length} valuation note{staleNotes.length > 1 ? 's are' : ' is'} over 90
                days old</b>, holding {inr(gateRows.find((r) => r.code === 'STALE_VALUATION').gain)} of
                gain out of reach. Valuation register.</li>
            )}
            <li><b>{exited} owners sold without you.</b> You earned nothing on those trades. The exit
              register puts a number on the missing resale desk.</li>
            {!!disputed && (
              <li><b>{disputed} of {sent.length} statements sent were disputed on a figure.</b> That ratio
                decides whether you go to 1,000 or go back to the ledger.</li>
            )}
            <li><b>{noConsent} active owners have no marketing consent.</b> They are legally out of reach
              until the next service touch captures it.</li>
            {nf && (
              <li><b>{nf.n} is {nf.days} days out.</b> Statements should land three to four weeks before,
                not during.</li>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
