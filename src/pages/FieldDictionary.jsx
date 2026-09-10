import { Fragment } from 'react';
import { Card, Chip, TableWrap } from '../components/Ui.jsx';
import { DICT } from '../constants/governance.js';

const th = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3.5 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap';
const td = 'px-3.5 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';
const sub2 = 'text-[10.5px] text-gray-400 dark:text-gray-500';

const reqChip = (req) =>
  req === 'Yes' ? <Chip cls="r">yes</Chip>
  : req === 'Cond.' ? <Chip cls="w">cond</Chip>
  : <Chip cls="m">{req}</Chip>;

export default function FieldDictionary() {
  const total = DICT.reduce((s, d) => s + d[1].length, 0);

  return (
    <Card title="Field dictionary" hint={`${total} fields across 5 layers`}>
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
        Columns: what it is called in the database, what the screen calls it, where the value comes from,
        and who is accountable for capturing it. <b>Capture owner</b> is the column that matters — a field
        with no named owner never gets filled.
      </div>
      <TableWrap>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Field</th><th className={th}>On screen</th><th className={th}>Type</th><th className={th}>Source</th>
              <th className={th}>Capture owner</th><th className={th}>Req.</th><th className={th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {DICT.map(([layer, fields]) => (
              <Fragment key={layer}>
                <tr>
                  <td colSpan={7} className="bg-gray-100 dark:bg-gray-700/50 font-bold text-[11.5px] px-3 py-2">{layer}</td>
                </tr>
                {fields.map(([f, l, t, src, own, req, pii, note]) => (
                  <tr key={f}>
                    <td className={td}>
                      <code>{f}</code>
                      {pii && (
                        <span className="text-[9px] font-bold text-red-600 dark:text-red-400"> PII</span>
                      )}
                    </td>
                    <td className={td}>{l}</td>
                    <td className={`${td} ${sub2}`}>{t}</td>
                    <td className={`${td} ${sub2}`}>{src}</td>
                    <td className={td}><b className="text-gray-900 dark:text-white">{own}</b></td>
                    <td className={td}>{reqChip(req)}</td>
                    <td className={`${td} ${sub2}`}>{note}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Card>
  );
}
