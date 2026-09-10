import { useState } from 'react';
import { Card, Chip, Row, KV, rowActionCls } from '../../components/Ui.jsx';
import LoanModal from '../../components/LoanModal.jsx';
import { fmtD, inrF } from '../../utils/core.js';
import { roll } from '../../utils/derived.js';

export default function MLedger({ c }) {
  const [editIdx, setEditIdx] = useState(null);
  const units = roll(c).all;

  return (
    <>
      {units.map((u, idx) => {
    const reconciles = Math.abs(u.rate * u.saleable - u.discount - u.consideration) < 1;
    return (
      <Card
        key={u.unit}
        title={`${u.unit} — payment ledger`}
        hint={
          <span className="flex items-center gap-2">
            {`${u.receipts} receipts${u.bounced ? ' · ' + u.bounced + ' returned' : ''}`}
            <button className={rowActionCls('primary')} onClick={() => setEditIdx(idx)}>Edit loan</button>
          </span>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <KV>
            <Row k="Consideration" v={inrF(u.consideration)} />
            <Row k="Received to date" v={`${inrF(u.paid)} (${u.paidPct.toFixed(0)}%)`} />
            <Row k="Outstanding" v={u.outstanding
              ? <span className="text-amber-600 dark:text-amber-400">{inrF(u.outstanding)}</span>
              : inrF(0)} />
            <Row k="Last receipt" v={fmtD(u.lastReceipt)} />
            <Row k="Instruments returned" v={u.bounced
              ? <span className="text-red-600 dark:text-red-400">{u.bounced}</span>
              : '0'} />
          </KV>
          <KV>
            <Row k="Funding" v={u.loan.selfFunded ? 'Self-funded' : `${u.loan.bank} · ${u.loan.tenure} yr`} />
            <Row k="EMI started" v={fmtD(u.loan.start) || '—'} />
            <Row k="Scheduled closure" v={fmtD(u.loan.closure) || '—'} />
            <Row k="Actual closure" v={
              u.loan.closedOn ? (
                <>{fmtD(u.loan.closedOn)} <Chip cls="g">{u.loan.prepaid ? 'foreclosed' : 'closed'}</Chip></>
              ) : u.loan.selfFunded ? '—' : <Chip cls="w">running</Chip>
            } />
            <Row k="Rate × area reconciles" v={reconciles
              ? <Chip cls="g">yes</Chip>
              : <Chip cls="r">MISMATCH</Chip>} />
          </KV>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
          <b>Paid-to-date is derived from the receipt ledger, never keyed in.</b> A hand-typed figure is how
          a reconciliation gap survives an audit — and once it appears on a branded statement in a
          customer's hand it is far harder to walk back than a wrong figure on a demand letter.
        </div>
      </Card>
    );
      })}

      {editIdx !== null && (
        <LoanModal customer={c} unit={units[editIdx]} unitIndex={editIdx} onClose={() => setEditIdx(null)} />
      )}
    </>
  );
}
