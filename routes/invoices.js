const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, customer_id, search } = req.query;
  let sql = `SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (customer_id) { sql += ' AND i.customer_id = ?'; params.push(customer_id); }
  if (search) { sql += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY i.created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const inv = getDb().prepare(`SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  const payments = getDb().prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(req.params.id);
  res.json({ ...inv, payments });
});

router.post('/', (req, res) => {
  const { customer_id, contract_id, quotation_id, title, items, subtotal, tax_rate, tax_amount, discount, total, due_date, status,
    gst_type, sgst, cgst, igst, sac_code, warranty_from, warranty_to, warranty_note,
    contact_person, booking_id, service_period, service_count, per_service_rate,
    amount_in_words, terms_conditions, invoice_type } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM invoices').get().count;
  const invNum = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO invoices (invoice_number, customer_id, contract_id, quotation_id, title, items, subtotal, tax_rate, tax_amount, discount, total, paid_amount, due_date, status, gst_type, sgst, cgst, igst, sac_code, warranty_from, warranty_to, warranty_note, contact_person, booking_id, service_period, service_count, per_service_rate, amount_in_words, terms_conditions, invoice_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    invNum, customer_id, contract_id, quotation_id, title, JSON.stringify(items || []), subtotal || 0, tax_rate || 0, tax_amount || 0, discount || 0, total || 0, 0, due_date, status || 'draft',
    gst_type || 'none', sgst || 0, cgst || 0, igst || 0, sac_code, warranty_from, warranty_to, warranty_note,
    contact_person, booking_id, service_period, service_count, per_service_rate, amount_in_words, terms_conditions, invoice_type || 'standard');
  res.json({ id: result.lastInsertRowid, invoice_number: invNum });
});

router.put('/:id', (req, res) => {
  const { title, items, subtotal, tax_rate, tax_amount, discount, total, paid_amount, due_date, status,
    gst_type, sgst, cgst, igst, sac_code, warranty_from, warranty_to, warranty_note,
    contact_person, booking_id, service_period, service_count, per_service_rate,
    amount_in_words, terms_conditions, invoice_type } = req.body;
  getDb().prepare('UPDATE invoices SET title=?, items=?, subtotal=?, tax_rate=?, tax_amount=?, discount=?, total=?, paid_amount=?, due_date=?, status=?, gst_type=?, sgst=?, cgst=?, igst=?, sac_code=?, warranty_from=?, warranty_to=?, warranty_note=?, contact_person=?, booking_id=?, service_period=?, service_count=?, per_service_rate=?, amount_in_words=?, terms_conditions=?, invoice_type=? WHERE id=?').run(
    title, JSON.stringify(items || []), subtotal, tax_rate, tax_amount, discount, total, paid_amount, due_date, status,
    gst_type, sgst, cgst, igst, sac_code, warranty_from, warranty_to, warranty_note,
    contact_person, booking_id, service_period, service_count, per_service_rate, amount_in_words, terms_conditions, invoice_type, req.params.id);
  res.json({ message: 'Invoice updated' });
});

// Record payment
router.post('/:id/payment', (req, res) => {
  const { amount, payment_method, payment_date, reference, notes } = req.body;
  const invoice = getDb().prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  
  const result = getDb().prepare('INSERT INTO payments (invoice_id, customer_id, amount, payment_method, payment_date, reference, notes) VALUES (?,?,?,?,?,?,?)').run(req.params.id, invoice.customer_id, amount, payment_method, payment_date || new Date().toISOString().split('T')[0], reference, notes);
  
  const newPaid = (invoice.paid_amount || 0) + amount;
  const newStatus = newPaid >= invoice.total ? 'paid' : 'partial';
  getDb().prepare('UPDATE invoices SET paid_amount=?, status=? WHERE id=?').run(newPaid, newStatus, req.params.id);
  
  res.json({ id: result.lastInsertRowid, message: 'Payment recorded', new_paid: newPaid, new_status: newStatus });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM payments WHERE invoice_id = ?').run(req.params.id);
  getDb().prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ message: 'Invoice deleted' });
});

// Payment reminders
router.get('/reminders/list', (req, res) => {
  const reminders = getDb().prepare(`
    SELECT pr.*, i.invoice_number, i.total, i.paid_amount, i.due_date as invoice_due, c.name as customer_name, c.phone as customer_phone
    FROM payment_reminders pr
    LEFT JOIN invoices i ON pr.invoice_id = i.id
    LEFT JOIN customers c ON pr.customer_id = c.id
    ORDER BY pr.reminder_date DESC
  `).all();
  res.json(reminders);
});

router.post('/reminders', (req, res) => {
  const { invoice_id, customer_id, reminder_date, method, notes } = req.body;
  const result = getDb().prepare('INSERT INTO payment_reminders (invoice_id, customer_id, reminder_date, method, notes) VALUES (?,?,?,?,?)').run(invoice_id, customer_id, reminder_date, method || 'email', notes);
  res.json({ id: result.lastInsertRowid, message: 'Reminder created' });
});

module.exports = router;
