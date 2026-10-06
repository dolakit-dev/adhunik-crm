const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const reports = getDb().prepare(`
    SELECT fr.*, sa.assignment_number, t.name as technician_name, c.name as customer_name
    FROM field_reports fr
    LEFT JOIN service_assignments sa ON fr.assignment_id = sa.id
    LEFT JOIN technicians t ON fr.technician_id = t.id
    LEFT JOIN customers c ON fr.customer_id = c.id
    ORDER BY fr.created_at DESC
  `).all();
  res.json(reports);
});

router.get('/:id', (req, res) => {
  const report = getDb().prepare(`
    SELECT fr.*, sa.assignment_number, t.name as technician_name, c.name as customer_name
    FROM field_reports fr
    LEFT JOIN service_assignments sa ON fr.assignment_id = sa.id
    LEFT JOIN technicians t ON fr.technician_id = t.id
    LEFT JOIN customers c ON fr.customer_id = c.id
    WHERE fr.id = ?
  `).get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

router.post('/', (req, res) => {
  const { assignment_id, technician_id, customer_id, report_date, findings, actions_taken, chemicals_used, photos, customer_signature, status } = req.body;
  const result = getDb().prepare('INSERT INTO field_reports (assignment_id, technician_id, customer_id, report_date, findings, actions_taken, chemicals_used, photos, customer_signature, status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(assignment_id, technician_id, customer_id, report_date || new Date().toISOString().split('T')[0], findings, actions_taken, chemicals_used, photos, customer_signature, status || 'draft');
  // Update assignment if completed
  if (assignment_id && status === 'submitted') {
    getDb().prepare("UPDATE service_assignments SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(assignment_id);
  }
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { findings, actions_taken, chemicals_used, photos, customer_signature, status } = req.body;
  getDb().prepare('UPDATE field_reports SET findings=?, actions_taken=?, chemicals_used=?, photos=?, customer_signature=?, status=? WHERE id=?').run(findings, actions_taken, chemicals_used, photos, customer_signature, status, req.params.id);
  res.json({ message: 'Report updated' });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM field_reports WHERE id = ?').run(req.params.id);
  res.json({ message: 'Report deleted' });
});

module.exports = router;
