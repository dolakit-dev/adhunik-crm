const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { month, year, status, employee_id } = req.query;
  let sql = `SELECT p.*, e.name as employee_name, e.department FROM payroll p LEFT JOIN employees e ON p.employee_id = e.id WHERE 1=1`;
  const params = [];
  if (month) { sql += ' AND p.month = ?'; params.push(month); }
  if (year) { sql += ' AND p.year = ?'; params.push(year); }
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (employee_id) { sql += ' AND p.employee_id = ?'; params.push(employee_id); }
  sql += ' ORDER BY p.year DESC, p.month DESC, e.name';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const payroll = getDb().prepare(`SELECT p.*, e.name as employee_name, e.department, e.role FROM payroll p LEFT JOIN employees e ON p.employee_id = e.id WHERE p.id = ?`).get(req.params.id);
  if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
  res.json(payroll);
});

router.post('/', (req, res) => {
  const { employee_id, month, year, basic_salary, allowances, deductions, overtime, bonus, tax, status } = req.body;
  const net = (basic_salary || 0) + (allowances || 0) + (overtime || 0) + (bonus || 0) - (deductions || 0) - (tax || 0);
  const result = getDb().prepare('INSERT INTO payroll (employee_id, month, year, basic_salary, allowances, deductions, overtime, bonus, tax, net_salary, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(employee_id, month, year, basic_salary || 0, allowances || 0, deductions || 0, overtime || 0, bonus || 0, tax || 0, net, status || 'pending');
  res.json({ id: result.lastInsertRowid, net_salary: net });
});

router.put('/:id', (req, res) => {
  const { basic_salary, allowances, deductions, overtime, bonus, tax, status, paid_date } = req.body;
  const net = (basic_salary || 0) + (allowances || 0) + (overtime || 0) + (bonus || 0) - (deductions || 0) - (tax || 0);
  getDb().prepare('UPDATE payroll SET basic_salary=?, allowances=?, deductions=?, overtime=?, bonus=?, tax=?, net_salary=?, status=?, paid_date=? WHERE id=?').run(basic_salary, allowances, deductions, overtime, bonus, tax, net, status, paid_date, req.params.id);
  res.json({ message: 'Payroll updated', net_salary: net });
});

// Generate payroll for all employees
router.post('/generate', (req, res) => {
  const { month, year } = req.body;
  const employees = getDb().prepare("SELECT * FROM employees WHERE status = 'active'").all();
  const insert = getDb().prepare('INSERT INTO payroll (employee_id, month, year, basic_salary, net_salary, status) VALUES (?,?,?,?,?,?)');
  const batch = getDb().transaction(() => {
    let count = 0;
    for (const emp of employees) {
      const existing = getDb().prepare('SELECT id FROM payroll WHERE employee_id = ? AND month = ? AND year = ?').get(emp.id, month, year);
      if (!existing) {
        insert.run(emp.id, month, year, emp.salary, emp.salary, 'pending');
        count++;
      }
    }
    return count;
  });
  const count = batch();
  res.json({ message: `${count} payroll entries generated` });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM payroll WHERE id = ?').run(req.params.id);
  res.json({ message: 'Payroll deleted' });
});

module.exports = router;
