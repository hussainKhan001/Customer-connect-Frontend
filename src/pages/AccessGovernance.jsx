import { ShieldAlert } from 'lucide-react';
import { Card, Banner, TableWrap, Chip, EmptyState } from '../components/Ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRoles } from '../hooks/useRoles.js';
import { CAPABILITIES, PERM_LABEL, NON_OVERRIDABLE } from '../constants/governance.js';

const MODULE = 'Module: Access & governance';

const RETENTION = [
  ['Legal file — agreement, registry, KYC', 'Statutory period'],
  ['Payment ledger', '8 years'],
  ['Marketing profile — DOB, anniversary, occupation', 'Until consent withdrawn'],
  ['Statement archive', '7 years'],
  ['Activity and contact log', '3 years'],
  ['Exited owners — marketing fields', 'Purge on exit'],
];

/* PERM_LABEL cls values ('yes' / 'no' / 'part') are semantic strings from
   constants/governance.js — map them to Tailwind here rather than touching the data. */
const MATRIX_CLS = {
  yes: 'text-green-600 dark:text-green-400 font-bold',
  no: 'text-gray-400 dark:text-gray-500',
  part: 'text-amber-600 dark:text-amber-400 font-bold',
};

const matrixTh = 'text-center text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-2 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap';

export default function AccessGovernance() {
  const { user, can } = useAuth();
  /* the matrix is read from the live role table, not from a constant —
     roles are edited on User management, and a governance page that
     describes yesterday's permissions is worse than no page at all */
  const { roles, error } = useRoles();

  /* this page shows every role's full permission matrix at once —
     grouped with User management/Master Data as admin tooling for the
     same reason, gated the same way. A direct URL hit bypasses the
     sidebar's own filter (see navigation.js's `capability` field), so
     the page has to check this itself too. */
  if (!can(MODULE)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to Access & Governance"
        hint={`Ask an admin to grant the "${MODULE}" capability if you need to view this.`}
      />
    );
  }

  const cols = roles || [];
  const myIdx = user ? cols.findIndex((r) => r.name === user.role) : -1;

  return (
    <>
      <Banner kind="info">
        <b>Right now every screen shows every owner's financial position.</b> A telecaller does not need to
        see 240 people's payment positions and unrealised gains — that is a leak and a poaching risk in a
        market where your own staff are the most likely people to take a list with them. Role-based access
        is not a phase-three nicety; it goes in before the pilot.
      </Banner>

      {error && <Banner kind="block">{error}</Banner>}

      <Card
        title="Access matrix"
        hint={myIdx >= 0
          ? `live · edited on User management · your role (${user.role}) is highlighted`
          : 'live · edited on User management'}
        pad={false}
      >
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${matrixTh} text-left`}>What</th>
                {cols.map((r, i) => (
                  <th key={r.id} className={`${matrixTh} ${i === myIdx ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''}`}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((label) => (
                <tr key={label} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                  <td className="text-left font-bold text-[11px] px-2 py-1.5 text-gray-900 dark:text-white">
                    {label}
                    {label === NON_OVERRIDABLE && <span className="ml-1.5 font-normal"><Chip cls="m">locked</Chip></span>}
                  </td>
                  {cols.map((r, i) => {
                    const level = r.permissions?.[label] || 'N';
                    const { cls, t } = PERM_LABEL[level] || PERM_LABEL.N;
                    return (
                      <td key={r.id} className={`text-center text-[11px] px-2 py-1.5 ${i === myIdx ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''}`}>
                        <span className={MATRIX_CLS[cls] || ''}>{t}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!cols.length && (
                <tr>
                  <td className="text-center text-sm text-gray-400 dark:text-gray-500 py-8" colSpan={2}>
                    {error ? 'Roles could not be loaded.' : 'Loading roles…'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed px-2 pb-2 pt-2.5">
          These fifteen rows are fixed — each one is enforced on a real endpoint, so a capability cannot be
          invented from a screen. The columns are not: roles are created, renamed and re-permissioned on
          User management, and this table follows. The contact gate stays closed for every role, at every
          level, permanently.
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="DPDP obligations">
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
            <li><b>Purpose stated at capture.</b> Portfolio statements, launch invitations, service
              updates — named, not implied.</li>
            <li><b>Marketing consent separate from service consent.</b> Declining one must not silence the
              other.</li>
            <li><b>Withdrawal path on every message.</b> One tap, honoured within the same day.</li>
            <li><b>Children's data needs verifiable parental consent.</b> Ask whether a child's birthday
              greeting is worth the obligation it creates. My view: it is not.</li>
            <li><b>Right to correction and erasure.</b> A customer can ask you to delete their profile. The
              ledger and legal file are retained under a statutory basis; the marketing profile is not.</li>
            <li><b>Breach notification.</b> You need a named person and a written procedure before you hold
              this much PII in one place.</li>
          </ul>
        </Card>

        <Card title="Retention">
          <table className="w-full border-collapse">
            <tbody>
              {RETENTION.map(([what, how]) => (
                <tr key={what} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                  <td className="py-1.5 pr-3 text-sm text-gray-600 dark:text-gray-300">{what}</td>
                  <td className="py-1.5 text-right text-sm"><b className="text-gray-900 dark:text-white">{how}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5">
            An exited owner keeps their legal and ledger record — you may need it — but their marketing
            profile is purged. That is both a DPDP obligation and the cleanest way to guarantee no
            statement ever reaches them by accident.
          </div>
        </Card>
      </div>
    </>
  );
}
