import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAppNavigation } from '../hooks/useAppNavigation.js';
import { Card, Chip, Banner, TableWrap, BtnPrimary, btnGhost, confColor, Avatar } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import ThemedCheckbox from '../components/theme/ThemedCheckbox.jsx';
import { PROJECTS } from '../constants/projects.js';
import { CHECKS, SAMPLE_DRAFT, exceptions, validateDraft, validateShellDraft } from '../utils/intake.js';
import { FILES, FORM_FIELDS } from '../constants/intakeFields.js';
import { downloadSampleTemplate, parseImportFile, downloadComplaintsTemplate, parseComplaintsFile } from '../utils/excel.js';
import { toast } from '../utils/toast.js';

const EMPTY = Object.fromEntries(FORM_FIELDS.map(([k]) => [k, '']));

const fixOwner = (fails) =>
  fails.some((f) => ['RATE_AREA', 'PAID_LE_CONSID'].includes(f[0])) ? 'Finance'
  : fails.some((f) => f[0] === 'VAL_CURRENT') ? 'Finance — valuation'
  : fails.some((f) => f[0] === 'REG_ON_POSSESSION') ? 'Legal'
  : 'CRM';

/* shared form-field classes — label / input / error text, per the Nexora form pattern */
const lblCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';
const inputCls = (bad) =>
  `w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${bad ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`;
const errCls = 'text-xs text-red-500 mt-1';
const tagCls = 'text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
const tdCls = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm';
const thCls = 'text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap';

export default function Intake() {
  const { base, addCustomer, addIncompleteCustomer, mutateCustomer } = useApp();
  const { openCustomer } = useAppNavigation();
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const ex = exceptions(base);
  const byCode = {};
  ex.forEach((x) => x.fails.forEach(([code]) => { byCode[code] = (byCode[code] || 0) + 1; }));

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setVal = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const [submitting, setSubmitting] = useState(false);

  /* ---- bulk import ---- */
  const fileRef = useRef(null);
  const [importIncomplete, setImportIncomplete] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const rows = await parseImportFile(file);
      if (!rows.length) {
        toast.error('Nothing to import', 'The sheet had no data rows below the header.');
        return;
      }
      const validate = importIncomplete ? validateShellDraft : validateDraft;
      const create = importIncomplete ? addIncompleteCustomer : addCustomer;
      let ok = 0;
      const held = [];
      for (const { rowNumber, draft: row } of rows) {
        const errs = validate(row, base);
        if (Object.keys(errs).length) {
          held.push({ rowNumber, row, errs });
          continue;
        }
        try {
          await create(row);
          ok++;
        } catch (err) {
          held.push({ rowNumber, row, errs: err.errors || { name: 'Could not save.' } });
        }
      }
      /* the single most common upload mistake: financials/PAN genuinely
         aren't known yet, but "Import as incomplete records" was left
         unchecked, so every row fails strict validation at once. Rather
         than make someone read 241 identical-looking error rows to
         figure that out, check whether the relaxed shell validator
         would have accepted them and say so directly. */
      const wouldPassAsShell = !importIncomplete && held.length
        ? held.filter((h) => Object.keys(validateShellDraft(h.row, base)).length === 0).length
        : 0;

      setImportResult({ total: rows.length, ok, held, wouldPassAsShell });
      if (ok) toast.success('Import complete', `${ok} of ${rows.length} row(s) added.`);
      if (held.length && !wouldPassAsShell) {
        toast.error(`${held.length} row(s) held`, 'Fix these in the sheet and re-upload — nothing partial was guessed.');
      }
    } catch (err) {
      toast.error('Could not read the file', err.message || 'Confirm it is the downloaded template, unmodified in structure.');
    } finally {
      setImporting(false);
    }
  };

  /* saves the already-parsed rows that only failed because PAN/
     financials are missing — reuses handleImportFile's in-memory
     `held` rows rather than asking for the file again, since nothing
     about them changed except which validator applies. */
  const [savingIncomplete, setSavingIncomplete] = useState(false);
  const saveHeldAsIncomplete = async () => {
    if (!importResult) return;
    setSavingIncomplete(true);
    try {
      const stillHeld = [];
      let saved = 0;
      for (const h of importResult.held) {
        const errs = validateShellDraft(h.row, base);
        if (Object.keys(errs).length) {
          stillHeld.push(h);
          continue;
        }
        try {
          await addIncompleteCustomer(h.row);
          saved++;
        } catch (err) {
          stillHeld.push({ ...h, errs: err.errors || { name: 'Could not save.' } });
        }
      }
      setImportResult((r) => ({ ...r, ok: r.ok + saved, held: stillHeld, wouldPassAsShell: 0 }));
      if (saved) toast.success('Saved as incomplete records', `${saved} row(s) added — complete PAN/financials later from the Incomplete records queue.`);
      if (stillHeld.length) toast.error(`${stillHeld.length} row(s) still held`, 'These failed for a different reason — see the table below.');
    } finally {
      setSavingIncomplete(false);
    }
  };

  /* ---- bulk complaint import — one row per complaint, matched to an
     owner purely by Project + Unit (see COMPLAINT_FIELDS' comment on
     why not a Customer ID or mobile). The Status column does double
     duty: blank/"Open" logs a new complaint the same as the single
     "Log complaint" action; "Closed" instead finds the matching OPEN
     complaint by NCR and unit and closes it with the Reason column,
     same as the single "Close" action. One sheet, one upload, both
     directions — reuses the existing per-row endpoints
     (mutateCustomer) rather than a separate bulk backend route. */
  const complaintsFileRef = useRef(null);
  const [complaintsImporting, setComplaintsImporting] = useState(false);
  const [complaintsResult, setComplaintsResult] = useState(null);

  const handleImportComplaints = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setComplaintsImporting(true);
    setComplaintsResult(null);
    try {
      const rows = await parseComplaintsFile(file);
      if (!rows.length) {
        toast.error('Nothing to import', 'The sheet had no data rows below the header.');
        return;
      }
      let opened = 0;
      let closed = 0;
      const held = [];
      /* the customer list from context is a snapshot from before this
         upload started — an open complaint this same sheet just added
         a few rows up wouldn't be in it yet, so a later row in the
         same sheet closing that exact complaint would wrongly read as
         "not found". Tracked locally per customer, seeded from the
         snapshot and mutated as each row commits, so open-then-close
         within one sheet resolves correctly. */
      const openTracker = new Map();
      const trackedOpenComplaints = (customerId) => {
        if (!openTracker.has(customerId)) {
          const customer = base.find((c) => c.id === customerId);
          openTracker.set(customerId, [...(customer?.openComplaints || [])]);
        }
        return openTracker.get(customerId);
      };

      /* a real complaint tracker's own wording for "resolved" varies —
         accepted here rather than held, same coerce-don't-reject
         philosophy as every other bulk-import field in this app.
         "Wrong entry" is this tracker's own way of marking a logged
         complaint as a mistaken entry, not an actual open issue — it
         still gets closed, just with that as the recorded reason. */
      const CLOSE_WORDS = ['closed', 'close', 'complete', 'completed', 'resolved', 'resolve', 'done', 'fixed', 'wrong entry', 'wrong-entry', 'wrongentry'];
      const OPEN_WORDS = ['open', 'pending', 'ongoing'];
      /* "Same Complaint" marks a row as a repeat submission of a
         complaint already logged elsewhere in the sheet (same unit,
         same description, minutes apart) — not a new complaint and not
         a status to hold on, so it's skipped rather than imported or
         held. */
      const SKIP_WORDS = ['same complaint', 'same-complaint', 'duplicate', 'dup'];
      let skipped = 0;

      for (const { rowNumber, draft: row } of rows) {
        const project = (row.project || '').trim();
        const unit = (row.unit || '').trim();
        const rawStatus = (row.status || '').trim().toLowerCase();
        if (SKIP_WORDS.includes(rawStatus)) { skipped++; continue; }
        const isWrongEntry = rawStatus === 'wrong entry' || rawStatus === 'wrong-entry' || rawStatus === 'wrongentry';
        const isClose = CLOSE_WORDS.includes(rawStatus);
        if (rawStatus && !isClose && !OPEN_WORDS.includes(rawStatus)) {
          held.push({ rowNumber, row, reason: `Status must be "Open" or "Closed", not "${row.status}".` });
          continue;
        }

        if (!unit) { held.push({ rowNumber, row, reason: 'Missing Unit number.' }); continue; }

        /* Unit number is the primary key here — Project only narrows it
           down when the same unit number happens to exist in more than
           one project (a handful do, e.g. "301"). So a row missing
           Project isn't held outright; it only ends up held below if
           the unit number turns out to be ambiguous without it. A
           handful of units on record are also held by more than one
           person (joint/co-owners), and neither this sheet nor the app
           should guess which one a complaint is against, so that's
           held too. */
        let matches = base.filter((c) =>
          (c.units || []).some((u) => u && u.unit && (u.unit === unit || u.unit.endsWith('-' + unit)) && (!project || u.project === project))
        );
        if (!matches.length) {
          /* the Project column itself is sometimes just wrong in a real
             sheet (a unit genuinely owned in Regal Garden, logged
             against Eden Garden) — searching every project for the
             same unit number turns a flat "no owner found" into a
             pointer at exactly what to fix in the sheet, without ever
             guessing which project to actually file the complaint
             under. */
          const elsewhere = project
            ? base.filter((c) => (c.units || []).some((u) => u && u.unit && (u.unit === unit || u.unit.endsWith('-' + unit)) && u.project !== project))
            : [];
          if (elsewhere.length) {
            const hits = elsewhere.flatMap((c) => (c.units || [])
              .filter((u) => u && u.unit && (u.unit === unit || u.unit.endsWith('-' + unit)) && u.project !== project)
              .map((u) => `${c.name} — ${u.project}/${u.unit}`));
            held.push({
              rowNumber, row,
              reason: `No owner found holding unit "${unit}" in ${project} — but it exists under a different project: ${hits.join(', ')}. Check the Project column.`,
            });
          } else {
            held.push({ rowNumber, row, reason: `No owner found holding unit "${unit}"${project ? ` in ${project}` : ''}.` });
          }
          continue;
        }
        if (matches.length > 1) {
          const completeMatches = matches.filter((c) => !c.incomplete);
          if (completeMatches.length === 1) {
            matches = completeMatches;
          } else {
            const names = new Set(matches.map((m) => (m.name || '').trim().toLowerCase()));
            if (names.size === 1) {
              matches = [matches.find((m) => !m.incomplete) || matches[0]];
            } else {
              /* different names but the exact same mobile number holding
                 the exact same unit is two profiles for one real
                 household (e.g. "Praveen Pachari & Nisha Pachauri" and a
                 separate "Nisha Pachauri" record, same phone) — a
                 duplicate-owner-profile data issue, not a genuine
                 co-owner ambiguity to hold on. The complaint reads the
                 same against either duplicate, so there's nothing to
                 guess here either. */
              const mobiles = new Set(matches.map((m) => (m.mobile || '').trim()).filter(Boolean));
              if (mobiles.size === 1) {
                matches = [matches.find((m) => !m.incomplete) || matches[0]];
              }
            }
          }
        }
        if (matches.length > 1) {
          const names = matches.map((m) => `${m.name} · ${m.id}`).join(', ');
          held.push({
            rowNumber, row,
            reason: project
              ? `More than one owner holds "${unit}" in ${project} (${names}) — resolve which one manually.`
              : `More than one owner holds unit "${unit}" across projects (${names}) — add Project to disambiguate.`,
          });
          continue;
        }
        const customerId = matches[0].id;
        const openList = trackedOpenComplaints(customerId);

        /* The owner was found by the same fuzzy unit match above (bare
           "512" matching a stored "B-512"), but the backend's own
           lookup (customers.js' /complaints route) only does an exact
           `u.unit === patch.unit` — sending the sheet's raw "512"
           there fails with "This owner has no unit '512'" even though
           the owner and unit were both correctly identified right
           here. Resolving to the customer's own stored unit/project
           strings before calling the API is what that exact match
           needs. */
        const matchedUnit = matches[0].units.find((u) =>
          u && u.unit && (u.unit === unit || u.unit.endsWith('-' + unit)) && (!project || u.project === project));
        const realUnit = matchedUnit.unit;
        const realProject = matchedUnit.project;

        /* Owner-of-the-fix and NCR reference are required by the open-
           complaint endpoint, but a sheet logging complaints that are
           already resolved often never captured either — coerced to a
           default rather than held, same as every other bulk-import
           field in this app; the synthetic NCR only has to be unique
           enough to link this row's own open+close pair below. */
        const ncr = (row.ncr || '').trim() || `IMPORT-${rowNumber}`;
        const owner = (row.owner || '').trim() || 'Not specified';

        try {
          if (isClose) {
            const idx = openList.findIndex((o) => o.ncr === ncr && o.unit === realUnit);
            if (idx !== -1) {
              await mutateCustomer(`/api/customers/${customerId}/complaints/${idx}/close`, { ncr, reason: row.reason }, 'POST');
              openList.splice(idx, 1);
              closed++;
            } else {
              /* nothing on file to close — this row is a historical
                 complaint being imported already resolved, not "close
                 an existing open one". Logged and closed in the same
                 step instead of holding a row whose complaint never
                 genuinely needs to sit open in the meantime. */
              const openedCustomer = await mutateCustomer(`/api/customers/${customerId}/complaints`, {
                t: row.t, raised: row.raised, owner, ncr, unit: realUnit, project: realProject,
              }, 'POST');
              const newIdx = (openedCustomer.openComplaints || []).length - 1;
              openList.length = 0;
              openList.push(...(openedCustomer.openComplaints || []));
              await mutateCustomer(`/api/customers/${customerId}/complaints/${newIdx}/close`, {
                ncr, reason: row.reason || (isWrongEntry ? 'Logged in error — wrong entry.' : 'Imported as already resolved.'),
              }, 'POST');
              openList.splice(newIdx, 1);
              closed++;
            }
          } else {
            await mutateCustomer(`/api/customers/${customerId}/complaints`, {
              t: row.t, raised: row.raised, owner, ncr, unit: realUnit, project: realProject,
            }, 'POST');
            openList.push({ ncr, unit: realUnit });
            opened++;
          }
        } catch (err) {
          held.push({ rowNumber, row, reason: Object.values(err.errors || {})[0] || err.message || 'Could not save.' });
        }
      }
      setComplaintsResult({ total: rows.length, opened, closed, held, skipped });
      if (opened) toast.success('Complaints opened', `${opened} row(s) added — the contact gate is now closed for those owners.`);
      if (closed) toast.success('Complaints closed', `${closed} row(s) closed.`);
      if (skipped) toast.success('Duplicates skipped', `${skipped} row(s) marked "Same Complaint" — not re-imported.`);
      if (held.length) toast.error(`${held.length} row(s) held`, 'Fix these in the sheet and re-upload.');
    } catch (err) {
      toast.error('Could not read the file', err.message || 'Confirm it is the downloaded template, unmodified in structure.');
    } finally {
      setComplaintsImporting(false);
    }
  };

  const submit = async () => {
    const errs = validateDraft(draft, base);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      const c = await addCustomer(draft);
      setDraft(EMPTY);
      setErrors({});
      openCustomer(c.id);
    } catch (err) {
      /* server is the source of truth — surface whatever it rejected
         even if the client-side check above missed it (e.g. a PAN that
         was just taken by someone else). */
      setErrors(err.errors || { name: 'Could not save this owner. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Banner kind="info">
        <b>This is the write path.</b> Three files in, validated on import, with everything that fails held
        here rather than quietly loaded. A record in this queue cannot be scored, cannot be sent a
        statement and cannot appear in an outreach list. That is deliberate — the queue is the thing
        standing between a reconciliation error and a customer's hands.
      </Banner>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3.5">
        {FILES.map(([n, d, cols]) => (
          <Card key={n} title={n} hint={<span className="tabular-nums">{cols.length} columns</span>}>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{d}</div>
            <div className="flex flex-wrap gap-1">
              {cols.map((x) => <code key={x} className={tagCls}>{x}</code>)}
            </div>
          </Card>
        ))}
      </div>

      <Card title="Bulk import" hint="Excel, validated per row">
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
          Download the template, fill one row per owner, then upload it back. Each row is validated exactly
          like the single-owner form — a row that fails is held and reported, never guessed or partially saved.
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button className={btnGhost} onClick={() => downloadSampleTemplate()}>
            Download template
          </button>
          <button
            className={btnGhost}
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? 'Importing…' : 'Upload filled sheet'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          <ThemedCheckbox
            checked={importIncomplete}
            onChange={setImportIncomplete}
            label="Import as incomplete records"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
          {importIncomplete
            ? 'Only name, mobile, project and unit are required — use this for a raw allotment list before KYC/financials are on file. PAN and money fields, if present, are still validated.'
            : 'All fields are required, same as the single-owner form below — use this once financials and booking dates are confirmed.'}
        </div>
        {importResult && (
          <div className="text-xs">
            {importResult.wouldPassAsShell > 0 && (
              <Banner kind="warn" style={{ margin: '0 0 12px' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <b>{importResult.wouldPassAsShell} of {importResult.held.length} held row(s) are only missing PAN/financials.</b>{' '}
                    Save them now as incomplete records — the sheet stays exactly as uploaded, only PAN/financials will still need
                    to be filled in later from the Incomplete records queue.
                  </div>
                  <BtnPrimary onClick={saveHeldAsIncomplete} disabled={savingIncomplete} className="flex-shrink-0">
                    {savingIncomplete ? 'Saving…' : `Save ${importResult.wouldPassAsShell} as incomplete records`}
                  </BtnPrimary>
                </div>
              </Banner>
            )}
            <div className="mb-1.5">
              <Chip cls="g">{importResult.ok} added</Chip>{' '}
              {importResult.held.length > 0 && <Chip cls="r">{importResult.held.length} held</Chip>}
            </div>
            {importResult.held.length > 0 && (
              <TableWrap>
                <table className="w-full border-collapse">
                  <tbody>
                    {importResult.held.slice(0, 20).map((h, i) => (
                      <tr key={i}>
                        <td className={tdCls}>Row {h.rowNumber}: {h.row.name || '(no name)'} · {h.row.unit || '—'}</td>
                        <td className={tdCls}>{Object.values(h.errs).join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}
      </Card>

      <Card title="Bulk complaints import" hint="Excel, unit-wise, opens and closes in one sheet" className="mb-3.5">
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
          One row per complaint, matched to an <b>existing owner by Project and Unit number</b> — no Customer
          ID needed, and never mobile (two owners can share one). Unit-wise because one flat's seepage says
          nothing about the owner's other units. Leave <b>Status</b> blank or "Open" to log a new complaint
          (same as the single "Log complaint" action — closes that owner's contact gate immediately); set it
          to <b>"Closed"</b> to find the matching open complaint by NCR and unit and close it, with{' '}
          <b>Reason</b> recorded against it. If the same project+unit is on record for more than one owner
          (joint/co-owners), that row is held rather than guessed at.
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button className={btnGhost} onClick={() => downloadComplaintsTemplate()}>
            Download template
          </button>
          <button
            className={btnGhost}
            disabled={complaintsImporting}
            onClick={() => complaintsFileRef.current?.click()}
          >
            {complaintsImporting ? 'Importing…' : 'Upload filled sheet'}
          </button>
          <input ref={complaintsFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportComplaints} />
        </div>
        {complaintsResult && (
          <div className="text-xs">
            <div className="mb-1.5">
              <span className="text-gray-500 dark:text-gray-400 mr-1.5">{complaintsResult.total} row(s) in the sheet:</span>
              {!!complaintsResult.opened && <Chip cls="r">{complaintsResult.opened} open</Chip>}{' '}
              {!!complaintsResult.closed && <Chip cls="g">{complaintsResult.closed} closed</Chip>}{' '}
              {!!complaintsResult.skipped && <Chip cls="B">{complaintsResult.skipped} skipped (duplicate)</Chip>}{' '}
              {complaintsResult.held.length > 0 && <Chip cls="m">{complaintsResult.held.length} held</Chip>}
            </div>
            {complaintsResult.held.length > 0 && (
              <TableWrap>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thCls}>Row</th>
                      <th className={thCls}>Why it was held</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaintsResult.held.slice(0, 20).map((h, i) => (
                      <tr key={i}>
                        <td className={tdCls}>Row {h.rowNumber}: {h.row.project || '(no project)'} · {h.row.unit || '(no unit)'}</td>
                        <td className={tdCls}>{h.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-4 mb-3.5">
        <Card title="Add an owner" hint="validated live">
          {FORM_FIELDS.map(([k, l, t]) => (
            <div className="mb-3.5" key={k}>
              <label htmlFor={`fld-${k}`} className={lblCls}>{l}</label>
              {t === 'select' ? (
                <ThemedSelect
                  value={draft[k] ?? ''}
                  onChange={setVal(k)}
                  options={PROJECTS.map((p) => ({ value: p.name, label: p.name }))}
                  placeholder="Choose"
                  className={errors[k] ? '[&>button]:border-red-400' : ''}
                />
              ) : (
                <input
                  id={`fld-${k}`}
                  type={t}
                  value={draft[k] ?? ''}
                  onChange={set(k)}
                  className={inputCls(!!errors[k])}
                />
              )}
              {errors[k] && <div className={errCls}>{errors[k]}</div>}
            </div>
          ))}
          <div className="flex flex-col gap-2 mb-3.5">
            <BtnPrimary className="w-full" onClick={submit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Validate and add'}
            </BtnPrimary>
            <button
              className={`${btnGhost} w-full`}
              disabled={submitting}
              onClick={() => { setDraft(SAMPLE_DRAFT()); setErrors({}); }}
            >
              Fill with a sample row
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Adding here writes to the database. The record appears in the owner base immediately,
            scored and gated like any other, and survives a reload.
          </div>
        </Card>

        <Card title="Import validation rules" hint="reject, do not guess">
          <TableWrap>
            <table className="w-full border-collapse">
              <tbody>
                {CHECKS.map(([code, l]) => (
                  <tr key={code}>
                    <td className={tdCls}><code className={tagCls}>{code}</code></td>
                    <td className={tdCls}>{l}</td>
                    <td className={`${tdCls} text-right`}>
                      {byCode[code] ? <Chip cls="r">{byCode[code]} failing</Chip> : <Chip cls="g">all clear</Chip>}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className={tdCls}><code className={tagCls}>DEDUPE_PAN</code></td>
                  <td className={tdCls}>Deduplicate on PAN first, mobile second, never on name</td>
                  <td className={`${tdCls} text-right`}><Chip cls="g">enforced</Chip></td>
                </tr>
                <tr>
                  <td className={tdCls}><code className={tagCls}>ONE_CUSTOMER_ID</code></td>
                  <td className={tdCls}>
                    One customer ID across all three entities — merge candidates surfaced for a human,
                    never merged silently
                  </td>
                  <td className={`${tdCls} text-right`}><Chip cls="g">enforced</Chip></td>
                </tr>
              </tbody>
            </table>
          </TableWrap>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5">
            Reject rather than guess. A row that does not reconcile is held, not adjusted — the variance
            between <code className={tagCls}>rate × area</code> and consideration is either an unrecorded discount or an
            error, and you want to know which before it reaches a customer.
          </div>
        </Card>
      </div>

      <Card
        title="Exceptions queue"
        hint={`${ex.length} records held · ${base.length - ex.length} clean`}
        pad={false}
      >
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thCls}>Owner</th>
                <th className={thCls}>Unit</th>
                <th className={`${thCls} text-right`}>Confidence</th>
                <th className={thCls}>Failing checks</th>
                <th className={thCls}>Owner of the fix</th>
              </tr>
            </thead>
            <tbody>
              {ex.slice(0, 30).map(({ c, fails }) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                  onClick={() => openCustomer(c.id)}
                >
                  <td className={tdCls}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white">{c.name}</div>
                        <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}>
                    {c._unit}
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c._project}</div>
                  </td>
                  <td className={`${tdCls} text-right tabular-nums font-semibold ${confColor(c._conf)}`}>{c._conf}%</td>
                  <td className={tdCls}>
                    {fails.map(([code]) => <code key={code} className={`${tagCls} mr-1`}>{code}</code>)}
                  </td>
                  <td className={`${tdCls} text-[10.5px] text-gray-400 dark:text-gray-500`}>{fixOwner(fails)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </>
  );
}
