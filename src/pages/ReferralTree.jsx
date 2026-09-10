import { GitBranch, TrendingUp, Users, Clock, Star } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { Card, Chip, Kpi, Kpis, Avatar, EmptyState } from '../components/Ui.jsx';
import { cr, inr } from '../utils/core.js';

export default function ReferralTree() {
  const { base } = useApp();
  const { openCustomer } = useAppNavigation();

  /* who introduced whom — one level of the graph per owner */
  const kids = {};
  base.forEach((c) => {
    if (c.referredBy) (kids[c.referredBy.id] = kids[c.referredBy.id] || []).push(c);
  });
  const byId = (id) => base.find((c) => c.id === id);
  const roots = Object.keys(kids).map(byId).filter(Boolean)
    .sort((a, b) => (kids[b.id] || []).length - (kids[a.id] || []).length);

  const referred = base.filter((c) => c.referredBy);
  const tot = referred.length;
  const val = referred.reduce((s, c) => s + c._consid, 0);
  const open = base.reduce((s, c) => s + c.referrals.filter((r) => r.status.startsWith('Open')).length, 0);
  const advocates = base.filter((c) => c._seg === 'D').length;

  const Branch = ({ c }) => {
    const k = kids[c.id] || [];
    return (
      <li>
        <span
          className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1.5 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-full cursor-pointer hover:border-primary-500 hover:shadow-sm transition-all max-w-full"
          onClick={() => openCustomer(c.id)}
        >
          <Avatar name={c.name} size="xs" />
          <b className="text-[13px] text-gray-900 dark:text-white truncate max-w-[160px] sm:max-w-none">{c.name}</b>
          <Chip cls={c._seg}>{c._seg}</Chip>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{c._project} · {inr(c._consid)}</span>
        </span>
        {!!k.length && (
          <ul className="pl-3.5 sm:pl-5 ml-1.5 sm:ml-2 border-l border-gray-200 dark:border-gray-700 list-none mt-1 space-y-1">
            {k.map((x) => <Branch key={x.id} c={x} />)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <Kpis>
        <Kpi label="Came via another owner" value={tot} icon={GitBranch} sub={`${((tot / base.length) * 100).toFixed(0)}% of the base`} />
        <Kpi label="Value written through referral" value={`₹${cr(val).toFixed(1)} Cr`} tone="o" icon={TrendingUp} sub="no marketing cost attached" />
        <Kpi label="Active referrers" value={roots.length} icon={Users} sub="the people carrying your pipeline" />
        <Kpi label="Referrals sitting unworked" value={open} tone="r" icon={Clock} sub="handed to you and dropped" />
        <Kpi label="Segment D advocates" value={advocates} icon={Star} sub="cannot buy again — can still bring buyers" />
      </Kpis>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4 items-start">
        <Card title="Genealogy" hint="top referrers first · click any node" pad={false} className="mb-0">
          {roots.length ? (
            <div className="p-3">
              <ul className="list-none space-y-1">{roots.slice(0, 12).map((c) => <Branch key={c.id} c={c} />)}</ul>
            </div>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="No referrals on record yet"
              hint="Once an owner is tagged as referred by another at booking, that relationship shows up here as a node you can click through to either owner."
            />
          )}
        </Card>

        <Card title="Programme design" className="mb-0">
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
            <li><b>Escalating slab, not flat.</b> 1st referral ₹X · 2nd ₹1.25X · 3rd onward ₹1.5X. A flat
              rate caps effort at one.</li>
            <li><b>Non-cash lane.</b> A doctor or a Class-I officer will not take a cheque. Gold coin, cafe
              hosting, launch-night invite. Note 194R applies to benefits in kind.</li>
            <li><b>Attribution before launch.</b> First tag wins, 90-day validity, disputes to AGM Sales.
              Write it now or arbitrate it later against your own DSAs.</li>
            <li><b>Close the loop.</b> {open} referred leads are sitting unworked and nobody went back to
              the referrer. That silence is what kills the second referral.</li>
            <li><b>Segment D is the referral engine.</b> High trust, no capacity. Stop treating them as a
              dead list.</li>
            <li><b>194H TDS applies to cash payouts.</b> Structure it before the first cheque, not after
              the first notice.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
