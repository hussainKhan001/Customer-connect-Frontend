/* =====================================================================
   INTAKE — the write path. Import validation, the exceptions queue, and
   the live form. Reject rather than guess: a row that does not
   reconcile is held, never adjusted.
   ===================================================================== */
import { daysTo } from './core.js';
import { PROJECTS } from '../constants/projects.js';
import { VAL_STALE_DAYS } from '../constants/seedData.js';

export const CHECKS = [
  ['RATE_AREA', 'Rate × area less discount equals consideration',
    (c) => c.units.every((u) => Math.abs(u.rate * u.saleable - u.discount - u.consideration) < 1)],
  ['PAID_LE_CONSID', 'Paid-to-date does not exceed consideration',
    (c) => c.units.every((u) => u.paid <= u.consideration + 1)],
  ['REG_ON_POSSESSION', 'Registry recorded for every possessed unit',
    (c) => c.units.every((u) => !u.possDate || !!u.regDate)],
  ['DATE_ORDER', 'Booking ≤ agreement ≤ registry ≤ possession',
    (c) => c.units.every((u) => {
      const a = [u.bookDate, u.agrDate, u.regDate, u.possDate].filter(Boolean).map((x) => +new Date(x));
      return a.every((v, i) => i === 0 || v >= a[i - 1]);
    })],
  ['VAL_CURRENT', 'Valuation note dated within 90 days',
    (c) => c.units.every((u) => u.exited || daysTo(u.val.notedOn) >= -VAL_STALE_DAYS)],
  ['CONSENT', 'DPDP consent on record', (c) => !!c.consent.date],
  ['ADDRESS', 'Address updated since booking', (c) => c.captured.addr],
  ['STATUS', 'Owner status confirmed', (c) => !!c.status],
];

export function exceptions(base) {
  const out = [];
  base.forEach((c) => {
    const fails = CHECKS.filter(([, , t]) => !t(c));
    if (fails.length) out.push({ c, fails });
  });
  return out.sort((a, b) => b.fails.length - a.fails.length);
}

export const SAMPLE_DRAFT = () => {
  const p = PROJECTS[0], sa = 1250, rt = 2000, dc = 0;
  return {
    name: 'Sample Owner', pan: 'ABCPD1234E', mobile: '+91 9425012345',
    project: p.name, unit: 'GC-C-305', saleable: sa, rate: rt, discount: dc,
    consideration: rt * sa - dc, bookDate: '2021-04-02', paid: rt * sa - dc,
  };
};

/* Validation on import is intentionally OFF (both the single-owner
   form and the bulk-sheet path below) — a row is never held for
   content reasons. The equivalent, permissive coercion (bad numbers
   and dates become null, an unmatched project falls back to the
   first known one) happens server-side in buildCustomer()/
   buildShellCustomer(), which is what actually decides what gets
   written; these two stay as no-ops so Intake.jsx's validate-then-
   submit shape doesn't need to change. */
export function validateDraft() {
  return {};
}

export function validateShellDraft() {
  return {};
}

/* buildCustomer() used to live here and write straight into the
   in-memory base. Creating an owner now goes through the real API
   (POST /api/customers, see AppContext.addCustomer) — the equivalent
   builder + authoritative validation live server-side in
   server/src/lib/validate.js. validateDraft() below stays client-side
   for instant form feedback; the server re-validates independently. */
