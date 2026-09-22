/* =====================================================================
   CORE — clock, seeded RNG, formatters, date/money helpers.
   ===================================================================== */
import { FEST } from '../constants/seedData.js';

/* Live local midnight, not a fixed prototype date — see the matching
   comment in backend/src/lib/core.js for why this changed from a
   hardcoded new Date(2026, 7, 10). Recomputed once per page load
   (module-level constant, not a function), so an open tab left
   running across midnight still needs a reload to pick up the new
   day — acceptable given how this app is actually used. */
const _now = new Date();
export const TODAY = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());

/* ---- dates ---- */
export const D = (s) => (s instanceof Date ? s : new Date(s));
export const fmtD = (d) =>
  d ? D(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
export const fmtDM = (d) =>
  d ? D(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null;
/* date + time of day — for the handful of things that actually carry
   a meaningful time (a follow-up's dueAt), unlike most dates in this
   app (booking, registry, ...) which are calendar-only. */
export const fmtDT = (d) =>
  d ? D(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : null;
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

/* takes the live projects list (see AppContext's masterData) rather
   than importing a static one, so a rename in Master Data resolves
   correctly here too. */
export const projByName = (projects, n) => projects.find((p) => p.name === n);

/* "N/A"/"NA" in coApplicant (see EditProfileModal's quick-fill button)
   is a deliberate "no co-applicant on this booking" answer, not a real
   name — anything that infers a spouse relation from the field being
   non-empty (an anniversary-date requirement, a relation/agreement
   qualifier in a display) should check this instead of `!!c.coApplicant`. */
export const hasCoApplicant = (c) => !!c.coApplicant && !/^n\/?a$/i.test(c.coApplicant.trim());

/* `unit.type` is one plain string (see UnitFinancialsModal's Villa/
   Plot/Flat(+BHK)/Other picker, which is what actually writes it) —
   "Flat - 2BHK" and "Villa - 3BHK" both need to resolve back to just
   "Flat"/"Villa" for anything that only cares about the top-level
   type, docsFor()'s per-property-type document checklist (see
   derived.js) being the reason this exists. Anything that isn't one
   of the three known top-level types (including the "—" default and
   a free-typed "Other" value) reads as 'Other', matching the master
   data document-checklist fallback. */
export const topPropertyType = (raw) => {
  const v = String(raw || '').trim();
  if (v === 'Plot') return 'Plot';
  if (v === 'Villa' || v.startsWith('Villa - ')) return 'Villa';
  if (v === 'Flat' || v.startsWith('Flat - ')) return 'Flat';
  return 'Other';
};

export const nextFest = () => {
  const f = FEST.filter((x) => x.s >= TODAY).sort((a, b) => a.s - b.s)[0];
  return f ? { ...f, days: daysTo(f.s) } : null;
};
