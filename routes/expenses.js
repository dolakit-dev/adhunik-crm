const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, category, search } = req.query;
  let sql = `SELECT e.*, v.name as vendor_name, ap.name as approved_by_name FROM expenses e LEFT JOIN vendors v ON e.vendor_id = v.id LEFT JOIN employees ap ON e.approved_by = ap.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND e.status = ?'; params.push(status); }
  if (category) { sql += ' AND e.category = ?'; params.push(category); }
  if (search) { sql += ' AND (e.expense_number LIKE ? OR e.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY e.date DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const exp = getDb().prepare(`SELECT e.*, v.name as vendor_name FROM expenses e LEFT JOIN vendors v ON e.vendor_id = v.id WHERE e.id = ?`).get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Expense not found' });
  res.json(exp);
});

router.post('/', (req, res) => {
  const { date, category, description, amount, vendor_id, payment_method, receipt_path, approved_by, status } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM expenses').get().count;
  const expNum = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO expenses (expense_number, date, category, description, amount, vendor_id, payment_method, receipt_path, approved_by, status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(expNum, date, category, description, amount, vendor_id, payment_method, receipt_path, approved_by, status || 'pending');
  res.json({ id: result.lastInsertRowid, expense_number: expNum });
});

router.put('/:id', (req, res) => {
  const { date, category, description, amount, vendor_id, payment_method, approved_by, status } = req.body;
  getDb().prepare('UPDATE expenses SET date=?, category=?, description=?, amount=?, vendor_id=?, payment_method=?, approved_by=?, status=? WHERE id=?').run(date, category, description, amount, vendor_id, payment_method, approved_by, status, req.params.id);
  res.json({ message: 'Expense updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Expense deleted' });
});

module.exports = router;
