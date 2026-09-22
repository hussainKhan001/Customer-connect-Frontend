/* "Generate portfolio statement" from Customer Master opens this
   instead of navigating to the standalone Portfolio Statement page —
   the owner is already known, so there's no reason to leave the page
   to see their statement. Wraps PortfolioStatementView (the document
   itself) in a wide drawer instead of a route.

   Owns the Letter/Dashboard toggle and the Download PDF/Share on
   WhatsApp actions — they live in the drawer's static footer (always
   reachable, not scrolled away with the document) rather than inline
   above the document the way the old standalone page had them. */
import { useState } from 'react';
import { MessageCircle, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import Modal from './Modal.jsx';
import PortfolioStatementView from './PortfolioStatementView.jsx';
import { btnGhost } from './Ui.jsx';
import { useApp } from '../context/AppContext.jsx';
import { TODAY, fmtD, inrF, displayName } from '../utils/core.js';
import { roll } from '../utils/derived.js';
import { apiFetch } from '../utils/api.js';
import { buildPortfolioStatementPdfBlob, downloadBlob } from '../utils/statementPdf.js';
import { toast } from '../utils/toast.js';

const SETTINGS_DEFAULTS = {
  companyName: 'Neoteric Properties Private Limited',
  groupLine: 'A Neoteric Group Company · Navayan Realty · Heaven Heights',
  regdOffice: '4th Floor, Neoteric Towers, City Centre, Gwalior – 474011, Madhya Pradesh',
  cin: 'U70200MP2014PTC034521',
  gstin: '23AAFCN1234M1Z5',
};

export default function PortfolioStatementDrawer({ customer: c, onClose }) {
  const { patchCustomer, settings } = useApp();
  const S = settings || SETTINGS_DEFAULTS;
  const [view, setView] = useState('letter');
  const [generating, setGenerating] = useState(false);

  const r = roll(c);
  const stmtRef = `STMT-${c.id}-Q${Math.ceil((TODAY.getMonth() + 1) / 3)}${TODAY.getFullYear()}`;

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

  /* built natively from the same data the Letter view renders, not a
     screenshot of it — so this works regardless of which view (Letter
     or Dashboard) happens to be on screen when it's clicked. */
  const downloadPdf = async () => {
    setGenerating(true);
    try {
      const blob = await buildPortfolioStatementPdfBlob({ c, S, r });
      downloadBlob(blob, `${stmtRef}.pdf`);
      logSend(c.id, 'WhatsApp PDF');
      toast.success('PDF ready', `${stmtRef}.pdf downloaded — attach it in WhatsApp to send.`);
    } catch {
      toast.error('Could not generate the PDF', 'Try again in a moment.');
    } finally {
      setGenerating(false);
    }
  };

  const warnNoMobile = () => {
    Swal.fire({ icon: 'warning', title: 'No mobile on record', text: 'Add a mobile number to this owner\'s profile before sharing on WhatsApp.' });
  };

  const waDigits = (c.mobile || '').replace(/\D/g, '');
  const waHasMobile = waDigits.length >= 10;
  const waPhone = waDigits.length === 10 ? `91${waDigits}` : waDigits;
  const waGainPct = r.consideration > 0 ? (r.gain / r.consideration) * 100 : 0;
  const waMessage = [
    `Dear ${c.salutation ? c.salutation + ' ' : ''}${c.name},`,
    '',
    `Here is your portfolio summary with ${S.companyName} as on ${fmtD(TODAY)}:`,
    `• Value today: ${inrF(r.value)}`,
    `• Unrealised gain: ${inrF(r.gain)} (${waGainPct.toFixed(0)}%)`,
    `• Outstanding: ${inrF(r.outstanding)}`,
    '',
    'Please find the detailed statement attached separately.',
  ].join('\n');
  const waHref = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

  /* a real button + an onClick function, not an <a href> — window.open()
     called synchronously from a genuine click is normally a trusted
     user gesture browsers don't block, but a site-level "always block
     pop-ups" permission (set once, remembered per-origin) blocks it
     regardless of how it's triggered — confirmed happening on at least
     one real setup. Rather than leave that as a dead end, the failure
     path offers a one-click same-tab fallback (which can never be
     blocked, since no new window is created) instead of just an error. */
  const openWhatsApp = () => {
    logSend(c.id, 'WhatsApp PDF');
    const win = window.open(waHref, '_blank');
    if (!win) {
      Swal.fire({
        icon: 'warning',
        title: 'Pop-up blocked',
        text: 'Your browser blocked the new tab. Allow pop-ups for this site to open WhatsApp in a new tab, or continue in this one instead.',
        showCancelButton: true,
        confirmButtonText: 'Open in this tab',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) window.location.href = waHref;
      });
    }
  };

  return (
    <Modal
      drawer
      drawerWidth="sm:w-[900px]"
      title="Portfolio statement"
      subtitle={`${displayName(c)} · ${c.id}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center w-full">
          <div className="self-start relative flex rounded-full border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800/80">
            <div
              className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-primary-500 shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: view === 'dashboard' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {[['letter', 'Letter'], ['dashboard', 'Dashboard']].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={`relative z-10 flex-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-300 ${
                  view === k ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto sm:ml-auto">
            <button
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold text-white bg-primary-500 hover:bg-primary-600 shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={downloadPdf}
              disabled={generating}
            >
              <Download className="w-3.5 h-3.5" />
              {generating ? 'Generating…' : 'Download PDF'}
            </button>
            {waHasMobile ? (
              <button
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 shadow-2xs"
                onClick={openWhatsApp}
                title={`Opens WhatsApp for ${c.mobile}`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Share on WhatsApp
              </button>
            ) : (
              <button
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold text-white bg-green-600/60 cursor-not-allowed shadow-2xs"
                onClick={warnNoMobile}
                title="No mobile on record"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Share on WhatsApp
              </button>
            )}
            <button className={`${btnGhost} flex-1 sm:flex-none`} onClick={onClose}>Close</button>
          </div>
        </div>
      }
    >
      <PortfolioStatementView customer={c} view={view} S={S} r={r} stmtRef={stmtRef} />
    </Modal>
  );
}
