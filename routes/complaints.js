const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, priority, search } = req.query;
  let sql = `SELECT cmp.*, c.name as customer_name, t.name as assigned_to_name FROM complaints cmp LEFT JOIN customers c ON cmp.customer_id = c.id LEFT JOIN technicians t ON cmp.assigned_to = t.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND cmp.status = ?'; params.push(status); }
  if (priority) { sql += ' AND cmp.priority = ?'; params.push(priority); }
  if (search) { sql += ' AND (cmp.complaint_number LIKE ? OR c.name LIKE ? OR cmp.subject LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY cmp.created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const complaint = getDb().prepare(`SELECT cmp.*, c.name as customer_name, c.phone as customer_phone, t.name as assigned_to_name FROM complaints cmp LEFT JOIN customers c ON cmp.customer_id = c.id LEFT JOIN technicians t ON cmp.assigned_to = t.id WHERE cmp.id = ?`).get(req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
  res.json(complaint);
});

router.post('/', (req, res) => {
  const { customer_id, contract_id, category, priority, subject, description, assigned_to, status } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM complaints').get().count;
  const compNum = `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO complaints (complaint_number, customer_id, contract_id, category, priority, subject, description, assigned_to, status) VALUES (?,?,?,?,?,?,?,?,?)').run(compNum, customer_id, contract_id, category, priority || 'medium', subject, description, assigned_to, status || 'open');
  res.json({ id: result.lastInsertRowid, complaint_number: compNum });
});

router.put('/:id', (req, res) => {
  const { category, priority, subject, description, assigned_to, resolution, status } = req.body;
  const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
  getDb().prepare('UPDATE complaints SET category=?, priority=?, subject=?, description=?, assigned_to=?, resolution=?, status=?, resolved_at=? WHERE id=?').run(category, priority, subject, description, assigned_to, resolution, status, resolvedAt, req.params.id);
  res.json({ message: 'Complaint updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);
  res.json({ message: 'Complaint deleted' });
});

module.exports = router;
