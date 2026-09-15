import { LogOut, Banknote, Percent, TrendingDown, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { Card, Kpi, Kpis, Banner, TableWrap, Avatar, EmptyState, Pagination } from '../components/Ui.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { cr, fmtD, inr, psf, projByName } from '../utils/core.js';
import { unitCalc } from '../utils/derived.js';

const COMMISSION = 0.02;
const PAGE_SIZE = 50;

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap';
const thR = `${th} text-right`;
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap';
const tdR = `${td} text-right tabular-nums`;
const sub2 = 'text-[10.5px] text-gray-400 dark:text-gray-500';

export default function ExitRegister() {
  const { base } = useApp();
  const { openCustomer } = useAppNavigation();

  const rows = base.flatMap((c) => c.units.filter((x) => x.exited).map((u) => {
    const uc = unitCalc(u);
    const askValue = u.saleable * projByName(u.project).resale;
    const soldValue = u.saleable * u.exitRate;
    return { c, u: uc, soldValue, askValue, gap: askValue - soldValue, comm: soldValue * COMMISSION };
  }));
  const ownersExited = new Set(rows.map((r) => r.c.id)).size;
  const { page, setPage, totalPages, pageItems: pagedRows, pageSize, setPageSize } = usePagination(rows, { pageSize: PAGE_SIZE });

  const totComm = rows.reduce((s, r) => s + r.comm, 0);
  const totGap = rows.reduce((s, r) => s + r.gap, 0);
  const totSold = rows.reduce((s, r) => s + r.soldValue, 0);
  const askedToSell = base.filter((c) => c.statements.length && c.statements[0].askedToSell).length;

  return (
    <>
      <Kpis>
        <Kpi label="Owners who exited" value={ownersExited} tone="r" icon={LogOut} sub="sold without you" />
        <Kpi label="Value transacted" value={`₹${cr(totSold).toFixed(2)} Cr`} icon={Banknote} sub="in your own projects" />
        <Kpi label="Commission foregone" value={inr(totComm)} tone="o" icon={Percent} sub="at 2% — the cost of no resale desk" />
        <Kpi label="Sold below your assessed value" value={inr(totGap)} icon={TrendingDown} sub="the discount a broker sale costs your customer" />
        <Kpi label="Statement readers asking to sell" value={askedToSell} tone="r" icon={AlertCircle} sub="the next wave, if you have nowhere to send them" />
      </Kpis>

      <Banner kind="block">
        <b>The statement creates sellers as well as buyers.</b> {askedToSell} owners in the pilot cohort
        asked how to sell after reading their gain. With no exit desk they list with a broker, take a
        discount, and you lose the commission and the relationship at once. Build the desk before the next
        batch goes out — this register is what it would have earned.
      </Banner>

      <Card title="Exits recorded" hint="from registry searches, not customer disclosure" pad={false} className="overflow-hidden">
        {rows.length ? (
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Owner</th><th className={th}>Unit</th><th className={thR}>Booked at</th><th className={thR}>Sold at</th>
                  <th className={thR}>Our assessed rate</th><th className={thR}>Their gain</th>
                  <th className={thR}>Commission foregone</th><th className={th}>Exited</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map(({ c, u, comm }) => (
                  <tr key={`${c.id}-${u.unit}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer" onClick={() => openCustomer(c.id)}>
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 dark:text-white">{c.name}</div>
                          <div className={sub2}>{c.id} · {c.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}>{u.unit}<div className={sub2}>{u.project} · {u.saleable} sq.ft.</div></td>
                    <td className={tdR}>{psf(u.rate)}</td>
                    <td className={tdR}>{psf(u.exitRate)}</td>
                    <td className={`${tdR} ${sub2}`}>{psf(u.valueRate)}</td>
                    <td className={`${tdR} font-bold text-gray-900 dark:text-white`}>{inr((u.exitRate - u.rate) * u.saleable)}</td>
                    <td className={`${tdR} font-bold text-primary-700 dark:text-primary-400`}>{inr(comm)}</td>
                    <td className={`${td} tabular-nums`}>{fmtD(u.exitDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState
            icon={LogOut}
            title="No exits recorded"
            hint="An exit is logged when a registry search finds an owner sold without going through you. None have turned up in the base yet — that's a good sign, not a missing feature."
          />
        )}
        {rows.length > 0 && (
          <div className="px-4 pb-3">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={rows.length} pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
        )}
      </Card>
    </>
  );
}
