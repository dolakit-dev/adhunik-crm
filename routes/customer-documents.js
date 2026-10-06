const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router({ mergeParams: true });
const { getDb } = require('../db');
const { renderAgreement, renderCertificate, renderGstInvoice, renderQuotation, saveGeneratedPdf } = require('../lib/customer-document-pdfs');

const documentTypes = new Set(['agreement', 'certificate', 'quotation', 'gst-invoice']);

function getCustomer(customerId) {
  return getDb().prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
}

function getSettings() {
  const settings = {};
  getDb().prepare('SELECT key, value FROM settings').all().forEach(setting => { settings[setting.key] = setting.value; });
  return settings;
}

function saveEmailAttempt(customerId, status, sentTo, sentAt, errorMessage) {
  getDb().prepare('INSERT INTO customer_document_email_logs (customer_id, status, sent_to, sent_at, error_message) VALUES (?,?,?,?,?)').run(
    customerId, status, sentTo || null, sentAt || null, errorMessage || null);
}

router.get('/', (req, res) => {
  if (!getCustomer(req.params.customerId)) return res.status(404).json({ error: 'Customer not found' });
  const documents = getDb().prepare('SELECT id, document_type, reference_id, file_name, created_at FROM customer_documents WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId);
  res.json(documents);
});

router.get('/email-status', (req, res) => {
  if (!getCustomer(req.params.customerId)) return res.status(404).json({ error: 'Customer not found' });
  const status = getDb().prepare('SELECT status, sent_to, sent_at, error_message FROM customer_document_email_logs WHERE customer_id = ? ORDER BY id DESC LIMIT 1').get(req.params.customerId);
  res.json(status || null);
});

router.post('/send-email', async (req, res) => {
  const customerId = req.params.customerId;
  const customer = getCustomer(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const recipient = String(customer.email || '').trim();
  const fail = (statusCode, message) => {
    saveEmailAttempt(customerId, 'Failed', recipient, null, message);
    return res.status(statusCode).json({ error: message });
  };
  if (!recipient) return fail(400, 'This customer has no saved email address. Add an email to the customer record first.');

  const requiredTypes = ['quotation', 'agreement', 'certificate', 'gst-invoice'];
  const documents = getDb().prepare('SELECT * FROM customer_documents WHERE customer_id = ? ORDER BY created_at DESC, id DESC').all(customerId);
  const storageDirectory = path.resolve(__dirname, '..', 'storage', 'customer-documents');
  const latestDocuments = new Map();
  documents.forEach((document) => {
    if (!requiredTypes.includes(document.document_type) || latestDocuments.has(document.document_type)) return;
    const filePath = path.resolve(__dirname, '..', document.file_path);
    if (!filePath.startsWith(`${storageDirectory}${path.sep}`) || !fs.existsSync(filePath)) return;
    latestDocuments.set(document.document_type, { document, filePath });
  });
  const missingTypes = requiredTypes.filter(type => !latestDocuments.has(type));
  if (missingTypes.length) {
    const labels = { agreement: 'Agreement', certificate: 'Certificate', quotation: 'Quotation', 'gst-invoice': 'GST Invoice' };
    return fail(400, `Generate all four PDFs before sending. Missing: ${missingTypes.map(type => labels[type]).join(', ')}.`);
  }

  const attachments = [];
  const attachedPaths = new Set();
  const attachedHashes = new Set();
  for (const type of requiredTypes) {
    const { document, filePath } = latestDocuments.get(type);
    const resolvedPath = path.resolve(filePath);
    if (attachedPaths.has(resolvedPath)) continue;
    const content = fs.readFileSync(resolvedPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    if (attachedHashes.has(hash)) continue;
    attachedPaths.add(resolvedPath);
    attachedHashes.add(hash);
    attachments.push({ filename: path.basename(document.file_name), content });
  }

  const host = process.env.BREVO_SMTP_HOST;
  const port = Number(process.env.BREVO_SMTP_PORT);
  const user = process.env.BREVO_SMTP_USER;
  const password = process.env.BREVO_SMTP_KEY;
  const from = process.env.MAIL_FROM;
  if (!host || !Number.isFinite(port) || !user || !password || !from) {
    return fail(503, 'Brevo SMTP is not fully configured. Check BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER, BREVO_SMTP_KEY, and MAIL_FROM in .env.');
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
    await transporter.sendMail({
      from,
      to: recipient,
      subject: 'Your service documents',
      text: `Hello ${customer.name},\n\nPlease find your Agreement, Certificate, Quotation, and GST Invoice attached.\n\nRegards,\nAdhunik Pest Control`,
      attachments,
    });
    const sentAt = new Date().toISOString();
    saveEmailAttempt(customerId, 'Sent', recipient, sentAt, null);
    res.json({ status: 'Sent', sent_to: recipient, sent_at: sentAt });
  } catch (error) {
    console.error('Customer documents email failed:', error);
    const message = `Could not send the customer documents email: ${error.message || 'Brevo SMTP request failed.'}`;
    saveEmailAttempt(customerId, 'Failed', recipient, null, message);
    res.status(502).json({ error: message });
  }
});

router.post('/generate/:type', async (req, res) => {
  const { customerId, type } = req.params;
  if (!documentTypes.has(type)) return res.status(404).json({ error: 'Unknown customer document type' });
  const db = getDb();
  const customer = getCustomer(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  try {
    const settings = getSettings();
    let referenceId = null;
    let bytes;

    if (type === 'agreement') {
      const contract = db.prepare('SELECT * FROM contracts WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1').get(customerId);
      const lead = customer.lead_id ? db.prepare('SELECT * FROM leads WHERE id = ?').get(customer.lead_id) : null;
      const assignment = db.prepare('SELECT * FROM service_assignments WHERE customer_id = ? ORDER BY scheduled_date DESC, id DESC LIMIT 1').get(customerId);
      referenceId = contract?.id || null;
      bytes = await renderAgreement(customer, contract, settings, lead, assignment);
    } else if (type === 'certificate') {
      const count = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;
      const lead = customer.lead_id ? db.prepare('SELECT * FROM leads WHERE id = ?').get(customer.lead_id) : null;
      const certificateNumber = `CERT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      const certificate = {
        certificate_number: certificateNumber,
        ref_number: certificateNumber,
        customer_id: customer.id,
        type: 'service',
        title: 'Certificate of General Pest Control',
        valid_from: customer.contract_start_date,
        valid_until: customer.contract_end_date,
        contact_period: [customer.contract_start_date, customer.contract_end_date].filter(Boolean).join(' - '),
        premise_address: [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', '),
        method: customer.treatment_method,
        chemicals: customer.chemicals_used,
      };
      const result = db.prepare('INSERT INTO certificates (certificate_number, customer_id, type, title, valid_from, valid_until, contact_period, method, chemicals, premise_address, customer_address, ref_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
        certificate.certificate_number, customer.id, certificate.type, certificate.title, certificate.valid_from, certificate.valid_until,
        certificate.contact_period, certificate.method, certificate.chemicals, certificate.premise_address, certificate.premise_address, certificate.ref_number);
      referenceId = result.lastInsertRowid;
      bytes = await renderCertificate(customer, certificate, lead);
    } else if (type === 'quotation') {
      const quotation = db.prepare('SELECT * FROM quotations WHERE customer_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(customerId);
      referenceId = quotation?.id || null;
      bytes = await renderQuotation(customer, quotation, settings);
    } else {
      const subtotal = Number(customer.service_rate);
      if (!Number.isFinite(subtotal) || subtotal <= 0) return res.status(400).json({ error: 'Add a service rate to this customer before generating a GST invoice.' });
      const taxRate = Number(settings.tax_rate) || 18;
      const taxAmount = Number((subtotal * taxRate / 100).toFixed(2));
      const total = Number((subtotal + taxAmount).toFixed(2));
      const count = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      const serviceName = customer.service_type || customer.pest_type || 'General Pest Control Service';
      const invoice = {
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        title: serviceName,
        items: [{ name: serviceName, qty: 1, rate: subtotal }],
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        paid_amount: 0,
        status: 'draft',
        gst_type: 'intra',
        sgst: Number((taxAmount / 2).toFixed(2)),
        cgst: Number((taxAmount / 2).toFixed(2)),
        igst: 0,
        sac_code: settings.sac_code || '',
        contact_person: customer.contact_person || customer.name,
        service_period: [customer.contract_start_date, customer.contract_end_date].filter(Boolean).join(' - '),
        service_count: Number(customer.service_count) || 1,
        per_service_rate: subtotal,
        invoice_type: 'annual',
      };
      const result = db.prepare('INSERT INTO invoices (invoice_number, customer_id, title, items, subtotal, tax_rate, tax_amount, total, paid_amount, status, gst_type, sgst, cgst, igst, sac_code, contact_person, service_period, service_count, per_service_rate, invoice_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
        invoice.invoice_number, invoice.customer_id, invoice.title, JSON.stringify(invoice.items), invoice.subtotal, invoice.tax_rate, invoice.tax_amount,
        invoice.total, invoice.paid_amount, invoice.status, invoice.gst_type, invoice.sgst, invoice.cgst, invoice.igst, invoice.sac_code,
        invoice.contact_person, invoice.service_period, invoice.service_count, invoice.per_service_rate, invoice.invoice_type);
      referenceId = result.lastInsertRowid;
      bytes = await renderGstInvoice(customer, invoice, settings);
    }

    const storageDirectory = path.resolve(__dirname, '..', 'storage', 'customer-documents');
    const latestDocument = db.prepare('SELECT id, customer_id, document_type, reference_id, file_name, file_path, created_at FROM customer_documents WHERE customer_id = ? AND document_type = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(customer.id, type);
    if (latestDocument) {
      const latestPath = path.resolve(__dirname, '..', latestDocument.file_path);
      if (latestPath.startsWith(`${storageDirectory}${path.sep}`) && fs.existsSync(latestPath) && fs.readFileSync(latestPath).equals(Buffer.from(bytes))) {
        return res.status(200).json({
          id: latestDocument.id,
          customer_id: latestDocument.customer_id,
          document_type: latestDocument.document_type,
          reference_id: latestDocument.reference_id,
          file_name: latestDocument.file_name,
          created_at: latestDocument.created_at,
        });
      }
    }

    const fileName = `customer-${customer.id}-${type}-${Date.now()}.pdf`;
    const filePath = await saveGeneratedPdf(bytes, fileName);
    const result = db.prepare('INSERT INTO customer_documents (customer_id, document_type, reference_id, file_name, file_path) VALUES (?,?,?,?,?)').run(
      customer.id, type, referenceId, fileName, filePath);
    res.status(201).json({ id: result.lastInsertRowid, customer_id: customer.id, document_type: type, reference_id: referenceId, file_name: fileName, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Customer document generation failed:', error);
    res.status(500).json({ error: 'Could not generate this PDF. Check that its source template is available.' });
  }
});

router.get('/:documentId/file', (req, res) => {
  const document = getDb().prepare('SELECT * FROM customer_documents WHERE id = ? AND customer_id = ?').get(req.params.documentId, req.params.customerId);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  const directory = path.resolve(__dirname, '..', 'storage', 'customer-documents');
  const filePath = path.resolve(__dirname, '..', document.file_path);
  if (!filePath.startsWith(`${directory}${path.sep}`) || !fs.existsSync(filePath)) return res.status(404).json({ error: 'PDF file not found' });
  res.type('application/pdf');
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${path.basename(document.file_name)}"`);
  res.sendFile(filePath);
});

router.delete('/:documentId', async (req, res) => {
  const db = getDb();
  const document = db.prepare('SELECT * FROM customer_documents WHERE id = ? AND customer_id = ?').get(req.params.documentId, req.params.customerId);
  if (!document) return res.status(404).json({ error: 'Document not found' });

  const storageDirectory = path.resolve(__dirname, '..', 'storage', 'customer-documents');
  const filePath = path.resolve(__dirname, '..', document.file_path);
  if (!filePath.startsWith(`${storageDirectory}${path.sep}`)) return res.status(400).json({ error: 'Invalid document file path' });

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Customer document deletion failed:', error);
      return res.status(500).json({ error: 'Could not delete this PDF.' });
    }
  }

  db.prepare('DELETE FROM customer_documents WHERE id = ? AND customer_id = ?').run(req.params.documentId, req.params.customerId);
  res.json({ message: 'PDF deleted' });
});

module.exports = router;