const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM technicians WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const tech = getDb().prepare('SELECT * FROM technicians WHERE id = ?').get(req.params.id);
  if (!tech) return res.status(404).json({ error: 'Technician not found' });
  const assignments = getDb().prepare(`SELECT sa.*, c.name as customer_name FROM service_assignments sa LEFT JOIN customers c ON sa.customer_id = c.id WHERE sa.technician_id = ? ORDER BY sa.scheduled_date DESC`).all(req.params.id);
  res.json({ ...tech, assignments });
});

router.post('/', (req, res) => {
  const { name, email, phone, specialization, license_number, license_expiry, status } = req.body;
  const result = getDb().prepare('INSERT INTO technicians (name, email, phone, specialization, license_number, license_expiry, status) VALUES (?,?,?,?,?,?,?)').run(name, email, phone, specialization, license_number, license_expiry, status || 'available');
  res.json({ id: result.lastInsertRowid, message: 'Technician created' });
});

router.put('/:id', (req, res) => {
  const { name, email, phone, specialization, license_number, license_expiry, status, current_lat, current_lng } = req.body;
  getDb().prepare('UPDATE technicians SET name=?, email=?, phone=?, specialization=?, license_number=?, license_expiry=?, status=?, current_lat=?, current_lng=? WHERE id=?').run(name, email, phone, specialization, license_number, license_expiry, status, current_lat, current_lng, req.params.id);
  res.json({ message: 'Technician updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM technicians WHERE id = ?').run(req.params.id);
  res.json({ message: 'Technician deleted' });
});

module.exports = router;
