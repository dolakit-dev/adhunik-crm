const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { renderQuotation } = require('../lib/customer-document-pdfs');

router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql = `SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND q.status = ?'; params.push(status); }
  if (search) { sql += ' AND (q.quote_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY q.created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id/pdf', async (req, res) => {
  const db = getDb();
  const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(quotation.customer_id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  try {
    const settings = {};
    db.prepare('SELECT key, value FROM settings').all().forEach(setting => { settings[setting.key] = setting.value; });
    const bytes = await renderQuotation(customer, quotation, settings);
    res.type('application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quote_number}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Quotation PDF generation failed:', error);
    res.status(500).json({ error: 'Could not generate this quotation PDF.' });
  }
});

router.get('/:id', (req, res) => {
  const q = getDb().prepare(`SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ?`).get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Quotation not found' });
  res.json(q);
});

router.post('/', (req, res) => {
  const { customer_id, lead_id, inspection_id, title, description, items, subtotal, tax_rate, tax_amount, discount, total, valid_until, status,
    gst_type, sgst, cgst, igst, sac_code, warranty_note, contact_person, terms_conditions } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM quotations').get().count;
  const quoteNum = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO quotations (quote_number, customer_id, lead_id, inspection_id, title, description, items, subtotal, tax_rate, tax_amount, discount, total, valid_until, status, gst_type, sgst, cgst, igst, sac_code, warranty_note, contact_person, terms_conditions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    quoteNum, customer_id, lead_id, inspection_id, title, description, JSON.stringify(items || []), subtotal || 0, tax_rate || 0, tax_amount || 0, discount || 0, total || 0, valid_until, status || 'draft',
    gst_type || 'none', sgst || 0, cgst || 0, igst || 0, sac_code, warranty_note, contact_person, terms_conditions);
  res.json({ id: result.lastInsertRowid, quote_number: quoteNum });
});

router.put('/:id', (req, res) => {
  const { title, description, items, subtotal, tax_rate, tax_amount, discount, total, valid_until, status,
    gst_type, sgst, cgst, igst, sac_code, warranty_note, contact_person, terms_conditions } = req.body;
  getDb().prepare('UPDATE quotations SET title=?, description=?, items=?, subtotal=?, tax_rate=?, tax_amount=?, discount=?, total=?, valid_until=?, status=?, gst_type=?, sgst=?, cgst=?, igst=?, sac_code=?, warranty_note=?, contact_person=?, terms_conditions=? WHERE id=?').run(
    title, description, JSON.stringify(items || []), subtotal, tax_rate, tax_amount, discount, total, valid_until, status,
    gst_type, sgst, cgst, igst, sac_code, warranty_note, contact_person, terms_conditions, req.params.id);
  res.json({ message: 'Quotation updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM quotations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Quotation deleted' });
});

module.exports = router;
