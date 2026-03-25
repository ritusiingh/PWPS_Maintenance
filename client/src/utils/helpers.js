export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '\u20b90';
  return '\u20b9' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatINRDecimal(amount) {
  if (amount == null || isNaN(amount)) return '\u20b90.00';
  return '\u20b9' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export const CURRENT_MONTH = MONTHS[new Date().getMonth()];
export const CURRENT_YEAR = new Date().getFullYear();

export const PAYMENT_MODES = [
  { value: 'upi', label: 'UPI' },
  { value: 'neft', label: 'NEFT/IMPS' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_CATEGORIES = [
  'Security','Housekeeping','Electricity','Lift Maintenance','Garden','Water',
  'Swimming Pool','Clubhouse','Repairs','Insurance','Legal','Administrative','Other'
];
