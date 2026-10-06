// ===== PRINT TEMPLATES FOR PEST CONTROL CRM =====
// Matches real Adhunik Pest Control bill formats

// Helper: Convert number to Indian words
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const scales = ['','Thousand','Lakh','Crore'];
  
  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
  }
  function threeDigits(n) {
    if (n >= 100) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and ' + twoDigits(n%100) : '');
    return twoDigits(n);
  }
  
  let result = '';
  let n = Math.floor(num);
  if (n >= 10000000) { result += threeDigits(Math.floor(n/10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000) { result += twoDigits(Math.floor(n/100000)) + ' Lakh '; n %= 100000; }
  if (n >= 1000) { result += twoDigits(Math.floor(n/1000)) + ' Thousand '; n %= 1000; }
  if (n > 0) result += threeDigits(n);
  
  // Handle paise
  const paise = Math.round((num - Math.floor(num)) * 100);
  let words = result.trim();
  if (paise > 0) words += ' and ' + twoDigits(paise) + ' Paise';
  return words + ' Only';
}

// Helper: Format date as DD-MM-YY
function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getFullYear()).slice(-2)}`;
}

// Helper: Format date as DD.MM.YYYY
function fmtDateDot(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

// ===== COMPANY HEADER =====
function companyHeader(s) {
  return `
    <div style="text-align:center;margin-bottom:8px;">
      <img src="/logo.jpg" alt="${s.company_name || ''}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin-bottom:6px;">
      <div style="font-size:11px;">Mob-${s.company_phone?.replace('+91 ','') || ''}, ${s.company_phone2?.replace('+91 ','') || ''}</div>
      <div style="font-size:18px;font-weight:bold;letter-spacing:1px;margin:4px 0;">${s.company_name || ''}</div>
      <div style="font-size:10px;">${s.company_address || ''}</div>
      <div style="font-size:10px;">
        CIN: ${s.company_cin || ''}, TAN: ${s.company_tan || ''}, MSME: ${s.company_msme || ''}
      </div>
      <div style="font-size:10px;">
        ISO-9001:2015 NO-${s.company_iso || ''} | ${s.company_website || ''}
      </div>
      <div style="font-size:10px;">
        Email: ${s.company_email2 || ''}, ${s.company_email || ''}
      </div>
      <div style="font-size:10px;">
        MSMEUAM NO-${s.company_msme || ''}, License No-${s.company_license || ''}
      </div>
    </div>`;
}

// ===== BANK DETAILS =====
function bankDetails(s) {
  return `
    <div style="margin-top:12px;border-top:1px solid #ccc;padding-top:8px;">
      <div style="font-weight:bold;font-size:11px;">Company's Bank Details</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <div style="font-size:10px;">
          <div>${s.company_name || ''}</div>
          <div>Bank Name: ${s.company_bank_name || ''}</div>
          <div>A/C No: ${s.company_bank_account || ''}</div>
          <div>IFSC Code: ${s.company_bank_ifsc || ''}</div>
          <div>Branch: ${s.company_bank_branch || ''}</div>
        </div>
        <div style="font-size:10px;text-align:right;">
          <div>GooglePay / PhonePay / Paytm</div>
          <div style="font-size:14px;font-weight:bold;">${s.company_upi || ''}</div>
        </div>
      </div>
    </div>`;
}

// ===== SIGNATURE SECTION =====
function signatureSection() {
  return `
    <div style="display:flex;justify-content:space-between;margin-top:30px;padding-top:10px;">
      <div style="font-size:10px;">
        <div style="font-weight:bold;">${document.querySelector('#companyNameHeader')?.textContent || 'ADHUNIK PEST CONTROL PVT.LTD'}</div>
        <div style="margin-top:4px;">Customer Acceptance / Approval for Bill</div>
        <div style="margin-top:20px;">Approve by: ________________</div>
        <div style="margin-top:4px;">Contact No: ________________</div>
        <div style="margin-top:4px;">Employee Signature: ________________</div>
      </div>
      <div style="text-align:center;margin-top:20px;">
        <div style="font-weight:bold;">Thanking You</div>
        <div style="margin-top:30px;border-top:1px solid #333;padding-top:4px;font-size:10px;">
          Authorised Signatory
        </div>
      </div>
    </div>`;
}

// =========================================================
// 1. NON-GST INVOICE (Termite / One-time Service Bill)
// =========================================================
window.printNonGstInvoice = function(inv, customer, settings) {
  const s = settings;
  const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
  const win = window.open('', '_blank', 'width=800,height=1000');
  
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${inv.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding:15px; font-size:11px; color:#222; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #555; padding:5px 8px; font-size:10px; }
    th { background:#f0f0f0; text-align:left; }
    .right { text-align:right; } .center { text-align:center; }
    .header-line { border-top:2px solid #333; border-bottom:2px solid #333; padding:2px 0; text-align:center; font-size:10px; margin:6px 0; }
    .bill-to { margin:8px 0; font-size:10px; }
    .net-payable { font-weight:bold; font-size:11px; margin-top:8px; padding:6px; background:#f9f9f9; border:1px solid #ddd; }
    @media print { body { padding:0; } .no-print { display:none; } }
  </style></head><body>
    <div id="companyNameHeader" style="display:none">${s.company_name || ''}</div>
    ${companyHeader(s)}
    
    <div class="header-line"><b>Invoice / Bill</b></div>
    
    <div style="display:flex;justify-content:space-between;">
      <div class="bill-to">
        <div><b>To:</b> ${customer.name}</div>
        <div>${customer.address || ''}</div>
        ${customer.city ? `<div>${customer.city}${customer.state ? ', '+customer.state : ''}${customer.zip ? '-'+customer.zip : ''}</div>` : ''}
        <div>Contact person: ${inv.contact_person || customer.contact_person || customer.name}</div>
        <div>Mobile no: ${customer.phone || ''}</div>
      </div>
      <div style="text-align:right;font-size:10px;">
        <div><b>Bill No:</b> ${inv.invoice_number}</div>
        ${inv.booking_id ? `<div>Booking ID: ${inv.booking_id}</div>` : ''}
        <div>Bill Date: ${fmtDateShort(inv.created_at)}</div>
        ${inv.warranty_from && inv.warranty_to ? `<div>Warranty Period: ${fmtDateDot(inv.warranty_from)} to ${fmtDateDot(inv.warranty_to)}</div>` : ''}
        ${inv.service_period ? `<div>Contact Period: ${inv.service_period}</div>` : ''}
      </div>
    </div>
    
    <div style="margin:8px 0;font-size:10px;font-style:italic;">
      We thank you for your valuable enquiry and have pleasure in submitting our offer as below:
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width:35%">Service/Items Details</th>
          <th class="right">Basic Price</th>
          <th class="center">Qty</th>
          <th class="right">Total Basic Price</th>
          <th class="center">GST Value @18%</th>
          <th class="right">Total Value</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.name || item.description || ''}</td>
            <td class="right">${Number(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="center">${item.qty || 1}</td>
            <td class="right">${Number((item.rate || 0) * (item.qty || 1)).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="center">${inv.gst_type === 'none' ? 'NO' : 'Yes'}</td>
            <td class="right">${Number((item.rate || 0) * (item.qty || 1)).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          </tr>
        `).join('')}
        <tr><td colspan="3"></td><td colspan="3" style="border:none;"></td></tr>
      </tbody>
    </table>
    
    <table style="margin-top:4px;">
      <tr>
        <td style="width:50%;border:none;"></td>
        <td class="right" style="width:25%;border:none;font-size:10px;"><b>Total</b></td>
        <td class="right" style="width:25%;border:none;font-size:10px;"><b>${Number(inv.subtotal || inv.total).toLocaleString('en-IN', {minimumFractionDigits:2})}</b></td>
      </tr>
      ${inv.gst_type !== 'none' ? `
      <tr>
        <td style="border:none;"></td>
        <td class="right" style="border:none;font-size:10px;">Service charge(10%)</td>
        <td class="right" style="border:none;font-size:10px;">-</td>
      </tr>
      <tr>
        <td style="border:none;"></td>
        <td class="right" style="border:none;font-size:10px;">GST (18%)</td>
        <td class="right" style="border:none;font-size:10px;">${Number(inv.tax_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>` : ''}
    </table>
    
    <div class="net-payable">
      Net Payable: ${inv.amount_in_words || numberToWords(inv.subtotal || inv.total)} 
      <span style="float:right;">${Number(inv.subtotal || inv.total).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
    </div>
    
    ${bankDetails(s)}
    ${signatureSection()}
    
    ${inv.terms_conditions ? `
    <div style="margin-top:20px;page-break-before:always;">
      <div style="font-weight:bold;font-size:12px;margin-bottom:8px;">TERMS & CONDITIONS</div>
      <div style="font-size:10px;white-space:pre-wrap;">${inv.terms_conditions}</div>
    </div>` : ''}
    
    <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#1a73e8;color:#fff;border:none;border-radius:4px;">Print Invoice</button>
      <button onclick="window.close()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#666;color:#fff;border:none;border-radius:4px;margin-left:10px;">Close</button>
    </div>
  </body></html>`);
};

// =========================================================
// 2. GST TAX INVOICE (With SGST/CGST breakdown)
// =========================================================
window.printGstInvoice = function(inv, customer, settings) {
  const s = settings;
  const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
  const win = window.open('', '_blank', 'width=800,height=1000');
  const subtotal = inv.subtotal || 0;
  const sgstRate = 9;
  const cgstRate = 9;
  const sgstAmt = inv.sgst || (subtotal * sgstRate / 100);
  const cgstAmt = inv.cgst || (subtotal * cgstRate / 100);
  const totalGst = sgstAmt + cgstAmt;
  const grandTotal = inv.total || (subtotal + totalGst);
  
  win.document.write(`<!DOCTYPE html><html><head><title>Tax Invoice - ${inv.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding:15px; font-size:11px; color:#222; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #555; padding:5px 8px; font-size:10px; }
    th { background:#e8e8e8; text-align:left; font-weight:bold; }
    .right { text-align:right; } .center { text-align:center; }
    .header-line { border-top:2px solid #333; border-bottom:2px solid #333; padding:4px 0; text-align:center; font-size:14px; font-weight:bold; margin:8px 0; }
    @media print { body { padding:0; } .no-print { display:none; } }
  </style></head><body>
    ${companyHeader(s)}
    
    <div class="header-line">Tax - Invoice</div>
    
    <div style="display:flex;justify-content:space-between;">
      <div style="font-size:10px;">
        <div><b>Bill No:</b> ${inv.invoice_number}</div>
        <div><b>Date:</b> ${fmtDateDot(inv.created_at)}</div>
      </div>
    </div>
    
    <div style="margin:10px 0;border:1px solid #555;padding:8px;font-size:10px;">
      <div><b>To,</b></div>
      <div style="font-weight:bold;margin:4px 0;">${customer.name}</div>
      <div>${customer.address || ''}</div>
      ${customer.city ? `<div>${customer.city} - ${customer.zip || ''}</div>` : ''}
      <div>Contact Person: ${inv.contact_person || customer.contact_person || customer.name}</div>
      <div>Contact No: ${customer.phone || ''}</div>
      ${customer.email ? `<div>Email: ${customer.email}</div>` : ''}
      ${customer.gstin ? `<div><b>GSTN: ${customer.gstin}</b></div>` : ''}
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width:5%">S.No</th>
          <th style="width:35%">Type of Service</th>
          <th class="center">Service Count</th>
          <th class="right">Per Service (Rs.)</th>
          <th class="right">Amount (Rs.)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => `
          <tr>
            <td class="center">${idx + 1}.</td>
            <td>
              ${item.name || ''}<br>
              ${item.description || ''}
              ${inv.service_period ? `<br><i>${inv.service_period}</i>` : ''}
            </td>
            <td class="center">${inv.service_count || item.qty || 1}</td>
            <td class="right">${Number(item.rate || inv.per_service_rate || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="right">${Number((item.rate || 0) * (item.qty || 1)).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <table style="margin-top:8px;">
      <tr>
        <td style="width:50%;border:none;vertical-align:top;">
          <div style="font-size:10px;">
            <div><b>GSTIN: ${s.company_gstin || ''}</b></div>
            <div>SAC Code: ${inv.sac_code || s.sac_code || '998531'}</div>
          </div>
        </td>
        <td style="border:none;">
          <table style="width:100%;">
            <tr>
              <td class="right" style="border:none;font-size:10px;">9% SGST</td>
              <td class="right" style="border:none;font-size:10px;width:80px;">${Number(sgstAmt).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            </tr>
            <tr>
              <td class="right" style="border:none;font-size:10px;">9% CGST</td>
              <td class="right" style="border:none;font-size:10px;width:80px;">${Number(cgstAmt).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            </tr>
            <tr style="border-top:1px solid #333;">
              <td class="right" style="border:none;font-size:10px;"><b>18% GST (Total)</b></td>
              <td class="right" style="border:none;font-size:10px;width:80px;"><b>${Number(totalGst).toLocaleString('en-IN', {minimumFractionDigits:2})}</b></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <div style="margin-top:10px;border:2px solid #333;padding:8px;display:flex;justify-content:space-between;">
      <div style="font-size:10px;">
        <div>A/c: ${s.company_bank_account || ''}</div>
        <div>Name: ${s.company_name || ''}</div>
        <div>Bank: ${s.company_bank_name || ''}</div>
        <div>Branch: ${s.company_bank_branch || ''}</div>
        <div>IFSC: ${s.company_bank_ifsc || ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:14px;font-weight:bold;">Total Amount</div>
        <div style="font-size:10px;margin:4px 0;">In Words: ${inv.amount_in_words || numberToWords(grandTotal)}</div>
        <div style="font-size:18px;font-weight:bold;border-top:2px solid #333;padding-top:4px;">
          ${Number(grandTotal).toLocaleString('en-IN', {minimumFractionDigits:2})}
        </div>
      </div>
    </div>
    
    <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:10px;">
      <div>
        <div style="border-top:1px solid #333;padding-top:4px;width:200px;text-align:center;">Customer's Signature</div>
        <div style="margin-top:4px;">Date:</div>
      </div>
      <div style="text-align:right;">
        <div style="border-top:1px solid #333;padding-top:4px;width:200px;text-align:center;">Company's Signature</div>
        <div style="margin-top:4px;">Date:</div>
      </div>
    </div>
    
    <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#1a73e8;color:#fff;border:none;border-radius:4px;">Print Invoice</button>
      <button onclick="window.close()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#666;color:#fff;border:none;border-radius:4px;margin-left:10px;">Close</button>
    </div>
  </body></html>`);
};

// =========================================================
// 3. ANNUAL MAINTENANCE INVOICE (with Service Schedule)
// =========================================================
window.printAnnualInvoice = function(inv, customer, settings) {
  const s = settings;
  const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
  const win = window.open('', '_blank', 'width=800,height=1100');
  const serviceCount = inv.service_count || 4;
  
  win.document.write(`<!DOCTYPE html><html><head><title>Annual Invoice - ${inv.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding:15px; font-size:11px; color:#222; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #555; padding:5px 8px; font-size:10px; }
    th { background:#e8e8e8; text-align:left; font-weight:bold; }
    .right { text-align:right; } .center { text-align:center; }
    .header-line { border-top:2px solid #333; border-bottom:2px solid #333; padding:2px 0; text-align:center; font-size:10px; margin:6px 0; }
    .service-log { margin-top:8px; }
    .service-log th { background:#f0f0f0; font-size:9px; }
    .service-log td { min-height:30px; height:35px; }
    @media print { body { padding:0; } .no-print { display:none; } }
  </style></head><body>
    ${companyHeader(s)}
    
    <div class="header-line"><b>Invoice / Bill</b></div>
    
    <div style="display:flex;justify-content:space-between;">
      <div style="font-size:10px;">
        <div><b>To:</b> ${customer.name}</div>
        <div>${customer.address || ''}</div>
        ${customer.city ? `<div>${customer.city}${customer.state ? ', '+customer.state : ''}${customer.zip ? '-'+customer.zip : ''}</div>` : ''}
        <div>Contact Person: ${inv.contact_person || customer.contact_person || customer.name}</div>
        <div>Contact No: ${customer.phone || ''}</div>
      </div>
      <div style="text-align:right;font-size:10px;">
        <div><b>Bill No:</b> ${inv.invoice_number}</div>
        ${inv.booking_id ? `<div>Booking ID: ${inv.booking_id}</div>` : ''}
        <div>Bill Date: ${fmtDateShort(inv.created_at)}</div>
        ${inv.service_period ? `<div>Contact Period: ${inv.service_period}</div>` : ''}
      </div>
    </div>
    
    <div style="margin:8px 0;font-size:10px;">
      <b>- Annual Maintenance Service (${serviceCount} Services) & Bill</b>
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width:40%">Service/Items Details</th>
          <th class="right">Basic Price</th>
          <th class="center">Qty</th>
          <th class="right">Total Basic Price</th>
          <th class="center">GST Value @18%</th>
          <th class="right">Total Value</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td><b>${item.name || ''}</b>${item.description ? '<br>'+item.description : ''}</td>
            <td class="right">${Number(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="center">${item.qty || 1}</td>
            <td class="right">${Number((item.rate || 0) * (item.qty || 1)).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="center">${inv.gst_type === 'none' ? 'No' : 'Yes'}</td>
            <td class="right">${Number((item.rate || 0) * (item.qty || 1)).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          </tr>
        `).join('')}
        <tr><td colspan="3"></td><td colspan="3" style="border:none;"></td></tr>
      </tbody>
    </table>
    
    <div style="text-align:right;margin-top:4px;font-size:10px;">
      <b>Net Payable: ${inv.amount_in_words || numberToWords(inv.subtotal || inv.total)}
      <span style="float:right;">${Number(inv.subtotal || inv.total).toLocaleString('en-IN', {minimumFractionDigits:2})}</span></b>
    </div>
    
    ${bankDetails(s)}
    ${signatureSection()}
    
    <!-- PAGE 2: Service Log -->
    <div style="page-break-before:always;">
      <div style="text-align:center;font-size:14px;font-weight:bold;margin-bottom:10px;">Annual Maintenance Service - Service Log</div>
      <table class="service-log">
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:25%">Type of Service</th>
            <th>Date</th>
            <th>In Time</th>
            <th>Out Time</th>
            <th>Technical Expert</th>
            <th>Company Sign</th>
            <th>Customer Sign</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({length: serviceCount}, (_, i) => `
            <tr>
              <td class="center">${i + 1}</td>
              <td>${items[0]?.name || 'GENERAL PEST CONTROL SERVICE'}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#1a73e8;color:#fff;border:none;border-radius:4px;">Print Invoice</button>
      <button onclick="window.close()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#666;color:#fff;border:none;border-radius:4px;margin-left:10px;">Close</button>
    </div>
  </body></html>`);
};

// =========================================================
// 4. CERTIFICATE OF GENERAL PEST CONTROL
// =========================================================
window.printCertificate = function(cert, customer, settings) {
  const s = settings;
  const win = window.open('', '_blank', 'width=800,height=1000');
  
  win.document.write(`<!DOCTYPE html><html><head><title>Certificate - ${cert.certificate_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Georgia', serif; padding:30px; font-size:12px; color:#222; }
    .cert-border { border:3px double #1a73e8; padding:30px; position:relative; }
    .cert-header { text-align:center; margin-bottom:20px; }
    .cert-title { font-size:22px; font-weight:bold; letter-spacing:2px; color:#1a73e8; margin:15px 0; text-decoration:underline; }
    .cert-body { font-size:13px; line-height:1.8; margin:20px 0; text-align:justify; }
    .cert-customer { font-size:18px; font-weight:bold; color:#333; text-decoration:underline; }
    .cert-footer { display:flex; justify-content:space-between; margin-top:50px; }
    .company-info { font-size:10px; text-align:center; margin-top:10px; border-top:1px solid #ccc; padding-top:10px; }
    @media print { body { padding:15px; } .no-print { display:none; } }
  </style></head><body>
    <div class="cert-border">
      <div class="cert-header">
        <img src="/logo.jpg" alt="${s.company_name || ''}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:8px;">
        <div style="font-size:11px;">${s.company_website || ''} | ${s.company_email || ''}</div>
        <div style="font-size:11px;">${s.company_email2 || ''} | ${s.company_phone?.replace('+91 ','') || ''} / ${s.company_phone2?.replace('+91 ','') || ''}</div>
        <div style="font-size:10px;margin-top:4px;">License No: ${s.company_license || ''}</div>
        <div style="font-size:10px;">Ref: ${cert.ref_number || cert.certificate_number}</div>
      </div>
      
      <div class="cert-title">CERTIFICATE OF GENERAL PEST CONTROL</div>
      
      <div class="cert-body">
        <div style="text-align:center;font-size:16px;font-weight:bold;margin:15px 0;">THIS IS to Certify</div>
        
        <div style="text-align:center;margin:15px 0;">
          <span class="cert-customer">${customer.name}</span>
        </div>
        
        <div>
          Has Undergone Pest Control Contact Period - <b>${cert.contact_period || (cert.valid_from && cert.valid_until ? fmtDateDot(cert.valid_from) + ' - ' + fmtDateDot(cert.valid_until) : '')}</b> With Premise Address,
        </div>
        
        <div style="margin:10px 0;">
          <b>${cert.premise_address || customer.address || ''}</b>
          ${customer.city ? `<br>${customer.city}${customer.state ? ', ' + customer.state : ''} - ${customer.zip || ''}` : ''}
        </div>
        
        <div>
          <b>${customer.name}</b> Has Properly Pests Free And To The Best Of Our Knowledge In Accordance To
          Government Of India Rendered Free From Injurious Disease.
        </div>
        
        <div style="margin-top:10px;">
          <b>Method:</b> ${cert.method || 'Only Spray'},
        </div>
        <div>
          <b>Chemicals Used:</b> ${cert.chemicals || 'Imidacloprid At 21% W/W And Beta-Cyfluthrin At 10.5% W/W'}
        </div>
      </div>
      
      <div class="cert-footer">
        <div style="text-align:center;">
          <div style="margin-top:40px;border-top:1px solid #333;padding-top:4px;width:200px;">
            Signature and Seal of<br>Authorized Signatory
          </div>
        </div>
        <div style="text-align:center;font-size:11px;">
          <div style="font-weight:bold;">Registered Office</div>
          <div style="margin-top:4px;">${s.company_reg_office || s.company_address || ''}</div>
        </div>
      </div>
    </div>
    
    <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#1a73e8;color:#fff;border:none;border-radius:4px;">Print Certificate</button>
      <button onclick="window.close()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#666;color:#fff;border:none;border-radius:4px;margin-left:10px;">Close</button>
    </div>
  </body></html>`);
};

// =========================================================
// 5. QUOTATION FORMAT
// =========================================================
window.printQuotation = function(quote, customer, settings) {
  const s = settings;
  const items = typeof quote.items === 'string' ? JSON.parse(quote.items) : (quote.items || []);
  const win = window.open('', '_blank', 'width=800,height=1000');
  const subtotal = quote.subtotal || 0;
  const isGst = quote.gst_type !== 'none';
  const sgstAmt = isGst ? (quote.sgst || subtotal * 9 / 100) : 0;
  const cgstAmt = isGst ? (quote.cgst || subtotal * 9 / 100) : 0;
  const grandTotal = quote.total || subtotal;
  
  win.document.write(`<!DOCTYPE html><html><head><title>Quotation - ${quote.quote_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding:15px; font-size:11px; color:#222; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #555; padding:5px 8px; font-size:10px; }
    th { background:#1a73e8; color:#fff; text-align:left; font-weight:bold; }
    .right { text-align:right; } .center { text-align:center; }
    .header-line { border-top:2px solid #1a73e8; border-bottom:2px solid #1a73e8; padding:4px 0; text-align:center; font-size:16px; font-weight:bold; color:#1a73e8; margin:8px 0; }
    .terms { margin-top:15px; font-size:9px; line-height:1.5; }
    @media print { body { padding:0; } .no-print { display:none; } }
  </style></head><body>
    ${companyHeader(s)}
    
    <div class="header-line">QUOTATION</div>
    
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
      <div style="font-size:10px;">
        <div><b>To:</b></div>
        <div style="font-weight:bold;font-size:12px;">${customer.name}</div>
        <div>${customer.address || ''}</div>
        ${customer.city ? `<div>${customer.city}${customer.state ? ', '+customer.state : ''}</div>` : ''}
        <div>Contact Person: ${quote.contact_person || customer.contact_person || customer.name}</div>
        <div>Mobile: ${customer.phone || ''}</div>
      </div>
      <div style="text-align:right;font-size:10px;">
        <div><b>Quote No:</b> ${quote.quote_number}</div>
        <div><b>Date:</b> ${fmtDateDot(quote.created_at)}</div>
        <div><b>Valid Until:</b> ${fmtDateDot(quote.valid_until)}</div>
        ${quote.warranty_note ? `<div>Warranty: ${quote.warranty_note}</div>` : ''}
      </div>
    </div>
    
    <div style="margin:6px 0;font-size:10px;font-style:italic;">
      Dear Sir/Madam,<br>
      We thank you for your valuable enquiry and have pleasure in submitting our offer as below:
    </div>
    
    ${quote.title ? `<div style="font-weight:bold;margin:6px 0;">${quote.title}</div>` : ''}
    
    <table>
      <thead>
        <tr>
          <th style="width:5%">S.No</th>
          <th style="width:40%">Service / Item Description</th>
          <th class="right">Rate (Rs.)</th>
          <th class="center">Qty</th>
          <th class="right">Amount (Rs.)</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => `
          <tr>
            <td class="center">${idx + 1}</td>
            <td>${item.name || ''}${item.description ? '<br><i>'+item.description+'</i>' : ''}</td>
            <td class="right">${Number(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="center">${item.qty || 1}</td>
            <td class="right">${Number((item.rate || 0) * (item.qty || 1)).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <table style="margin-top:4px;">
      <tr>
        <td style="width:60%;border:none;"></td>
        <td class="right" style="border:none;"><b>Subtotal:</b></td>
        <td class="right" style="border:none;width:120px;"><b>${Number(subtotal).toLocaleString('en-IN', {minimumFractionDigits:2})}</b></td>
      </tr>
      ${isGst ? `
      <tr>
        <td style="border:none;"></td>
        <td class="right" style="border:none;">9% SGST:</td>
        <td class="right" style="border:none;width:120px;">${Number(sgstAmt).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>
      <tr>
        <td style="border:none;"></td>
        <td class="right" style="border:none;">9% CGST:</td>
        <td class="right" style="border:none;width:120px;">${Number(cgstAmt).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>
      ` : ''}
      <tr style="border-top:2px solid #333;">
        <td style="border:none;"></td>
        <td class="right" style="border:none;font-size:12px;"><b>Grand Total:</b></td>
        <td class="right" style="border:none;font-size:12px;width:120px;"><b>${Number(grandTotal).toLocaleString('en-IN', {minimumFractionDigits:2})}</b></td>
      </tr>
    </table>
    
    <div style="margin-top:8px;padding:6px;background:#f5f5f5;border:1px solid #ddd;font-size:10px;">
      <b>Amount in Words:</b> ${numberToWords(grandTotal)}
    </div>
    
    ${bankDetails(s)}
    
    ${quote.terms_conditions ? `
    <div class="terms">
      <div style="font-weight:bold;font-size:10px;margin-bottom:4px;">Terms & Conditions:</div>
      <div style="white-space:pre-wrap;">${quote.terms_conditions}</div>
    </div>` : ''}
    
    <div style="display:flex;justify-content:space-between;margin-top:30px;font-size:10px;">
      <div>
        <div style="border-top:1px solid #333;padding-top:4px;width:200px;text-align:center;">Customer's Signature</div>
      </div>
      <div style="text-align:right;">
        <div>For <b>${s.company_name || ''}</b></div>
        <div style="margin-top:30px;border-top:1px solid #333;padding-top:4px;width:200px;text-align:center;">Authorised Signatory</div>
      </div>
    </div>
    
    <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#1a73e8;color:#fff;border:none;border-radius:4px;">Print Quotation</button>
      <button onclick="window.close()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#666;color:#fff;border:none;border-radius:4px;margin-left:10px;">Close</button>
    </div>
  </body></html>`);
};

console.log('Print templates loaded.');
