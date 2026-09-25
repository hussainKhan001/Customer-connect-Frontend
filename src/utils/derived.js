/* =====================================================================
   DERIVED — position maths, the contact gate, data confidence, the
   propensity score and the segment. Every function here is pure: the
   weights are passed in, never read off a global.
   ===================================================================== */
import { D, TODAY, yrs, daysTo, annivIn, addD, fmtD, fmtDM, fmtDT, nextFest, todayInput, hasCoApplicant, topPropertyType } from './core.js';
import { VAL_STALE_DAYS } from '../constants/seedData.js';
import { DEFAULT_W, SEGLBL } from '../constants/segments.js';

/* ---- one unit's position ---- */
/* Null-safe: a unit imported without a confirmed saleable area, rate
   or consideration (a shell/incomplete record now shown directly in
   the owner base rather than held out of it) has no real position to
   compute — currentValue/gain/paidPct all come out 0 rather than a
   misleading negative number from mixing a real consideration against
   a zeroed-out area. `hasFinancials` marks that distinction for the
   UI so "0" can be shown as "not confirmed" rather than as a real
   zero-gain investment. */
export function unitCalc(u) {
  const hasArea = u.saleable > 0;
  const hasConsideration = u.consideration > 0;
  const hasFinancials = hasArea && u.rate > 0 && hasConsideration;
  const v = Math.max(u.val?.circle || 0, u.val?.resale || 0);
  const cv = hasArea ? v * u.saleable : 0;
  const gain = hasFinancials ? cv - u.consideration : 0;
  const bookDate = u.bookDate || TODAY;
  const held = yrs(bookDate, u.exited ? u.exitDate : TODAY);
  const paid = u.paid || 0;
  return {
    ...u,
    hasFinancials,
    valueRate: v, currentValue: cv, gain,
    gainPct: hasFinancials ? (gain / u.consideration) * 100 : 0,
    cagr: hasFinancials && held > 0.5 ? (Math.pow(cv / u.consideration, 1 / held) - 1) * 100 : 0,
    heldYrs: held,
    outstanding: hasConsideration ? u.consideration - paid : 0,
    paidPct: hasConsideration ? (paid / u.consideration) * 100 : 0,
    ltcg: new Date(D(bookDate).getFullYear() + 2, D(bookDate).getMonth(), D(bookDate).getDate()),
    valStale: daysTo(u.val?.notedOn) < -VAL_STALE_DAYS,
  };
}

/* ---- rollup across every unit an owner holds, in any entity ---- */
export function roll(c) {
  const all = c.units.map(unitCalc);
  const live = all.filter((u) => !u.exited);
  const S = (a, k) => a.reduce((s, u) => s + (u[k] || 0), 0);
  return {
    all, units: live,
    consideration: S(live, 'consideration'),
    paid: S(live, 'paid'),
    outstanding: S(live, 'outstanding'),
    value: S(live, 'currentValue'),
    gain: S(live, 'gain'),
  };
}

/* ---- contact gate — evaluated in strict order, first match wins ---- */
export const GATE_ORDER = [
  ['OWNER_EXITED', 'Owner has exited', (c) => c.status === 'EXITED',
    'No longer an owner — the unit was sold on the open market. Every outbound list must exclude this record. A portfolio statement here would be a serious error.'],
  ['TRANSFER_IN_PROGRESS', 'Transfer or succession in progress', (c) => c.status === 'TRANSFER_IN_PROGRESS' || c.status === 'DECEASED',
    'Ownership is being transferred to the nominee. No marketing, no greetings, no statements until transfer completes and the nominee gives fresh consent.'],
  ['LITIGATION', 'Litigation flag', (c) => c.litigation,
    'Litigation flag set. Legal clearance required before any contact.'],
  ['OPEN_COMPLAINT', 'Open service complaint', (c) => c.openComplaints.length > 0, null],
  ['NO_MARKETING_CONSENT', 'No marketing consent under DPDP', (c) => !c.consent.marketing,
    'Marketing consent not on record. Service and transactional messages only. This is a legal block, not a preference.'],
  ['STALE_VALUATION', 'Valuation note out of date',
    (c) => c.units.some((u) => !u.exited && daysTo(u.val.notedOn) < -VAL_STALE_DAYS),
    'The valuation note for this project is more than 90 days old. A gain figure computed on stale evidence must not be shown to a customer.'],
];

export function gate(c) {
  for (const [code, label, test, why] of GATE_ORDER) {
    if (test(c)) {
      if (code === 'OPEN_COMPLAINT') {
        const o = c.openComplaints[0];
        return {
          open: false, code, label,
          why: 'Open complaint ageing ' + o.days + ' days (' + o.ncr + ', owner: ' + o.owner +
               '). Sales and marketing outbound suppressed until service closes it. The record returns to outreach automatically on closure.',
        };
      }
      return { open: false, code, label, why };
    }
  }
  return {
    open: true, code: 'OPEN', label: 'No block',
    why: 'Marketing consent on record, no open service issue, valuation current.',
  };
}

/* ---- is this record clean enough to put in front of a customer ---- */
export function confidence(c) {
  const checks = [
    ['Identity verified — PAN and KYC', !!c.pan && !!c.kycDate],
    ['Mobile on record', !!c.mobile],
    ['Address updated since booking', !!c.corrAddr && !c.corrAddr.includes('not updated')],
    ['Owner status confirmed active', c.status === 'ACTIVE'],
    ['Paid-to-date within consideration', c.units.every((u) => u.paid <= u.consideration)],
    ['Registry on record for every possessed unit', c.units.every((u) => !u.possDate || !!u.regDate)],
    ['Valuation note dated within 90 days', c.units.every((u) => u.exited || daysTo(u.val.notedOn) >= -VAL_STALE_DAYS)],
    ['DPDP consent recorded', !!c.consent.date],
    ['Date of birth captured', c.captured.dob],
    ['Anniversary captured', c.captured.anniv || !hasCoApplicant(c)],
  ];
  const pass = checks.filter((x) => x[1]).length;
  return { checks, pass, total: checks.length, pct: Math.round((pass / checks.length) * 100) };
}

export function score(c, W = DEFAULT_W) {
  const r = roll(c);
  if (!r.units.length) return { capacity: 0, trust: 0, timing: 0, engagement: 0, total: 0 };

  const paidPct = r.consideration ? r.paid / r.consideration : 0;
  const closed = r.units.every((u) => u.loan.closed || u.loan.selfFunded);
  const prepay = r.units.some((u) => u.loan.prepaid);
  const capacity = Math.min(100,
    paidPct * 30 + (closed ? 25 : prepay ? 15 : 6) + Math.min(1, r.gain / 4000000) * 25 + (c.occBand / 100) * 20);

  const bounced = r.units.reduce((s, u) => s + u.bounced, 0);
  const trust = Math.max(0, Math.min(100,
    (c.openComplaints.length ? 0 : 35) + ((c.nps || 5) / 10) * 30 + (25 - bounced * 4) + (c.litigation ? 0 : 10)));

  const held = Math.max(...r.units.map((u) => u.heldYrs));
  const cands = [
    c.captured.dob ? annivIn(c.dob) : null,
    c.captured.anniv ? annivIn(c.spouseDob) : null,
    ...r.units.map((u) => annivIn(u.bookDate)),
  ].filter((x) => x != null);
  const trig = cands.length ? Math.min(...cands) : 999;
  const nf = nextFest();
  const timing = Math.min(100,
    (held >= 2 ? 30 : (held / 2) * 30) + (closed ? 25 : prepay ? 15 : 5) +
    (trig <= 45 ? 25 : trig <= 90 ? 14 : 5) + (nf && nf.days <= 60 ? 20 : nf && nf.days <= 120 ? 11 : 4));

  const engagement = Math.min(100,
    Math.min(1, c.referrals.length / 4) * 40 + Math.min(1, c.events.length / 3) * 30 +
    Math.min(1, c.siteVisits / 4) * 20 + (c.portalLast ? 10 : 0));

  const t = W.capacity + W.trust + W.timing + W.engagement;
  return {
    capacity, trust, timing, engagement,
    total: Math.round((capacity * W.capacity + trust * W.trust + timing * W.timing + engagement * W.engagement) / t),
  };
}

export function segOf(c, W = DEFAULT_W, g = gate(c), s = score(c, W)) {
  if (!g.open) return 'C';
  if (s.total >= 76) return 'A';
  if (s.trust >= 65 && s.capacity < 50) return 'D';
  return s.total >= 50 ? 'B' : 'D';
}

/* What the segment chip actually says — the gate reason outranks the score */
export function segDisplay(c) {
  const g = c._g;
  if (g.code === 'OWNER_EXITED') return { cls: 'r', t: 'Out of scope — exited' };
  if (g.code === 'TRANSFER_IN_PROGRESS') return { cls: 'r', t: 'Out of scope — transfer pending' };
  if (g.code === 'LITIGATION') return { cls: 'r', t: 'C · Legal hold' };
  if (g.code === 'NO_MARKETING_CONSENT') return { cls: 'w', t: 'Service contact only' };
  if (g.code === 'STALE_VALUATION') return { cls: 'w', t: 'Held — valuation stale' };
  return { cls: c._seg, t: SEGLBL[c._seg] };
}

/* ---- enrich: attach every derived field, re-run on any weight change ---- */
export function enrich(base, W) {
  return base.map((c) => {
    const s = score(c, W);
    const g = gate(c);
    const r = roll(c);
    const rawSeg = segOf(c, W, g, s);
    /* a manual segmentOverride (see PATCH /:id/segment-override) only
       takes hold while the gate is open — segOf() already forces 'C'
       otherwise, and letting an override promote someone past a
       closed gate would defeat the entire point of the gate. _segRaw
       is what the score alone says, kept alongside _seg so the UI can
       show "computed vs. overridden" instead of hiding the real
       number the moment someone overrides it. */
    const seg = (g.open && c.segmentOverride?.seg) ? c.segmentOverride.seg : rawSeg;
    return {
      ...c,
      _s: s, _total: s.total, _seg: seg, _segRaw: rawSeg,
      _segOverridden: g.open && !!c.segmentOverride?.seg,
      _g: g, _blocked: !g.open,
      _gain: r.gain, _value: r.value, _consid: r.consideration, _paid: r.paid,
      _out: r.outstanding, _live: r.units.length, _conf: confidence(c).pct,
      _rate: r.units.length ? (r.units[0].rate || 0) : 0,
      _vrate: r.units.length ? r.units[0].valueRate : 0,
      _project: c.units[0].project, _unit: c.units[0].unit, _book: c.units[0].bookDate,
      _held: r.units.length ? Math.max(...r.units.map((u) => u.heldYrs)) : 0,
      _paidPct: r.consideration ? (r.paid / r.consideration) * 100 : 0,
    };
  });
}

/* ---- dated reasons to make contact, gate applied ---- */
/* `incompleteBase` (raw, unenriched shell records — no PAN/confirmed
   financials) contributes personal triggers only. A birthday or
   anniversary is real and worth a call regardless of whether KYC is
   done; a portfolio trigger (booking anniversary, loan closure, LTCG
   window) genuinely can't be computed without real unit financials,
   so those stay complete-owners-only rather than running unitCalc()
   on nulls and producing a meaningless date. */
/* has this one occurrence (this label, due on this exact date) already
   been marked handled off the Trigger Calendar? Label + date together
   are the natural key — see TriggerAckSchema on the backend — so a
   recurring trigger (a birthday, say) acknowledged this year shows as
   due and unhandled again next year, when the date has moved on. */
function findAck(c, label, date) {
  return (c.triggerAcks || []).find((a) => a.label === label && a.date === date);
}

export function triggerList(base, incompleteBase = []) {
  const out = [];
  base.forEach((c) => {
    if (c._blocked) return;
    const add = (d, label, kind) => {
      if (d == null || d < 0 || d > 90) return;
      const ack = d === 0 ? findAck(c, label, todayInput()) : null;
      out.push({ c, days: d, label, kind, acked: !!ack, remark: ack?.remark || null, ackedBy: ack?.by || null });
    };
    if (c.captured.dob) add(annivIn(c.dob), 'Birthday', 'personal');
    if (c.captured.anniv && c.spouseDob) add(annivIn(c.spouseDob), 'Wedding anniversary', 'personal');
    /* a shell/incomplete unit (no confirmed bookDate) has no real
       booking/registry/LTCG anniversary to compute — skip it here
       rather than deriving a trigger from a null or epoch date. */
    c.units.filter((u) => !u.exited && u.bookDate).forEach((u) => {
      add(annivIn(u.bookDate), 'Booking anniversary — year ' + Math.max(1, TODAY.getFullYear() - D(u.bookDate).getFullYear()), 'portfolio');
      if (u.regDate) add(annivIn(u.regDate), 'Registry anniversary', 'portfolio');
      if (!u.loan.closed && u.loan.closure) add(daysTo(u.loan.closure), 'Home loan closes — EMI capacity frees up', 'money');
      add(daysTo(new Date(D(u.bookDate).getFullYear() + 2, D(u.bookDate).getMonth(), D(u.bookDate).getDate())),
        'Completes 24 months — LTCG / 54F window opens', 'money');
    });
  });
  incompleteBase.forEach((c) => {
    const add = (d, label, kind) => {
      if (d == null || d < 0 || d > 90) return;
      const ack = d === 0 ? findAck(c, label, todayInput()) : null;
      out.push({ c, days: d, label, kind, acked: !!ack, remark: ack?.remark || null, ackedBy: ack?.by || null });
    };
    if (c.captured.dob) add(annivIn(c.dob), 'Birthday', 'personal');
    if (c.captured.anniv && c.spouseDob) add(annivIn(c.spouseDob), 'Wedding anniversary', 'personal');
  });
  return out.sort((a, b) => a.days - b.days || (b.c._total ?? 0) - (a.c._total ?? 0));
}

/* ---- due today and not yet acknowledged — the "point" every trigger
   surface (Sidebar nav, header bell, the Trigger Calendar's own rows)
   dots when it's true, and stops dotting the moment it's acked ---- */
export const dueTodayUnacked = (list) => list.filter((t) => t.days === 0 && !t.acked);

/* Manual, staff-written reminders (see FollowUpSchema) — surfaced by
   the header bell the same way the system-computed triggerList()
   above is, so "call back Tuesday about the loan" shows up exactly
   like a birthday does. Only overdue-or-due-right-now, unfinished ones
   are returned — a follow-up scheduled for next week doesn't belong
   in "what needs attention right now" the way a same-day birthday
   does; it'll appear here on its own the moment its time arrives. */
export function followUpsDue(base) {
  const now = new Date();
  const out = [];
  base.forEach((c) => {
    if (c._blocked) return;
    (c.followUps || []).forEach((f) => {
      if (f.done) return;
      const dueAt = new Date(f.dueAt);
      if (dueAt > now) return;
      out.push({ c, id: f._id, note: f.note, dueAt });
    });
  });
  return out.sort((a, b) => a.dueAt - b.dueAt);
}

/* One owner's combined timeline: every system-computed dated reason
   to reach out (birthdays, anniversaries, loan closure, LTCG/54F
   windows) plus every still-open manual follow-up note, oldest/most-
   overdue first — exactly what the "Timeline" tab (MFollowUps.jsx)
   renders. Pulled out here, rather than left inline in that one
   component, so CustomerMaster.jsx's own "Next Follow-up" sidebar
   card (Nexora-inspired — see its own comment) can read the single
   soonest item without re-deriving the whole trigger list a second
   time in a second place. `date` is a real Date on every item (not
   just the relative `days` offset triggerList()-style code already
   used) specifically so a countdown hook has something concrete to
   tick against. */
export function timelineItems(c) {
  const r = roll(c);
  const rawTriggers = [];
  if (c.captured.dob) rawTriggers.push(['Birthday', annivIn(c.dob), fmtDM(c.dob), 'personal']);
  if (c.captured.anniv && c.spouseDob) rawTriggers.push(['Wedding anniversary', annivIn(c.spouseDob), fmtDM(c.spouseDob), 'personal']);
  if (c.captured.kid) c.children.forEach((k) => rawTriggers.push([`${k.n}'s birthday`, annivIn(k.dob), fmtDM(k.dob), 'personal']));
  r.units.forEach((u) => {
    if (u.bookDate) rawTriggers.push(['Booking anniversary — ' + u.unit, annivIn(u.bookDate), fmtDM(u.bookDate), 'portfolio']);
    if (u.regDate) rawTriggers.push(['Registry anniversary — ' + u.unit, annivIn(u.regDate), fmtDM(u.regDate), 'portfolio']);
    if (!u.loan.closed && u.loan.closure) rawTriggers.push(['Loan closure — ' + u.unit, daysTo(u.loan.closure), fmtD(u.loan.closure), 'money']);
    rawTriggers.push(['LTCG / 54F window — ' + u.unit, daysTo(u.ltcg), fmtD(u.ltcg), 'money']);
  });

  const all = c.followUps || [];
  const openNotes = all.filter((f) => !f.done);

  const items = [
    ...rawTriggers.map(([label, d, dt, kind], i) => ({
      key: `trig-${i}`, isNote: false, days: d, date: addD(TODAY, Math.round(d)), label, sub: `${dt} · ${kind}`,
      tone: kind === 'money' ? 'g' : kind === 'portfolio' ? 'o' : '',
      ack: d === 0 && (label === 'Birthday' || label === 'Wedding anniversary') ? findAck(c, label, todayInput()) : null,
    })),
    ...openNotes.map((f) => {
      const date = new Date(f.dueAt);
      return {
        key: f._id, isNote: true, days: (date - new Date()) / 86400000, date, label: f.note,
        sub: fmtDT(date) + (f.createdBy ? ` · added by ${f.createdBy}` : ''),
        tone: date <= new Date() ? 'r' : '', f,
      };
    }),
  ];
  return items.sort((a, b) => a.days - b.days);
}

/* ---- per-owner document vault ---- */
/* Per unit, per row: which documents to even ask for depends on that
   unit's own top-level property type (Villa/Flat/Plot each want a
   different set — see topPropertyType() in core.js and the Master
   Data page's per-type checklist editor), and whether each one is
   actually on file is purely "has a page been uploaded under this
   key" (see MDocuments.jsx's pagesFor()) — no longer a stand-in for a
   milestone date being captured. A unit's agreement/registry/
   possession dates (MilestonesModal.jsx) are a separate, still-real
   fact about the booking; they just don't drive this checklist
   anymore, since a signed date and a scanned copy on file are two
   different questions and conflating them is what made a row read
   "on file" with nothing actually attached.
   `documentTemplates` is useApp().masterData.documentTemplates — a
   map of property type -> document labels, admin-edited. */
export function docsFor(c, documentTemplates = {}) {
  const pagesFor = (key) => (c.documents || []).filter((x) => x.key === key);
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  /* `unit` is null for owner-level rows (succession/nominee papers,
     not tied to any one unit) — MDocuments.jsx groups by this to
     render one section per unit instead of one flat list, with a
     trailing "Owner-level" section for the null-unit rows. `type` is
     just the document type on its own (no unit suffix), for the row
     label inside a section that's already titled with the unit; `n`
     stays the full "Type — Unit" label for places that show a row
     out of that context (e.g. DocumentPreviewModal's title). */
  const row = (key, n, unit, type) => {
    const pages = pagesFor(key);
    return { key, n, unit, type, ok: pages.length > 0, d: pages[0]?.uploadedAt || null };
  };

  const d = [];
  const expectedKeys = new Set();
  c.units.forEach((u) => {
    const label = u.unit || 'no unit number yet';
    /* genuinely never captured (not just an unusual value) — showing
       the generic "Other" checklist in that case used to read as a
       real answer ("this owner needs a Sale Deed") when it was
       actually just a fallback for missing data. Say so instead. */
    if (!String(u.type || '').trim()) {
      d.push({ key: `notype-${u.unit || 'noNumber'}`, n: label, unit: label, type: null, ok: null, d: null, noType: true });
      return;
    }
    const top = topPropertyType(u.type);
    const docTypes = documentTemplates[top]?.length ? documentTemplates[top] : (documentTemplates.Other || []);
    docTypes.forEach((docType) => {
      const key = `${slug(docType)}-${u.unit || 'noNumber'}`;
      expectedKeys.add(key);
      d.push(row(key, `${docType} — ${label}`, label, docType));
    });
    if (u.exited) {
      const key = `transfer-${u.unit || 'noNumber'}`;
      expectedKeys.add(key);
      d.push(row(key, 'Transfer deed (third party) — ' + label, label, 'Transfer deed (third party)'));
    }
  });
  if (c.status === 'TRANSFER_IN_PROGRESS') {
    expectedKeys.add('succession');
    d.push(row('succession', 'Succession / transfer papers', null, 'Succession / transfer papers'));
    expectedKeys.add('kyc-nominee');
    d.push(row('kyc-nominee', 'KYC — nominee', null, 'KYC — nominee'));
  }

  /* documents genuinely on file that don't match any row above — most
     often a Master Data checklist label got renamed (or a type's
     checklist changed) after these were already uploaded/linked, which
     otherwise makes a real, on-record document silently vanish from
     view rather than just showing under a name that no longer matches
     the current checklist. Grouped under whichever unit the key's own
     "-<unit>" suffix names, so it still lands in the right section
     instead of an unexplained separate pile. */
  const seenOrphanKeys = new Set();
  (c.documents || []).forEach((doc) => {
    if (expectedKeys.has(doc.key) || seenOrphanKeys.has(doc.key)) return;
    seenOrphanKeys.add(doc.key);
    const unit = c.units.find((u) => u.unit && doc.key.endsWith(`-${u.unit}`));
    const label = unit ? (unit.unit || 'no unit number yet') : null;
    d.push({
      key: doc.key,
      n: `Other document on file — ${label || 'owner-level'}`,
      unit: label,
      type: 'Other document on file',
      ok: true,
      d: doc.uploadedAt || null,
      orphan: true,
    });
  });

  return d;
}

/* ---- every touch, by name, newest first ---- */
export function activityFor(c) {
  const a = [];
  c.units.forEach((u) => {
    a.push({ d: u.bookDate, w: 'Sales', t: 'Booked ' + u.unit + ' at ' + (u.rate != null ? '₹' + u.rate.toLocaleString('en-IN') + ' per sq.ft.' : 'an unrecorded rate'), by: 'Sales' });
    if (u.regDate) a.push({ d: u.regDate, w: 'Legal', t: 'Registry completed — ' + u.unit, by: 'Legal' });
    if (u.loan.closedOn) a.push({ d: u.loan.closedOn, w: 'Finance', t: u.loan.bank + ' loan on ' + u.unit + (u.loan.prepaid ? ' foreclosed by customer' : ' closed on schedule'), by: 'Bank feed' });
    if (u.exited) a.push({ d: u.exitDate, w: 'System', t: 'Owner status changed to Exited. Unit resold on the open market at approx. ' + (u.exitRate != null ? '₹' + u.exitRate.toLocaleString('en-IN') + '/sq.ft.' : 'an unrecorded rate'), by: 'Legal' });
  });
  if (c.consent.date) a.push({ d: c.consent.date, w: 'Consent', t: 'DPDP consent recorded — marketing ' + (c.consent.marketing ? 'granted' : 'DECLINED'), by: 'CRM' });
  if (c.nps) a.push({ d: c.npsDate, w: 'Survey', t: 'NPS captured — ' + c.nps + '/10' + (c.npsReason ? ' (' + c.npsReason + ')' : ''), by: 'CRM' });

  c.openComplaints.forEach((o) => {
    a.push({ d: o.raised, w: 'Service', t: 'Complaint raised — ' + o.t + '. ' + o.ncr + ' opened.', by: 'CRM' });
    a.push({ d: o.raised, w: 'System', t: 'Contact gate CLOSED — all sales and marketing outbound suppressed', by: 'System' });
  });
  c.referrals.forEach((r) => a.push({ d: r.date, w: 'Referral', t: 'Referred ' + r.n + ' — ' + r.status, by: 'Sales' }));
  c.events.forEach((e) => a.push({ d: e.d, w: 'Event', t: 'Attended ' + e.n, by: 'CRM' }));
  (c.calls || []).forEach((call) => a.push({
    d: call.date, w: 'Call', t: 'Call — ' + call.outcome + (call.note ? ': ' + call.note : ''), by: call.by || 'CRM',
  }));
  c.statements.forEach((s) => a.push({
    d: s.d, w: 'Statement',
    t: 'Portfolio statement ' + s.v + ' sent via ' + s.ch +
       (s.disputed ? ' — FIGURE DISPUTED by customer' : s.profileDone ? ' — profile completed' : ''),
    by: 'CRM',
  }));
  if (c.portalLast) a.push({ d: c.portalLast, w: 'Customer', t: 'Logged into owner portal', by: '—' });
  return a.sort((x, y) => D(y.d) - D(x.d)).slice(0, 16);
}

/* ---- Portfolio NPS statistics helper ---- */
export function getNpsStats(base = []) {
  const withNps = base.filter((c) => c.nps != null && c.nps >= 0 && c.nps <= 10);
  const total = withNps.length;
  if (!total) {
    return { total: 0, promoters: 0, passives: 0, detractors: 0, score: 0, avgRating: 0, promoterPct: 0, passivePct: 0, detractorPct: 0 };
  }
  const promoters = withNps.filter((c) => c.nps >= 9).length;
  const passives = withNps.filter((c) => c.nps >= 7 && c.nps <= 8).length;
  const detractors = withNps.filter((c) => c.nps <= 6).length;
  const promoterPct = Math.round((promoters / total) * 100);
  const passivePct = Math.round((passives / total) * 100);
  const detractorPct = Math.round((detractors / total) * 100);
  const score = promoterPct - detractorPct;
  const avgRating = (withNps.reduce((s, c) => s + c.nps, 0) / total).toFixed(1);

  return { total, promoters, passives, detractors, score, avgRating, promoterPct, passivePct, detractorPct };
}

