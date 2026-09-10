import { useApp } from '../context/AppContext.jsx';
import { Card, BtnPrimary, btnGhost } from '../components/Ui.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { DEFAULT_W, TRUST_HEAVY_W } from '../constants/segments.js';

const PILLARS = [
  ['capacity', 'Capacity', 'Can they write the cheque'],
  ['trust', 'Trust', 'Should we even be talking'],
  ['timing', 'Timing', 'Is the window open now'],
  ['engagement', 'Engagement', 'Are they already an advocate'],
];

/* segment tile top-border colour, per the shared segment-tile convention */
const SEG_BORDER = { A: 'border-t-primary-500', B: 'border-t-blue-500', C: 'border-t-red-500', D: 'border-t-indigo-500' };

export default function ScoringEngine() {
  const { base, weights, setWeights } = useApp();
  const { getThemeColor } = useTheme();
  const cnt = (k) => base.filter((c) => c._seg === k).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4">
      <Card title="Weights" hint="segments redraw live">
        {PILLARS.map(([k, l, d]) => (
          <div className="flex items-center gap-3 mb-3" key={k}>
            <div className="w-32 flex-shrink-0">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{l}</div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{d}</div>
            </div>
            <input
              type="range" min="0" max="60" value={weights[k]} aria-label={`${l} weight`}
              className="flex-1"
              style={{ accentColor: getThemeColor() }}
              onChange={(e) => setWeights((w) => ({ ...w, [k]: +e.target.value }))}
            />
            <div className="w-12 text-right text-sm font-bold tabular-nums text-gray-900 dark:text-white">{weights[k]}%</div>
          </div>
        ))}

        <div className="flex gap-2 mt-3.5">
          <BtnPrimary className="text-xs px-2.5 py-1.5" onClick={() => setWeights(DEFAULT_W)}>Reset to 40 / 25 / 20 / 15</BtnPrimary>
          <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={() => setWeights(TRUST_HEAVY_W)}>Try trust-heavy</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {['A', 'B', 'C', 'D'].map((k) => (
            <div key={k} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-t-4 ${SEG_BORDER[k]} p-3.5`}>
              <div className="text-sm font-bold text-gray-800 dark:text-gray-100">Segment {k}</div>
              <div className="text-2xl font-black tabular-nums text-gray-900 dark:text-white mt-1">{cnt(k)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="What each pillar is made of">
        <div className="bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5 text-[11.5px] leading-relaxed font-mono">
          <b>Capacity</b> = paid-up ratio (30) + loan-closure proximity (25) + unrealised gain quantum (25)
          + occupation band (20)<br />
          <b>Trust</b> = zero open complaints (35) + NPS (30) + payment discipline less cheque returns (25)
          + no litigation (10)<br />
          <b>Timing</b> = holding ≥ 24 months (30) + loan closed or prepaying (25) + life-stage trigger
          within 45 days (25) + festive window (20)<br />
          <b>Engagement</b> = referrals given (40) + events attended (30) + site visits and portal logins (30)
        </div>

        <h3 className="text-[12.5px] font-bold text-gray-800 dark:text-gray-100 mt-3.5 mb-2">Rules the score cannot override</h3>
        <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
          <li><b>The gate runs first, in fixed order.</b> Exited, transfer pending, litigation, open
            complaint, no consent, stale valuation. Any hit forces Segment C regardless of score.</li>
          <li><b>Segment A never goes to a telecaller.</b> These are ₹40 L to ₹1 Cr second purchases from
            people who already trust you. The CEO or GM calls personally, or nobody does.</li>
          <li><b>Segment D is not a failure bucket.</b> High trust, low capacity — the referral engine, and
            the programme is built for them, not for sales.</li>
          <li><b>Valuation is resale-led and floored at circle rate.</b> Never your own ask price.</li>
          <li><b>Weights are a hypothesis.</b> Re-fit them against actual second-purchase conversions after
            two quarters. Whatever you set today is a written, testable guess and nothing more.</li>
        </ul>
      </Card>
    </div>
  );
}
