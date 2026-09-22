/* Owner-facing visual alternative to the formal Portfolio Statement
   letter — same owner picker, same Print/PDF + send-log flow (see
   PortfolioStatement.jsx), but a dashboard read at a glance instead of
   a document read top to bottom. Built from the same roll()/unitCalc()
   rollup every other per-owner view already uses — no new data model.

   Charts are hand-rolled divs (no charting library — the app has none
   and these are always a handful of data points per owner), following
   the house pattern already set by Meter/ScoreBar: a track + a filled
   bar, colour drawn from the existing Tailwind design-system tokens
   (primary orange, green for gain, gray for neutral/outstanding)
   rather than a new palette. */
import { Wallet, TrendingUp, TrendingDown, Building2, Award } from 'lucide-react';
import { Card, Kpi, Kpis, Meter } from './Ui.jsx';
import { inr, inrF, psf } from '../utils/core.js';

/* single measure across a handful of named entities (units) — one
   consistent hue throughout, since the axis labels (not colour) carry
   identity here; sorted so the eye reads it as a ranking. */
function ValueBar({ label, sub, value, max }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-baseline text-[12.5px] mb-1">
        <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">{label}</span>
        <span className="text-gray-500 dark:text-gray-400 text-[11px] flex-shrink-0 ml-2">{sub}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PortfolioDashboard({ c, r, companyName }) {
  const outstandingPct = r.consideration > 0 ? (r.outstanding / r.consideration) * 100 : 0;
  const paidPct = 100 - outstandingPct;

  /* grouped by project, not by individual unit — an owner holding two
     units in the same project reads as one bar, matching how the rest
     of the app (Owner Base's project tiles) already rolls units up. */
  const byProject = new Map();
  r.units.forEach((u) => {
    const key = u.project;
    const entry = byProject.get(key) || { project: key, value: 0, gain: 0, units: 0 };
    entry.value += u.currentValue;
    entry.gain += u.gain;
    entry.units += 1;
    byProject.set(key, entry);
  });
  const projectRows = [...byProject.values()].sort((a, b) => b.value - a.value);
  const maxProjectValue = Math.max(...projectRows.map((p) => p.value), 1);

  const s = c._s;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="text-center mb-4">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{companyName}</p>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">Portfolio Dashboard</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.name} · {c.id}</p>
      </div>

      <Kpis>
        <Kpi label="Units held" value={r.units.length} icon={Building2} highlight />
        <Kpi label="Consideration" value={inrF(r.consideration)} icon={Wallet} />
        <Kpi label="Value today" value={inrF(r.value)} icon={TrendingUp} tone="o" />
        <Kpi label="Unrealised gain" value={inrF(r.gain)} tone="g" icon={TrendingUp}
          sub={r.consideration > 0 ? `${((r.gain / r.consideration) * 100).toFixed(0)}% over consideration` : undefined} />
      </Kpis>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Paid vs Outstanding" hint={inrF(r.consideration)}>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700/60">
            {paidPct > 0 && <div className="h-full bg-green-500" style={{ width: `${paidPct}%` }} />}
            {outstandingPct > 0 && <div className="h-full bg-amber-500 ml-0.5" style={{ width: `${outstandingPct}%` }} />}
          </div>
          <div className="flex justify-between mt-3 text-[12.5px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Paid <b className="text-gray-900 dark:text-white ml-1">{inrF(r.paid)}</b>
              <span className="text-gray-400 dark:text-gray-500">({paidPct.toFixed(0)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Outstanding <b className="text-gray-900 dark:text-white ml-1">{inrF(r.outstanding)}</b>
              <span className="text-gray-400 dark:text-gray-500">({outstandingPct.toFixed(0)}%)</span>
            </span>
          </div>
        </Card>

        <Card title="Propensity" hint={s ? `score ${s.total}` : undefined}>
          {s ? (
            [['capacity', 'Capacity'], ['trust', 'Trust'], ['timing', 'Timing'], ['engagement', 'Engagement']]
              .map(([k, l]) => (
                <Meter key={k} label={l} value={Math.round(s[k])} cls={s[k] >= 65 ? 'o' : ''} width={s[k]} />
              ))
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Not scored — the contact gate is closed, so segment is set by rule rather than propensity.
            </div>
          )}
        </Card>
      </div>

      <Card title="Value by project" hint={`${projectRows.length} project${projectRows.length === 1 ? '' : 's'}`} className="mt-4">
        {projectRows.map((p) => (
          <ValueBar
            key={p.project}
            label={`${p.project}${p.units > 1 ? ` (${p.units} units)` : ''}`}
            sub={`${inrF(p.value)} · ${p.gain >= 0 ? '+' : ''}${inr(p.gain)} gain`}
            value={p.value}
            max={maxProjectValue}
          />
        ))}
      </Card>

      <Card title="Units" pad={false} className="mt-4 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {r.units.map((u, idx) => (
            <div key={`${u.project}-${u.unit}-${idx}`} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{u.unit}</div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500">{u.project} · {psf(u.valueRate)}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm text-gray-900 dark:text-white tabular-nums">{inrF(u.currentValue)}</div>
                <div className={`text-[11px] tabular-nums flex items-center gap-1 justify-end ${u.gain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {u.gain >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {inr(u.gain)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {c._seg && (
        <div className="flex items-center gap-2 justify-center mt-4 text-xs text-gray-500 dark:text-gray-400">
          <Award className="w-3.5 h-3.5" />
          Segment {c._seg} owner — figures as on today, floored at Government Circle Rate.
        </div>
      )}
    </div>
  );
}
