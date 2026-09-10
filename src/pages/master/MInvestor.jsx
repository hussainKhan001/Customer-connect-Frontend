/* Investor profile — is this owner buying to invest or to live in,
   and what does their actual behaviour say. The classification is
   captured by a human and stored (customer.ownerType); the signals
   below it are derived facts, shown as a *suggestion* only. The app's
   standing rule applies here too: never write an inferred value into
   a field someone will later read as confirmed. */
import { useState } from 'react';
import { Card, Chip, Banner, Row, KV, TableWrap } from '../../components/Ui.jsx';
import ThemedSelect from '../../components/theme/ThemedSelect.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { toast } from '../../utils/toast.js';
import { OWNER_TYPE_LBL, OCCUPANCY_LBL } from '../../constants/segments.js';

const TYPE_OPTS = [
  { value: '', label: 'Not captured' },
  ...Object.entries(OWNER_TYPE_LBL).map(([value, label]) => ({ value, label })),
];
const OCC_OPTS = [
  { value: '', label: 'Not captured' },
  ...Object.entries(OCCUPANCY_LBL).map(([value, label]) => ({ value, label })),
];

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap';
const td = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-middle text-sm whitespace-nowrap';
const sub2 = 'text-[10.5px] text-gray-400 dark:text-gray-500';

/* Weighed, never stored. Each signal is a fact already on the record —
   the reading of them is what stays advisory. */
function signals(c) {
  const exitedCount = c.units.filter((u) => u.exited).length;
  const projects = new Set(c.units.map((u) => u.project).filter(Boolean)).size;
  const rented = c.units.filter((u) => u.occupancy === 'RENTED').length;
  const selfOccupied = c.units.filter((u) => u.occupancy === 'SELF_OCCUPIED').length;

  const forInvestor = [
    exitedCount > 0 && `sold ${exitedCount} unit${exitedCount > 1 ? 's' : ''} already`,
    c._live > 1 && `holds ${c._live} units at once`,
    projects > 1 && `spread across ${projects} projects`,
    rented > 0 && `${rented} unit${rented > 1 ? 's' : ''} rented out`,
  ].filter(Boolean);

  const forEndUser = [
    c._live === 1 && exitedCount === 0 && 'single unit, never sold',
    selfOccupied > 0 && `${selfOccupied} unit${selfOccupied > 1 ? 's' : ''} self-occupied`,
  ].filter(Boolean);

  const lean = forInvestor.length >= 2 ? 'INVESTOR'
    : forInvestor.length === 0 && forEndUser.length ? 'END_USER'
    : null;

  return { forInvestor, forEndUser, lean, exitedCount, projects, rented, selfOccupied };
}

export default function MInvestor({ c }) {
  const { updateProfile, mutateCustomer } = useApp();
  const [savingType, setSavingType] = useState(false);
  const [savingUnit, setSavingUnit] = useState(null);
  const s = signals(c);

  const setOwnerType = async (v) => {
    setSavingType(true);
    try {
      await updateProfile(c.id, { ownerType: v });
      toast.success('Owner type saved', v ? OWNER_TYPE_LBL[v] : 'Cleared — back to not captured.');
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSavingType(false);
    }
  };

  const setOccupancy = async (idx, u, v) => {
    setSavingUnit(idx);
    try {
      await mutateCustomer(`/api/customers/${c.id}/units/${idx}/occupancy`, {
        unit: u.unit, project: u.project, occupancy: v,
      });
      toast.success('Occupancy saved', `${u.unit} — ${v ? OCCUPANCY_LBL[v] : 'not captured'}.`);
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSavingUnit(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card title="Owner type" hint="captured, not inferred" className="mb-0">
          <div className="flex items-center gap-2.5 mb-3">
            <ThemedSelect
              className="w-52"
              value={c.ownerType || ''}
              onChange={setOwnerType}
              options={TYPE_OPTS}
              placeholder="Not captured"
            />
            {savingType && <span className={sub2}>Saving…</span>}
            {!savingType && c.ownerType && <Chip cls={c.ownerType === 'INVESTOR' ? 'A' : 'B'}>{OWNER_TYPE_LBL[c.ownerType]}</Chip>}
          </div>

          {s.lean && s.lean !== c.ownerType && (
            <Banner kind="warn" style={{ margin: '0 0 12px' }}>
              <b>Signals point to {OWNER_TYPE_LBL[s.lean]}</b>
              {c.ownerType ? ' — which does not match what is captured above.' : ' — but nothing is captured yet.'}{' '}
              This is a reading of the record, not a fact. Set it above only if you actually know.
            </Banner>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            An investor buys for yield or resale and can hold several units at once; an end user buys to
            live in it. The difference decides whether a second purchase is even plausible — and whether
            this owner is worth more to you as a buyer or as a referral source.
          </div>
        </Card>

        <Card title="What the record actually shows" hint={`${s.forInvestor.length + s.forEndUser.length} signals`} className="mb-0">
          <KV>
            <Row k="Units held now" v={c._live} />
            <Row k="Units sold earlier" v={s.exitedCount || '—'} miss={!s.exitedCount} />
            <Row k="Projects" v={s.projects || '—'} />
            <Row k="Longest holding" v={c._held ? `${c._held.toFixed(1)} yr` : '—'} />
            <Row k="Paid to date" v={`${c._paidPct.toFixed(0)}%`} />
            <Row k="Referrals given" v={c.referrals.length || '—'} miss={!c.referrals.length} />
          </KV>

          {!!s.forInvestor.length && (
            <div className="mt-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Points to investor</div>
              <div className="flex flex-wrap gap-1.5">
                {s.forInvestor.map((x) => <Chip key={x} cls="A">{x}</Chip>)}
              </div>
            </div>
          )}
          {!!s.forEndUser.length && (
            <div className="mt-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Points to end user</div>
              <div className="flex flex-wrap gap-1.5">
                {s.forEndUser.map((x) => <Chip key={x} cls="B">{x}</Chip>)}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Occupancy" hint="per unit — an investor usually lives in one and rents the rest" pad={false}>
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Unit</th>
                <th className={th}>Status</th>
                <th className={th}>Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {c.units.map((u, idx) => (
                <tr key={`${u.unit}-${idx}`}>
                  <td className={td}>
                    <b>{u.unit || '—'}</b>
                    <div className={sub2}>{u.project}</div>
                  </td>
                  <td className={td}>
                    {u.exited ? <Chip cls="r">exited</Chip> : <Chip cls="g">held</Chip>}
                  </td>
                  <td className={td}>
                    {u.exited ? (
                      <span className={sub2}>— no longer owned</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ThemedSelect
                          className="w-44"
                          value={u.occupancy || ''}
                          onChange={(v) => setOccupancy(idx, u, v)}
                          options={OCC_OPTS}
                          placeholder="Not captured"
                        />
                        {savingUnit === idx && <span className={sub2}>Saving…</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed p-3.5 pt-3">
          Rented-out units are the strongest single signal that an owner treats property as an
          investment — and a rented unit also means a tenant, which is who actually reports a
          maintenance complaint against a record that reads as satisfied.
        </div>
      </Card>
    </>
  );
}
