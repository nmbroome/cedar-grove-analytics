// ============================================================
// Firm-wide monthly billing summary / revenue reconciliation
// ------------------------------------------------------------
// Pure helpers that shape a `monthlyMetrics/all` entry into the
// 9-row labeled table and the Recharts waterfall dataset used by
// the Billing Summaries page.
//
// The breakdown fields are synced from the same monthly sheet tab
// as `revenueAccrued` (see FirestoreSchema.md). They are optional:
// legacy entries that only have `revenueAccrued` are excluded from
// the reconciliation view via `hasBillingSummary`.
//
// Reconciliation identities (verified against the source sheet):
//   gross       = attorneyBillables + flatFee83b + filingFees + outsideCounselReimbursements
//   netAccrued  = gross - writeOffs - filingFees - outsideCounselReimbursements
//   revenueAccrued = netAccrued - deferred
// ============================================================

// Safe numeric accessor: treats absent / null / NaN as 0 so a
// partial sync degrades gracefully instead of throwing.
const num = (entry, key) => {
  const v = entry?.[key];
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
};

// True only when the three anchor totals are present numbers. These
// anchor both the table headline rows and all three full-height
// waterfall bars; component lines (filing fees, OCR, etc.) can each
// default to 0 without breaking the view.
export const hasBillingSummary = (entry) => {
  if (!entry) return false;
  const has = (key) => typeof entry[key] === 'number' && !Number.isNaN(entry[key]);
  return has('gross') && has('netAccrued') && has('revenueAccrued');
};

// Ordered rows mirroring the source sheet, top to bottom. `kind`
// drives styling in the view:
//   gross     - section total (bold label)
//   subtract  - red, rendered with a leading minus
//   component - indented sub-line that rolls up into Gross
//   subtotal  - Net Accrued (bold)
//   total     - Revenue (Accrued) (bold, top border)
export const buildSummaryRows = (entry) => [
  { key: 'gross', label: 'Gross (Billables, Fees, Reimbursements)', value: num(entry, 'gross'), kind: 'gross' },
  { key: 'writeOffs', label: 'Write Offs', value: num(entry, 'writeOffs'), kind: 'subtract' },
  { key: 'attorneyBillables', label: 'Attorney Billables', value: num(entry, 'attorneyBillables'), kind: 'component' },
  { key: 'flatFee83b', label: '83(b) Flat Fee', value: num(entry, 'flatFee83b'), kind: 'component' },
  { key: 'filingFees', label: 'Filing Fees', value: num(entry, 'filingFees'), kind: 'component' },
  { key: 'outsideCounselReimbursements', label: 'Outside Counsel Reimbursements', value: num(entry, 'outsideCounselReimbursements'), kind: 'component' },
  { key: 'netAccrued', label: 'Net Accrued', value: num(entry, 'netAccrued'), kind: 'subtotal' },
  { key: 'deferred', label: 'Deferred', value: num(entry, 'deferred'), kind: 'subtract' },
  { key: 'revenueAccrued', label: 'Revenue (Accrued)', value: num(entry, 'revenueAccrued'), kind: 'total' },
];

// Recharts floating-bar dataset (transparent base + visible delta).
// Totals are anchored at 0 (full-height bars); subtraction steps
// float down from the prior running total. Bar height is always the
// positive `delta`; the sign lives only in `value` (used by labels
// and the tooltip).
//
//   { name, base, delta, value, isTotal, isNegative }
//
// Steps: Gross -> -Write Offs -> -Filing Fees -> -Outside Counsel
// Reimb -> Net Accrued (anchor) -> -Deferred -> Revenue Accrued.
export const buildWaterfallData = (entry) => {
  const gross = num(entry, 'gross');
  const writeOffs = num(entry, 'writeOffs');
  const filingFees = num(entry, 'filingFees');
  const ocr = num(entry, 'outsideCounselReimbursements');
  const netAccrued = num(entry, 'netAccrued');
  const deferred = num(entry, 'deferred');
  const revenueAccrued = num(entry, 'revenueAccrued');

  const data = [{ name: 'Gross', base: 0, delta: gross, value: gross, isTotal: true, isNegative: false }];

  let running = gross;
  const subtract = (name, amount) => {
    const after = running - amount;
    // Avoid -0 for zero-value steps (e.g. Outside Counsel Reimb = $0).
    data.push({ name, base: after, delta: amount, value: amount === 0 ? 0 : -amount, isTotal: false, isNegative: true });
    running = after;
  };

  subtract('Write Offs', writeOffs);
  subtract('Filing Fees', filingFees);
  subtract('Outside Counsel Reimb', ocr);

  data.push({ name: 'Net Accrued', base: 0, delta: netAccrued, value: netAccrued, isTotal: true, isNegative: false });

  running = netAccrued;
  subtract('Deferred', deferred);

  data.push({ name: 'Revenue Accrued', base: 0, delta: revenueAccrued, value: revenueAccrued, isTotal: true, isNegative: false });

  return data;
};
