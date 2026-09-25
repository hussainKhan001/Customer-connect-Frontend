import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, ArrowLeft, AlertTriangle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCurrentCustomer } from '../hooks/useCurrentCustomer.js';
import { useFollowUpCountdown } from '../hooks/useFollowUpCountdown.js';
import { useFirstTouch } from '../hooks/useFirstTouch.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { Card, Chip, Row, KV, Meter, Dot, confMeterCls, btnGhost, BtnPrimary } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import EditProfileModal from '../components/EditProfileModal.jsx';
import StatusModal from '../components/StatusModal.jsx';
import CallModal from '../components/CallModal.jsx';
import SegmentOverrideModal from '../components/SegmentOverrideModal.jsx';
import InviteListDrawer from '../components/InviteListDrawer.jsx';
import PortfolioStatementDrawer from '../components/PortfolioStatementDrawer.jsx';
import { initials, inrF, fmtD, fmtDT, displayName, hasCoApplicant } from '../utils/core.js';
import { roll, confidence, segDisplay, timelineItems } from '../utils/derived.js';
import { STATUSLBL } from '../constants/segments.js';

import MOverview from './master/MOverview.jsx';
import MPortfolio from './master/MPortfolio.jsx';
import MInvestor from './master/MInvestor.jsx';
import MLedger from './master/MLedger.jsx';
import MRelationship from './master/MRelationship.jsx';
import MFollowUps from './master/MFollowUps.jsx';
import MDocuments from './master/MDocuments.jsx';
import MActivity from './master/MActivity.jsx';
import MGovernance from './master/MGovernance.jsx';
import MAuditLog from './master/MAuditLog.jsx';

/* an optional 3rd element gates the tab behind a capability — same as
   PAGES' own `capability` field in navigation.js. Audit log shares the
   exact row the global Audit Log page uses ('Module: Audit log'), so
   whoever can see the system-wide trail can see this owner-scoped
   slice of it, and nobody else gets a tab pointing at a route they'd
   just get a 403 from. */
const CTABS = [
  ['overview', 'Overview'], ['portfolio', 'Portfolio'], ['investor', 'Investor'], ['ledger', 'Ledger'],
  ['relationship', 'Relationship'], ['followups', 'Timeline'],
  ['documents', 'Documents'], ['activity', 'Activity log'], ['governance', 'Consent & gate'],
  ['audit', 'Audit log', 'Module: Audit log'],
];

const TAB_VIEWS = {
  overview: MOverview, portfolio: MPortfolio, investor: MInvestor, ledger: MLedger,
  relationship: MRelationship, followups: MFollowUps, documents: MDocuments,
  activity: MActivity, governance: MGovernance, audit: MAuditLog,
};

/* short chip labels for confidence()'s full sentence-length checks
   (see derived.js) — the full wording still shows on hover via the
   chip's title attribute, this is only what's printed on the chip
   itself. Falls back to the full label if derived.js's wording ever
   drifts from this map, rather than silently dropping the check. */
const CONF_SHORT_LABEL = {
  'Identity verified — PAN and KYC': 'Identity',
  'Mobile on record': 'Mobile',
  'Address updated since booking': 'Address',
  'Owner status confirmed active': 'Status',
  'Paid-to-date within consideration': 'Payments',
  'Registry on record for every possessed unit': 'Registry',
  'Valuation note dated within 90 days': 'Valuation',
  'DPDP consent recorded': 'Consent',
  'Date of birth captured': 'DOB',
  'Anniversary captured': 'Anniversary',
};

export default function CustomerMaster() {
  const { base, weights } = useApp();
  const { can } = useAuth();
  const { getThemeColor } = useTheme();
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  /* land on the strongest Segment A record when nobody has been picked */
  const fallback = base.find((c) => c._seg === 'A') || base[0];
  const { current, isFallback } = useCurrentCustomer(base, fallback);

  /* keep the URL in sync with what's actually being shown — a missing/
     unknown :id resolves to the fallback record, and a missing :tab
     defaults to overview; both get corrected into the address bar
     rather than left silently mismatched. */
  useEffect(() => {
    if (!current) return;
    if (isFallback || !tab) navigate(`/master/${current.id}/${tab || 'overview'}`, { replace: true });
  }, [current, isFallback, tab, navigate]);

  const firstTouch = useFirstTouch(current?.id);

  if (!current) return <div className="text-xs text-gray-500 dark:text-gray-400">No owners on book.</div>;

  const c = current;
  const r = roll(c);
  const cf = confidence(c);
  const sd = segDisplay(c);
  const g = c._g;
  const s = c._s;
  const Tab = TAB_VIEWS[tab] || TAB_VIEWS.overview;
  const footerMiss = [
    !c.captured.dob && 'date of birth',
    !c.captured.anniv && hasCoApplicant(c) && 'anniversary',
    !c.captured.occ && 'income band',
    !c.captured.addr && 'current address',
  ].filter(Boolean);

  return (
    <>
      {/* Same shape as Nexora's own Lead Detail page: a persistent left
         sidebar (identity + summary cards) that has nothing to do with
         which tab is picked, sitting BESIDE a right pane that owns its
         own tab bar and content — not a tab row spanning the full
         width with two columns underneath it, which is what this page
         used to be. `<main>` (App.jsx) is already the page's one
         scroll container; rather than guess a viewport-relative height
         for a SECOND, independently-scrolling pair of panes (fragile
         without a browser here to check it against, and this app's
         real header height), the sidebar instead just goes
         `lg:sticky` so it stays in view while long tab content
         scrolls past it in the normal page flow — same visual effect,
         no nested scroll containers to get subtly wrong. */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
          <div className="p-3.5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => navigate('/base')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex gap-3 items-start">
              <div
                className="w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                style={{ backgroundColor: getThemeColor() }}
              >
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">{displayName(c)}</h1>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {c.id} · {c.city}
                </div>
                {firstTouch?.actor && (
                  <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate" title={fmtDT(firstTouch.at)}>
                    Added by {firstTouch.actor.name}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <button onClick={() => setSegmentOpen(true)} className="inline-flex items-center gap-1 group" title="Override segment">
                <Chip cls={sd.cls}>{sd.t}{c._segOverridden ? ' · manual' : ''}</Chip>
                <Pencil className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
              <button onClick={() => setStatusOpen(true)} className="inline-flex items-center gap-1 group" title="Change owner status">
                <Chip cls={c.status === 'ACTIVE' ? 'g' : 'r'}>{STATUSLBL[c.status]}</Chip>
                <Pencil className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
              {g.open ? <Chip cls="g">contact open</Chip> : <Chip cls="r">gate closed</Chip>}
              {c._live > 1 && <Chip cls="k">{c._live} units</Chip>}
            </div>

            <ThemedSelect
              className="w-full mt-3"
              value={c.id}
              onChange={(v) => navigate(`/master/${v}/overview`, { replace: true })}
              options={base.map((x) => ({ value: x.id, label: `${x.name} — ${STATUSLBL[x.status]}` }))}
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5">
            <NextFollowUpCard c={c} />

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Units held" v={c._live} sub={c.units.length > c._live ? `+${c.units.length - c._live} exited` : null} />
              <Stat label="Consideration" v={c._live ? inrF(r.consideration) : '—'} />
              <Stat label="Paid" v={c._live ? inrF(r.paid) : '—'} />
              <Stat label="Outstanding" v={c._live ? inrF(r.outstanding) : '—'} tone={r.outstanding > 0 ? 'o' : ''} />
              <Stat label="Value today" v={c._live ? inrF(r.value) : '—'} />
              <Stat label="Unrealised gain" v={c._live ? inrF(r.gain) : '—'} tone="g" />
            </div>

            <Rail c={c} cf={cf} weights={weights} onEditProfile={() => setEditOpen(true)} />
          </div>

          {/* the sidebar's static footer IS the owner's action set (what
             used to be its own "Actions" card, buried in the scroll) —
             one card's worth of buttons, not two separate action areas
             saying the same thing in different words. */}
          <div className="p-2.5 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 space-y-1.5">
            <BtnPrimary className="w-full text-xs" disabled={!g.open} onClick={() => setStatementOpen(true)}>
              Generate portfolio statement
            </BtnPrimary>
            <div className="grid grid-cols-2 gap-1.5">
              <button className={`${btnGhost} text-[11px] px-1 py-2`} disabled={!g.open} onClick={() => setInviteOpen(true)}>Invite list</button>
              <button className={`${btnGhost} text-[11px] px-1 py-2`} onClick={() => setCallOpen(true)}>Log a call</button>
              <button className={`${btnGhost} text-[11px] px-1 py-2 col-span-2`} onClick={() => setEditOpen(true)}>Complete profile</button>
            </div>
            {!g.open && (
              <div className="text-[10px] text-red-600 dark:text-red-400 leading-snug">
                Outbound disabled by the gate — enforced at send time as well as here.
              </div>
            )}
            {!!footerMiss.length && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 leading-snug">
                Missing: {footerMiss.join(', ')}.
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <nav className="flex flex-shrink-0 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-700 px-2 sm:px-3">
            {CTABS.filter(([, , capability]) => !capability || can(capability)).map(([k, l]) => (
              <button
                key={k}
                onClick={() => navigate(`/master/${c.id}/${k}`, { replace: true })}
                className={`text-[13px] whitespace-nowrap px-3 py-3 border-b-2 ${
                  tab === k ? 'font-semibold border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                {l}
              </button>
            ))}
          </nav>
          <div className="flex-1 min-w-0 flex flex-col overflow-y-auto custom-scrollbar p-4 sm:p-5">
            <Tab c={c} />
          </div>
        </div>
      </div>

      {editOpen && <EditProfileModal customer={c} onClose={() => setEditOpen(false)} />}
      {statusOpen && <StatusModal customer={c} onClose={() => setStatusOpen(false)} />}
      {callOpen && <CallModal customer={c} onClose={() => setCallOpen(false)} />}
      {segmentOpen && <SegmentOverrideModal customer={c} onClose={() => setSegmentOpen(false)} />}
      {inviteOpen && <InviteListDrawer customer={c} onClose={() => setInviteOpen(false)} />}
      {statementOpen && <PortfolioStatementDrawer customer={c} onClose={() => setStatementOpen(false)} />}
    </>
  );
}

const STAT_TONE = { g: 'text-green-600 dark:text-green-400', o: 'text-primary-600 dark:text-primary-400' };

const Stat = ({ label, v, sub, tone }) => (
  <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 px-2.5 py-2">
    <div className="text-[8.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{label}</div>
    <div className={`text-sm font-black tracking-tight tabular-nums mt-0.5 ${STAT_TONE[tone] || 'text-gray-900 dark:text-white'}`}>{v}</div>
    {sub && <div className="text-[9.5px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
  </div>
);

/* Same card Nexora's own Lead Detail sidebar leads with — the single
   soonest item off the owner's Timeline (see derived.js's
   timelineItems(), shared with the Timeline tab itself so both read
   the same merged, sorted list), with a live countdown ticking down
   to it. Renders nothing when there's genuinely nothing tracked,
   rather than an empty card taking up space for no reason. */
function NextFollowUpCard({ c }) {
  const next = timelineItems(c)[0];
  const { label, isOverdue, isDueToday } = useFollowUpCountdown(next?.date);
  if (!next) return null;

  return (
    <div className={`rounded-lg border p-3.5 ${
      isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Next follow-up</span>
        {isOverdue && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3 h-3" />{isDueToday ? 'Due today' : 'Overdue'}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{next.label}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{next.sub}</div>
      {label && (
        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-black tabular-nums border ${
          isOverdue
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 animate-pulse'
            : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
        }`}>
          <Clock className="w-3 h-3" />{label}
        </div>
      )}
    </div>
  );
}

function Rail({ c, cf, weights, onEditProfile }) {
  const g = c._g;
  const s = c._s;

  return (
    <>
      <Card
        title="Identity"
        hint={
          <button onClick={onEditProfile} className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold">
            <Pencil className="w-3 h-3" />Edit
          </button>
        }
      >
        <KV>
          <Row k="Customer ID" v={c.id} />
          <Row k="PAN" v={c.pan} />
          <Row k="Aadhaar number" v={c.aadhaarNo} />
          <Row k="KYC completed" v={fmtD(c.kycDate)} />
          <Row
            k="Co-applicant"
            miss={!c.coApplicant}
            v={c.coApplicant ? (
              hasCoApplicant(c) ? (
                <>{c.coApplicant} <span className="text-[10.5px] text-gray-400 dark:text-gray-500">({c.coRelation}{c.coOnAgreement ? ', on agreement' : ', not on agreement'})</span></>
              ) : c.coApplicant
            ) : null}
          />
          <Row k="Mobile" v={c.mobile} />
          <Row k="Alternative mobile" v={c.altMobile} />
          <Row k="Email" v={c.email} />
          <Row k="City" v={c.city} />
          <Row k="Occupation" v={c.captured.occ ? c.occupation : null} miss={!c.captured.occ} />
          <Row k="Date of birth" v={c.captured.dob ? fmtD(c.dob) : null} miss={!c.captured.dob} />
          <Row k="Anniversary" v={c.captured.anniv ? fmtD(c.spouseDob) : null} miss={!c.captured.anniv} />
          <Row k="Community" v={c.community} />
          <Row k="Source" v={c.source} />
          <Row k="Referred by" v={c.referredBy ? c.referredBy.n : '—'} />
          <Row k="Address" v={c.captured.addr ? c.corrAddr : null} miss={!c.captured.addr} />
        </KV>
      </Card>

      {/* stacked, not side-by-side — the sidebar is a fixed 320px now
         (matching Nexora's own single-column card stack), too narrow
         for two cards next to each other without both cramping. */}
      <div className="space-y-4">
        <Card title="Data confidence" hint={<span className="tabular-nums">{cf.pass}/{cf.total}</span>}>
          <Meter label="Ready to show the customer" value={`${cf.pct}%`} cls={confMeterCls(cf.pct)} width={cf.pct} />
          {/* a chip cloud, not a 10-row list — every item's full
             wording still lives in its title tooltip, but stacking ten
             sentence-length rows in a column half this width means most
             wrap to 2-3 lines each, so the card ends up far taller than
             its Propensity neighbour and CSS grid's default row-stretch
             turns that gap into dead space inside the shorter card. */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {cf.checks.map(([l, ok]) => (
              <span
                key={l}
                title={l}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-medium leading-none ${
                  ok
                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
              >
                <Dot tone={ok ? 'g' : 'r'} />
                {CONF_SHORT_LABEL[l] || l}
              </span>
            ))}
          </div>
        </Card>

        <Card
          title="Propensity"
          hint={`${weights.capacity}/${weights.trust}/${weights.timing}/${weights.engagement}`}
        >
          {g.open ? (
            [['capacity', 'Capacity'], ['trust', 'Trust'], ['timing', 'Timing'], ['engagement', 'Engagement']]
              .map(([k, l]) => (
                <Meter key={k} label={l} value={Math.round(s[k])} cls={s[k] >= 65 ? 'o' : ''} width={s[k]} />
              ))
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Not scored. The gate is closed, so segment is set by rule. The score is meaningless until the
              block clears.
            </div>
          )}
        </Card>
      </div>

    </>
  );
}
