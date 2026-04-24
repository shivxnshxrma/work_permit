/**
 * buildPermitPDF(data)
 * Draws the complete DS Group Work Permit using jsPDF.
 * Returns a jsPDF instance.
 */
import { jsPDF } from 'jspdf';

export function buildPermitPDF(d) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  _drawPage1(doc, d);
  doc.addPage();
  _drawPage2(doc);
  return doc;
}

/* ── layout constants (mm) ─────────────────────────────────────────────── */
const ML = 4, MT = 3, TW = 289, TE = 293;
const LW = 172, RX = 176, RW = 117;
const ACX = [176, 200, 229, 259], ACW = [24, 29, 30, 34];
const PPE_IW = 68, PPE_YNW = 31, PPE_ABW = 18;
const CBS = 2.7;
const fD = (s) => { if (!s) return ''; const p = s.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };

/* ── row-map builder ───────────────────────────────────────────────────── */
function mkRows() {
  const defs = [
    ['hdr',5.5],['permit',5.5],['desc',5],['wt1',5.5],['wt2',5.5],
    ['fire',5.5],['haz',11],['prec',11],['trn',5.5],['leg',5.5],
    ['sft',5.5],['per',5.5],['cHdr',5],['co',5.5],['ct',5.5],
    ['mob',5.5],['dt',5.5],['tm',5.5],['mp',5.5],['wa',9],
    ['hHdr',4.5],['h1',5],['h2',5],['h3',5],['ns',5.5],
    ['acc',18],['ab',5.5],['nt',6],['ft',4],
  ];
  const m = {}; let y = MT;
  defs.forEach(([n, h]) => { m[n] = { y, h }; y += h; });
  return m;
}

/* ── primitives ────────────────────────────────────────────────────────── */
const SF  = (d, sz, st = 'normal') => { d.setFont('helvetica', st); d.setFontSize(sz); };
const DC  = (d, r, g, b) => d.setDrawColor(r, g, b);
const FC  = (d, r, g, b) => d.setFillColor(r, g, b);
const TC  = (d, r, g, b) => d.setTextColor(r, g, b);
const LW2 = (d, w)       => d.setLineWidth(w);

function Rect(d, x, y, w, h, fill) {
  LW2(d, 0.2); DC(d, 80, 80, 80);
  if (fill) { FC(d, ...fill); d.rect(x, y, w, h, 'FD'); }
  else d.rect(x, y, w, h, 'S');
}
const Hline = (d, x1, y, x2) => { LW2(d, 0.2); DC(d, 80, 80, 80); d.line(x1, y, x2, y); };
const Vline = (d, x, y1, y2) => { LW2(d, 0.2); DC(d, 80, 80, 80); d.line(x, y1, x, y2); };

function hCell(d, txt, x, y, w, h, sz = 5.5, dark = false) {
  const fill = dark ? [30, 58, 95] : [210, 218, 228];
  Rect(d, x, y, w, h, fill);
  SF(d, sz, 'bold'); TC(d, ...(dark ? [255, 255, 255] : [10, 10, 10]));
  const lines = d.splitTextToSize(txt, w - 1);
  const lh = sz * 0.4, th = lines.length * lh;
  lines.forEach((l, i) => d.text(l, x + w / 2, y + h / 2 - th / 2 + lh / 2 + i * lh, { align: 'center' }));
}

const uline = (d, x, y, w) => { LW2(d, 0.2); DC(d, 100, 100, 100); d.line(x, y, x + w, y); };

function dv(d, txt, x, y, mw, sz = 6.5) {
  if (!txt) return;
  SF(d, sz, 'normal'); TC(d, 0, 0, 0);
  let s = String(txt); while (s.length > 1 && d.getTextWidth(s) > mw - 0.3) s = s.slice(0, -1);
  d.text(s, x, y);
}

function dwrap(d, txt, x, y, mw, sz = 6, lh = 3.3) {
  if (!txt) return;
  SF(d, sz, 'normal'); TC(d, 0, 0, 0);
  const lines = d.splitTextToSize(String(txt), mw - 0.5);
  lines.forEach((l, i) => d.text(l, x, y + i * lh));
}

function CB(d, x, y, checked) {
  LW2(d, 0.25); DC(d, 60, 60, 60); FC(d, 255, 255, 255); d.rect(x, y, CBS, CBS, 'FD');
  if (checked) {
    LW2(d, 0.45); DC(d, 0, 0, 0);
    d.line(x + CBS * 0.15, y + CBS * 0.52, x + CBS * 0.38, y + CBS * 0.78);
    d.line(x + CBS * 0.38, y + CBS * 0.78, x + CBS * 0.85, y + CBS * 0.15);
  }
}

/* ── page 1 ────────────────────────────────────────────────────────────── */
function _drawPage1(doc, d) {
  const R = mkRows();
  const PPE_ITEMS = [
    'Full Body Harness','Ear Plug','Goggle / Face shield','Dust Mask',
    'Hand Gloves (Chemical/ Heat/ Cut resistant/ Cotton / Electrically insulated)',
    'Apron & Leg Guard','Heat Resistant suit','Fitness Certificate',
    'Any other (Pl. specify) 1.','Any other (Pl. specify) 2.',
  ];

  /* header block */
  FC(doc, 30, 58, 95); doc.rect(ML, MT, TW, R.hdr.h, 'F');
  FC(doc, 185, 28, 28); doc.rect(ML + 1, MT + 1, 14, 12, 'F');
  SF(doc, 5, 'bold'); TC(doc, 255, 255, 255); doc.text('DS GROUP', ML + 8, MT + 3, { align: 'center' });
  SF(doc, 9, 'bold'); doc.text('DS', ML + 8, MT + 9, { align: 'center' });
  SF(doc, 18, 'bold'); TC(doc, 20, 20, 20);
  FC(doc, 255, 255, 255); doc.rect(ML + 18, MT + 1, TW - 60, R.hdr.h - 2, 'F');
  doc.text('WORK PERMIT', ML + 18 + (TW - 60) / 2, MT + R.hdr.h / 2 + 3.5, { align: 'center' });
  SF(doc, 5, 'normal'); TC(doc, 50, 50, 50);
  doc.text('DS(FDS)/ADM/FM/14', TE - 1, MT + 3.5, { align: 'right' });
  doc.text('Version 6.00', TE - 1, MT + 7, { align: 'right' });
  doc.text('Effective Date: 15th June 2024', TE - 1, MT + 10.5, { align: 'right' });

  /* permit header row */
  const P = R.permit; Rect(doc, ML, P.y, TW, P.h);
  const py = P.y + P.h / 2 + 0.8;
  SF(doc, 6.5, 'bold'); TC(doc, 0, 0, 0); doc.text('Permit Valid From:', ML + 2, py);
  SF(doc, 7, 'normal');
  const vfx = ML + 33; doc.text(fD(d.validFrom) || '___/___/____', vfx, py); uline(doc, vfx, P.y + P.h - 0.5, 24);
  SF(doc, 6.5, 'bold'); doc.text('To', vfx + 26, py);
  SF(doc, 7, 'normal'); const vtx = vfx + 31; doc.text(fD(d.validTo) || '___/___/____', vtx, py); uline(doc, vtx, P.y + P.h - 0.5, 24);
  SF(doc, 6.5, 'bold'); doc.text('Location of work:', vtx + 27, py);
  SF(doc, 7, 'normal'); const lx = vtx + 53; doc.text(d.location || '', lx, py); uline(doc, lx, P.y + P.h - 0.5, 33);
  SF(doc, 6.5, 'bold'); doc.text('S. No.:', TE - 32, py);
  SF(doc, 7, 'normal'); doc.text(d.sNo || '', TE - 20, py); uline(doc, TE - 20, P.y + P.h - 0.5, 18);

  /* outer border + section divider */
  const tTop = R.desc.y, tBot = R.ns.y + R.ns.h;
  LW2(doc, 0.35); DC(doc, 40, 40, 40); doc.rect(ML, tTop, TW, tBot - tTop, 'S');
  LW2(doc, 0.35); Vline(doc, RX, tTop, R.per.y + R.per.h);

  /* approval header */
  hCell(doc, 'Description of work  (Please \u2713 the following)', ML, R.desc.y, LW, R.desc.h, 5.5);
  hCell(doc, 'Initiator\nUser Dept.', ACX[0], R.desc.y, ACW[0], R.desc.h * 2.5, 5);
  hCell(doc, 'Recommended', ACX[1], R.desc.y, ACW[1] + ACW[2], R.desc.h, 5.5);
  hCell(doc, 'APPROVAL\nHOD Facility\nManagement / Unit Head', ACX[3], R.desc.y, ACW[3], R.desc.h * 2.5, 4.8);
  hCell(doc, 'HOD User\nDept.', ACX[1], R.desc.y + R.desc.h, ACW[1], R.desc.h * 1.5, 4.8);
  hCell(doc, 'EHS\nRepresentative', ACX[2], R.desc.y + R.desc.h, ACW[2], R.desc.h * 1.5, 4.8);

  const aY0 = R.desc.y + R.desc.h * 2.5, aRH = R.desc.h;
  ['Name', 'Signature', 'Date'].forEach((lbl, i) => {
    const ry = aY0 + i * aRH; Hline(doc, RX, ry, TE);
    SF(doc, 5, 'bold'); TC(doc, 30, 30, 30); doc.text(lbl, RX + 1, ry + aRH / 2 + 0.6);
    ACX.forEach((ax) => Vline(doc, ax, ry, ry + aRH)); Vline(doc, TE, ry, ry + aRH);
  });
  [{ x: ACX[0], w: ACW[0], n: d.initName, s: d.initSig, dt: fD(d.initDate) },
   { x: ACX[1], w: ACW[1], n: d.hodUName, s: d.hodUSig, dt: fD(d.hodUDate) },
   { x: ACX[2], w: ACW[2], n: d.ehsName,  s: d.ehsSig,  dt: fD(d.ehsDate)  },
   { x: ACX[3], w: ACW[3], n: d.hodFName, s: d.hodFSig, dt: fD(d.hodFDate) },
  ].forEach(({ x, w, n, s, dt }) => {
    dv(doc, n,  x + 1, aY0 + aRH / 2 + 0.8,       w - 1.5, 5.5);
    dv(doc, s,  x + 1, aY0 + aRH + aRH / 2 + 0.8,  w - 1.5, 5.5);
    dv(doc, dt, x + 1, aY0 + 2 * aRH + aRH / 2 + 0.8, w - 1.5, 5.5);
  });

  /* work type checkboxes */
  const wt = d.workTypes || [];
  Hline(doc, ML, R.wt1.y, RX, R.wt1.y); Hline(doc, ML, R.wt2.y, RX, R.wt2.y);
  Hline(doc, ML, R.wt2.y + R.wt2.h, RX, R.wt2.y + R.wt2.h);
  const wrow = (items, ry) => {
    const cw = LW / items.length;
    items.forEach(([lbl, val], i) => {
      if (i > 0) Vline(doc, ML + i * cw, ry, ry + R.wt1.h);
      const bx = ML + i * cw + 1, by = ry + R.wt1.h / 2 - CBS / 2;
      CB(doc, bx, by, wt.includes(val));
      SF(doc, 5.5, 'normal'); TC(doc, 0, 0, 0); doc.text(lbl, bx + CBS + 1, ry + R.wt1.h / 2 + 0.6);
    });
  };
  wrow([['Hot work','Hot work'],['Excavation/Civil work','Excavation/Civil work'],['Pipeline work','Pipeline work'],['Confined space entry','Confined space entry']], R.wt1.y);
  wrow([['Height work (1.8m+)','Height work (1.8m+)'],['Electrical','Electrical'],['Emergency Machinery','Emergency Machinery'],['Others','Others']], R.wt2.y);

  /* fire risk */
  const FR = R.fire; Hline(doc, ML, FR.y, RX, FR.y); Hline(doc, ML, FR.y + FR.h, RX, FR.y + FR.h);
  SF(doc, 5.5, 'normal'); TC(doc, 0, 0, 0); doc.text('Fire risk evaluation (by Fire / Safety)', ML + 1, FR.y + FR.h / 2 + 0.6);
  const fx0 = ML + 90, fcw = (LW - 90) / 4;
  ['A', 'B', 'C', 'D'].forEach((lbl, i) => {
    Vline(doc, fx0 + i * fcw, FR.y, FR.y + FR.h);
    SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0); doc.text(lbl, fx0 + fcw / 2 + i * fcw, FR.y + FR.h / 2 + 0.6, { align: 'center' });
    // Display checkbox with checkmark if checked
    const isChecked = [d.fireA, d.fireB, d.fireC, d.fireD][i];
    const checkboxSize = 3;
    const boxX = fx0 + i * fcw + fcw / 2 - checkboxSize / 2;
    const boxY = FR.y + FR.h / 2 - checkboxSize / 2;
    // Draw checkbox border
    Rect(doc, boxX, boxY, checkboxSize, checkboxSize, false);
    // Draw checkmark if checked
    if (isChecked) {
      TC(doc, 0, 100, 0);
      SF(doc, 6, 'bold');
      doc.text('✓', boxX + checkboxSize / 2, boxY + checkboxSize / 2 + 0.5, { align: 'center' });
    }
  });

  /* hazards + company employee */
  const HZ = R.haz; Hline(doc, ML, HZ.y, TE, HZ.y); Hline(doc, ML, HZ.y + HZ.h, TE, HZ.y + HZ.h);
  const sx = ML + LW / 2; Vline(doc, sx, HZ.y, HZ.y + HZ.h);
  SF(doc, 5, 'bold'); TC(doc, 30, 30, 30); doc.text('Potential Hazards:', ML + 1, HZ.y + 3);
  dwrap(doc, d.hazards, ML + 1, HZ.y + 6.5, LW / 2 - 2, 6, 3.3);
  SF(doc, 5, 'bold'); doc.text('Company employee responsible for the work:', sx + 1, HZ.y + 3, { maxWidth: LW / 2 - 1 });
  dwrap(doc, d.empResp, sx + 1, HZ.y + 8, LW / 2 - 2, 6.5, 3.3);
  SF(doc, 5, 'bold'); TC(doc, 30, 30, 30); doc.text('Name', RX + 1, HZ.y + 3);
  [ACX[1], ACX[2], ACX[3]].forEach((ax) => Vline(doc, ax, HZ.y, HZ.y + HZ.h));

  /* precautions + training */
  const PC = R.prec; Hline(doc, ML, PC.y, TE, PC.y); Hline(doc, ML, PC.y + PC.h, TE, PC.y + PC.h);
  Vline(doc, sx, PC.y, PC.y + PC.h);
  SF(doc, 5, 'bold'); TC(doc, 30, 30, 30); doc.text('Precautions to be taken:', ML + 1, PC.y + 3);
  dwrap(doc, d.precautions, ML + 1, PC.y + 6.5, LW / 2 - 2, 6, 3.3);
  SF(doc, 5, 'bold'); doc.text('Is Specific training required (if Yes, Please specify):', sx + 1, PC.y + 3, { maxWidth: LW / 2 - 1 });
  const t3w = (LW / 2) / 3;
  ['Name', 'Designation', 'Dept.'].forEach((lb, i) => {
    if (i > 0) Vline(doc, sx + i * t3w, PC.y, PC.y + PC.h);
    SF(doc, 4.8, 'bold'); TC(doc, 40, 40, 40); doc.text(lb, sx + i * t3w + 1, PC.y + PC.h - 3);
    uline(doc, sx + i * t3w + 1, PC.y + PC.h - 1.2, t3w - 2);
  });
  const tv = PC.y + PC.h / 2 + 1;
  dv(doc, d.trainName,  sx + 1,           tv, t3w - 1.5, 6);
  dv(doc, d.trainDesig, sx + t3w + 1,     tv, t3w - 1.5, 6);
  dv(doc, d.trainDept,  sx + 2 * t3w + 1, tv, t3w - 1.5, 6);
  SF(doc, 5, 'bold'); TC(doc, 30, 30, 30); doc.text('Signature', RX + 1, PC.y + 3);
  [ACX[1], ACX[2], ACX[3]].forEach((ax) => Vline(doc, ax, PC.y, PC.y + PC.h));

  /* training/confined space header row */
  const TN = R.trn;
  Hline(doc, ML, TN.y, TE, TN.y); Hline(doc, ML, TN.y + TN.h, TE, TN.y + TN.h);
  Vline(doc, sx, TN.y, TN.y + TN.h);
  hCell(doc, 'For confined space permit', sx, TN.y, LW / 2, TN.h, 5.5);
  SF(doc, 5, 'bold'); TC(doc, 30, 30, 30); doc.text('Date', RX + 1, TN.y + TN.h / 2 + 0.6);
  [ACX[1], ACX[2], ACX[3]].forEach((ax) => Vline(doc, ax, TN.y, TN.y + TN.h));
  [[ACX[0], ACW[0], fD(d.initDate)],[ACX[1], ACW[1], fD(d.hodUDate)],[ACX[2], ACW[2], fD(d.ehsDate)],[ACX[3], ACW[3], fD(d.hodFDate)]].forEach(([x, w, v]) => dv(doc, v, x + 1, TN.y + TN.h / 2 + 0.6, w - 1.5, 5.5));

  /* PPE section */
  const ppeHY = TN.y + TN.h;
  hCell(doc, 'Precautionary measures recommended by\nIncharge Security & Safety / Facility Management', RX, ppeHY, RW, R.leg.h * 1.1, 5.5);
  const ppeSubY = ppeHY + R.leg.h * 1.1, ppeSubH = R.leg.h * 0.9;
  hCell(doc, 'Items', RX, ppeSubY, PPE_IW, ppeSubH, 5.5);
  hCell(doc, 'PPE Required (Pl. \u2713)', RX + PPE_IW, ppeSubY, PPE_YNW, ppeSubH, 5.5);
  hCell(doc, 'Approved by', RX + PPE_IW + PPE_YNW, ppeSubY, PPE_ABW, ppeSubH, 5.5);
  const ppeSY = ppeSubY + ppeSubH, pRH = 4.4;
  const pyesX = RX + PPE_IW + 1, pnoX = RX + PPE_IW + 16;
  PPE_ITEMS.forEach((item, i) => {
    const ry = ppeSY + i * pRH;
    Hline(doc, RX, ry, TE, ry); Vline(doc, RX + PPE_IW, ry, ry + pRH); Vline(doc, RX + PPE_IW + PPE_YNW, ry, ry + pRH);
    SF(doc, 4.8, 'normal'); TC(doc, 0, 0, 0);
    const ls = doc.splitTextToSize(item, PPE_IW - 1.5);
    const ty = ry + (pRH - ls.length * 2.6) / 2 + 2.2;
    ls.forEach((l, li) => doc.text(l, RX + 0.8, ty + li * 2.6));
    const val = (d.ppe || {})[item] || '';
    const cy = ry + pRH / 2 - CBS / 2;
    CB(doc, pyesX, cy, val === 'Yes'); SF(doc, 4.8, 'normal'); TC(doc, 0, 0, 0); doc.text('Yes', pyesX + CBS + 0.5, ry + pRH / 2 + 0.6);
    CB(doc, pnoX,  cy, val === 'No');  doc.text('No', pnoX + CBS + 0.5, ry + pRH / 2 + 0.6);
    const ax = RX + PPE_IW + PPE_YNW + 0.5;
    if (i === 0) { SF(doc, 4.5, 'bold'); TC(doc, 30, 30, 30); doc.text('Name:', ax, ry + 2.5); dv(doc, d.ppeApprName, ax, ry + 5, PPE_ABW - 1, 4.5); }
    if (i === 4) { SF(doc, 4.5, 'bold'); TC(doc, 30, 30, 30); doc.text('Sig:',  ax, ry + 2.5); }
    if (i === 5) { SF(doc, 4.5, 'bold'); TC(doc, 30, 30, 30); doc.text('Date:', ax, ry + 2.5); dv(doc, fD(d.ppeApprDate), ax, ry + 5, PPE_ABW - 1, 4.5); }
  });
  const ppeEndY = ppeSY + PPE_ITEMS.length * pRH; Hline(doc, RX, ppeEndY, TE, ppeEndY);

  /* legal + entrant */
  const LG = R.leg; Hline(doc, ML, LG.y, RX, LG.y); Hline(doc, ML, LG.y + LG.h, RX, LG.y + LG.h);
  Vline(doc, sx, LG.y, LG.y + LG.h);
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Legal Requirements (Statutory):', ML + 1, LG.y + 2.5);
  const lnx = ML + 54, lsx = lnx + 27;
  Vline(doc, lnx, LG.y, LG.y + LG.h); Vline(doc, lsx, LG.y, LG.y + LG.h);
  SF(doc, 4.8, 'bold'); TC(doc, 40, 40, 40); doc.text('Name', lnx + 1, LG.y + 2); doc.text('Signature', lsx + 1, LG.y + 2);
  uline(doc, lnx + 1, LG.y + LG.h - 1, 25); uline(doc, lsx + 1, LG.y + LG.h - 1, LW - 54 - 27 - 3);
  dv(doc, d.legalName, lnx + 1, LG.y + LG.h / 2 + 1.5, 25, 5.5);
  dv(doc, d.legalSig, lsx + 1, LG.y + LG.h / 2 + 1.5, 20, 5.5);
  SF(doc, 5.5, 'normal'); TC(doc, 0, 0, 0); doc.text('Entrant', sx + 1, LG.y + LG.h / 2 + 0.6);
  const ex = sx + 16; uline(doc, ex, LG.y + LG.h - 1, 17); uline(doc, ex + 18, LG.y + LG.h - 1, 17);
  dv(doc, d.entrant, ex, LG.y + LG.h - 2, 17, 5.5); dv(doc, d.entrantSig, ex + 18, LG.y + LG.h - 2, 17, 5.5);

  /* shift + attendant */
  const SF2 = R.sft; Hline(doc, ML, SF2.y, RX, SF2.y); Hline(doc, ML, SF2.y + SF2.h, RX, SF2.y + SF2.h);
  Vline(doc, sx, SF2.y, SF2.y + SF2.h);
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Shift handovers requirements:', ML + 1, SF2.y + 2.5);
  dwrap(doc, d.shiftHandover, ML + 1, SF2.y + 5.5, LW / 2 - 2, 5.5, 3);
  SF(doc, 5.5, 'normal'); TC(doc, 0, 0, 0); doc.text('Attendant', sx + 1, SF2.y + SF2.h / 2 + 0.6);
  uline(doc, sx + 17, SF2.y + SF2.h - 1, 17); uline(doc, sx + 35, SF2.y + SF2.h - 1, 17);
  dv(doc, d.attendant, sx + 17, SF2.y + SF2.h - 2, 17, 5.5); dv(doc, d.attendantSig, sx + 35, SF2.y + SF2.h - 2, 17, 5.5);

  /* persons + supervisor */
  const PE = R.per; Hline(doc, ML, PE.y, RX, PE.y); Hline(doc, ML, PE.y + PE.h, RX, PE.y + PE.h);
  Vline(doc, sx, PE.y, PE.y + PE.h);
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Persons to be notified:', ML + 1, PE.y + 2.5);
  dwrap(doc, d.personsNotified, ML + 1, PE.y + 5.5, LW / 2 - 2, 5.5, 3);
  SF(doc, 5.5, 'normal'); TC(doc, 0, 0, 0); doc.text('Supervisor', sx + 1, PE.y + PE.h / 2 + 0.6);
  uline(doc, sx + 18, PE.y + PE.h - 1, 17); uline(doc, sx + 36, PE.y + PE.h - 1, 17);
  dv(doc, d.supervisor, sx + 18, PE.y + PE.h - 2, 17, 5.5); dv(doc, d.supervisorSig, sx + 36, PE.y + PE.h - 2, 17, 5.5);

  /* contractor header */
  hCell(doc, 'Contractor & Work Area details', ML, R.cHdr.y, LW, R.cHdr.h, 6);

  /* completion verification header */
  const cmx = RX + RW / 2;
  hCell(doc, 'WORK PERMIT', RX, ppeEndY, RW / 2, 5, 6.5);
  hCell(doc, 'COMPLETION VERIFICATION\nIncharge Facility Management / Unit Head', cmx, ppeEndY, RW / 2, 5, 5.5);
  const cBodyH = R.wa.y + R.wa.h - ppeEndY - 5;
  Rect(doc, RX, ppeEndY + 5, RW / 2, cBodyH); Rect(doc, cmx, ppeEndY + 5, RW / 2, cBodyH);
  SF(doc, 5, 'normal'); TC(doc, 0, 0, 0);
  doc.text('Copy issued to\nContractor by :', RX + 1, ppeEndY + 9, { lineHeightFactor: 1.5 });
  uline(doc, RX + 1, ppeEndY + 15, RW / 2 - 2); dv(doc, d.copyIssuedBy, RX + 1, ppeEndY + 14, RW / 2 - 2, 5.5);
  const ct = doc.splitTextToSize('The above work is completed. Manpower deployed is removed from the working site and site area is cleaned and restored in terms of safety.', RW / 2 - 2);
  ct.forEach((l, i) => doc.text(l, cmx + 1, ppeEndY + 8 + i * 3.1));

  /* contractor detail rows */
  const lbw = 22, cdx = ML + lbw, co3h = R.co.h + R.ct.h + R.mob.h;
  Rect(doc, ML, R.co.y, lbw, co3h);
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Contractor\nDetails', ML + 1, R.co.y + co3h / 2 - 1, { lineHeightFactor: 1.4, maxWidth: lbw - 1 });
  [['Company name', d.coName, R.co],['Contact Person', d.contactPerson, R.ct],['Mobile No.', d.mobile, R.mob]].forEach(([lb, val, row], i) => {
    if (i > 0) Hline(doc, ML, row.y, RX, row.y);
    Rect(doc, cdx, row.y, LW - lbw, row.h);
    SF(doc, 4.8, 'bold'); TC(doc, 40, 40, 40); doc.text(lb, cdx + 1, row.y + 2.5);
    dv(doc, val, cdx + 1, row.y + row.h / 2 + 1.5, LW - lbw - 2, 6.5);
  });

  /* issued date + completion sigs */
  const isoY = ppeEndY + 5 + cBodyH / 2;
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Issued Date:', RX + 1, isoY);
  uline(doc, RX + 1, isoY + 3, RW / 2 - 2); dv(doc, fD(d.issuedDate), RX + 1, isoY + 2.5, RW / 2 - 2, 5.5);
  SF(doc, 4.8, 'bold'); doc.text('Name', cmx + 2, isoY - 2); doc.text('Signature', cmx + 22, isoY - 2); doc.text('Date', cmx + 45, isoY - 2);
  [['Contractor:', d.cmpContractor, isoY + 3],['Company\nemployee\nsite incharge:', d.cmpSiteIncharge, isoY + 10],['Person Issuing:', d.cmpPersonIssuing, isoY + 20]].forEach(([lb, val, ry]) => {
    SF(doc, 4.8, 'normal'); TC(doc, 0, 0, 0);
    const ls = lb.split('\n'); ls.forEach((l, i) => doc.text(l, RX + 1, ry + i * 2.8));
    uline(doc, cmx + 2, ry + 2, 18); uline(doc, cmx + 22, ry + 2, 20); uline(doc, cmx + 45, ry + 2, 14);
    dv(doc, val, cmx + 2, ry + 1.5, 18, 4.8);
  });

  /* date / timing / manpower / work-area rows */
  const DR = R.dt; Hline(doc, ML, DR.y, RX, DR.y); Hline(doc, ML, DR.y + DR.h, RX, DR.y + DR.h);
  const dmx = ML + lbw + (LW - lbw) * 0.5;
  Vline(doc, ML + lbw, DR.y, DR.y + DR.h); Vline(doc, dmx, DR.y, DR.y + DR.h);
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Date', ML + 1, DR.y + DR.h / 2 + 0.6);
  doc.text('Start', cdx + 1, DR.y + DR.h / 2 + 0.6); dv(doc, fD(d.startDate), cdx + 9, DR.y + DR.h / 2 + 0.6, dmx - cdx - 10, 6);
  doc.text('End', dmx + 1, DR.y + DR.h / 2 + 0.6);   dv(doc, fD(d.endDate), dmx + 8, DR.y + DR.h / 2 + 0.6, RX - dmx - 9, 6);

  const TM = R.tm; Hline(doc, ML, TM.y, RX, TM.y); Hline(doc, ML, TM.y + TM.h, RX, TM.y + TM.h);
  Vline(doc, ML + lbw, TM.y, TM.y + TM.h); Vline(doc, dmx, TM.y, TM.y + TM.h);
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Timing (Shifts)', ML + 1, TM.y + TM.h / 2 + 0.6);
  doc.text('Start', cdx + 1, TM.y + TM.h / 2 + 0.6); dv(doc, d.shiftStart, cdx + 9, TM.y + TM.h / 2 + 0.6, 24, 6);
  SF(doc, 5, 'normal'); doc.text('AM / PM', cdx + 35, TM.y + TM.h / 2 + 0.6);
  SF(doc, 5, 'bold'); doc.text('End', dmx + 1, TM.y + TM.h / 2 + 0.6); dv(doc, d.shiftEnd, dmx + 8, TM.y + TM.h / 2 + 0.6, 22, 6);
  SF(doc, 5, 'normal'); doc.text('AM / PM', dmx + 32, TM.y + TM.h / 2 + 0.6);

  const MP = R.mp; Hline(doc, ML, MP.y, RX, MP.y); Hline(doc, ML, MP.y + MP.h, RX, MP.y + MP.h);
  Rect(doc, ML, MP.y, LW, MP.h);
  SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Manpower', ML + 1, MP.y + MP.h / 2 + 0.6);
  dv(doc, d.manpower, ML + 24, MP.y + MP.h / 2 + 0.6, LW - 25, 6.5);

  const WA = R.wa; Hline(doc, ML, WA.y, RX, WA.y); Hline(doc, ML, WA.y + WA.h, RX, WA.y + WA.h);
  const w3 = LW / 3;
  Rect(doc, ML, WA.y, w3, WA.h); SF(doc, 5, 'bold'); TC(doc, 0, 0, 0); doc.text('Work\nArea\nDetails', ML + 1, WA.y + 3, { lineHeightFactor: 1.4 });
  hCell(doc, 'Department', ML + w3, WA.y, w3, WA.h * 0.45, 5.5);
  Rect(doc, ML + w3, WA.y + WA.h * 0.45, w3, WA.h * 0.55); Vline(doc, ML + w3, WA.y, WA.y + WA.h);
  hCell(doc, 'Specify exact location', ML + w3 * 2, WA.y, w3, WA.h * 0.45, 5.5);
  Rect(doc, ML + w3 * 2, WA.y + WA.h * 0.45, w3, WA.h * 0.55); Vline(doc, ML + w3 * 2, WA.y, WA.y + WA.h);
  const waDY = WA.y + WA.h * 0.45 + WA.h * 0.55 / 2 + 1;
  dv(doc, d.workDept, ML + w3 + 1, waDY, w3 - 2, 6.5); dv(doc, d.exactLoc, ML + w3 * 2 + 1, waDY, w3 - 2, 6.5);

  /* HRA checks */
  hCell(doc, 'To be checked by HRA (at Units) and Facility Management (at Corporate)', ML, R.hHdr.y, TW, R.hHdr.h, 5.5);
  [['Copy of registration provided for Contract Labour (Regulation & abolition) Act 1970', d.hra1, R.h1],
   ['Copy of registration provided for Employees Provident Funds Act 1952', d.hra2, R.h2],
   ['Copy of registration provided for Employees State Insurance (ESI) Act 1948', d.hra3, R.h3],
  ].forEach(([txt, val, row]) => {
    Rect(doc, ML, row.y, TW, row.h);
    SF(doc, 5, 'normal'); TC(doc, 0, 0, 0); doc.text('\u2022  ' + txt, ML + 1, row.y + row.h / 2 + 0.6, { maxWidth: TW - 38 });
    const yx = ML + TW - 33;
    CB(doc, yx, row.y + row.h / 2 - CBS / 2, val === 'Yes'); doc.text('Yes', yx + CBS + 0.5, row.y + row.h / 2 + 0.6);
    CB(doc, yx + 16, row.y + row.h / 2 - CBS / 2, val === 'No'); doc.text('No', yx + 17 + CBS, row.y + row.h / 2 + 0.6);
    Vline(doc, yx - 1, row.y, row.y + row.h);
  });

  /* name/sig/date row */
  const NS = R.ns; Rect(doc, ML, NS.y, TW, NS.h);
  const ny = NS.y + NS.h / 2 + 0.6;
  SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0);
  doc.text('Name:', ML + 1, ny); uline(doc, ML + 10, NS.y + NS.h - 1, 58); dv(doc, d.hraName, ML + 10, ny, 58, 6.5);
  doc.text('Signature:', ML + TW * 0.4, ny); uline(doc, ML + TW * 0.4 + 14, NS.y + NS.h - 1, 48);
  doc.text('Date:', ML + TW * 0.75, ny); uline(doc, ML + TW * 0.75 + 9, NS.y + NS.h - 1, 38); dv(doc, fD(d.hraDate), ML + TW * 0.75 + 9, ny, 38, 6.5);

  /* acceptance */
  const AC = R.acc, amx = ML + LW * 0.6;
  Rect(doc, ML, AC.y, TW, AC.h); Vline(doc, amx, AC.y, AC.y + AC.h);
  SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0); doc.text('Acceptance by CONTRACTOR', (ML + amx) / 2, AC.y + 3, { align: 'center' });
  SF(doc, 4.7, 'normal'); TC(doc, 30, 30, 30);
  const at = doc.splitTextToSize('I understand the work which is to be carried out and the method of work to be used to ensure that it is carried out safely and abide by the all applicable Central, State, Municipal & Local laws, Bylaws, Rules & Regulations. No work will be carried out other than the work authorized by this permit.', amx - ML - 2);
  at.forEach((l, i) => doc.text(l, ML + 1, AC.y + 7 + i * 2.9));
  SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0); doc.text('Acceptance by person on report', (amx + TE) / 2, AC.y + 3, { align: 'center' });
  SF(doc, 5.5, 'normal'); TC(doc, 0, 0, 0);
  const ry0 = AC.y + 8;
  doc.text('Name', amx + 1, ry0); uline(doc, amx + 10, ry0 + 1, TE - amx - 12); dv(doc, d.repName, amx + 10, ry0, TE - amx - 12, 6);
  doc.text('Signature', amx + 1, ry0 + 7); uline(doc, amx + 14, ry0 + 8, TE - amx - 16);
  doc.text('Date', amx + 1, ry0 + 14); uline(doc, amx + 10, ry0 + 15, TE - amx - 12); dv(doc, fD(d.repDate), amx + 10, ry0 + 14, TE - amx - 12, 6);

  /* accept bottom */
  const AB = R.ab; Rect(doc, ML, AB.y, TW, AB.h);
  const aby = AB.y + AB.h / 2 + 0.6;
  SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0);
  doc.text('Name:', ML + 1, aby); uline(doc, ML + 10, AB.y + AB.h - 1, 48); dv(doc, d.conName, ML + 10, aby, 48, 6.5);
  doc.text('Signature:', ML + TW * 0.35, aby); uline(doc, ML + TW * 0.35 + 14, AB.y + AB.h - 1, 48);
  doc.text('Date:', ML + TW * 0.7, aby); uline(doc, ML + TW * 0.7 + 9, AB.y + AB.h - 1, 33); dv(doc, fD(d.conDate), ML + TW * 0.7 + 9, aby, 33, 6.5);

  /* note */
  const NT = R.nt;
  doc.setLineDashPattern([1, 0.5], 0); LW2(doc, 0.2); DC(doc, 80, 80, 80); doc.rect(ML, NT.y, TW, NT.h, 'S'); doc.setLineDashPattern([], 0);
  SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0); doc.text('NOTE:', ML + 1, NT.y + 2.5);
  SF(doc, 4.8, 'normal');
  doc.text('\u2022  This permit applies only to work in the location described.', ML + 10, NT.y + 2.5);
  doc.text('\u2022  This permit only applies to the person to whom it is issued. If work has to be continued by someone else, this permit must be returned to issuer for cancellation and another permit issued.', ML + 10, NT.y + 5.5, { maxWidth: TW - 11 });

  /* footer */
  const FT = R.ft; SF(doc, 5, 'normal'); TC(doc, 60, 60, 60);
  doc.text('Green Copy for Contractor', ML, FT.y + FT.h / 2 + 0.6);
  doc.text('Pink Copy for Incharge Facility Management  /  Incharge HRA at Units', ML + TW / 2, FT.y + FT.h / 2 + 0.6, { align: 'center' });
  doc.text('White Copy for Issuing Authority', ML + TW, FT.y + FT.h / 2 + 0.6, { align: 'right' });
}

/* ── page 2 (static guidelines) ────────────────────────────────────────── */
function _drawPage2(doc) {
  const px = 4, py = 3, pw = 289, c3 = pw / 3;
  hCell(doc, 'GUIDELINES FOR SAFETY AT WORKS', px, py, pw, 7, 9, true);
  SF(doc, 5, 'normal'); TC(doc, 0, 0, 0);
  doc.text('The contractor shall be responsible for safety of all employees & labours; employed by him on works, directly or through petty contractor or subcontractor.', px + 1, py + 10, { maxWidth: pw - 2 });
  const h2y = py + 13;
  hCell(doc, 'TEMPORARY WORKS', px, h2y, c3, 5.5, 7, true);
  hCell(doc, 'COMPLIANCE WITH RULES FOR EMPLOYEE OF LABOUR', px + c3, h2y, c3, 5.5, 7, true);
  hCell(doc, 'OBSERVANCE OF ENVIRONMENTAL\nREGULATIONS AND PROTECTION', px + c3 * 2, h2y, c3, 5.5, 6, true);
  const c3cy = h2y + 5.5, c3ch = 26;
  ['\u2713 All temporary works provided & maintained by the contractor at his own cost and removed when no longer required.',
   '\u2713 Comply with all applicable Central, State, Municipal & Local laws.\n\u2713 No person below age 18 as labourers.\n\u2713 Ensure compliance with PF/ESI/Workmen compensation Act.',
   '\u2713 Ensure all workmen and sub contractors comply with all environmental laws and conditions of any permit, permission, consent and/or no objection granted by any authority.',
  ].forEach((txt, i) => {
    Rect(doc, px + i * c3, c3cy, c3, c3ch);
    const ls = doc.splitTextToSize(txt, c3 - 2); SF(doc, 5, 'normal'); TC(doc, 0, 0, 0);
    ls.forEach((l, j) => doc.text(l, px + i * c3 + 1, c3cy + 3 + j * 2.9));
  });
  const sy = c3cy + c3ch;
  hCell(doc, 'SAFETY OF WORK AND PUBLIC & LABOUR', px, sy, c3 * 2, 5, 7, true);
  hCell(doc, 'REPORTING OF LABOUR ACCIDENT', px + c3 * 2, sy, c3, 5, 7, true);
  const sch = 38;
  Rect(doc, px, sy + 5, c3 * 2, sch); Rect(doc, px + c3 * 2, sy + 5, c3, sch);
  const st = doc.splitTextToSize('\u2713 Provide safety belts, retro guards, eye protection.\n\u2713 Workers in wet conditions: waterproof boots, coat & hat.\n\u2713 All workers to wear approved helmets.\n\u2713 Contractor to ensure tools are suitable and in safe condition.\n\u2713 Welding sets to be properly earthed.\n\u2713 Welding/burning/grinding must be reported prior to commencement.\n\u2713 Contractors checked for alcohol level before permitting to work.\n\u2713 No wooden ladders within DS premises.\n\u2713 Ensure barricading at area of work.', c3 * 2 - 2);
  SF(doc, 5, 'normal'); TC(doc, 0, 0, 0); st.forEach((l, i) => doc.text(l, px + 1, sy + 8 + i * 2.9));
  const rt = doc.splitTextToSize('\u2713 Report accident to Project Manager & provide prompt medical attention.\n\u2713 Compensation paid per Workmen\'s Compensation Act.\n\u2713 Contractor must indemnify the company from all claims, levies, damages, penalties & payments.', c3 - 2);
  rt.forEach((l, i) => doc.text(l, px + c3 * 2 + 1, sy + 8 + i * 2.9));
  const pry = sy + 5 + sch;
  Rect(doc, px, pry, pw, 6); SF(doc, 6.5, 'bold'); TC(doc, 0, 0, 0);
  doc.text('Principal to Principal you are working at arms length on this contract. You are not an agent.', px + pw / 2, pry + 4, { align: 'center' });
  const siy = pry + 6;
  hCell(doc, 'SAFETY INSTRUCTIONS', px, siy, pw, 6, 9, true);
  const si3y = siy + 6, si3h = 5;
  hCell(doc, 'HOT WORK', px, si3y, c3, si3h, 7, true); hCell(doc, 'HEIGHT WORK (1.8 M+)', px + c3, si3y, c3, si3h, 7, true); hCell(doc, 'EXCAVATION/CIVIL WORK', px + c3 * 2, si3y, c3, si3h, 7, true);
  const si3cy = si3y + si3h, si3ch = 26;
  ['\u2713 Supervisor takes rounds on site.\n\u2713 Experienced person with PPE (cloths, apron, goggles, gloves).\n\u2713 Fire extinguisher ready (CO\u2082/ABC).\n\u2713 Inspect hoses, regulators, flash back arrestor.\n\u2713 Double earthing for electrical welding.\n\u2713 Remove all flammable materials from work area.',
   '\u2713 All open sides barricaded.\n\u2713 Safety belt/harness with secure anchorage.\n\u2713 Firm equipment (ladder/hoist) for raising persons.\n\u2713 Ensure correct angle of 75\u00b0 for ladders.\n\u2713 Person medically fit to work at height.\n\u2713 Competent person to erect scaffolding.',
   '\u2713 Eliminate negative slopes, overhangs.\n\u2713 Ensure no electrical cable/pipe passing from work area.\n\u2713 Worker: gumboot, helmet, safety belt, goggles & gloves.\n\u2713 Never use defective or damaged portable electrical tool.\n\u2713 Provide caution board and fence/cordon the area.\n\u2713 Toolbox training must be given.',
  ].forEach((txt, i) => {
    Rect(doc, px + i * c3, si3cy, c3, si3ch);
    const ls = doc.splitTextToSize(txt, c3 - 2); SF(doc, 5, 'normal'); TC(doc, 0, 0, 0);
    ls.forEach((l, j) => doc.text(l, px + i * c3 + 1, si3cy + 3 + j * 2.9));
  });
  const si4y = si3cy + si3ch, si4h = 5;
  hCell(doc, 'ELECTRICAL WORK', px, si4y, c3, si4h, 7, true); hCell(doc, 'CONFINED SPACE ENTRY', px + c3, si4y, c3, si4h, 7, true); hCell(doc, 'EMERGENCY MACHINERY BREAKDOWN', px + c3 * 2, si4y, c3, si4h, 6, true);
  const si4cy = si4y + si4h, si4ch = 28;
  ['\u2713 Competent electricians only.\n\u2713 3 core cable & 3 pin plug for all portable tools.\n\u2713 Never overload electrical equipment.\n\u2713 Terminal Box properly secured.\n\u2713 IS-compatible rubber gloves/safety shoes.\n\u2713 Use loto; key only with worker.',
   '\u2713 Entrant, Attendant, Supervisor clearly defined.\n\u2713 Ensure adequate oxygen.\n\u2713 Remove inflammable gas by inert gas, then by air.\n\u2713 Use safety belt, shoes, and helmet.\n\u2713 Trained watchman for rescue.\n\u2713 Use low voltage (24V) hand lamp.\n\u2713 No hot job in confined space unless authorized.',
   '\u2713 Contact Security/Safety Incharge on duty.\n\u2713 Start work with all safety precautions.\n\u2713 Site supervision compulsory.',
  ].forEach((txt, i) => {
    Rect(doc, px + i * c3, si4cy, c3, si4ch);
    const ls = doc.splitTextToSize(txt, c3 - 2); SF(doc, 5, 'normal'); TC(doc, 0, 0, 0);
    ls.forEach((l, j) => doc.text(l, px + i * c3 + 1, si4cy + 3 + j * 2.9));
  });
  const ecY = si4cy + 12;
  hCell(doc, 'EMERGENCY CONTACT POINT', px + c3 * 2, ecY, c3, 5, 6.5, true);
  ['NAME :', 'MOBILE :', 'EXT. :', 'REMARKS :'].forEach((f, i) => {
    SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0); doc.text(f, px + c3 * 2 + 1, ecY + 9 + i * 5.5);
    uline(doc, px + c3 * 2 + 16, ecY + 10 + i * 5.5, c3 - 18);
  });
  const ntY = si4cy + si4ch + 2;
  SF(doc, 5.5, 'bold'); TC(doc, 0, 0, 0); doc.text('NOTE:', px + 1, ntY);
  SF(doc, 5.5, 'normal');
  doc.text('\u25aa  Use of LPG for Oxy Acetylene cutting is banned unless specifically permitted by the sanctioning authority.', px + 10, ntY, { maxWidth: pw - 12 });
  doc.text("\u25aa  Site supervision is compulsory. All contractors must bring their own PPE's.", px + 10, ntY + 5, { maxWidth: pw - 12 });
}
