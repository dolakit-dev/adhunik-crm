const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET all leads
router.get('/', (req, res) => {
  const { status, priority, search } = req.query;
  let sql = `SELECT l.*, e.name as assigned_to_name, c.id as converted_customer_id FROM leads l LEFT JOIN employees e ON l.assigned_to = e.id LEFT JOIN customers c ON c.lead_id = l.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND l.status = ?'; params.push(status); }
  if (priority) { sql += ' AND l.priority = ?'; params.push(priority); }
  if (search) { sql += ' AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY l.created_at DESC';
  const leads = getDb().prepare(sql).all(...params);
  res.json(leads);
});

// GET single lead
router.get('/:id', (req, res) => {
  const lead = getDb().prepare(`SELECT l.*, e.name as assigned_to_name FROM leads l LEFT JOIN employees e ON l.assigned_to = e.id WHERE l.id = ?`).get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const followups = getDb().prepare('SELECT * FROM lead_followups WHERE lead_id = ? ORDER BY follow_up_date DESC').all(req.params.id);
  res.json({ ...lead, followups });
});

// POST create lead
router.post('/', (req, res) => {
  const { name, email, phone, source, status, priority, property_type, pest_type, notes, assigned_to, follow_up_date, conversion_value, post_office, mouza, village, para, pin_code } = req.body;
  const result = getDb().prepare(`INSERT INTO leads (name, email, phone, source, status, priority, property_type, pest_type, notes, assigned_to, follow_up_date, conversion_value, post_office, mouza, village, para, pin_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name ?? null, email ?? null, phone ?? null, source || 'Website', status || 'new', priority || 'medium', property_type ?? null, pest_type ?? null, notes ?? null, assigned_to ?? null, follow_up_date ?? null, conversion_value || 0, post_office ?? null, mouza ?? null, village ?? null, para ?? null, pin_code ?? null);
  res.json({ id: result.lastInsertRowid, message: 'Lead created' });
});

router.post('/:id/convert', (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const existingCustomer = db.prepare('SELECT id FROM customers WHERE lead_id = ?').get(lead.id);
  if (existingCustomer) return res.json({ customer_id: existingCustomer.id, message: 'Lead already converted' });
  const result = db.prepare('INSERT INTO customers (name, email, phone, property_type, notes, status, gstin, lead_id, service_type, post_office, mouza, village, para, zip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    lead.name, lead.email, lead.phone || '', lead.property_type, lead.notes, 'active', null, lead.id, lead.pest_type,
    lead.post_office, lead.mouza, lead.village, lead.para, lead.pin_code);
  db.prepare("UPDATE leads SET status='won', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(lead.id);
  res.status(201).json({ customer_id: result.lastInsertRowid, message: 'Lead converted to customer' });
});

// PUT update lead
router.put('/:id', (req, res) => {
  const { name, email, phone, source, status, priority, property_type, pest_type, notes, assigned_to, follow_up_date, conversion_value, post_office, mouza, village, para, pin_code } = req.body;
  getDb().prepare(`UPDATE leads SET name=?, email=?, phone=?, source=?, status=?, priority=?, property_type=?, pest_type=?, notes=?, assigned_to=?, follow_up_date=?, conversion_value=?, post_office=?, mouza=?, village=?, para=?, pin_code=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(name ?? null, email ?? null, phone ?? null, source ?? null, status ?? null, priority ?? null, property_type ?? null, pest_type ?? null, notes ?? null, assigned_to ?? null, follow_up_date ?? null, conversion_value ?? null, post_office ?? null, mouza ?? null, village ?? null, para ?? null, pin_code ?? null, req.params.id);
  res.json({ message: 'Lead updated' });
});

// DELETE lead
router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM lead_followups WHERE lead_id = ?').run(req.params.id);
  getDb().prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ message: 'Lead deleted' });
});

// POST follow-up
router.post('/:id/followups', (req, res) => {
  const { employee_id, follow_up_date, notes, status, outcome } = req.body;
  const result = getDb().prepare('INSERT INTO lead_followups (lead_id, employee_id, follow_up_date, notes, status, outcome) VALUES (?, ?, ?, ?, ?, ?)').run(req.params.id, employee_id, follow_up_date, notes, status || 'pending', outcome);
  res.json({ id: result.lastInsertRowid, message: 'Follow-up created' });
});

// GET follow-ups
router.get('/followups/all', (req, res) => {
  const followups = getDb().prepare(`
    SELECT lf.*, l.name as lead_name, l.phone as lead_phone, e.name as employee_name
    FROM lead_followups lf
    LEFT JOIN leads l ON lf.lead_id = l.id
    LEFT JOIN employees e ON lf.employee_id = e.id
    ORDER BY lf.follow_up_date DESC
  `).all();
  res.json(followups);
});

// PUT update follow-up
router.put('/followups/:id', (req, res) => {
  const { status, outcome, notes } = req.body;
  getDb().prepare('UPDATE lead_followups SET status=?, outcome=?, notes=? WHERE id=?').run(status, outcome, notes, req.params.id);
  res.json({ message: 'Follow-up updated' });
});

// GET pipeline
router.get('/pipeline/data', (req, res) => {
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const pipeline = {};
  stages.forEach(stage => {
    pipeline[stage] = getDb().prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC').all(stage);
  });
  res.json(pipeline);
});

// GET reports
router.get('/reports/data', (req, res) => {
  const totalLeads = getDb().prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const bySource = getDb().prepare('SELECT source, COUNT(*) as count FROM leads GROUP BY source').all();
  const byStatus = getDb().prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
  const byPriority = getDb().prepare('SELECT priority, COUNT(*) as count FROM leads GROUP BY priority').all();
  const conversionRate = getDb().prepare("SELECT COUNT(*) as count FROM leads WHERE status='won'").get().count;
  const avgConversionValue = getDb().prepare("SELECT AVG(conversion_value) as avg FROM leads WHERE status='won'").get().avg;
  const monthlyLeads = getDb().prepare("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count FROM leads GROUP BY month ORDER BY month DESC LIMIT 12").all();
  res.json({ totalLeads, bySource, byStatus, byPriority, conversionRate, avgConversionValue, monthlyLeads });
});

module.exports = router;
