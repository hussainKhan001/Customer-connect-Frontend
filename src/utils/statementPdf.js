/* Builds the Portfolio Statement as a REAL, native PDF — text laid out
   with jsPDF + jspdf-autotable, not a screenshot of the on-screen
   letter. A rasterised capture (the previous approach) can't guarantee
   correct margins or a clean one-page fit, and looks soft at any zoom;
   this instead draws the exact same document structure the HTML
   letter shows, with real vector text, so it's crisp, small, and
   selectable — a document worth handing a customer.
   Both jsPDF and jspdf-autotable are dynamically imported (see the
   same reasoning in the git history of this file) so their ~250KB
   combined weight only loads the first time someone actually
   generates a statement, not on every Customer Master page view. */
import { TODAY, fmtD, inrF, displayName } from './core.js';

const QTR_END_MONTH = ['March', 'June', 'September', 'December'];

function salutationLine(salutation) {
  const s = (salutation || '').trim().replace(/\.$/, '').toLowerCase();
  if (s === 'mr') return 'Dear Sir,';
  if (['mrs', 'ms', 'smt', 'miss', 'kumari'].includes(s)) return 'Dear Madam,';
  return 'Dear Sir/Madam,';
}

const INK = 30;
const MUTED = 95;
const RULE = 40;

export async function buildPortfolioStatementPdfBlob({ c, S, r }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 50;
  const contentW = pageW - M * 2;
  const centerX = pageW / 2;
  let y = M + 10;

  const stmtRef = `STMT-${c.id}-Q${Math.ceil((TODAY.getMonth() + 1) / 3)}${TODAY.getFullYear()}`;
  const qtrLabel = `${QTR_END_MONTH[Math.ceil((TODAY.getMonth() + 1) / 3) - 1]} ${TODAY.getFullYear()}`;
  const addrLines = [c.captured?.addr && c.corrAddr ? c.corrAddr : null, c.city].filter(Boolean);

  /* keeps a paragraph/section from starting right at the bottom edge —
     jsPDF has no automatic reflow for hand-placed text the way a
     browser has for HTML, so every block that might land near the
     bottom margin checks this first and starts a fresh page instead. */
  const ensureSpace = (needed) => {
    if (y + needed > pageH - M) {
      doc.addPage();
      y = M + 10;
    }
  };

  /* ---- 1. Letterhead ---- */
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(INK);
  doc.text(S.companyName.toUpperCase(), centerX, y, { align: 'center' });
  y += 16;

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(S.groupLine, centerX, y, { align: 'center' });
  y += 13;

  doc.setFontSize(8);
  doc.text(`Regd. Office: ${S.regdOffice}  |  CIN: ${S.cin}  |  GSTIN: ${S.gstin}`, centerX, y, { align: 'center' });
  y += 12;

  doc.setDrawColor(INK);
  doc.setLineWidth(1.6);
  doc.line(M, y, pageW - M, y);
  doc.setLineWidth(0.5);
  doc.line(M, y + 2.5, pageW - M, y + 2.5);
  y += 28;

  /* ---- 2. Title ---- */
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(INK);
  doc.text('PORTFOLIO STATEMENT', centerX, y, { align: 'center', charSpace: 1.4 });
  const titleW = doc.getTextWidth('PORTFOLIO STATEMENT') + 14 * 1.4;
  doc.setLineWidth(0.75);
  doc.line(centerX - titleW / 2, y + 4, centerX + titleW / 2, y + 4);
  y += 28;

  /* ---- 3. Ref row ---- */
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Statement No.: ${stmtRef}`, M, y);
  doc.text(`Date: ${fmtD(TODAY)}`, pageW - M, y, { align: 'right' });
  y += 22;

  /* ---- 4. To ---- */
  doc.text('To,', M, y);
  y += 15;
  doc.text(displayName(c), M, y);
  y += 15;
  doc.text(`Owner Reference: ${c.id}`, M, y);
  y += 15;
  if (addrLines.length) {
    doc.text(addrLines.join(', '), M, y, { maxWidth: contentW });
    y += 15;
  }
  y += 6;

  /* ---- 5. Subject ---- */
  doc.setFont('times', 'bold');
  const subject = `Subject: Portfolio Valuation Statement for the Quarter Ended ${qtrLabel}`;
  doc.text(subject, M, y, { maxWidth: contentW });
  const subjW = Math.min(doc.getTextWidth(subject), contentW);
  doc.setLineWidth(0.6);
  doc.line(M, y + 3, M + subjW, y + 3);
  y += 22;

  /* ---- 6. Salutation + paragraph ---- */
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(salutationLine(c.salutation), M, y);
  y += 17;

  const bodyPara = `We are pleased to furnish herewith the Portfolio Valuation Statement in respect of the immovable property/properties held by you through ${S.companyName} and its group entities, as recorded in our books as on the date mentioned above. The valuation stated herein has been arrived at on the basis of registered resale transactions in the vicinity of the property/properties over the preceding two (2) quarters, floored at the prevailing Government Circle Rate, and is furnished solely for your general information and record.`;
  doc.text(bodyPara, M, y, { maxWidth: contentW, align: 'justify', lineHeightFactor: 1.4 });
  y += doc.splitTextToSize(bodyPara, contentW).length * 14.5 + 14;

  /* ---- 7. Table ---- */
  ensureSpace(90);
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: { font: 'times', fontSize: 9, cellPadding: 5, textColor: INK, lineColor: RULE, lineWidth: 0.75 },
    headStyles: { fillColor: [225, 225, 225], textColor: INK, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [225, 225, 225], textColor: INK, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: contentW * 0.08 },
      1: { cellWidth: contentW * 0.24 },
      2: { cellWidth: contentW * 0.2 },
      3: { halign: 'center', cellWidth: contentW * 0.16 },
      4: { halign: 'right', cellWidth: contentW * 0.16 },
      5: { halign: 'center', cellWidth: contentW * 0.16 },
    },
    head: [['Sr. No.', 'Project / Unit', 'Entity', 'Valuation Date', 'Current Valuation', 'Ledger Status']],
    body: r.units.map((unit, i) => [
      i + 1,
      `${unit.project} / ${unit.unit}`,
      unit.entity,
      fmtD(unit.val.notedOn),
      inrF(unit.currentValue),
      unit.regDate ? 'Registered' : 'Registry Pending',
    ]),
    foot: [['', '', '', 'Total Valuation / Unrealised Gain', inrF(r.value), inrF(r.gain)]],
  });
  y = doc.lastAutoTable.finalY + 24;

  /* ---- 8. Notes ---- */
  ensureSpace(40);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text('Notes:', M, y);
  doc.setLineWidth(0.6);
  doc.line(M, y + 3, M + doc.getTextWidth('Notes:'), y + 3);
  y += 16;

  const NOTES = [
    'The valuation stated herein is derived from registered resale transactions in the vicinity of the property over the preceding two (2) quarters and is floored at the prevailing Government Circle Rate.',
    'Valuations are reviewed and revised on a quarterly basis and are subject to change based on prevailing market conditions at the relevant time.',
    'This statement is issued for general information and record-keeping purposes only and does not constitute a legal opinion, financial advice, or a certificate of title.',
    'Particulars, if any, reflected as "Not on Record" indicate information not presently available with the Company and do not affect the validity of the remaining particulars stated herein.',
    'Property values are subject to market risk and may rise as well as fall; past performance is not indicative of future returns.',
    "Any discrepancy in the particulars stated above may kindly be reported in writing to the Company's Registered Office within thirty (30) days of receipt of this statement.",
  ];
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  NOTES.forEach((note, i) => {
    const lines = doc.splitTextToSize(note, contentW - 16);
    ensureSpace(lines.length * 12.5 + 4);
    doc.text(`${i + 1}.`, M, y);
    doc.text(lines, M + 16, y);
    y += lines.length * 12.5 + 4;
  });
  y += 10;

  /* ---- 9. Closing ---- */
  ensureSpace(120);
  doc.setFontSize(10.5);
  const closing = 'This statement is issued in good faith based on the records available with the Company as on the date mentioned above, and without prejudice to the rights of either party.';
  doc.text(closing, M, y, { maxWidth: contentW });
  y += doc.splitTextToSize(closing, contentW).length * 13 + 10;
  doc.text('Thanking you,', M, y);
  y += 14;
  doc.setFont('times', 'bold');
  doc.text(`For ${S.companyName}`, M, y);
  y += 55;

  /* ---- 10. Signature block ---- */
  doc.setFont('times', 'normal');
  doc.setLineWidth(0.75);
  doc.line(M, y, M + 170, y);
  y += 12;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text('Authorised Signatory', M, y);
  y += 12;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text('Manager – Customer Relations', M, y);

  const sealX = pageW - M - 90;
  const sealY = y - 90;
  doc.setDrawColor(RULE);
  doc.setLineDashPattern([3, 2], 0);
  doc.rect(sealX, sealY, 90, 68);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text('Company Seal', sealX + 45, sealY + 38, { align: 'center' });

  /* ---- 11. Footer, every page ---- */
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(RULE);
    doc.setLineWidth(0.5);
    doc.line(M, pageH - M + 8, pageW - M, pageH - M + 8);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(`${S.companyName} · Regd. Office: ${S.regdOffice}`, M, pageH - M + 20);
    doc.text(`Page ${p} of ${pageCount}`, pageW - M, pageH - M + 20, { align: 'right' });
  }

  return doc.output('blob');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
