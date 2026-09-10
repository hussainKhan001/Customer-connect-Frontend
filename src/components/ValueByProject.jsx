import { useMemo, useState } from 'react';
import { Card, Chip, TableWrap, btnGhost } from './Ui.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { cr, inr, fmtD, daysTo } from '../utils/core.js';
import { PROJECTS } from '../constants/projects.js';
import { VAL_STALE_DAYS } from '../constants/seedData.js';
import { unitCalc } from '../utils/derived.js';

/* Two series, so the palette is categorical and validated:
   #F97316 / #B91C1C — CVD ΔE 20.4 (deutan), normal-vision ΔE 21.0. Orange sits at
   2.8:1 on white, below the 3:1 mark floor, so every bar carries a visible value
   label and the card ships a table view. Neither is optional. */
const BLOCK = '#ef4444';

export default function ValueByProject({ base }) {
  const { getThemeColor } = useTheme();
  const REACH = getThemeColor();
  const [table, setTable] = useState(false);
  const [tip, setTip] = useState(null);

  const rows = useMemo(() => {
    const m = new Map(PROJECTS.map((p) => [p.name, { p, owners: 0, reachable: 0, blocked: 0 }]));
    base.forEach((c) => {
      const counted = new Set();
      c.units.forEach((u) => {
        if (u.exited) return;
        const e = m.get(u.project);
        if (!e) return;
        const { gain } = unitCalc(u);
        if (c._blocked) e.blocked += gain; else e.reachable += gain;
        if (!counted.has(u.project)) { e.owners++; counted.add(u.project); }
      });
    });
    return [...m.values()]
      .map((e) => ({ ...e, total: e.reachable + e.blocked, stale: daysTo(e.p.noted) < -VAL_STALE_DAYS }))
      .sort((a, b) => b.total - a.total);
  }, [base]);

  const max = Math.max(...rows.map((r) => r.total), 1);
  const totReach = rows.reduce((s, r) => s + r.reachable, 0);
  const totBlocked = rows.reduce((s, r) => s + r.blocked, 0);
  const grand = totReach + totBlocked;

  /* The KPI above counts active owners only. This chart counts every live unit on
     the book. Two different totals for "unrealised gain" on one screen is a
     defect unless the difference is stated, so state it. */
  const activeGain = useMemo(
    () => base.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + c._gain, 0),
    [base],
  );
  const heldElsewhere = grand - activeGain;

  const move = (r) => (e) => {
    const box = e.currentTarget.closest('.chartwrap').getBoundingClientRect();
    setTip({ r, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  return (
    <Card
      title="Where the value sits"
      hint={
        <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={() => setTable((t) => !t)}>
          {table ? 'Show chart' : 'Show table'}
        </button>
      }
    >
      {table ? (
        <TableWrap>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Project</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Owners</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Reachable now</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Behind the gate</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Total gain</th>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Note dated</th>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.code}>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                    <b className="text-gray-900 dark:text-white">{r.p.name}</b>
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{r.p.entity}</div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{r.owners}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{inr(r.reachable)}</td>
                  <td
                    className={`px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums ${r.blocked ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}
                  >
                    {inr(r.blocked)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums font-bold text-gray-900 dark:text-white">
                    {inr(r.total)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap tabular-nums text-[10.5px] text-gray-400 dark:text-gray-500">
                    {fmtD(r.p.noted)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                    {r.stale ? <Chip cls="r">stale — owners held</Chip> : <Chip cls="g">current</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <div className="chartwrap relative">
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300 mb-3">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: REACH }} />
              Reachable now — ₹{cr(totReach).toFixed(1)} Cr
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: BLOCK }} />
              Behind the gate — ₹{cr(totBlocked).toFixed(1)} Cr
            </span>
          </div>

          {rows.map((r) => (
            <div
              key={r.p.code}
              className="flex items-center gap-3 py-1.5"
              onMouseMove={move(r)}
              onMouseLeave={() => setTip(null)}
            >
              <div className="w-28 sm:w-36 flex-shrink-0">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.p.name}</div>
                <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                  {r.owners} owner{r.owners === 1 ? '' : 's'}
                  {r.stale && <> · <span className="text-red-500 dark:text-red-400 font-bold">stale</span></>}
                </div>
              </div>
              <div className="flex-1 h-5 rounded-full bg-gray-100 dark:bg-gray-700/40 overflow-hidden">
                <div className="flex h-full rounded-full overflow-hidden" style={{ width: `${(r.total / max) * 100}%` }}>
                  {r.reachable > 0 && <i style={{ flex: r.reachable, background: REACH }} />}
                  {r.blocked > 0 && <i style={{ flex: r.blocked, background: BLOCK }} />}
                </div>
              </div>
              <div className="w-24 flex-shrink-0 text-right text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {inr(r.total)}
              </div>
            </div>
          ))}

          {tip && (
            <div
              className="absolute bg-gray-900 dark:bg-gray-950 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl border border-gray-700/80 dark:border-gray-800 pointer-events-none max-w-[260px] z-10 animate-fade-in-down"
              style={{
                left: Math.min(tip.x + 14, 380),
                top: Math.max(tip.y - 12, 0),
              }}
            >
              <div className="font-bold text-[11px] mb-1.5 pb-1.5 border-b border-gray-700/80">{tip.r.p.name}</div>
              <div className="flex justify-between items-center gap-3 text-[11px] py-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: REACH }} />
                  Reachable now
                </span>
                <b className="tabular-nums">{inr(tip.r.reachable)}</b>
              </div>
              <div className="flex justify-between items-center gap-3 text-[11px] py-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <i className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: BLOCK }} />
                  Behind the gate
                </span>
                <b className="tabular-nums">{inr(tip.r.blocked)}</b>
              </div>
              <div className="flex justify-between items-center gap-3 text-[11px] py-0.5 mt-0.5">
                <span>{tip.r.owners} owners</span><b>{inr(tip.r.total)}</b>
              </div>
              <div className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-700">
                {tip.r.stale
                  ? `Valuation note ${Math.abs(daysTo(tip.r.p.noted))} days old — every owner here is held.`
                  : `Valued at ${fmtD(tip.r.p.noted)} · ${tip.r.p.entity}`}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5">
        Unrealised gain on live units, by project, split by whether the owner may be contacted today.
        The red portion is value you hold but cannot act on — a stale valuation note alone holds every
        owner in that project, however clean their record is.
        {heldElsewhere > 0 && (
          <>
            {' '}<b>Basis:</b> ₹{cr(grand).toFixed(1)} Cr across every live unit on the book. The
            ₹{cr(activeGain).toFixed(1)} Cr headline above counts active owners only — the
            ₹{cr(heldElsewhere).toFixed(2)} Cr difference is units still held by owners in transfer or
            mid-exit.
          </>
        )}
      </div>
    </Card>
  );
}
