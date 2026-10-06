const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, technician_id, search } = req.query;
  let sql = `SELECT sa.*, c.name as customer_name, c.phone as customer_phone, t.name as technician_name FROM service_assignments sa LEFT JOIN customers c ON sa.customer_id = c.id LEFT JOIN technicians t ON sa.technician_id = t.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND sa.status = ?'; params.push(status); }
  if (technician_id) { sql += ' AND sa.technician_id = ?'; params.push(technician_id); }
  if (search) { sql += ' AND (sa.assignment_number LIKE ? OR c.name LIKE ? OR t.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY sa.scheduled_date DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const sa = getDb().prepare(`SELECT sa.*, c.name as customer_name, c.phone as customer_phone, t.name as technician_name, t.phone as technician_phone FROM service_assignments sa LEFT JOIN customers c ON sa.customer_id = c.id LEFT JOIN technicians t ON sa.technician_id = t.id WHERE sa.id = ?`).get(req.params.id);
  if (!sa) return res.status(404).json({ error: 'Assignment not found' });
  const reports = getDb().prepare('SELECT * FROM field_reports WHERE assignment_id = ?').all(req.params.id);
  res.json({ ...sa, reports });
});

router.post('/', (req, res) => {
  const { customer_id, contract_id, technician_id, service_type, scheduled_date, scheduled_time, address, instructions, status } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM service_assignments').get().count;
  const assignNum = `SA-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO service_assignments (assignment_number, customer_id, contract_id, technician_id, service_type, scheduled_date, scheduled_time, address, instructions, status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(assignNum, customer_id, contract_id, technician_id, service_type, scheduled_date, scheduled_time, address, instructions, status || 'assigned');
  // Update technician status
  if (technician_id) {
    getDb().prepare("UPDATE technicians SET status = 'on-job' WHERE id = ?").run(technician_id);
  }
  res.json({ id: result.lastInsertRowid, assignment_number: assignNum });
});

router.put('/:id', (req, res) => {
  const { customer_id, contract_id, technician_id, service_type, scheduled_date, scheduled_time, address, instructions, status, notes, rating, completed_at } = req.body;
  getDb().prepare('UPDATE service_assignments SET customer_id=?, contract_id=?, technician_id=?, service_type=?, scheduled_date=?, scheduled_time=?, address=?, instructions=?, status=?, notes=?, rating=?, completed_at=? WHERE id=?').run(customer_id, contract_id, technician_id, service_type, scheduled_date, scheduled_time, address, instructions, status, notes, rating, completed_at, req.params.id);
  if (status === 'completed' && technician_id) {
    getDb().prepare("UPDATE technicians SET status = 'available', total_jobs = total_jobs + 1 WHERE id = ?").run(technician_id);
  }
  res.json({ message: 'Assignment updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM service_assignments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Assignment deleted' });
});

module.exports = router;
