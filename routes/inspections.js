const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql = `SELECT i.*, c.name as customer_name, t.name as inspector_name FROM inspections i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN technicians t ON i.inspector_id = t.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (search) { sql += ' AND (c.name LIKE ? OR i.pest_type LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY i.inspection_date DESC';
  res.json(getDb().prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const inspection = getDb().prepare(`SELECT i.*, c.name as customer_name, t.name as inspector_name FROM inspections i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN technicians t ON i.inspector_id = t.id WHERE i.id = ?`).get(req.params.id);
  if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
  res.json(inspection);
});

router.post('/', (req, res) => {
  const { customer_id, lead_id, inspector_id, inspection_date, property_address, pest_type, severity, findings, recommendations, photos, status } = req.body;
  const result = getDb().prepare('INSERT INTO inspections (customer_id, lead_id, inspector_id, inspection_date, property_address, pest_type, severity, findings, recommendations, photos, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(customer_id, lead_id, inspector_id, inspection_date, property_address, pest_type, severity || 'low', findings, recommendations, photos, status || 'scheduled');
  res.json({ id: result.lastInsertRowid, message: 'Inspection created' });
});

router.put('/:id', (req, res) => {
  const { customer_id, lead_id, inspector_id, inspection_date, property_address, pest_type, severity, findings, recommendations, photos, status } = req.body;
  getDb().prepare('UPDATE inspections SET customer_id=?, lead_id=?, inspector_id=?, inspection_date=?, property_address=?, pest_type=?, severity=?, findings=?, recommendations=?, photos=?, status=? WHERE id=?').run(customer_id, lead_id, inspector_id, inspection_date, property_address, pest_type, severity, findings, recommendations, photos, status, req.params.id);
  res.json({ message: 'Inspection updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM inspections WHERE id = ?').run(req.params.id);
  res.json({ message: 'Inspection deleted' });
});

module.exports = router;
