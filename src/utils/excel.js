/* =====================================================================
   EXCEL IMPORT — bulk-create owners from a spreadsheet, and a
   downloadable sample template so the column format is never guessed.
   Uses exceljs (not the more common `xlsx`/SheetJS package — that one
   has two unpatched high-severity advisories, prototype pollution and
   ReDoS, both directly reachable through parsing an untrusted uploaded
   file, which is exactly what this module does).
   ===================================================================== */
import ExcelJS from 'exceljs';
import { SAMPLE_DRAFT } from './intake.js';
import { FULL_FORM_FIELDS, COMPLAINT_FIELDS } from '../constants/intakeFields.js';
import { PROJECTS } from '../constants/projects.js';
import { OCC, COMM } from '../constants/seedData.js';

const SHEET_NAME = 'Owners';
const TEMPLATE_FILENAME = 'owner-import-template.xlsx';

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

function sampleRows() {
  const first = {
    ...SAMPLE_DRAFT(),
    email: 'rahul.verma@example.com', salutation: 'Mr.',
    dob: '1985-06-14', spouseDob: '1990-11-02',
    coApplicant: 'Priya Verma', coRelation: 'Spouse', coOnAgreement: 'Yes',
    kycDate: '2021-04-02', corrAddr: 'B-42, Vivekanand Colony, Gwalior', city: 'Gwalior',
    occupation: OCC[0].k, community: COMM[0], source: 'Direct walk-in',
    consentWhatsapp: 'Yes', consentSms: 'Yes', consentEmail: 'No', consentMarketing: 'Yes', consentChildren: 'No',
    consentPurpose: 'Portfolio statements, launch invitations, service updates',
  };

  const p2 = PROJECTS[1] || PROJECTS[0];
  const rt = 2200, sa = 1450, dc = 20000;
  const second = {
    name: 'Another Sample Owner', pan: 'PQRSX5678M', mobile: '+91 9876543210',
    email: '', salutation: 'Mrs.',
    dob: '1978-02-28', spouseDob: '',
    coApplicant: '', coRelation: '', coOnAgreement: 'No',
    kycDate: '2022-01-15', corrAddr: '', city: 'Morar',
    occupation: OCC[3].k, community: COMM[2], source: 'Digital lead',
    consentWhatsapp: 'Yes', consentSms: 'No', consentEmail: 'No', consentMarketing: 'No', consentChildren: 'No',
    consentPurpose: 'Service and documentation only',
    project: p2.name, unit: 'RG-B-101', saleable: sa, rate: rt, discount: dc,
    consideration: rt * sa - dc, bookDate: '2022-01-15', paid: rt * sa - dc - 150000,
  };
  return [first, second];
}

/* 1-based column index -> Excel column letter (23 -> 'W', etc.) —
   computed from FULL_FORM_FIELDS' own order rather than hardcoded, so
   adding/reordering a field there can't silently point validation at
   the wrong column. */
function colLetter(n) {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const VALIDATION_ROWS = 200;

/* real Excel dropdown validation (not just a text instruction) for the
   columns that must match a fixed list — Occupation/Community feed
   the Capacity score via OCC/COMM (see validateProfilePatch), and a
   typo there fails silently different from a typo in a free-text
   field: the row is held with "choose a value from the list", not
   obviously wrong until import. */
function applyListValidation(sheet, key, formula) {
  const idx = FULL_FORM_FIELDS.findIndex(([k]) => k === key);
  if (idx === -1) return;
  const letter = colLetter(idx + 1);
  for (let r = 2; r <= VALIDATION_ROWS; r++) {
    sheet.getCell(`${letter}${r}`).dataValidation = {
      type: 'list', allowBlank: true, formulae: [formula],
      showErrorMessage: true, errorTitle: 'Invalid value', error: 'Choose a value from the dropdown list.',
    };
  }
}

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* downloads a template with the exact columns Intake expects, pre-filled
   with two realistic sample rows — never real owner data. */
export async function downloadSampleTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.columns = FULL_FORM_FIELDS.map(([key, label]) => ({ header: label, key, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  sampleRows().forEach((row) => sheet.addRow(row));

  /* a hidden sheet backs the dropdown lists — Excel data validation
     can reference another sheet's range but not an inline list long
     enough to hold occupation's full text, so this is the option that
     actually works rather than one that only fits the short lists. */
  const lists = workbook.addWorksheet('Lists');
  lists.state = 'hidden';
  lists.getColumn(1).values = ['Project', ...PROJECTS.map((p) => p.name)];
  lists.getColumn(2).values = ['Occupation', ...OCC.map((o) => o.k)];
  lists.getColumn(3).values = ['Community', ...COMM];
  lists.getColumn(4).values = ['YesNo', 'Yes', 'No'];

  applyListValidation(sheet, 'project', `=Lists!$A$2:$A$${PROJECTS.length + 1}`);
  applyListValidation(sheet, 'occupation', `=Lists!$B$2:$B$${OCC.length + 1}`);
  applyListValidation(sheet, 'community', `=Lists!$C$2:$C$${COMM.length + 1}`);
  ['coOnAgreement', 'consentWhatsapp', 'consentSms', 'consentEmail', 'consentMarketing', 'consentChildren']
    .forEach((k) => applyListValidation(sheet, k, '=Lists!$D$2:$D$3'));

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, TEMPLATE_FILENAME);
}

/* the fields buildCustomer/validateDraft cannot proceed without — if
   the header row doesn't map to one of these at all (not "mapped but
   blank" — genuinely not found in any column), every single row will
   fail on that field with the same generic message, which reads like
   241 rows of bad data rather than what it actually is: a header the
   parser never recognised. Caught explicitly below instead of letting
   that confusing pile-up happen. */
const REQUIRED_KEYS = ['name', 'pan', 'mobile', 'project', 'unit', 'saleable', 'rate', 'consideration', 'bookDate', 'paid'];
/* project and unit are BOTH required — there's no Customer ID column
   any more, so project+unit is the only way to find the owner, and a
   unit number alone isn't unique across projects. status is still
   optional: a blank value means "open" — see handleImportComplaints
   in Intake.jsx. */
const COMPLAINT_REQUIRED_KEYS = ['project', 'unit', 't', 'raised', 'owner', 'ncr'];

function cellValue(cell) {
  let value = cell.value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === 'object' && 'text' in value) value = value.text;
  else if (value && typeof value === 'object' && 'result' in value) value = value.result;
  return value == null ? '' : String(value).trim();
}

const MONTH_NAMES = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/* Excel date-typed cells already come out of cellValue() as ISO
   "YYYY-MM-DD" (see above). A "date" column typed/pasted as plain text
   instead — the common case for a sheet built outside this app — comes
   out as whatever the person wrote, most often this company's own
   day-first convention (see fmtD's 'en-GB' locale) rather than ISO.
   Every backend date validator only accepts what `new Date(s)` parses,
   which is ISO-first and reads "01-08-2026" as invalid or as the wrong
   day/month — silently failing almost every row in a real sheet.
   Normalising here, once, at the point the cell is read, fixes every
   bulk-import date field at the source instead of guessing per row. */
function normalizeDateString(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  /* a "date" column whose cells were never formatted as a date in
     Excel (typed/pasted into a plain General-format cell) comes back
     from cellValue() as the raw serial number stringified, e.g.
     "46600" instead of a real Date — the single most common cause of
     an entire column failing identically. Excel's day 0 is 1899-12-30
     (that offset already absorbs the well-known 1900 leap-year bug). */
  if (/^\d{4,6}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial >= 1) {
      const dt = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      if (!Number.isNaN(dt.getTime()) && dt.getUTCFullYear() >= 1950 && dt.getUTCFullYear() <= 2100) {
        return dt.toISOString().slice(0, 10);
      }
    }
  }
  /* the optional trailing `(?:[ T]\d{1,2}:\d{2}(:\d{2})?)?` drops a
     time-of-day suffix — a full export from a complaints tracker
     ("17/05/2025 09:42:54") is exactly as valid a Raised date as a
     bare one, only the date part is ever needed downstream. */
  let m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.exec(s);
  if (m) {
    const [, dS, moS, yS] = m;
    const y = yS.length === 2 ? (Number(yS) < 50 ? `20${yS}` : `19${yS}`) : yS;
    const d = Number(dS), mo = Number(moS);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]*(\d{2,4})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.exec(s)
    || /^([A-Za-z]{3,9})[\s-]+(\d{1,2})[\s,-]*(\d{2,4})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.exec(s);
  if (m) {
    const isDayFirst = /^\d/.test(m[1]);
    const day = isDayFirst ? m[1] : m[2];
    const monStr = isDayFirst ? m[2] : m[1];
    const mon = MONTH_NAMES[monStr.slice(0, 3).toLowerCase()];
    if (mon !== undefined) {
      const yS = m[3];
      const y = yS.length === 2 ? (Number(yS) < 50 ? `20${yS}` : `19${yS}`) : yS;
      return `${y}-${String(mon + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  /* last resort: a format not covered above (e.g. a full RFC/ISO
     datetime). new Date() on anything that isn't strict "YYYY-MM-DD"
     parses in LOCAL time, so reading it back with .toISOString()
     (UTC) can shift the calendar day — pull the date parts straight
     off the local getters instead, same trap ThemedDate.jsx documents
     for todayInput(). */
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/* shared by parseImportFile/parseComplaintsFile below — reads a
   workbook's first sheet into [{ rowNumber, draft }], matching header
   cells to `fields`' keys case/spacing-insensitively, by either the
   on-screen label ("Full name") or the raw field key ("name"), so
   column order and exact wording don't matter. Unrecognised columns
   are ignored; missing OPTIONAL columns just come through empty and
   whichever validator runs next rejects them same as a blank field in
   the manual form — reject, don't guess. A missing REQUIRED column is
   a different problem and is reported once, up front, rather than
   letting every row fail on it with the same confusing message. */
async function parseSheetFile(file, fields, requiredKeys) {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const labelToKey = new Map();
  const dateKeys = new Set();
  fields.forEach(([key, label, type]) => {
    labelToKey.set(norm(label), key);
    labelToKey.set(norm(key), key);
    if (type === 'date') dateKeys.add(key);
  });

  const colKeyByIndex = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = labelToKey.get(norm(cell.value));
    if (key) colKeyByIndex[colNumber] = key;
  });

  const foundKeys = new Set(Object.values(colKeyByIndex));
  const missingRequired = requiredKeys.filter((k) => !foundKeys.has(k));
  if (missingRequired.length) {
    const labels = missingRequired.map((k) => fields.find(([fk]) => fk === k)?.[1] || k);
    throw new Error(
      `Could not find a column for: ${labels.join(', ')}. The header row's wording doesn't match the ` +
      `template's — download a fresh copy and use its exact column headers.`
    );
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const draft = {};
    let hasAnyValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = colKeyByIndex[colNumber];
      if (!key) return;
      const value = cellValue(cell);
      if (value !== '') hasAnyValue = true;
      draft[key] = dateKeys.has(key) ? normalizeDateString(value) : value;
    });
    if (hasAnyValue) rows.push({ rowNumber, draft });
  });
  return rows;
}

export async function parseImportFile(file) {
  return parseSheetFile(file, FULL_FORM_FIELDS, REQUIRED_KEYS);
}

/* downloads a template for bulk-logging complaints against EXISTING
   owners — matched by Project + Unit, never a Customer ID the person
   filling this in wouldn't have to hand, and never mobile (two owners
   can share one, e.g. family). */
export async function downloadComplaintsTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Complaints');
  sheet.columns = COMPLAINT_FIELDS.map(([key, label]) => ({ header: label, key, width: 26 }));
  sheet.getRow(1).font = { bold: true };
  /* two rows, one of each flow this sheet now drives: a blank/"Open"
     Status opens a new complaint (closing that owner's contact gate);
     "Closed" instead finds the matching open one by NCR and Unit and
     closes it, with Reason recorded against it. */
  sheet.addRow({
    project: 'Garden City', unit: 'A-26', t: 'Seepage — master bathroom wall',
    raised: '2026-08-01', owner: 'AGM CRM', ncr: 'NCR-2026-0142', status: 'Open', reason: '',
  });
  sheet.addRow({
    project: 'Garden City', unit: 'A-26', t: 'Paint peeling — balcony',
    raised: '2026-06-15', owner: 'Site Engineering', ncr: 'NCR-2026-0142', status: 'Closed',
    reason: 'Repainted and inspected on site — owner confirmed satisfied.',
  });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, 'complaints-import-template.xlsx');
}

/* reads an uploaded workbook of complaint rows — one row per
   complaint, matched to an existing owner by Project + Unit by the
   caller (this just parses; it doesn't look owners up). */
export async function parseComplaintsFile(file) {
  return parseSheetFile(file, COMPLAINT_FIELDS, COMPLAINT_REQUIRED_KEYS);
}
