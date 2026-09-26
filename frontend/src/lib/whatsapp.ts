/** Normalize phone to WhatsApp international format (digits only, with country code). */
export function normalizeWhatsAppNumber(phone: string, defaultCountry = '92'): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Pakistan local: 03XXXXXXXXX → 923XXXXXXXXX
  if (digits.startsWith('0') && digits.length === 11) {
    digits = defaultCountry + digits.slice(1);
  }
  // Already has country code without +
  if (digits.length === 10 && defaultCountry === '92') {
    digits = defaultCountry + digits;
  }
  return digits;
}

export function buildOverdueWhatsAppUrl(opts: {
  phone: string;
  customerName: string;
  accountNumber: string;
  dueAmount: number;
  dueDate: string | Date;
  businessName?: string;
  currency?: string;
}): string {
  const currency = opts.currency || 'PKR';
  const dateStr =
    typeof opts.dueDate === 'string'
      ? new Date(opts.dueDate).toLocaleDateString('en-GB')
      : opts.dueDate.toLocaleDateString('en-GB');
  const amount = Number(opts.dueAmount).toLocaleString('en-PK');
  const biz = opts.businessName || 'our store';

  const message = [
    `Assalam o Alaikum ${opts.customerName},`,
    ``,
    `This is a reminder from ${biz}.`,
    ``,
    `Account: ${opts.accountNumber}`,
    `Overdue installment: ${currency} ${amount}`,
    `Due date: ${dateStr}`,
    ``,
    `Please clear your pending payment at your earliest convenience.`,
    `JazakAllah.`,
  ].join('\n');

  const number = normalizeWhatsAppNumber(opts.phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
