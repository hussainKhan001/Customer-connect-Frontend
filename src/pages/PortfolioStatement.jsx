import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext.jsx';
import { useCurrentCustomer } from '../hooks/useCurrentCustomer.js';
import { Card, btnGhost } from '../components/Ui.jsx';
import PortfolioDashboard from '../components/PortfolioDashboard.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import { TODAY, fmtD, inr, inrF, displayName } from '../utils/core.js';
import { roll } from '../utils/derived.js';
import { apiFetch } from '../utils/api.js';

const QTR_END_MONTH = ['March', 'June', 'September', 'December'];

/* matches Settings.js's own schema defaults — so the letterhead
   always has real text to show even in the moment before the
   /api/settings fetch resolves, rather than a blank flash. */
const SETTINGS_DEFAULTS = {
  companyName: 'Neoteric Properties Private Limited',
  groupLine: 'A Neoteric Group Company · Navayan Realty · Heaven Heights',
  regdOffice: '4th Floor, Neoteric Towers, City Centre, Gwalior – 474011, Madhya Pradesh',
  cin: 'U70200MP2014PTC034521',
  gstin: '23AAFCN1234M1Z5',
};

/* "Mr." -> Sir, "Mrs./Ms./Smt./Miss" -> Madam, anything else (or
   never captured) -> the neutral form — a formal letter always
   opens with a salutation, never leaves it blank. */
function salutationLine(salutation) {
  const s = (salutation || '').trim().replace(/\.$/, '').toLowerCase();
  if (s === 'mr') return 'Dear Sir,';
  if (['mrs', 'ms', 'smt', 'miss', 'kumari'].includes(s)) return 'Dear Madam,';
  return 'Dear Sir/Madam,';
}

export default function PortfolioStatement() {
  const { base, patchCustomer, settings } = useApp();
  const S = settings || SETTINGS_DEFAULTS;
  const navigate = useNavigate();
  /* Letter is the formal, print-first document (see the theme-forcing
     effect below); Dashboard is the same owner's numbers read as a
     glance-able screen instead — same picker, same Print/PDF + send-
     log flow, just a different rendering of the same roll(c). */
  const [view, setView] = useState('letter');

  /* a customer-facing statement is a formal document, not the app's
     own UI — it should read the same on paper whether the person
     printing it happens to have dark mode on or not. Forced only for
     the duration of the print itself (afterprint restores it), and
     only while this page is mounted, so it never touches printing
     from anywhere else in the app. */
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const onBeforePrint = () => {
      wasDark = root.classList.contains('dark');
      if (wasDark) { root.classList.remove('dark'); root.setAttribute('data-theme', 'light'); }
    };
    const onAfterPrint = () => {
      if (wasDark) { root.classList.add('dark'); root.setAttribute('data-theme', 'dark'); }
    };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

  /* shared by both send actions below — a failed log shouldn't stop
     what the user already asked for (a print, or WhatsApp already
     opened in a new tab), but a successful send should show up in
     Statement Send Log without a page reload, and a role-based denial
     (403, per the PERMS matrix) should actually be shown, not silently
     swallowed. */
  const logSend = async (customerId, ch) => {
    try {
      const res = await apiFetch(`/api/customers/${customerId}/statements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ch }),
      });
      if (res.ok) {
        patchCustomer(await res.json());
      } else if (res.status === 403 || res.status === 409) {
        const body = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'warning', title: 'Not sent', text: body.error || 'This send was blocked.' });
      }
    } catch {
      // offline/unreachable — the seeded/previous send history still renders fine
    }
  };

  const printAndLog = (customerId) => {
    window.print();
    logSend(customerId, 'WhatsApp PDF');
  };

  /* Opens WhatsApp (app on mobile, Web on desktop) with the owner's
     own mobile number and a pre-filled message — this only pre-fills
     text, it can't attach the statement itself, so the flow is still
     "Print / save as PDF" first, then this to send it: the owner
     never sees the app or logs in, exactly the WhatsApp PDF channel
     Statement Send Log already tracks. Held back if no mobile is on
     record — there's nowhere to open the chat to. */
  const shareOnWhatsApp = (c, r) => {
    const digits = (c.mobile || '').replace(/\D/g, '');
    if (digits.length < 10) {
      Swal.fire({ icon: 'warning', title: 'No mobile on record', text: 'Add a mobile number to this owner\'s profile before sharing on WhatsApp.' });
      return;
    }
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const gainPct = r.consideration > 0 ? (r.gain / r.consideration) * 100 : 0;
    const message = [
      `Dear ${c.salutation ? c.salutation + ' ' : ''}${c.name},`,
      '',
      `Here is your portfolio summary with ${S.companyName} as on ${fmtD(TODAY)}:`,
      `• Value today: ${inrF(r.value)}`,
      `• Unrealised gain: ${inrF(r.gain)} (${gainPct.toFixed(0)}%)`,
      `• Outstanding: ${inrF(r.outstanding)}`,
      '',
      'Please find the detailed statement attached separately.',
    ].join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    logSend(c.id, 'WhatsApp PDF');
  };

  /* the picker only ever offers owners the gate has cleared */
  const pool = base.filter((c) => !c._blocked && c._live).sort((a, b) => b._gain - a._gain);

  /* hooks must run unconditionally on every render, so this — and the
     redirect effect below — sit above the "no pool" early return even
     though they're meaningless when pool is empty (current then comes
     back undefined and the effect no-ops). */
  const { current, isFallback } = useCurrentCustomer(pool, pool[0]);
  useEffect(() => {
    if (!current || !isFallback) return;
    navigate(`/statement/${current.id}`, { replace: true });
  }, [current, isFallback, navigate]);

  if (!pool.length) {
    return (
      <div className="p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        No owner currently clears the gate for a statement.
      </div>
    );
  }

  const c = current;
  const r = roll(c);
  const gainPct = (r.gain / r.consideration) * 100;

  const ownerOptions = pool.map((x) => ({
    value: x.id,
    label: `${x.name} — ${x._project} ${x._unit} — gain ${inr(x._gain)}`,
  }));

  const stmtRef = `STMT-${c.id}-Q${Math.ceil((TODAY.getMonth() + 1) / 3)}${TODAY.getFullYear()}`;
  const qtrLabel = `${QTR_END_MONTH[Math.ceil((TODAY.getMonth() + 1) / 3) - 1]} ${TODAY.getFullYear()}`;
  const addrLines = [c.captured?.addr && c.corrAddr ? c.corrAddr : null, c.city].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center mb-3 print:hidden">
        <ThemedSelect
          value={c.id}
          onChange={(v) => navigate(`/statement/${v}`, { replace: true })}
          options={ownerOptions}
          className="w-full sm:w-auto sm:min-w-[340px] sm:max-w-[340px]"
        />
        <div className="flex rounded-full border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/80">
          {[['letter', 'Letter'], ['dashboard', 'Dashboard']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                view === k ? 'bg-primary-500 text-white shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={() => printAndLog(c.id)}>
          Print / save as PDF
        </button>
        <button
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
          onClick={() => shareOnWhatsApp(c, r)}
          title={c.mobile ? `Opens WhatsApp for ${c.mobile}` : 'No mobile on record'}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Share on WhatsApp
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {base.filter((x) => x._blocked).length} blocked owners are excluded from this picker by design.
        </span>
      </div>

      {view === 'dashboard' && <PortfolioDashboard c={c} r={r} companyName={S.companyName} />}

      {/* the document itself is deliberately theme-invariant — a formal
         letter reads the same on paper regardless of which UI theme
         happened to be active when it was generated, so nothing below
         this line carries a dark: variant. */}
      {view === 'letter' && (
      <div className="bg-white text-gray-900 max-w-[790px] mx-auto shadow-md print:shadow-none p-8 sm:p-10 font-serif text-[12.5px] leading-relaxed print:max-w-none">

        {/* 1. Letterhead */}
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-bold tracking-wide uppercase m-0">{S.companyName}</p>
          <p className="font-sans text-[11px] tracking-wide text-gray-700 mt-1 mb-1">
            {S.groupLine}
          </p>
          <p className="font-sans text-[10px] text-gray-600 mb-2">
            Regd. Office: {S.regdOffice}
            &nbsp;|&nbsp; CIN: {S.cin} &nbsp;|&nbsp; GSTIN: {S.gstin}
          </p>
        </div>
        <div className="border-t-4 border-double border-gray-900 mb-4" />

        {/* 2. Title */}
        <p className="text-center font-bold text-[15px] tracking-[0.2em] underline underline-offset-4 mb-4">
          PORTFOLIO STATEMENT
        </p>

        {/* 3. Ref row */}
        <div className="flex justify-between text-[12.5px] mb-3">
          <span><b>Statement No.:</b> {stmtRef}</span>
          <span><b>Date:</b> {fmtD(TODAY)}</span>
        </div>

        {/* 4. To */}
        <div className="mb-3">
          <p className="m-0">To,</p>
          <p className="m-0">
            {displayName(c)}<br />
            Owner Reference: {c.id}<br />
            {addrLines.join(', ')}
          </p>
        </div>

        {/* 5. Subject */}
        <p className="font-bold underline underline-offset-2 mb-3">
          Subject: Portfolio Valuation Statement for the Quarter Ended {qtrLabel}
        </p>

        {/* 6. Salutation + paragraph */}
        <p className="mb-2.5">{salutationLine(c.salutation)}</p>
        <p className="text-justify mb-4">
          We are pleased to furnish herewith the Portfolio Valuation Statement in respect of the
          immovable property/properties held by you through {S.companyName} and
          its group entities, as recorded in our books as on the date mentioned above. The valuation
          stated herein has been arrived at on the basis of registered resale transactions in the
          vicinity of the property/properties over the preceding two (2) quarters, floored at the
          prevailing Government Circle Rate, and is furnished solely for your general information
          and record.
        </p>

        {/* 7. Table */}
        <table className="w-full border-collapse font-sans text-[11px] mb-4">
          <thead>
            <tr>
              <th className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-center w-[8%]">Sr. No.</th>
              <th className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-center w-[22%]">Project / Unit</th>
              <th className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-center w-[22%]">Entity</th>
              <th className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-center w-[16%]">Valuation Date</th>
              <th className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-center w-[16%]">Current Valuation</th>
              <th className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-center w-[16%]">Ledger Status</th>
            </tr>
          </thead>
          <tbody>
            {r.units.map((unit, i) => (
              <tr key={unit.unit + unit.project}>
                <td className="border border-gray-900 p-1.5 text-center">{i + 1}</td>
                <td className="border border-gray-900 p-1.5">{unit.project} / {unit.unit}</td>
                <td className="border border-gray-900 p-1.5">{unit.entity}</td>
                <td className="border border-gray-900 p-1.5 text-center">{fmtD(unit.val.notedOn)}</td>
                <td className="border border-gray-900 p-1.5 text-right">{inrF(unit.currentValue)}</td>
                <td className="border border-gray-900 p-1.5 text-center">{unit.regDate ? 'Registered' : 'Registry Pending'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-right">
                Total Valuation / Unrealised Gain
              </td>
              <td className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-right">{inrF(r.value)}</td>
              <td className="border border-gray-900 bg-gray-200 font-bold p-1.5 text-center">{inrF(r.gain)}</td>
            </tr>
          </tfoot>
        </table>

        {/* 8. Notes */}
        <p className="font-bold underline underline-offset-2 mb-1.5">Notes:</p>
        <ol className="list-decimal pl-5 mb-4 space-y-1 text-justify text-[11.5px]">
          <li>The valuation stated herein is derived from registered resale transactions in the vicinity of the property over the preceding two (2) quarters and is floored at the prevailing Government Circle Rate.</li>
          <li>Valuations are reviewed and revised on a quarterly basis and are subject to change based on prevailing market conditions at the relevant time.</li>
          <li>This statement is issued for general information and record-keeping purposes only and does not constitute a legal opinion, financial advice, or a certificate of title.</li>
          <li>Particulars, if any, reflected as "Not on Record" indicate information not presently available with the Company and do not affect the validity of the remaining particulars stated herein.</li>
          <li>Property values are subject to market risk and may rise as well as fall; past performance is not indicative of future returns.</li>
          <li>Any discrepancy in the particulars stated above may kindly be reported in writing to the Company's Registered Office within thirty (30) days of receipt of this statement.</li>
        </ol>

        {/* 9. Closing */}
        <p className="mb-1">
          This statement is issued in good faith based on the records available with the Company as
          on the date mentioned above, and without prejudice to the rights of either party.
        </p>
        <p className="mb-0.5">Thanking you,</p>
        <p className="font-bold mb-10">For {S.companyName}</p>

        {/* 10. Signature block */}
        <div className="flex justify-between items-end mb-6">
          <div className="w-3/5">
            <div className="border-t border-gray-900 w-56 pt-1 mt-10">
              <div className="font-bold">Authorised Signatory</div>
              <div className="font-sans text-[11px] text-gray-600">Manager – Customer Relations</div>
            </div>
          </div>
          <div className="w-28 h-24 border-2 border-dashed border-gray-900 flex items-center justify-center text-center font-sans text-[10.5px] text-gray-600">
            Company Seal
          </div>
        </div>

        {/* 11. Footer */}
        <div className="flex justify-between items-baseline pt-1.5 border-t border-gray-400 font-sans text-[9.5px] text-gray-600">
          <span>{S.companyName} · Regd. Office: {S.regdOffice}</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
      )}

      {view === 'letter' && (
      <Card title="Why this page is the whole platform" className="max-w-[790px] mx-auto mt-4 print:hidden">
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This single page does three jobs. It is a <b>loyalty product</b> no builder in Gwalior currently
          gives. It is a <b>data-capture mechanism</b> that fills your empty birthday and anniversary
          fields without one form-filling drive. And it is a <b>re-investment pitch</b> that reframes "the
          flat I bought" into "the investment that returned {isNaN(gainPct) ? '0' : gainPct.toFixed(0)}%".
          Ship this before anything else on the platform — and pilot on 50, not 1,000, because every
          statement is also an invitation to audit your own ledger.
        </div>
      </Card>
      )}
    </>
  );
}
