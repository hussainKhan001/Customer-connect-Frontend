import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { useCurrentCustomer } from '../hooks/useCurrentCustomer.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { Card, Chip, Row, KV, Meter, Dot, confMeterCls, btnGhost, BtnPrimary } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import EditProfileModal from '../components/EditProfileModal.jsx';
import StatusModal from '../components/StatusModal.jsx';
import CallModal from '../components/CallModal.jsx';
import { initials, inrF, fmtD, displayName } from '../utils/core.js';
import { roll, confidence, segDisplay } from '../utils/derived.js';
import { STATUSLBL } from '../constants/segments.js';

import MOverview from './master/MOverview.jsx';
import MPortfolio from './master/MPortfolio.jsx';
import MInvestor from './master/MInvestor.jsx';
import MLedger from './master/MLedger.jsx';
import MRelationship from './master/MRelationship.jsx';
import MTriggers from './master/MTriggers.jsx';
import MFollowUps from './master/MFollowUps.jsx';
import MDocuments from './master/MDocuments.jsx';
import MActivity from './master/MActivity.jsx';
import MGovernance from './master/MGovernance.jsx';

const CTABS = [
  ['overview', 'Overview'], ['portfolio', 'Portfolio'], ['investor', 'Investor'], ['ledger', 'Ledger'],
  ['relationship', 'Relationship'], ['triggers', 'Trigger dates'], ['followups', 'Follow-ups'],
  ['documents', 'Documents'], ['activity', 'Activity log'], ['governance', 'Consent & gate'],
];

const TAB_VIEWS = {
  overview: MOverview, portfolio: MPortfolio, investor: MInvestor, ledger: MLedger,
  relationship: MRelationship, triggers: MTriggers, followups: MFollowUps, documents: MDocuments,
  activity: MActivity, governance: MGovernance,
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
  const { openStatement } = useAppNavigation();
  const { getThemeColor } = useTheme();
  const { id, tab } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

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

  if (!current) return <div className="text-xs text-gray-500 dark:text-gray-400">No owners on book.</div>;

  const c = current;
  const r = roll(c);
  const cf = confidence(c);
  const sd = segDisplay(c);
  const g = c._g;
  const s = c._s;
  const Tab = TAB_VIEWS[tab] || TAB_VIEWS.overview;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 pt-4 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 rounded-t-lg">
        <button
          onClick={() => navigate('/base')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Owner Base
        </button>

        <div className="flex gap-3.5 items-start flex-wrap">
          <div
            className="w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-sm"
            style={{ backgroundColor: getThemeColor() }}
          >
            {initials(c.name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{displayName(c)}</h1>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Chip cls={sd.cls}>{sd.t}</Chip>
              <button
                onClick={() => setStatusOpen(true)}
                className="inline-flex items-center gap-1 group"
                title="Change owner status"
              >
                <Chip cls={c.status === 'ACTIVE' ? 'g' : 'r'}>{STATUSLBL[c.status]}</Chip>
                <Pencil className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 " />
              </button>
              {g.open ? <Chip cls="g">contact open</Chip> : <Chip cls="r">gate closed</Chip>}
              {c._live > 1 && <Chip cls="k">{c._live} units</Chip>}
              <Chip cls={cf.pct >= 80 ? 'g' : cf.pct >= 60 ? 'w' : 'r'}>data confidence {cf.pct}%</Chip>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {c.id} · {c.city} · {c.captured.occ ? c.occupation : 'occupation not captured'} · {c.mobile}
            </div>
          </div>
          <div className="flex-1" />
          <ThemedSelect
            className="w-full sm:w-72"
            value={c.id}
            onChange={(v) => navigate(`/master/${v}/overview`, { replace: true })}
            options={base.map((x) => ({ value: x.id, label: `${x.name} — ${STATUSLBL[x.status]}` }))}
          />
        </div>

        <div className="flex mt-4 border-t border-gray-100 dark:border-gray-700 overflow-x-auto custom-horizontal-scrollbar">
          <Strip label="Units held" v={<>{c._live}{c.units.length > c._live && (
            <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500"> (+{c.units.length - c._live} exited)</span>
          )}</>} />
          <Strip label="Consideration" v={c._live ? inrF(r.consideration) : '—'} />
          <Strip label="Paid" v={c._live ? inrF(r.paid) : '—'} />
          <Strip label="Outstanding" v={c._live ? inrF(r.outstanding) : '—'} tone={r.outstanding > 0 ? 'o' : ''} />
          <Strip label="Value today" v={c._live ? inrF(r.value) : '—'} />
          <Strip label="Unrealised gain" v={c._live ? inrF(r.gain) : '—'} tone="g" />
          <Strip label="Propensity" v={g.open ? s.total : '—'} />
        </div>

        <div className="flex mt-1 overflow-x-auto no-scrollbar">
          {CTABS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => navigate(`/master/${c.id}/${k}`, { replace: true })}
              className={`text-[13px] whitespace-nowrap px-3.5 py-2.5 border-b-2 ${
                tab === k ? 'font-semibold border-primary-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="w-full lg:w-[320px] xl:w-[400px] 2xl:w-[460px] flex-shrink-0 flex flex-col gap-4">
          <Rail c={c} cf={cf} weights={weights} onStatement={() => openStatement(c.id)} onEditProfile={() => setEditOpen(true)} onLogCall={() => setCallOpen(true)} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col"><Tab c={c} /></div>
      </div>

      {editOpen && <EditProfileModal customer={c} onClose={() => setEditOpen(false)} />}
      {statusOpen && <StatusModal customer={c} onClose={() => setStatusOpen(false)} />}
      {callOpen && <CallModal customer={c} onClose={() => setCallOpen(false)} />}
    </>
  );
}

const STRIP_TONE = { g: 'text-green-600 dark:text-green-400', o: 'text-primary-600 dark:text-primary-400' };

const Strip = ({ label, v, tone }) => (
  <div className="pr-5 mr-5 py-2.5 border-r border-gray-100 dark:border-gray-700 last:border-0 last:mr-0 last:pr-0 flex-shrink-0">
    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</div>
    <div className={`text-lg font-black tracking-tight tabular-nums mt-0.5 ${STRIP_TONE[tone] || 'text-gray-900 dark:text-white'}`}>{v}</div>
  </div>
);

function Rail({ c, cf, weights, onStatement, onEditProfile, onLogCall }) {
  const g = c._g;
  const s = c._s;
  const miss = [
    !c.captured.dob && 'date of birth',
    !c.captured.anniv && c.coApplicant && 'anniversary',
    !c.captured.occ && 'income band',
    !c.captured.addr && 'current address',
  ].filter(Boolean);

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
              <>{c.coApplicant} <span className="text-[10.5px] text-gray-400 dark:text-gray-500">({c.coRelation}{c.coOnAgreement ? ', on agreement' : ', not on agreement'})</span></>
            ) : null}
          />
          <Row k="Mobile" v={c.mobile} />
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

      <div className="grid grid-cols-2 gap-4 items-start">
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

      <Card title="Actions">
        <BtnPrimary className="w-full mb-1.5" disabled={!g.open} onClick={onStatement}>
          Generate portfolio statement
        </BtnPrimary>
        <button className={`${btnGhost} w-full mb-1.5`} disabled={!g.open}>Add to launch invite list</button>
        <button className={`${btnGhost} w-full mb-1.5`} onClick={onLogCall}>Log a call</button>
        <button className={`${btnGhost} w-full`} onClick={onEditProfile}>Complete profile</button>
        {!g.open && (
          <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed mt-2">
            Outbound disabled by the gate — enforced at send time as well as here.
          </div>
        )}
        {!!miss.length && (
          <div className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed mt-2.5">
            Missing: {miss.join(', ')}.
          </div>
        )}
      </Card>
    </>
  );
}
