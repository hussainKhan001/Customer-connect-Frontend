import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Banner, TableWrap } from '../components/Ui.jsx';
import { fmtD, daysTo, psf } from '../utils/core.js';
import { PROJECTS } from '../constants/projects.js';
import { VAL_STALE_DAYS } from '../constants/seedData.js';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const thR = `${th} text-right`;
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap';
const tdR = `${td} text-right tabular-nums`;
const sub2 = 'text-[10.5px] text-gray-400 dark:text-gray-500';

export default function ValuationRegister() {
  const { base } = useApp();
  const anyStale = PROJECTS.some((p) => daysTo(p.noted) < -VAL_STALE_DAYS);

  return (
    <>
      <Banner kind={anyStale ? 'warn' : 'good'}>
        <b>Every gain figure in this system traces to one of these notes.</b> There is no market data feed
        for Gwalior, so the note is the evidence — the registered resales it is built on, the date, and the
        named person who signed it. A note older than 90 days automatically holds every owner in that
        project out of all outreach, because a gain figure computed on stale evidence should not reach a
        customer.
      </Banner>

      <Card pad={false} className="overflow-hidden">
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Project</th><th className={th}>Entity</th><th className={thR}>Launch rate</th><th className={thR}>Our ask</th>
                <th className={thR}>Recent resale</th><th className={thR}>Circle rate</th><th className={thR}>System uses</th>
                <th className={th}>Noted on</th><th className={th}>Signed by</th><th className={th}>Basis</th><th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((p) => {
                const stale = daysTo(p.noted) < -VAL_STALE_DAYS;
                const n = base.filter((c) => c.units.some((u) => u.project === p.name)).length;
                return (
                  <tr key={p.code}>
                    <td className={td}>
                      <b className="text-gray-900 dark:text-white">{p.name}</b>
                      <div className={sub2}>{n} owners · launched {p.launch}</div>
                    </td>
                    <td className={`${td} ${sub2}`}>{p.entity}</td>
                    <td className={`${tdR} ${sub2}`}>{psf(p.lr)}</td>
                    <td className={`${tdR} ${sub2}`}>{psf(p.ask)}</td>
                    <td className={tdR}>{psf(p.resale)}</td>
                    <td className={tdR}>{psf(p.circle)}</td>
                    <td className={tdR}><b className="text-gray-900 dark:text-white">{psf(Math.max(p.circle, p.resale))}</b></td>
                    <td className={`${td} tabular-nums`}>
                      {fmtD(p.noted)}
                      <div className={sub2}>{Math.abs(daysTo(p.noted))} days ago</div>
                    </td>
                    <td className={`${td} ${sub2}`}>{p.by}</td>
                    <td className={`${td} ${sub2}`}>{p.basis}</td>
                    <td className={td}>{stale ? <Chip cls="r">stale — owners held</Chip> : <Chip cls="g">current</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <Card title="Valuation policy" hint="write this before the first statement">
        <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
          <li><b>Value at registered resale, floored at circle rate.</b> Never your own ask price. If a
            project's prices flatten, your own dashboard must not become the buyer's evidence against you.</li>
          <li><b>Refreshed monthly, signed by a named person.</b> Unsigned numbers are indefensible the
            moment a customer challenges one.</li>
          <li><b>Record the transactions the note is built on.</b> Wildflower Township has no resale history
            yet, so it sits at circle rate — and that is the honest answer, not a gap to fill with an
            estimate.</li>
          <li><b>Thin evidence is disclosed, not smoothed.</b> The Statement rests on a single transaction.
            Either widen the window or say so on the note.</li>
          <li><b>Once you publish a number you have set a floor.</b> The day you start buying units back,
            every assessed value you have ever quoted becomes a negotiating position. Decide the policy
            before the first trade, not after the third argument.</li>
        </ul>
      </Card>
    </>
  );
}
