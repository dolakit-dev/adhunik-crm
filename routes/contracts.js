const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql = `SELECT c.*, cust.name as customer_name FROM contracts c LEFT JOIN customers cust ON c.customer_id = cust.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (search) { sql += ' AND (c.contract_number LIKE ? OR cust.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY c.created_at DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const contract = getDb().prepare(`SELECT c.*, cust.name as customer_name, cust.phone as customer_phone, cust.address as customer_address FROM contracts c LEFT JOIN customers cust ON c.customer_id = cust.id WHERE c.id = ?`).get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const invoices = getDb().prepare('SELECT * FROM invoices WHERE contract_id = ? ORDER BY created_at DESC').all(req.params.id);
  const services = getDb().prepare('SELECT * FROM service_assignments WHERE contract_id = ? ORDER BY scheduled_date DESC').all(req.params.id);
  res.json({ ...contract, invoices, services });
});

router.post('/', (req, res) => {
  const { customer_id, title, description, service_type, frequency, start_date, end_date, value, billing_cycle, billing_amount, status, auto_renew, terms } = req.body;
  const count = getDb().prepare('SELECT COUNT(*) as count FROM contracts').get().count;
  const contractNum = `CNT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const result = getDb().prepare('INSERT INTO contracts (contract_number, customer_id, title, description, service_type, frequency, start_date, end_date, value, billing_cycle, billing_amount, status, auto_renew, terms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(contractNum, customer_id, title, description, service_type, frequency, start_date, end_date, value || 0, billing_cycle || 'monthly', billing_amount || 0, status || 'active', auto_renew ? 1 : 0, terms);
  res.json({ id: result.lastInsertRowid, contract_number: contractNum });
});

router.put('/:id', (req, res) => {
  const { customer_id, title, description, service_type, frequency, start_date, end_date, value, billing_cycle, billing_amount, status, auto_renew, terms } = req.body;
  getDb().prepare('UPDATE contracts SET customer_id=?, title=?, description=?, service_type=?, frequency=?, start_date=?, end_date=?, value=?, billing_cycle=?, billing_amount=?, status=?, auto_renew=?, terms=? WHERE id=?').run(customer_id, title, description, service_type, frequency, start_date, end_date, value, billing_cycle, billing_amount, status, auto_renew ? 1 : 0, terms, req.params.id);
  res.json({ message: 'Contract updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Contract deleted' });
});

// Expiring contracts
router.get('/expiring/list', (req, res) => {
  const contracts = getDb().prepare(`
    SELECT c.*, cust.name as customer_name, cust.phone as customer_phone
    FROM contracts c LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.status IN ('expiring', 'active') AND c.end_date <= date('now', '+30 days')
    ORDER BY c.end_date ASC
  `).all();
  res.json(contracts);
});

// Recurring billing
router.get('/recurring/list', (req, res) => {
  const contracts = getDb().prepare(`
    SELECT c.*, cust.name as customer_name, cust.phone as customer_phone, cust.email as customer_email
    FROM contracts c LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.status = 'active'
    ORDER BY c.billing_cycle, c.customer_id
  `).all();
  res.json(contracts);
});

module.exports = router;
