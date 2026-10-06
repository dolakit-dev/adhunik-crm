const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { initializeDatabase, getDb } = require('./db');
const { renderCertificate } = require('./lib/customer-document-pdfs');

const app = express();
const DEFAULT_PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to attach db to request
app.use((req, res, next) => {
  req.db = getDb();
  next();
});

async function startServer(portOverride, options = {}) {
  const PORT = typeof portOverride === 'object'
  ? (process.env.CRM_PORT || DEFAULT_PORT)
  : (portOverride || process.env.CRM_PORT || DEFAULT_PORT);
  // Initialize Database (async for sql.js)
  await initializeDatabase();
  console.log('Database initialized.');

  // ===== API ROUTES =====

  // ---------- DASHBOARD ----------
  app.get('/api/dashboard/stats', (req, res) => {
    const db = getDb();
    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const newLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status='new'").get().count;
    const activeContracts = db.prepare("SELECT COUNT(*) as count FROM contracts WHERE status='active'").get().count;
    const expiringContracts = db.prepare("SELECT COUNT(*) as count FROM contracts WHERE status='expiring'").get().count;
    const totalInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
    const unpaidInvoices = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status IN ('unpaid','overdue')").get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(paid_amount),0) as total FROM invoices WHERE status='paid'").get().total;
    const pendingAmount = db.prepare("SELECT COALESCE(SUM(total - paid_amount),0) as total FROM invoices WHERE status IN ('unpaid','overdue','partial')").get().total;
    const openComplaints = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status='open'").get().count;
    const todayAssignments = db.prepare("SELECT COUNT(*) as count FROM service_assignments WHERE scheduled_date <= date('now','+7 days') AND status != 'completed'").get().count;
    const totalTechnicians = db.prepare('SELECT COUNT(*) as count FROM technicians').get().count;
    const availableTechs = db.prepare("SELECT COUNT(*) as count FROM technicians WHERE status='available'").get().count;
    const lowStockItems = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_quantity').get().count;
    const totalExpenses = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE status='approved'").get().total;

    const recentInvoices = db.prepare(`
      SELECT i.invoice_number, i.total, i.status, c.name as customer_name
      FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id ORDER BY i.created_at DESC LIMIT 5
    `).all();

    const upcomingServices = db.prepare(`
      SELECT sa.assignment_number, sa.service_type, sa.scheduled_date, sa.status,
      c.name as customer_name, t.name as technician_name
      FROM service_assignments sa
      LEFT JOIN customers c ON sa.customer_id = c.id
      LEFT JOIN technicians t ON sa.technician_id = t.id
      WHERE sa.status IN ('assigned','in-progress')
      ORDER BY sa.scheduled_date ASC LIMIT 5
    `).all();

    res.json({
      totalCustomers, totalLeads, newLeads, activeContracts, expiringContracts,
      totalInvoices, unpaidInvoices, totalRevenue, pendingAmount,
      openComplaints, todayAssignments, totalTechnicians, availableTechs,
      lowStockItems, totalExpenses, recentInvoices, upcomingServices
    });
  });

  // ---------- LOAD ROUTES ----------
  app.use('/api/leads', require('./routes/leads'));
  app.use('/api/customers', require('./routes/customers'));
  app.use('/api/customers/:customerId/documents', require('./routes/customer-documents'));
  app.use('/api/technicians', require('./routes/technicians'));
  app.use('/api/employees', require('./routes/employees'));
  app.use('/api/vendors', require('./routes/vendors'));
  app.use('/api/inspections', require('./routes/inspections'));
  app.use('/api/quotations', require('./routes/quotations'));
  app.use('/api/contracts', require('./routes/contracts'));
  app.use('/api/invoices', require('./routes/invoices'));
  app.use('/api/complaints', require('./routes/complaints'));
  app.use('/api/assignments', require('./routes/assignments'));
  app.use('/api/inventory', require('./routes/inventory'));
  app.use('/api/expenses', require('./routes/expenses'));
  app.use('/api/vouchers', require('./routes/vouchers'));
  app.use('/api/field-reports', require('./routes/field-reports'));
  app.use('/api/attendance', require('./routes/attendance'));
  app.use('/api/payroll', require('./routes/payroll'));

  // ---------- CALENDAR ----------
  app.get('/api/calendar/events', (req, res) => {
    const db = getDb();
    let events = [];
    const assignments = db.prepare(`
      SELECT sa.service_type, sa.scheduled_date, sa.status,
      c.name as customer_name, t.name as technician_name
      FROM service_assignments sa
      LEFT JOIN customers c ON sa.customer_id = c.id
      LEFT JOIN technicians t ON sa.technician_id = t.id
    `).all();
    assignments.forEach(a => {
      events.push({ id: `sa-${a.id}`, title: `${a.service_type} - ${a.customer_name||''}`, date: a.scheduled_date, type: 'service', status: a.status });
    });
    const followups = db.prepare(`
      SELECT lf.id, lf.follow_up_date, lf.status, l.name as lead_name
      FROM lead_followups lf LEFT JOIN leads l ON lf.lead_id = l.id WHERE lf.status = 'pending'
    `).all();
    followups.forEach(f => {
      events.push({ id: `fu-${f.id}`, title: `Follow-up: ${f.lead_name||''}`, date: f.follow_up_date, type: 'followup', status: f.status });
    });
    const expiring = db.prepare(`
      SELECT c.id, c.end_date, c.status, cust.name as customer_name FROM contracts c
      LEFT JOIN customers cust ON c.customer_id = cust.id WHERE c.status IN ('active','expiring')
    `).all();
    expiring.forEach(c => {
      events.push({ id: `ce-${c.id}`, title: `Contract Expiry: ${c.customer_name||''}`, date: c.end_date, type: 'expiry', status: c.status });
    });
    res.json(events);
  });

  // ---------- WHATSAPP ----------
  app.get('/api/whatsapp/campaigns', (req, res) => {
    res.json(getDb().prepare('SELECT * FROM whatsapp_campaigns ORDER BY created_at DESC').all());
  });
  app.post('/api/whatsapp/campaigns', (req, res) => {
    const db = getDb();
    const { name, message, template } = req.body;
    const result = db.prepare('INSERT INTO whatsapp_campaigns (name, message, template, status) VALUES (?, ?, ?, ?)').run(name, message, template, 'draft');
    res.json({ id: result.lastInsertRowid, message: 'Campaign created' });
  });

  // ---------- CERTIFICATES ----------
  app.get('/api/certificates', (req, res) => {
    res.json(getDb().prepare(`SELECT cert.*, c.name as customer_name FROM certificates cert LEFT JOIN customers c ON cert.customer_id = c.id ORDER BY cert.created_at DESC`).all());
  });
  app.post('/api/certificates', (req, res) => {
    const db = getDb();
    const { customer_id, type, title, description, service_date, valid_from, valid_until, issued_by,
      contact_period, chemicals, method, premise_address, ref_number, customer_address } = req.body;
    const count = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;
    const certNum = `CERT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    db.prepare('INSERT INTO certificates (certificate_number, customer_id, type, title, description, service_date, valid_from, valid_until, issued_by, contact_period, chemicals, method, premise_address, ref_number, customer_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(certNum, customer_id, type, title, description, service_date, valid_from, valid_until, issued_by, contact_period, chemicals, method, premise_address, ref_number || certNum, customer_address);
    res.json({ certificate_number: certNum });
  });
  app.get('/api/certificates/:certificateId/pdf', async (req, res) => {
    const db = getDb();
    const certificate = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.certificateId);
    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(certificate.customer_id);
    if (!customer) return res.status(404).json({ error: 'Certificate customer not found' });
    const lead = customer.lead_id ? db.prepare('SELECT * FROM leads WHERE id = ?').get(customer.lead_id) : null;

    try {
      const bytes = await renderCertificate(customer, certificate, lead);
      const reference = String(certificate.certificate_number || certificate.id).replace(/[^a-zA-Z0-9_-]/g, '');
      res.type('application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="certificate-${reference}.pdf"`);
      res.send(Buffer.from(bytes));
    } catch (error) {
      console.error('Certificate PDF generation failed:', error);
      res.status(500).json({ error: 'Could not generate the Certificate PDF.' });
    }
  });

  // ---------- GEOFENCE ----------
  app.get('/api/geofence', (req, res) => {
    res.json(getDb().prepare(`SELECT ga.*, t.name as technician_name FROM geofence_activity ga LEFT JOIN technicians t ON ga.technician_id = t.id ORDER BY ga.timestamp DESC LIMIT 50`).all());
  });

  // ---------- CALLS ----------
  app.get('/api/calls', (req, res) => {
    res.json(getDb().prepare(`SELECT ch.*, c.name as customer_name, l.name as lead_name, e.name as employee_name FROM call_history ch LEFT JOIN customers c ON ch.customer_id = c.id LEFT JOIN leads l ON ch.lead_id = l.id LEFT JOIN employees e ON ch.employee_id = e.id ORDER BY ch.call_time DESC`).all());
  });
  app.post('/api/calls', (req, res) => {
    const { customer_id, lead_id, employee_id, direction, duration, notes } = req.body;
    const result = getDb().prepare('INSERT INTO call_history (customer_id, lead_id, employee_id, direction, duration, notes) VALUES (?,?,?,?,?,?)').run(customer_id||null, lead_id||null, employee_id||null, direction||'outbound', duration||0, notes);
    res.json({ id: result.lastInsertRowid });
  });

  // ---------- AUDITS ----------
  app.get('/api/audits', (req, res) => {
    res.json(getDb().prepare(`SELECT ai.*, c.name as customer_name, t.name as auditor_name FROM audit_inspections ai LEFT JOIN customers c ON ai.customer_id = c.id LEFT JOIN technicians t ON ai.auditor_id = t.id ORDER BY ai.created_at DESC`).all());
  });
  app.post('/api/audits', (req, res) => {
    const { customer_id, auditor_id, inspection_date, location, checklist, findings } = req.body;
    const result = getDb().prepare('INSERT INTO audit_inspections (customer_id, auditor_id, inspection_date, location, checklist, findings) VALUES (?,?,?,?,?,?)').run(customer_id, auditor_id, inspection_date, location, checklist, findings);
    res.json({ id: result.lastInsertRowid });
  });

  // ---------- SETTINGS ----------
  app.get('/api/settings', (req, res) => {
    const settings = getDb().prepare('SELECT * FROM settings').all();
    const obj = {};
    settings.forEach(s => obj[s.key] = s.value);
    res.json(obj);
  });
  app.put('/api/settings', (req, res) => {
    const db = getDb();
    for (const [key, value] of Object.entries(req.body)) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    }
    res.json({ message: 'Settings updated' });
  });

  // Fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  if (!options.serverless) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
}

// Export for Electron, or auto-start if run directly
module.exports = { startServer, app };

if (!process.versions.electron && !process.env.VERCEL) {
  startServer().catch(err => {
    console.error(err);
    process.exit(1);
  });
}