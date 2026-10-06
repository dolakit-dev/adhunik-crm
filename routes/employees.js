const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, department, search } = req.query;
  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (department) { sql += ' AND department = ?'; params.push(department); }
  if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const emp = getDb().prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

router.post('/', (req, res) => {
  const { name, email, phone, role, department, salary, join_date, status, address } = req.body;
  const result = getDb().prepare('INSERT INTO employees (name, email, phone, role, department, salary, join_date, status, address) VALUES (?,?,?,?,?,?,?,?,?)').run(name, email, phone, role, department, salary || 0, join_date, status || 'active', address);
  res.json({ id: result.lastInsertRowid, message: 'Employee created' });
});

router.put('/:id', (req, res) => {
  const { name, email, phone, role, department, salary, join_date, status, address } = req.body;
  getDb().prepare('UPDATE employees SET name=?, email=?, phone=?, role=?, department=?, salary=?, join_date=?, status=?, address=? WHERE id=?').run(name, email, phone, role, department, salary, join_date, status, address, req.params.id);
  res.json({ message: 'Employee updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  res.json({ message: 'Employee deleted' });
});

module.exports = router;
