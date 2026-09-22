import { Send, MailOpen, UserCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { Card, Chip, Kpi, Kpis, Banner, TableWrap, Avatar, EmptyState, btnGhost, Pagination } from '../components/Ui.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { D, fmtD, inr } from '../utils/core.js';

const PAGE_SIZE = 25;

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const thR = `${th} text-right`;
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap';
const tdR = `${td} text-right tabular-nums`;

export default function SendLog() {
  const { base } = useApp();
  const { openCustomer } = useAppNavigation();
  const navigate = useNavigate();

  const sent = base.filter((c) => c.statements.length).map((c) => ({ c, s: c.statements[0] }));
  const sentSorted = [...sent].sort((a, b) => D(b.s.d) - D(a.s.d));
  const { page, setPage, totalPages, pageItems: pagedSent, pageSize, setPageSize } = usePagination(sentSorted, { pageSize: PAGE_SIZE });
  const n = sent.length;
  const pc = (k) => (n ? Math.round((sent.filter((x) => x.s[k]).length / n) * 100) : 0);
  const supp = base.filter((c) => c._blocked).length;
  const disputeRate = pc('disputed');

  return (
    <>
      <Kpis>
        <Kpi label="Statements sent" value={n} icon={Send} sub="pilot cohort" />
        <Kpi label="Opened" value={`${pc('opened')}%`} icon={MailOpen} sub="WhatsApp PDF outperforms email" />
        <Kpi label="Profile completed" value={`${pc('profileDone')}%`} tone="g" icon={UserCheck} sub="the fields you could not collect any other way" />
        <Kpi label="Asked about a new project" value={`${pc('askedNewProject')}%`} tone="o" icon={Sparkles} sub="unprompted" />
        <Kpi label="Disputed a figure" value={`${disputeRate}%`} tone="r" icon={AlertTriangle} sub="this number decides whether you scale" />
      </Kpis>

      {n > 0 ? (
        <Banner kind={disputeRate > 10 ? 'block' : 'good'}>
          <b>{disputeRate}% dispute rate on {n} statements.</b>{' '}
          {disputeRate > 10
            ? 'Too high to scale. Every disputed figure is a customer auditing your ledger and finding it wrong — and a wrong number on a branded statement is far harder to walk back than a wrong number on a demand letter. Go back to reconciliation before sending another batch.'
            : 'Inside tolerance. Reconcile the disputes individually, then widen the next batch.'}{' '}
          Separately, <b>{pc('askedToSell')}% asked how to sell.</b> Without a resale desk those owners go to
          a broker and you lose the commission and the relationship — which is exactly what the exit register
          is already counting.
        </Banner>
      ) : (
        <Banner kind="info">
          <b>Nothing sent yet.</b> These numbers — open rate, profile completion, disputes — only mean
          something once a batch has actually gone out. Send the first portfolio statement to start this log.
        </Banner>
      )}

      <Card title="Send history" hint={`${supp} records suppressed at send time by the gate`} pad={false} className="overflow-hidden">
        {n === 0 ? (
          <EmptyState
            icon={Send}
            title="No statements sent yet"
            hint="Generate a statement from an owner's own Customer Master page — its date, version, channel and outcome will then appear here."
            action={<button className={`${btnGhost} text-xs px-3 py-1.5`} onClick={() => navigate('/base')}>Open Owner Base →</button>}
          />
        ) : (
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Owner</th><th className={th}>Sent</th><th className={th}>Version</th><th className={th}>Channel</th>
                <th className={thR}>Gain shown</th><th className={th}>Opened</th><th className={th}>Profile</th><th className={th}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {pagedSent.map(({ c, s }) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer" onClick={() => openCustomer(c.id)}>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white">{c.name}</div>
                        <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c.id} · {c._project}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} tabular-nums`}>{fmtD(s.d)}</td>
                  <td className={td}><code>{s.v}</code></td>
                  <td className={`${td} text-[10.5px] text-gray-400 dark:text-gray-500`}>{s.ch}</td>
                  <td className={`${tdR} font-bold text-gray-900 dark:text-white`}>{inr(c._gain)}</td>
                  <td className={td}>{s.opened ? <Chip cls="g">yes</Chip> : <Chip cls="m">no</Chip>}</td>
                  <td className={td}>{s.profileDone ? <Chip cls="g">completed</Chip> : <Chip cls="m">pending</Chip>}</td>
                  <td className={td}>
                    {s.disputed ? <Chip cls="r">figure disputed</Chip>
                      : s.askedToSell ? <Chip cls="w">asked to sell</Chip>
                      : s.askedNewProject ? <Chip cls="A">asked about launch</Chip>
                      : <Chip cls="m">no reply</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        )}
        {n > 0 && (
          <div className="px-4 pb-3">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={sentSorted.length} pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
        )}
      </Card>

      <Card title="Rules the send layer enforces">
        <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
          <li><b>The gate is re-evaluated at send time, not at list-build time.</b> A complaint raised the
            morning of the send stops that statement.</li>
          <li><b>Every statement is versioned and archived exactly as the customer saw it.</b> When a figure
            is disputed you need to know what was on the page, not what the database says today.</li>
          <li><b>Statements go as PDF or image, never as a link.</b> Half your base will not open a link,
            and older buyers will not log in.</li>
          <li><b>Every message carries a withdrawal path.</b> DPDP requires it and it costs you nothing.</li>
          <li><b>A named person signs off every batch before it leaves.</b> At 50 that is possible. At
            1,000 it needs to be a sampling rule with a named auditor.</li>
        </ul>
      </Card>
    </>
  );
}
