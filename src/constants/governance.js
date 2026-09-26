/* =====================================================================
   REFERENCE — the field dictionary and the access matrix. Static tables
   that document the system rather than drive it.
   ===================================================================== */
import { Users, Wallet, TrendingUp, ShieldAlert, Settings, Layers } from 'lucide-react';

/* [db field, on screen, type, source, capture owner, required, pii, note] */
export const DICT = [
  ['Layer 1 — Identity and relationship graph', [
    ['customer_id', 'Customer ID', 'string', 'Assigned on first booking', 'System', 'Yes', '', 'Spans all three entities. A buyer in Neoteric Properties and Navayan is ONE record. This is Phase 0.'],
    ['owner_status', 'Owner status', 'enum', 'Legal / registry search', 'CRM', 'Yes', '', 'Active · Exited · Transfer in progress · Deceased. The most important field in the system — it decides whether this person may be contacted at all.'],
    ['owner_status_since, status_note', 'Status changed', 'date + text', 'Legal', 'CRM', 'Yes', '', ''],
    ['salutation, full_name, gender', 'Name', 'string', 'Booking form', 'CRM', 'Yes', 'PII', ''],
    ['pan', 'PAN', 'string, masked', 'KYC', 'CRM', 'Yes', 'PII', 'Primary dedupe key. Never dedupe on name.'],
    ['aadhaar_held', 'Aadhaar on file', 'boolean', 'KYC', 'CRM', 'Yes', 'PII', 'Store the flag, not the number, unless you have a lawful basis to retain it.'],
    ['mobile, alt_mobile', 'Mobile', 'string', 'Booking form', 'CRM', 'Yes', 'PII', 'Secondary dedupe key.'],
    ['corr_address, perm_address', 'Address', 'text', 'Booking form', 'CRM', 'Yes', 'PII', 'Flag when not updated since booking — statements get returned.'],
    ['dob', 'Date of birth', 'date', 'Owner profile', 'Customer', 'No', 'PII', 'Missing on roughly 6 in 10 records today.'],
    ['co_applicant_name, relation, on_agreement', 'Co-applicant', 'string', 'Sale agreement', 'CRM', 'Yes', 'PII', 'Decides who the statement is addressed to and who signs an exchange.'],
    ['spouse_dob', 'Anniversary', 'date', 'Owner profile', 'Customer', 'No', 'PII', ''],
    ['children[] {name, dob}', 'Children', 'array', 'Owner profile', 'Customer', 'No', 'PII', 'DPDP requires verifiable parental consent. Consider dropping this field entirely.'],
    ['occupation, employer, income_band', 'Occupation', 'enum', 'Owner profile', 'Customer', 'No', '', 'Feeds Capacity. Salaried and business have different liquidity patterns.'],
    ['community_cluster, home_town', 'Community', 'enum', 'Owner profile', 'Customer', 'No', 'PII', 'For network mapping only — never for pricing or selection.'],
    ['source_channel', 'Came to us via', 'enum', 'Booking form', 'Sales', 'Yes', '', ''],
    ['referred_by_customer_id', 'Referred by', 'FK', 'Booking form', 'Sales', 'No', '', 'Tag at booking or it is lost forever.'],
  ]],
  ['Layer 2 — Investment ledger (one row per unit)', [
    ['unit_id, project, entity, tower, unit_no', 'Unit', 'string', 'Inventory master', 'Sales', 'Yes', '', ''],
    ['carpet_sqft, saleable_sqft, loading_pct', 'Area', 'number', 'Inventory master', 'Projects', 'Yes', '', 'Carry both. Loading is what buyers now ask about; RERA is written around carpet.'],
    ['booking_date, agreement_date, registry_date, possession_date', 'Milestones', 'date', 'Legal file', 'CRM', 'Yes', '', 'Four dates. Each is a trigger and each is a gate.'],
    ['booking_rate_psf, discount, realised_rate_psf', 'Rate paid', 'number', 'Booking form', 'Sales', 'Yes', '', 'rate × saleable − discount must equal consideration or the row is rejected at import.'],
    ['total_consideration', 'Consideration', 'number', 'Sale agreement', 'Finance', 'Yes', '', ''],
    ['receipts[] {date, amount, mode, instrument, bounced}', 'Payment ledger', 'array', 'Tally', 'Finance', 'Yes', '', 'paid_to_date is DERIVED from this. Never keyed in.'],
    ['paid_to_date, outstanding', 'Paid / outstanding', 'derived', '—', 'System', '—', '', 'Any mismatch against Tally holds the record in the exceptions queue.'],
    ['funding_mode, bank, tenure, emi_start, loan_closure_date, closed_on, prepaid', 'Loan', 'object', 'Bank NOC / customer', 'CRM', 'No', '', 'Closure date is a top-three trigger — that EMI becomes free capacity.'],
    ['val {ask_psf, resale_psf, circle_psf, noted_on, basis, signed_by}', 'Valuation', 'object', 'Monthly valuation note', 'Finance', 'Yes', '', 'Value at resale, floor at circle, never publish the ask. noted_on and basis are what make it defensible.'],
    ['exited, exit_date, exit_rate', 'Exit', 'object', 'Registry search', 'Legal', 'No', '', 'A resale you did not handle. Record it — it is the running cost of no exit desk.'],
    ['derived: current_value, gain_inr, gain_pct, cagr, holding_years, ltcg_date', 'Position', 'derived', '—', 'System', '—', '', ''],
  ]],
  ['Layer 3 — Behaviour, trust and consent', [
    ['complaints[] {text, raised, closed, days, ncr_ref, owner}', 'Complaints', 'array', 'CRM / NCR system', 'CRM', 'Yes', '', 'Any open complaint closes the gate. Links to your existing NCR numbering.'],
    ['nps_score, nps_captured_on', 'NPS', 'number + date', 'Survey', 'CRM', 'No', '', 'A score older than 12 months should not be scored on.'],
    ['litigation_flag', 'Litigation', 'boolean', 'Legal case system', 'Legal', 'Yes', '', 'Hard block.'],
    ['payment_discipline, cheque_returns', 'Payment discipline', 'derived', 'Ledger', 'System', '—', '', ''],
    ['site_visits_post_booking, events_attended[]', 'Engagement', 'array', 'Event register', 'CRM', 'No', '', ''],
    ['referrals[] {name, id, date, status, rm_assigned}', 'Referrals given', 'array', 'CRM', 'Sales', 'No', '', 'Track the ones that did NOT convert. Silence towards the referrer kills the second referral.'],
    ['consent {whatsapp, sms, email, marketing, date, purpose, withdrawal}', 'Consent', 'object', 'Consent capture', 'CRM', 'Yes', 'PII', 'Marketing consent is separate from service consent. No marketing consent = no statement, whatever the score.'],
    ['consent.children, parental_consent_ref', 'Children data consent', 'object', 'Consent capture', 'CRM', 'Cond.', 'PII', 'Required if any child DOB is held.'],
  ]],
  ['Layer 4 — Trigger dates', [
    ['dob, spouse_dob, children_dob[]', 'Personal dates', 'date', 'Owner profile', 'Customer', 'No', 'PII', 'Recurring. Only fire when the gate is open.'],
    ['booking / registry / possession anniversary', 'Portfolio dates', 'derived', '—', 'System', '—', '', 'Derivable from what you already hold. Start the trigger calendar here.'],
    ['ltcg_eligible_date', 'LTCG / 54F window', 'derived', 'booking + 24 months', 'System', '—', '', 'Constrains when an exchange can happen without a tax hit, not just when to call.'],
    ['loan_closure_date', 'Loan closure', 'date', 'Bank / customer', 'CRM', 'No', '', ''],
    ['festive_calendar', 'Auspicious window', 'system table', 'Maintained annually', 'Marketing', '—', '', 'Akshaya Tritiya, Navratri, Dhanteras, Gudi Padwa.'],
  ]],
  ['Layer 5 — Derived state and governance', [
    ['capacity, trust, timing, engagement', 'Pillar scores', 'derived', '—', 'System', '—', '', ''],
    ['propensity_score, segment, segment_since', 'Segment', 'derived', '—', 'System', '—', '', 'Segment C is set by the gate, never by the score.'],
    ['gate_status, gate_code, gate_reason', 'Contact gate', 'derived', '—', 'System', '—', '', 'Machine-readable so the send layer enforces it independently of the screen.'],
    ['data_confidence_pct, failed_checks[]', 'Data confidence', 'derived', '—', 'System', '—', '', 'Which records are clean enough to put in front of a customer.'],
    ['statements[] {sent_on, version, channel, opened, disputed}', 'Statement history', 'array', 'Send layer', 'System', '—', '', 'Archive exactly what the customer saw, not what the database says today.'],
    ['activity[] {date, type, text, by}', 'Activity log', 'array', 'All systems', 'System', 'Yes', '', 'Without outcome data the weights can never be re-fit.'],
    ['next_action, next_action_owner, next_action_due', 'Next action', 'object', 'Manual', 'Named person', 'Yes', '', 'A named owner and a date, or it does not happen.'],
  ]],
];

/* The capability catalogue — the fifteen things access can be granted
   against. Each label is enforced by a requirePermission() call on a
   real route (backend/src/routes/customers.js), which is why this list
   is code and not something User management can add to.

   Which roles exist, and what level each holds against each capability,
   is data — read from /api/roles (see hooks/useRoles.js). The matrix
   that used to live here is now the seed in
   backend/src/lib/permissions.js and nothing reads it from the
   frontend any more. */
export const CAPABILITIES = [
  'Owner base — names and units',
  'Payment ledger and outstanding',
  'Unrealised gain and valuation',
  'Propensity score and segment',
  'Personal dates — DOB, anniversary',
  'Complaints and NCR references',
  'Litigation flag and case notes',
  'Consent record',
  'Send a portfolio statement',
  'Export the base',
  'Change the valuation note',
  'Override the contact gate',
  'Owner status and transfer state',
  'Engagement data — NPS, referrals, events, visits',
  'Manage events and invite lists',
  'Manage leads and external complaints',
  'User management — add/edit/deactivate accounts',
  'Impersonate other user accounts',
  /* one row per sidebar page — see backend/src/lib/permissions.js's
     own comment on MODULE_CAPABILITIES for why these are separate
     from the action rows above. */
  'Module: Dashboard',
  'Module: Owner base',
  'Module: Trigger calendar',
  'Module: Referral tree',
  'Module: Events',
  'Module: Leads',
  'Module: Portfolio statement',
  'Module: Statement send log',
  'Module: Intake & exceptions',
  'Module: Incomplete records',
  'Module: Valuation register',
  'Module: Exit register',
  'Module: Scoring engine',
  'Module: Field dictionary',
  'Module: Access & governance',
  'Module: User management',
  'Module: Company profile',
  'Module: Roles',
  'Module: Master data',
  'Module: Audit log',
];

/* the capability that guards User management itself — the UI warns
   before anyone edits it, since it is the one that can lock people out */
export const MANAGE_USERS = 'User management — add/edit/deactivate accounts';

/* the one row nothing may open — not a role, not a per-user override.
   Same constant, same reasoning, in backend/src/lib/permissions.js. */
export const NON_OVERRIDABLE = 'Override the contact gate';

export const PERM_LABEL = {
  F: { cls: 'yes', t: 'full' },
  S: { cls: 'part', t: 'own scope' },
  O: { cls: 'part', t: 'own customers' },
  N: { cls: 'no', t: 'none' },
};

/* level picker options, shared by the role editor and the per-user
   override editor so the wording can never drift between them */
export const LEVEL_OPTIONS = [
  { value: 'F', label: 'Full' },
  { value: 'S', label: 'Own scope' },
  { value: 'O', label: 'Own customers' },
  { value: 'N', label: 'None' },
];

/* how many capabilities a role actually opens — the count shown on
   each role card. The gate is excluded from the denominator because no
   role can ever hold it. */
export const GRANTABLE = CAPABILITIES.filter((c) => c !== NON_OVERRIDABLE);

export const openCount = (permissions) =>
  GRANTABLE.filter((c) => (permissions || {})[c] && permissions[c] !== 'N').length;

/* Shared grouping for BOTH the per-role matrix (RolePermissionsModal)
   and the per-user override editor (UserPermissionsModal) — the same
   "which functional area" organization applies whether you're setting
   a whole role's defaults or one person's exceptions to it, so this is
   defined once rather than risking the two screens' groupings drifting
   apart. Purely a display grouping — the capabilities themselves are
   still one flat, fixed list enforced on real routes (see
   backend/src/lib/permissions.js). Every CAPABILITIES entry must appear
   in exactly one group — checked once, below, rather than trusted. */
export const PERMISSION_GROUPS = [
  { name: 'Owner records', Icon: Users, labels: ['Owner base — names and units', 'Personal dates — DOB, anniversary', 'Consent record'] },
  { name: 'Financials', Icon: Wallet, labels: ['Payment ledger and outstanding', 'Unrealised gain and valuation', 'Change the valuation note'] },
  { name: 'Scoring & engagement', Icon: TrendingUp, labels: ['Propensity score and segment', 'Engagement data — NPS, referrals, events, visits', 'Send a portfolio statement', 'Manage events and invite lists', 'Manage leads and external complaints'] },
  { name: 'Risk & compliance', Icon: ShieldAlert, labels: ['Complaints and NCR references', 'Litigation flag and case notes', NON_OVERRIDABLE] },
  { name: 'Administration', Icon: Settings, labels: ['Owner status and transfer state', 'Export the base', MANAGE_USERS, 'Impersonate other user accounts'] },
  /* one row per sidebar page/tab — whether the person sees it at all,
     not whether an action inside it works (that's every group above).
     See constants/navigation.js's `capability` field and
     backend/src/lib/permissions.js's MODULE_CAPABILITIES for the other
     half of this. Company profile/Users/Roles are separate rows (used
     to share one) so any one of Settings' three account/team tabs can
     be handed out without the other two. */
  { name: 'Modules — sidebar pages', Icon: Layers, labels: [
    'Module: Dashboard', 'Module: Owner base', 'Module: Trigger calendar', 'Module: Referral tree',
    'Module: Events', 'Module: Leads',
    'Module: Portfolio statement', 'Module: Statement send log', 'Module: Intake & exceptions',
    'Module: Incomplete records', 'Module: Valuation register', 'Module: Exit register',
    'Module: Scoring engine', 'Module: Field dictionary', 'Module: Access & governance',
    'Module: User management', 'Module: Company profile', 'Module: Roles',
    'Module: Master data', 'Module: Audit log',
  ] },
];
if (import.meta.env.DEV) {
  const grouped = PERMISSION_GROUPS.flatMap((g) => g.labels);
  const missing = CAPABILITIES.filter((c) => !grouped.includes(c));
  const extra = grouped.filter((c) => !CAPABILITIES.includes(c));
  if (missing.length || extra.length) {
    // eslint-disable-next-line no-console
    console.error('governance.js: PERMISSION_GROUPS/CAPABILITIES mismatch', { missing, extra });
  }
}
