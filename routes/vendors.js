const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, category, search } = req.query;
  let sql = 'SELECT * FROM vendors WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (search) { sql += ' AND (name LIKE ? OR company LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const vendor = getDb().prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json(vendor);
});

router.post('/', (req, res) => {
  const { name, email, phone, company, address, category, gst_number, payment_terms, status } = req.body;
  const result = getDb().prepare('INSERT INTO vendors (name, email, phone, company, address, category, gst_number, payment_terms, status) VALUES (?,?,?,?,?,?,?,?,?)').run(name, email, phone, company, address, category, gst_number, payment_terms, status || 'active');
  res.json({ id: result.lastInsertRowid, message: 'Vendor created' });
});

router.put('/:id', (req, res) => {
  const { name, email, phone, company, address, category, gst_number, payment_terms, status } = req.body;
  getDb().prepare('UPDATE vendors SET name=?, email=?, phone=?, company=?, address=?, category=?, gst_number=?, payment_terms=?, status=? WHERE id=?').run(name, email, phone, company, address, category, gst_number, payment_terms, status, req.params.id);
  res.json({ message: 'Vendor updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Vendor deleted' });
});

module.exports = router;
