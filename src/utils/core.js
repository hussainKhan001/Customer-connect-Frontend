/* =====================================================================
   CORE — clock, seeded RNG, formatters, date/money helpers.
   Swap generateBase() in generator.js for a fetch() against your own
   API; nothing in the view layer needs to change.
   ===================================================================== */
import { PROJECTS } from '../constants/projects.js';
import { FEST } from '../constants/seedData.js';

/* Live local midnight, not a fixed prototype date — see the matching
   comment in backend/src/lib/core.js for why this changed from a
   hardcoded new Date(2026, 7, 10). Recomputed once per page load
   (module-level constant, not a function), so an open tab left
   running across midnight still needs a reload to pick up the new
   day — acceptable given how this app is actually used. */
const _now = new Date();
export const TODAY = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());

/* ---- deterministic PRNG so the sample base is identical every load ---- */
let seed = 20260810;
export const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
export const pick = (a) => a[Math.floor(rnd() * a.length)];
export const ib = (a, b) => Math.floor(a + rnd() * (b - a + 1));
export const bt = (a, b) => a + rnd() * (b - a);

/* ---- dates ---- */
export const D = (s) => (s instanceof Date ? s : new Date(s));
export const fmtD = (d) =>
  d ? D(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
export const fmtDM = (d) =>
  d ? D(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null;
export const addD = (d, n) => { const x = new Date(D(d)); x.setDate(x.getDate() + n); return x; };
/* "YYYY-MM-DD" for TODAY, using its local date components rather than
   .toISOString() — TODAY is built via new Date(year, month, day), i.e.
   local midnight, and toISOString() converts to UTC first, which rolls
   the date back a day in any timezone ahead of UTC (e.g. IST). Every
   "default this date field to today" spot must use this, not
   TODAY.toISOString().slice(0, 10). */
export const todayInput = () => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${TODAY.getFullYear()}-${pad(TODAY.getMonth() + 1)}-${pad(TODAY.getDate())}`;
};
/* "YYYY-MM-DD" for a stored date value, for pre-filling a date input.
   Safe to round-trip through .toISOString() here (unlike TODAY above)
   because a stored value already came from parsing a date-only string
   (UTC midnight), so converting back to UTC doesn't shift it. */
export const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');
export const daysTo = (d) => Math.round((D(d) - TODAY) / 86400000);
export const yrs = (a, b) => (D(b) - D(a)) / 31557600000;
export const annivIn = (d) => {
  if (!d) return null;
  const s = D(d);
  const n = new Date(TODAY.getFullYear(), s.getMonth(), s.getDate());
  if (n < TODAY) n.setFullYear(TODAY.getFullYear() + 1);
  return Math.round((n - TODAY) / 86400000);
};

/* ---- money ---- */
export const inr = (n) =>
  n >= 10000000 ? '₹' + (n / 10000000).toFixed(2) + ' Cr'
  : n >= 100000 ? '₹' + (n / 100000).toFixed(2) + ' L'
  : '₹' + Math.round(n).toLocaleString('en-IN');
export const inrF = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const cr = (n) => n / 10000000;
export const psf = (n) => '₹' + Number(n).toLocaleString('en-IN');

export const initials = (n) =>
  n.replace(/^(Dr|Mr|Mrs|Ms|Smt|Shri)\.?\s+/i, '').split(' ').slice(0, 2).map((x) => x[0]?.toUpperCase() || '').join('');

/* This app's data usually already has the salutation baked into
   `name` itself ("Mrs. Junali Srivastava"), while `salutation` is
   tracked as its own field alongside it — prepending both naively
   reads "Mrs. Mrs. Junali Srivastava". Only prepend when `name`
   doesn't already start with it. Every place that shows a customer's
   name with a salutation should go through this, not
   `${c.salutation} ${c.name}` directly. */
export const displayName = (c) => {
  const sal = (c.salutation || '').trim();
  if (!sal) return c.name;
  const stripped = sal.replace(/\.$/, '');
  return new RegExp(`^${stripped}\\.?\\s`, 'i').test(c.name) ? c.name : `${sal} ${c.name}`;
};

export const projByName = (n) => PROJECTS.find((p) => p.name === n);

/* "N/A"/"NA" in coApplicant (see EditProfileModal's quick-fill button)
   is a deliberate "no co-applicant on this booking" answer, not a real
   name — anything that infers a spouse relation from the field being
   non-empty (an anniversary-date requirement, a relation/agreement
   qualifier in a display) should check this instead of `!!c.coApplicant`. */
export const hasCoApplicant = (c) => !!c.coApplicant && !/^n\/?a$/i.test(c.coApplicant.trim());

export const nextFest = () => {
  const f = FEST.filter((x) => x.s >= TODAY).sort((a, b) => a.s - b.s)[0];
  return f ? { ...f, days: daysTo(f.s) } : null;
};
