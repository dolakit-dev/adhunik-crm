const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// ===== RECEIPT VOUCHERS =====
router.get('/receipts', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM receipt_vouchers ORDER BY date DESC').all());
});

router.post('/receipts', (req, res) => {
  const { date, party_name, party_type, amount, payment_method, description, reference } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM receipt_vouchers').get().count;
  const num = `RV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO receipt_vouchers (voucher_number, date, party_name, party_type, amount, payment_method, description, reference) VALUES (?,?,?,?,?,?,?,?)').run(num, date, party_name, party_type, amount, payment_method, description, reference);
  res.json({ id: result.lastInsertRowid, voucher_number: num });
});

router.put('/receipts/:id', (req, res) => {
  const { date, party_name, party_type, amount, payment_method, description, reference } = req.body;
  getDb().prepare('UPDATE receipt_vouchers SET date=?, party_name=?, party_type=?, amount=?, payment_method=?, description=?, reference=? WHERE id=?').run(date, party_name, party_type, amount, payment_method, description, reference, req.params.id);
  res.json({ message: 'Receipt voucher updated' });
});

router.delete('/receipts/:id', (req, res) => {
  getDb().prepare('DELETE FROM receipt_vouchers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Receipt voucher deleted' });
});

// ===== PAYMENT VOUCHERS =====
router.get('/payments', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM payment_vouchers ORDER BY date DESC').all());
});

router.post('/payments', (req, res) => {
  const { date, party_name, party_type, amount, payment_method, description, approved_by, reference } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM payment_vouchers').get().count;
  const num = `PV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO payment_vouchers (voucher_number, date, party_name, party_type, amount, payment_method, description, approved_by, reference) VALUES (?,?,?,?,?,?,?,?,?)').run(num, date, party_name, party_type, amount, payment_method, description, approved_by, reference);
  res.json({ id: result.lastInsertRowid, voucher_number: num });
});

router.put('/payments/:id', (req, res) => {
  const { date, party_name, party_type, amount, payment_method, description, approved_by, reference } = req.body;
  getDb().prepare('UPDATE payment_vouchers SET date=?, party_name=?, party_type=?, amount=?, payment_method=?, description=?, approved_by=?, reference=? WHERE id=?').run(date, party_name, party_type, amount, payment_method, description, approved_by, reference, req.params.id);
  res.json({ message: 'Payment voucher updated' });
});

router.delete('/payments/:id', (req, res) => {
  getDb().prepare('DELETE FROM payment_vouchers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Payment voucher deleted' });
});

// ===== LEDGER =====
router.get('/ledger/general', (req, res) => {
  const receipts = getDb().prepare("SELECT date, 'Receipt' as type, party_name as party, amount, description FROM receipt_vouchers").all();
  const payments = getDb().prepare("SELECT date, 'Payment' as type, party_name as party, amount, description FROM payment_vouchers").all();
  const expenses = getDb().prepare("SELECT date, 'Expense' as type, description as party, amount, category as description FROM expenses WHERE status='approved'").all();
  const invoices = getDb().prepare("SELECT created_at as date, 'Invoice' as type, invoice_number as party, total as amount, title as description FROM invoices WHERE status='paid'").all();
  const all = [...receipts, ...payments, ...expenses, ...invoices].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(all);
});

router.get('/ledger/customer/:id', (req, res) => {
  const invoices = getDb().prepare("SELECT invoice_number as ref, created_at as date, 'Invoice' as type, total as amount, title as description FROM invoices WHERE customer_id = ?").all(req.params.id);
  const payments = getDb().prepare("SELECT reference as ref, payment_date as date, 'Payment' as type, -amount as amount, notes as description FROM payments WHERE customer_id = ?").all(req.params.id);
  const all = [...invoices, ...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(all);
});

module.exports = router;
