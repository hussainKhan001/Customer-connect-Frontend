export const FILES = [
  ['units_master.csv', 'One row per unit. Comes from your inventory and legal files.',
    ['entity', 'project', 'tower', 'unit_no', 'type', 'carpet_sqft', 'saleable_sqft', 'booking_date', 'agreement_date', 'registry_date', 'possession_date', 'booking_rate_psf', 'discount', 'total_consideration', 'customer_pan']],
  ['payment_ledger.csv', 'One row per receipt. Comes from Tally. paid_to_date is derived from this and never keyed in.',
    ['unit_no', 'receipt_date', 'amount', 'mode', 'instrument_no', 'bounced_flag', 'demand_ref']],
  ['customer_master.csv', 'One row per person. Comes from your booking forms and KYC file.',
    ['pan', 'mobile', 'alt_mobile', 'email', 'salutation', 'full_name', 'co_applicant_name', 'co_relation', 'corr_address', 'city', 'occupation', 'dob', 'anniversary', 'source_channel', 'referred_by_mobile', 'owner_status']],
];

/* Bulk complaint import — one row per complaint, matched to an
   existing owner purely by Project + Unit number (not Customer ID —
   whoever is filling this in knows which flat had the problem, not an
   internal customer code; not mobile either, since two owners can
   share one, e.g. family). Both Project and Unit are required: a unit
   number alone isn't unique across projects (see Owner Base's own
   unit filter), so there's no safe way to resolve the owner without
   both. In the rare case the exact same project+unit is still held by
   more than one owner (co-owners/joint holders on record), the row is
   held rather than guessed at — see handleImportComplaints. */
export const COMPLAINT_FIELDS = [
  ['project', 'Project', 'text'],
  ['unit', 'Unit number', 'text'],
  ['t', 'What happened', 'text'],
  ['raised', 'Raised on', 'date'],
  ['owner', 'Owner of the fix', 'text'],
  ['ncr', 'NCR reference', 'text'],
  ['status', 'Status (Open or Closed)', 'text'],
  ['reason', 'Resolution reason (if Closed)', 'text'],
];

export const FORM_FIELDS = [
  ['name', 'Full name', 'text'],
  ['pan', 'PAN', 'text'],
  ['mobile', 'Mobile', 'text'],
  ['project', 'Project', 'select'],
  ['unit', 'Unit number', 'text'],
  ['saleable', 'Saleable sq.ft.', 'number'],
  ['rate', 'Booking rate per sq.ft.', 'number'],
  ['discount', 'Discount', 'number'],
  ['consideration', 'Total consideration', 'number'],
  ['bookDate', 'Booking date', 'date'],
  ['paid', 'Received to date', 'number'],
];

/* The bulk-import sheet's full column set — everything about an owner
   that is genuinely "one value per person" (identity, KYC, consent,
   co-applicant, occupation, address) plus the fields needed to create
   their first unit. Deliberately NOT included: loan/valuation detail,
   complaints, referrals, events, calls, NPS — those are per-unit or
   repeating records (an owner can have several), so they don't fit a
   flat one-row-per-owner sheet and are entered later from Customer
   Master as they happen, not pre-populated in bulk. This list drives
   only the Excel template/import (see utils/excel.js) — the quick
   single-owner form still uses the shorter FORM_FIELDS above unchanged. */
export const FULL_FORM_FIELDS = [
  ['name', 'Full name', 'text'],
  ['pan', 'PAN', 'text'],
  ['mobile', 'Mobile', 'text'],
  ['email', 'Email', 'text'],
  ['salutation', 'Salutation', 'text'],
  ['dob', 'Date of birth', 'date'],
  ['spouseDob', 'Anniversary', 'date'],
  ['coApplicant', 'Co-applicant name', 'text'],
  ['coRelation', 'Co-applicant relation', 'text'],
  ['coOnAgreement', 'Co-applicant on agreement (Yes/No)', 'text'],
  ['kycDate', 'KYC completed date', 'date'],
  ['corrAddr', 'Current address', 'text'],
  ['city', 'City', 'text'],
  ['occupation', 'Occupation', 'text'],
  ['community', 'Community', 'text'],
  ['source', 'Came to us via', 'text'],
  ['consentWhatsapp', 'WhatsApp consent (Yes/No)', 'text'],
  ['consentSms', 'SMS consent (Yes/No)', 'text'],
  ['consentEmail', 'Email consent (Yes/No)', 'text'],
  ['consentMarketing', 'Marketing consent (Yes/No)', 'text'],
  ['consentChildren', "Children's data consent (Yes/No)", 'text'],
  ['consentPurpose', 'Consent purpose', 'text'],
  ['project', 'Project', 'select'],
  ['unit', 'Unit number', 'text'],
  ['saleable', 'Saleable sq.ft.', 'number'],
  ['rate', 'Booking rate per sq.ft.', 'number'],
  ['discount', 'Discount', 'number'],
  ['consideration', 'Total consideration', 'number'],
  ['bookDate', 'Booking date', 'date'],
  ['paid', 'Received to date', 'number'],
];
