import { Check } from 'lucide-react';
import { Card, Banner, Timeline, Dot, Chip } from '../../components/Ui.jsx';
import { fmtD, fmtDM, annivIn, daysTo, todayInput } from '../../utils/core.js';
import { roll } from '../../utils/derived.js';

/* Only 'Birthday' and 'Wedding anniversary' are tracked in the exact
   same wording by triggerList() (see derived.js) — the board's own
   Trigger Calendar / header bell can only ever ack those two labels
   for this customer, so only these two can show a done+remark status
   here. Portfolio reasons below (booking anniversary, LTCG window…)
   carry the unit number in their label text here, which the board
   never sees, so there's nothing to cross-reference for those. */
function findAck(c, label) {
  return (c.triggerAcks || []).find((a) => a.label === label && a.date === todayInput());
}

const when = (d) =>
  d < 0 ? Math.abs(Math.round(d / 365)) + ' yr ago'
  : d === 0 ? 'today'
  : d < 400 ? 'in ' + d + 'd'
  : 'in ' + (d / 365).toFixed(1) + ' yr';

export default function MTriggers({ c }) {
  const r = roll(c);
  const g = c._g;
  const t = [];

  if (c.captured.dob) t.push(['Birthday', annivIn(c.dob), fmtDM(c.dob), 'personal']);
  if (c.captured.anniv && c.spouseDob) t.push(['Wedding anniversary', annivIn(c.spouseDob), fmtDM(c.spouseDob), 'personal']);
  if (c.captured.kid) c.children.forEach((k) => t.push([`${k.n}'s birthday`, annivIn(k.dob), fmtDM(k.dob), 'personal']));

  r.units.forEach((u) => {
    /* an incomplete/shell unit (see validateIncomplete.js) has no real
       bookDate yet — annivIn(null) reads as "not captured" (null), and
       null coerces to 0 in when()'s `d < 400` check, rendering as the
       nonsensical "in nulld" instead of just not showing a row for a
       date that was never actually captured. */
    if (u.bookDate) t.push(['Booking anniversary — ' + u.unit, annivIn(u.bookDate), fmtDM(u.bookDate), 'portfolio']);
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
      {!g.open && (
        <Banner kind="block">
          <b>All triggers suppressed.</b> The dates are still tracked, but nothing fires while the gate is
          closed. A birthday message to someone with an open seepage complaint is worse than silence.
        </Banner>
      )}

      <Card title="Dated reasons to make contact" hint={`${t.length} tracked`}>
        <Timeline>
          {t.map(([l, d, dt, k], i) => {
            const ack = d === 0 && (l === 'Birthday' || l === 'Wedding anniversary') ? findAck(c, l) : null;
            return (
            <li key={i} className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
              <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{when(d)}</span>
              <span className="flex-1">
                <Dot tone={k === 'money' ? 'g' : k === 'portfolio' ? 'o' : ''} />
                {l}
                {ack && <Chip cls="g">done</Chip>}
                <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{dt} · {k}</div>
                {ack && (
                  <div className="text-[10.5px] text-green-700 dark:text-green-400 mt-0.5">
                    <Check className="w-3 h-3 inline -mt-0.5 mr-1" />
                    Done{ack.by ? ` by ${ack.by}` : ''}{ack.remark ? ` — ${ack.remark}` : ''}
                  </div>
                )}
              </span>
            </li>
            );
          })}
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
