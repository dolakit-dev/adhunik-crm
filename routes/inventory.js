const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { category, status, search } = req.query;
  let sql = 'SELECT i.*, v.name as supplier_name FROM inventory i LEFT JOIN vendors v ON i.supplier_id = v.id WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND i.category = ?'; params.push(category); }
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (search) { sql += ' AND (i.name LIKE ? OR i.sku LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY i.name';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const item = getDb().prepare('SELECT i.*, v.name as supplier_name FROM inventory i LEFT JOIN vendors v ON i.supplier_id = v.id WHERE i.id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const transactions = getDb().prepare('SELECT * FROM inventory_transactions WHERE inventory_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  res.json({ ...item, transactions });
});

router.post('/', (req, res) => {
  const { name, sku, category, description, unit, quantity, min_quantity, cost_price, selling_price, supplier_id, location, status } = req.body;
  const result = getDb().prepare('INSERT INTO inventory (name, sku, category, description, unit, quantity, min_quantity, cost_price, selling_price, supplier_id, location, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(name, sku, category, description, unit || 'pcs', quantity || 0, min_quantity || 0, cost_price || 0, selling_price || 0, supplier_id, location, status || 'active');
  res.json({ id: result.lastInsertRowid, message: 'Item created' });
});

router.put('/:id', (req, res) => {
  const { name, sku, category, description, unit, quantity, min_quantity, cost_price, selling_price, supplier_id, location, status } = req.body;
  getDb().prepare('UPDATE inventory SET name=?, sku=?, category=?, description=?, unit=?, quantity=?, min_quantity=?, cost_price=?, selling_price=?, supplier_id=?, location=?, status=? WHERE id=?').run(name, sku, category, description, unit, quantity, min_quantity, cost_price, selling_price, supplier_id, location, status, req.params.id);
  res.json({ message: 'Item updated' });
});

// Stock transaction
router.post('/:id/transaction', (req, res) => {
  const { type, quantity, reference_type, reference_id, notes } = req.body;
  const item = getDb().prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  
  const newQty = type === 'in' ? item.quantity + quantity : item.quantity - quantity;
  getDb().prepare('UPDATE inventory SET quantity = ? WHERE id = ?').run(newQty, req.params.id);
  const result = getDb().prepare('INSERT INTO inventory_transactions (inventory_id, type, quantity, reference_type, reference_id, notes) VALUES (?,?,?,?,?,?)').run(req.params.id, type, quantity, reference_type, reference_id, notes);
  res.json({ id: result.lastInsertRowid, new_quantity: newQty });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM inventory_transactions WHERE inventory_id = ?').run(req.params.id);
  getDb().prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
  res.json({ message: 'Item deleted' });
});

// Low stock alerts
router.get('/alerts/low-stock', (req, res) => {
  const items = getDb().prepare('SELECT * FROM inventory WHERE quantity <= min_quantity AND status = ?').all('active');
  res.json(items);
});

module.exports = router;
