const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { date, employee_id, status, month } = req.query;
  let sql = `SELECT a.*, e.name as employee_name, e.department FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id WHERE 1=1`;
  const params = [];
  if (date) { sql += ' AND a.date = ?'; params.push(date); }
  if (employee_id) { sql += ' AND a.employee_id = ?'; params.push(employee_id); }
  if (status) { sql += ' AND a.status = ?'; params.push(status); }
  if (month) { sql += " AND strftime('%Y-%m', a.date) = ?"; params.push(month); }
  sql += ' ORDER BY a.date DESC, e.name';
  res.json(getDb().prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { employee_id, date, check_in, check_out, status, notes } = req.body;
  const result = getDb().prepare('INSERT INTO attendance (employee_id, date, check_in, check_out, status, notes) VALUES (?,?,?,?,?,?)').run(employee_id, date, check_in, check_out, status || 'present', notes);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { check_in, check_out, status, notes } = req.body;
  getDb().prepare('UPDATE attendance SET check_in=?, check_out=?, status=?, notes=? WHERE id=?').run(check_in, check_out, status, notes, req.params.id);
  res.json({ message: 'Attendance updated' });
});

// Attendance report summary
router.get('/report', (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const report = getDb().prepare(`
    SELECT e.id, e.name, e.department,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
    COUNT(CASE WHEN a.status = 'half-day' THEN 1 END) as half_days,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
    COUNT(a.id) as total_entries
    FROM employees e
    LEFT JOIN attendance a ON e.id = a.employee_id AND strftime('%Y-%m', a.date) = ?
    WHERE e.status = 'active'
    GROUP BY e.id ORDER BY e.name
  `).all(targetMonth);
  res.json(report);
});

module.exports = router;
