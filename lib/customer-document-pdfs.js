const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const templateDirectory = path.join(__dirname, '..', 'public');

function cleanText(value) {
  return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
}

function drawAt(page, text, font, options) {
  const { width, height } = page.getSize();
  const scaleX = width / options.referenceWidth;
  const scaleY = height / options.referenceHeight;
  const value = cleanText(text);
  if (!value) return;
  const maxWidth = (options.maxWidth || options.referenceWidth - options.x) * scaleX;
  let fontSize = options.fontSize * scaleY;
  while (font.widthOfTextAtSize(value, fontSize) > maxWidth && fontSize > 5) fontSize -= 0.25;
  const textWidth = font.widthOfTextAtSize(value, fontSize);
  let x = options.x * scaleX;
  if (options.align === 'center') x += (maxWidth - textWidth) / 2;
  if (options.align === 'right') x += maxWidth - textWidth;
  page.drawText(value, {
    x,
    y: height - options.y * scaleY,
    size: fontSize,
    font,
    color: options.color || rgb(0.08, 0.08, 0.08),
  });
}

function coverAt(page, options) {
  const { width, height } = page.getSize();
  const scaleX = width / options.referenceWidth;
  const scaleY = height / options.referenceHeight;
  page.drawRectangle({
    x: options.x * scaleX,
    y: height - (options.y + options.height) * scaleY,
    width: options.width * scaleX,
    height: options.height * scaleY,
    color: rgb(1, 1, 1),
  });
}

function formatDate(value, separator = '.') {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
    .map((part, index) => index === 2 ? String(part) : String(part).padStart(2, '0'))
    .join(separator);
}

function customerAddress(customer) {
  return [customer.address, [customer.city, customer.state, customer.zip].filter(Boolean).join(', ')].filter(Boolean);
}

async function loadTemplate(fileName) {
  const bytes = fs.readFileSync(path.join(templateDirectory, fileName));
  return PDFDocument.load(bytes);
}

async function renderAgreement(customer, contract, settings = {}, lead = null, assignment = null) {
  const pdf = await loadTemplate('agrement.pdf');
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const base = { referenceWidth: 595, referenceHeight: 842 };
  const today = formatDate(new Date().toISOString());
  const from = contract?.start_date || customer.contract_start_date;
  const to = contract?.end_date || customer.contract_end_date;
  const companyName = customer.company_name || customer.name;
  const service = contract?.service_type || customer.service_type || customer.treatment_method || lead?.pest_type || '';
  const rate = Number(contract?.value) > 0 ? Number(contract.value) : Number(customer.service_rate) || 0;
  const billingAmount = Number(contract?.billing_amount) || Number(customer.service_rate) || 0;
  const taxRate = Number(contract?.tax_rate ?? settings.tax_rate) || 0;
  const taxAmount = rate > 0 && taxRate > 0 ? Number((rate * taxRate / 100).toFixed(2)) : 0;
  const totalAmount = rate + taxAmount;
  const advance = Number(customer.advance_amount) || 0;
  const address = customerAddress(customer).join(', ');
  const subscriber = customer.company_name || customer.name;
  const months = contractDurationMonths(from, to);
  const contractDate = formatDate(contract?.created_at);
  const workOrderDate = formatDate(assignment?.scheduled_date || contract?.start_date);
  const contactDate = formatCompactDate(lead?.created_at || customer.created_at);
  const contactTime = customer.service_time || assignment?.scheduled_time;
  const enquiry = lead?.source || '';
  const billingCycle = String(contract?.billing_cycle || customer.service_frequency || '').toLowerCase();
  const isMonthly = /monthly|month/.test(billingCycle);
  const isOneTime = /one[\s-]?time/.test(billingCycle);
  const hasAdvance = customer.advance_amount !== null && customer.advance_amount !== undefined && String(customer.advance_amount).trim() !== '';

  drawAgreementField(page, contract?.contract_number, bold, { ...base, x: 145, y: 174, maxWidth: 238 });
  drawAgreementField(page, contractDate, font, { ...base, x: 426, y: 174, maxWidth: 100 });
  drawAgreementField(page, assignment?.assignment_number, bold, { ...base, x: 145, y: 194, maxWidth: 238 });
  drawAgreementField(page, workOrderDate, font, { ...base, x: 426, y: 194, maxWidth: 100 });
  drawAgreementField(page, customer.phone, font, { ...base, x: 206, y: 213, maxWidth: 110 });
  drawAgreementField(page, contactTime, font, { ...base, x: 326, y: 213, maxWidth: 60 });
  drawAgreementField(page, contactDate, font, { ...base, x: 421, y: 213, maxWidth: 32, fontSize: 8, minFontSize: 7 });
  drawAgreementField(page, enquiry, font, { ...base, x: 496, y: 213, maxWidth: 32, fontSize: 8, minFontSize: 7 });
  drawAgreementField(page, customer.contact_person || customer.name, font, { ...base, x: 145, y: 303, maxWidth: 383 });
  drawAgreementField(page, companyName, font, { ...base, x: 138, y: 323, maxWidth: 246 });
  drawAgreementField(page, customer.gstin, font, { ...base, x: 391, y: 323, maxWidth: 137 });
  drawAgreementField(page, address, font, { ...base, x: 102, y: 343, maxWidth: 426, maxLines: 3, lineHeight: 10 });

  drawAgreementField(page, today, font, { ...base, x: 160, y: 395, maxWidth: 52 });
  drawAgreementField(page, subscriber, font, { ...base, x: 128, y: 414, maxWidth: 275 });
  drawAgreementField(page, address, font, { ...base, x: 103, y: 432, maxWidth: 235, maxLines: 2, lineHeight: 10 });

  drawAgreementField(page, service, font, { ...base, x: 178, y: 497, maxWidth: 350 });
  drawAgreementField(page, customer.property_size, font, { ...base, x: 222, y: 515, maxWidth: 306 });
  drawAgreementField(page, contract?.frequency || customer.service_frequency, font, { ...base, x: 192, y: 534, maxWidth: 336 });
  drawAgreementField(page, taxRate > 0 ? `${taxRate}%` : '', font, { ...base, x: 160, y: 549, maxWidth: 112 });
  drawAgreementField(page, taxAmount > 0 ? taxAmount.toFixed(2) : '', font, { ...base, x: 300, y: 549, maxWidth: 228 });
  drawAgreementField(page, rate > 0 ? rate.toFixed(2) : '', font, { ...base, x: 289, y: 568, maxWidth: 76 });

  drawAgreementField(page, isMonthly && billingAmount > 0 ? billingAmount.toFixed(2) : '', font, { ...base, x: 400.5, y: 568, maxWidth: 34.5, fontSize: 7.5, minFontSize: 7.5, align: 'center' });
  drawAgreementField(page, isOneTime && (billingAmount || rate) > 0 ? (billingAmount || rate).toFixed(2) : '', font, { ...base, x: 474, y: 568, maxWidth: 50, align: 'right' });
  drawAgreementField(page, months ? `${months} months` : '', font, { ...base, x: 376, y: 584, maxWidth: 42 });
  drawAgreementField(page, totalAmount > 0 ? amountInWords(totalAmount) : '', font, { ...base, x: 103, y: 599, maxWidth: 425, fontSize: 8 });

  drawAgreementField(page, formatDate(from), font, { ...base, x: 202, y: 618, maxWidth: 83 });
  drawAgreementField(page, formatDate(to), font, { ...base, x: 312, y: 618, maxWidth: 66 });
  drawAgreementField(page, months ? `${months} months` : '', font, { ...base, x: 478, y: 618, maxWidth: 50 });
  drawAgreementField(page, [customer.service_day, customer.service_time].filter(Boolean).join(' / '), font, { ...base, x: 194, y: 633, maxWidth: 334 });
  drawAgreementField(page, customer.payment_method || customer.payment_terms, font, { ...base, x: 257, y: 646, maxWidth: 271 });
  drawAgreementField(page, hasAdvance ? advance.toFixed(2) : '', font, { ...base, x: 300, y: 662, maxWidth: 118 });
  drawAgreementField(page, totalAmount > 0 ? (totalAmount - advance).toFixed(2) : '', font, { ...base, x: 440, y: 662, maxWidth: 88 });
  drawAgreementField(page, today, font, { ...base, x: 82, y: 761, maxWidth: 150 });
  return pdf.save();
}

function contractDurationMonths(from, to) {
  if (!from || !to) return 0;
  const start = new Date(`${String(from).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(to).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + (end.getDate() >= start.getDate() ? 1 : 0));
}

function formatCompactDate(value) {
  const formatted = formatDate(value);
  return formatted ? `${formatted.slice(0, 6)}${formatted.slice(-2)}` : '';
}

function drawAgreementField(page, text, font, options) {
  const value = cleanText(text);
  if (!value) return;
  const maxLines = options.maxLines || 1;
  const minFontSize = options.minFontSize || 7;
  let fontSize = options.fontSize || 8.5;
  let lines = wrapText(value, font, fontSize, options.maxWidth);
  while (lines.length > maxLines && fontSize > minFontSize) {
    fontSize = Math.max(minFontSize, fontSize - 0.25);
    lines = wrapText(value, font, fontSize, options.maxWidth);
  }
  if (lines.length > maxLines) return;
  lines.forEach((line, index) => drawAt(page, line, font, {
    ...options,
    y: options.y + index * (options.lineHeight || 11),
    fontSize,
  }));
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = cleanText(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

async function renderCertificate(customer, certificate, lead = null) {
  const pdf = await loadTemplate('certificate-blank1.pdf');
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const base = { referenceWidth: 792, referenceHeight: 612 };
  const fieldFontSize = 9.5;
  const name = customer.company_name || customer.name;
  const from = certificate.valid_from || customer.contract_start_date;
  const to = certificate.valid_until || customer.contract_end_date;
  const period = [from, to].filter(Boolean).map(date => formatDate(date)).join('-') || formatContactPeriod(certificate.contact_period);
  const pinCode = customer.zip || lead?.pin_code || certificate.pincode || '';
  const value = (field, fallback = '') => customer[field] || lead?.[field] || fallback || '';

  drawCertificateField(page, certificate.ref_number || certificate.certificate_number, font, { ...base, x: 103, y: 204, maxWidth: 76.5, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, name, font, { ...base, x: 260, y: 320, maxWidth: 275, fontSize: fieldFontSize, minFontSize: fieldFontSize, align: 'center' });
  drawCertificateField(page, period, font, { ...base, x: 393, y: 367, maxWidth: 130, fontSize: fieldFontSize, minFontSize: fieldFontSize });

  drawCertificateField(page, value('village'), font, { ...base, x: 203, y: 381, maxWidth: 132, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, value('para'), font, { ...base, x: 367, y: 381, maxWidth: 133, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, value('police_station'), font, { ...base, x: 581, y: 381, maxWidth: 54, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, value('post_office'), font, { ...base, x: 298, y: 393, maxWidth: 49, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, value('mouza'), font, { ...base, x: 396, y: 393, maxWidth: 19, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, value('dag'), font, { ...base, x: 446, y: 393, maxWidth: 19, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, pinCode, font, { ...base, x: 514.5, y: 393, maxWidth: 44, fontSize: fieldFontSize, minFontSize: fieldFontSize });

  drawCertificateField(page, name, font, { ...base, x: 112, y: 440, maxWidth: 164, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, certificate.method || customer.treatment_method, font, { ...base, x: 558, y: 453, maxWidth: 65, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  drawCertificateField(page, certificate.chemicals || customer.chemicals_used, font, { ...base, x: 269, y: 468, maxWidth: 342, fontSize: fieldFontSize, minFontSize: fieldFontSize });
  return pdf.save();
}

function formatContactPeriod(value) {
  const period = cleanText(value);
  if (!period) return '';
  return period
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, year, month, day) => `${day}.${month}.${year}`)
    .replace(/\s*-\s*/g, '-');
}

function drawCertificateField(page, text, font, options) {
  const value = cleanText(text);
  if (!value) return;
  const maxWidth = options.maxWidth;
  let fontSize = options.fontSize;
  while (font.widthOfTextAtSize(value, fontSize) > maxWidth && fontSize > options.minFontSize) {
    fontSize = Math.max(options.minFontSize, fontSize - 0.25);
  }
  if (font.widthOfTextAtSize(value, fontSize) > maxWidth) return;
  drawAt(page, value, font, { ...options, fontSize });
}

const smallNumbers = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tensWords = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(value) {
  if (value < 20) return smallNumbers[value];
  return `${tensWords[Math.floor(value / 10)]}${value % 10 ? ` ${smallNumbers[value % 10]}` : ''}`;
}

function amountInWords(amount) {
  let value = Math.round(Number(amount) || 0);
  if (!value) return 'Zero Only';
  const groups = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']];
  const words = [];
  groups.forEach(([size, label]) => {
    if (value >= size) {
      const group = Math.floor(value / size);
      words.push(`${group < 100 ? twoDigits(group) : smallNumbers[Math.floor(group / 100)] + ' Hundred ' + twoDigits(group % 100)} ${label}`.trim());
      value %= size;
    }
  });
  if (value) words.push(twoDigits(value));
  return `${words.join(' ')} Only`;
}

async function renderGstInvoice(customer, invoice, settings) {
  const pdf = await loadTemplate('g.p.c gst bill - blank.pdf');
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const base = { referenceWidth: 768, referenceHeight: 1024 };
  const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items || '[]') : (invoice.items || []);
  const item = items[0] || {};
  const subtotal = Number(invoice.subtotal) || 0;
  const taxRate = Number(invoice.tax_rate ?? settings.tax_rate ?? 18);
  const tax = Number(invoice.tax_amount ?? (subtotal * taxRate / 100));
  const total = Number(invoice.total ?? (subtotal + tax));
  const address = customerAddress(customer);
  const contact = customer.contact_person || customer.name;
  const period = invoice.service_period || [customer.contract_start_date, customer.contract_end_date].filter(Boolean).map(date => formatDate(date)).join('-');
  const words = amountInWords(total);
  const date = formatDate(invoice.created_at || new Date().toISOString(), '-');
  const serviceName = item.name || customer.service_type || customer.pest_type || 'General Pest Control Service';
  const lineItems = items.length ? items : [{ name: serviceName, qty: invoice.service_count || 1, rate: invoice.per_service_rate || subtotal }];
  const gstType = invoice.gst_type || 'intra';
  const sgst = Number(invoice.sgst ?? (gstType === 'inter' ? 0 : tax / 2));
  const cgst = Number(invoice.cgst ?? (gstType === 'inter' ? 0 : tax / 2));
  const igst = Number(invoice.igst ?? (gstType === 'inter' ? tax : 0));

  coverAt(page, { ...base, x: 115, y: 224, width: 300, height: 20 });
  drawAt(page, `M/s. ${customer.company_name || customer.name}`, bold, { ...base, x: 115, y: 234, maxWidth: 300, fontSize: 10 });
  drawAt(page, customerAddress(customer)[0] || '', font, { ...base, x: 30, y: 263, maxWidth: 380, fontSize: 8 });
  drawAt(page, address[1] || '', font, { ...base, x: 30, y: 276, maxWidth: 380, fontSize: 8 });
  drawAt(page, customer.phone ? `Mobile No- ${customer.phone}` : '', font, { ...base, x: 30, y: 289, maxWidth: 380, fontSize: 8 });
  drawAt(page, `Contact Person-${contact}`, font, { ...base, x: 30, y: 302, maxWidth: 380, fontSize: 8 });
  drawAt(page, customer.email ? `Email-${customer.email}` : '', font, { ...base, x: 30, y: 315, maxWidth: 380, fontSize: 8 });
  drawAt(page, customer.gstin ? `Gstin-${customer.gstin}` : '', bold, { ...base, x: 30, y: 328, maxWidth: 380, fontSize: 8 });
  drawAt(page, invoice.invoice_number, bold, { ...base, x: 620, y: 240, maxWidth: 110, fontSize: 9 });
  drawAt(page, invoice.booking_id || `C-${customer.id}`, font, { ...base, x: 620, y: 263, maxWidth: 110, fontSize: 8 });
  drawAt(page, date, font, { ...base, x: 622, y: 338, maxWidth: 110, fontSize: 8 });
  drawAt(page, period ? `Contact Period - ${period}` : '', font, { ...base, x: 94, y: 360, maxWidth: 500, fontSize: 8 });

  lineItems.slice(0, 6).forEach((line, index) => {
    const quantity = Number(line.qty ?? line.quantity ?? 1);
    const rate = Number(line.rate ?? line.price ?? subtotal);
    const lineTotal = Number(line.amount ?? rate * quantity);
    const rowY = 448 + index * 22;
    drawAt(page, line.name || line.description || serviceName, font, { ...base, x: 30, y: rowY, maxWidth: 225, fontSize: 8 });
    drawAt(page, rate.toFixed(2), font, { ...base, x: 260, y: rowY, maxWidth: 85, fontSize: 8, align: 'right' });
    drawAt(page, String(quantity), font, { ...base, x: 354, y: rowY, maxWidth: 48, fontSize: 8, align: 'center' });
    drawAt(page, lineTotal.toFixed(2), font, { ...base, x: 420, y: rowY, maxWidth: 120, fontSize: 8, align: 'right' });
    drawAt(page, taxRate > 0 ? 'Yes' : 'No', font, { ...base, x: 548, y: rowY, maxWidth: 62, fontSize: 8, align: 'center' });
    drawAt(page, lineTotal.toFixed(2), font, { ...base, x: 615, y: rowY, maxWidth: 120, fontSize: 8, align: 'right' });
  });

  drawAt(page, sgst.toFixed(2), font, { ...base, x: 617, y: 592, maxWidth: 115, fontSize: 8, align: 'right' });
  drawAt(page, cgst.toFixed(2), font, { ...base, x: 617, y: 620, maxWidth: 115, fontSize: 8, align: 'right' });
  drawAt(page, igst.toFixed(2), font, { ...base, x: 617, y: 644, maxWidth: 115, fontSize: 8, align: 'right' });
  drawAt(page, words, font, { ...base, x: 140, y: 670, maxWidth: 465, fontSize: 8 });
  drawAt(page, total.toFixed(2), bold, { ...base, x: 617, y: 670, maxWidth: 115, fontSize: 9, align: 'right' });

  return pdf.save();
}

async function renderQuotation(customer, quotation = null, settings = {}) {
  const pdf = await loadTemplate('GPC_quotation-blank.pdf');
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const base = { referenceWidth: 612, referenceHeight: 792 };
  const dateValue = quotation?.created_at || new Date().toISOString();
  const today = formatDate(dateValue, '.');
  const quoteNumber = quotation?.quote_number || customer.reference_no || `AP${today.replace(/\./g, '/')}`;
  const customerName = customer.company_name || customer.name || 'Customer';
  const customerContact = quotation?.contact_person || customer.contact_person || customer.name || '';
  const customerCity = [customer.city, customer.state, customer.zip].filter(Boolean).join(', ');
  const companyAddress = settings.company_address || 'Office add-Lane-8, Promodgarh, Gouranganagar,New Town, Kol-700162';
  const companyPhone = settings.company_phone || '8609387288';
  const companyEmail = settings.company_email2 || settings.company_email || 'rdinfotech2016@gmail.com';
  const companyGST = settings.company_gstin || '19AARCA9483H1ZV';
  const companyPAN = settings.company_pan || 'AARCA9483H';
  const companyTAN = settings.company_tan || 'CALA24665E';
  const companyContact = settings.company_contact_person || 'Rajesh Das';

  let items = quotation?.items || [];
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!items.length) {
    items = [{
      name: customer.service_type || customer.pest_type || quotation?.title || 'General Pest Control Service',
      description: customer.chemicals_used || '',
      qty: Number(customer.service_count) || 1,
      rate: Number(customer.service_rate ?? quotation?.subtotal) || 0,
    }];
  }
  const lines = items.map((item) => {
    const quantity = Number(item.qty ?? item.quantity) || 1;
    const rate = Number(item.rate ?? item.price) || 0;
    return { item, quantity, rate, amount: Number(item.amount) || rate * quantity };
  });
  const subtotal = Number(quotation?.subtotal) || lines.reduce((sum, line) => sum + line.amount, 0);
  const amount = Math.max(0, subtotal - (Number(quotation?.discount) || 0));
  const serviceFrequency = customer.service_frequency || 'One year';
  const serviceMethod = customer.treatment_method || 'Spray';

  const drawLines = (text, x, y, width, maxLines, textFont = font, size = 8.3, lineHeight = 13.4) => {
    const wrapped = wrapText(text, textFont, size, width).slice(0, maxLines);
    wrapped.forEach((line, index) => drawAt(page, line, textFont, { ...base, x, y: y + index * lineHeight, maxWidth: width, fontSize: size }));
  };

  coverAt(page, { ...base, x: 119, y: 155, width: 101, height: 13 });
  coverAt(page, { ...base, x: 475, y: 155, width: 73, height: 13 });
  drawAt(page, quoteNumber, bold, { ...base, x: 120, y: 167, maxWidth: 95, fontSize: 8.3 });
  drawAt(page, today, bold, { ...base, x: 476, y: 167, maxWidth: 68, fontSize: 8.3 });

  drawAt(page, 'To,', font, { ...base, x: 79.6, y: 184.8, maxWidth: 220, fontSize: 8.3 });
  drawLines(customerName, 79.6, 198.3, 220, 1, bold);
  drawLines(customer.address || '', 79.6, 211.7, 220, 1);
  drawLines(customerCity, 79.6, 225.1, 220, 1);
  drawLines(customerContact ? `Contact Person-${customerContact}` : '', 79.6, 251.9, 220, 1);
  drawLines(customer.phone ? `Mobile No- ${customer.phone}` : '', 79.6, 265.4, 220, 1);
  drawLines(customer.email ? `Email-${customer.email}` : '', 79.6, 278.8, 220, 1);
  drawLines(customer.gstin ? `GSTIN-${customer.gstin}` : '', 79.6, 292.3, 220, 1);

  drawAt(page, 'From,', font, { ...base, x: 337, y: 184.8, maxWidth: 195, fontSize: 8.3 });
  [
    { text: settings.company_name || 'Adhunik pest control pvt.ltd', y: 198.3, bold: true },
    { text: companyAddress, y: 211.7 },
    { text: `GSTN - ${companyGST}`, y: 238.5 },
    { text: `Pan No-${companyPAN}`, y: 251.9 },
    { text: `TAN - ${companyTAN}`, y: 265.4 },
    { text: `Contact Person-${companyContact}`, y: 278.8 },
    { text: `Mobile No-${companyPhone}`, y: 292.3 },
    { text: `e-mail id - ${companyEmail}`, y: 305.7 },
  ].forEach((line) => drawLines(line.text, 337, line.y, 195, 2, line.bold ? bold : font));

  lines.slice(0, 2).forEach(({ item, quantity, rate, amount: lineAmount }, index) => {
    const y = index === 0 ? 366.4 : 450.3;
    const name = item.name || item.description || customer.service_type || 'Pest Control Service';
    drawLines(name, 77.7, y, 108, 5, font, 8.3, 13.4);
    drawLines(`${serviceFrequency}${quantity > 1 ? ` x ${quantity}` : ''}`, 190.8, y, 57, 5, font, 8.3, 13.4);
    drawLines(item.method || serviceMethod, 252.2, y, 51, 5, font, 8.3, 13.4);
    drawLines(item.chemicals || item.description || customer.chemicals_used || '', 308, y, 157, 5, font, 8.3, 13.4);
    drawAt(page, rate.toFixed(2), font, { ...base, x: 469.4, y: y - 2.5, maxWidth: 40, fontSize: 8.3, align: 'right' });
    drawAt(page, lineAmount.toFixed(2), font, { ...base, x: 519, y, maxWidth: 37, fontSize: 8.3, align: 'right' });
  });

  [535.3, 579.2].forEach((y) => {
    coverAt(page, { ...base, x: 221, y: y - 10, width: 38, height: 14 });
    drawAt(page, `${amount.toFixed(2)}/-`, bold, { ...base, x: 223.7, y, maxWidth: 42, fontSize: 8.3 });
  });

  return pdf.save();
}

async function saveGeneratedPdf(bytes, fileName) {
  const directory = path.join(__dirname, '..', 'storage', 'customer-documents');
  await fs.promises.mkdir(directory, { recursive: true });
  await fs.promises.writeFile(path.join(directory, fileName), bytes);
  return path.join('storage', 'customer-documents', fileName);
}

module.exports = { renderAgreement, renderCertificate, renderGstInvoice, renderQuotation, saveGeneratedPdf };