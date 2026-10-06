const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'crm.db')
  : path.join(__dirname, 'crm.db');
let db = null;
let SQL = null;

// Wrapper to mimic better-sqlite3 API
class DbWrapper {
  constructor(sqlDb) { this._db = sqlDb; }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        return { lastInsertRowid: self._db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0, changes: self._db.getRowsModified() };
      },
      get(...params) {
        let stmt;
        try {
          stmt = self._db.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) { return stmt.getAsObject(); }
          return undefined;
        } finally { if (stmt) stmt.free(); }
      },
      all(...params) {
        let stmt;
        try {
          stmt = self._db.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) { results.push(stmt.getAsObject()); }
          return results;
        } finally { if (stmt) stmt.free(); }
      }
    };
  }

  exec(sql) { this._db.exec(sql); }

  transaction(fn) {
    return (...args) => {
      this._db.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this._db.exec('COMMIT');
        return result;
      } catch (e) {
        this._db.exec('ROLLBACK');
        throw e;
      }
    };
  }

  pragma(str) { /* sql.js handles this internally */ }
}

function saveDb() {
  if (db && db._db) {
    const data = db._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

async function initializeDatabase() {
  SQL = await initSqlJs({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file)
  });
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new DbWrapper(new SQL.Database(fileBuffer));
  } else {
    db = new DbWrapper(new SQL.Database());
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT NOT NULL,
      address TEXT, city TEXT, state TEXT, zip TEXT, post_office TEXT, mouza TEXT,
      village TEXT, para TEXT, property_type TEXT, property_size TEXT,
      notes TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT,
      source TEXT, status TEXT DEFAULT 'new', priority TEXT DEFAULT 'medium', property_type TEXT,
      post_office TEXT, mouza TEXT, village TEXT, para TEXT, pin_code TEXT,
      pest_type TEXT, notes TEXT, assigned_to INTEGER, follow_up_date TEXT,
      conversion_value REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS lead_followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER NOT NULL, employee_id INTEGER,
      follow_up_date TEXT NOT NULL, notes TEXT, status TEXT DEFAULT 'pending', outcome TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT,
      role TEXT, department TEXT, salary REAL DEFAULT 0, join_date TEXT,
      status TEXT DEFAULT 'active', address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT,
      specialization TEXT, license_number TEXT, license_expiry TEXT, status TEXT DEFAULT 'available',
      current_lat REAL, current_lng REAL, rating REAL DEFAULT 0, total_jobs INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT,
      company TEXT, address TEXT, category TEXT, gst_number TEXT, payment_terms TEXT,
      status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, lead_id INTEGER,
      inspector_id INTEGER, inspection_date TEXT NOT NULL, property_address TEXT, pest_type TEXT,
      severity TEXT DEFAULT 'low', findings TEXT, recommendations TEXT, photos TEXT,
      status TEXT DEFAULT 'scheduled', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, quote_number TEXT UNIQUE, customer_id INTEGER,
      lead_id INTEGER, inspection_id INTEGER, title TEXT, description TEXT, items TEXT,
      subtotal REAL DEFAULT 0, tax_rate REAL DEFAULT 0, tax_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0, total REAL DEFAULT 0, valid_until TEXT,
      status TEXT DEFAULT 'draft', gst_type TEXT DEFAULT 'none',
      sgst REAL DEFAULT 0, cgst REAL DEFAULT 0, igst REAL DEFAULT 0,
      sac_code TEXT, warranty_note TEXT, contact_person TEXT,
      terms_conditions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, contract_number TEXT UNIQUE, customer_id INTEGER NOT NULL,
      title TEXT, description TEXT, service_type TEXT, frequency TEXT, start_date TEXT NOT NULL,
      end_date TEXT NOT NULL, value REAL DEFAULT 0, billing_cycle TEXT DEFAULT 'monthly',
      billing_amount REAL DEFAULT 0, status TEXT DEFAULT 'active', auto_renew INTEGER DEFAULT 0,
      terms TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT UNIQUE, customer_id INTEGER NOT NULL,
      contract_id INTEGER, quotation_id INTEGER, title TEXT, items TEXT,
      subtotal REAL DEFAULT 0, tax_rate REAL DEFAULT 18, tax_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0, total REAL DEFAULT 0, paid_amount REAL DEFAULT 0,
      due_date TEXT, status TEXT DEFAULT 'draft',
      gst_type TEXT DEFAULT 'none', sgst REAL DEFAULT 0, cgst REAL DEFAULT 0, igst REAL DEFAULT 0,
      sac_code TEXT, warranty_from TEXT, warranty_to TEXT, warranty_note TEXT,
      contact_person TEXT, booking_id TEXT, service_period TEXT,
      service_count INTEGER, per_service_rate REAL, amount_in_words TEXT,
      terms_conditions TEXT, invoice_type TEXT DEFAULT 'standard',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER, customer_id INTEGER,
      amount REAL NOT NULL, payment_method TEXT, payment_date TEXT, reference TEXT, notes TEXT,
      status TEXT DEFAULT 'completed', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payment_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL, reminder_date TEXT, sent_date TEXT,
      method TEXT DEFAULT 'email', status TEXT DEFAULT 'pending', notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT, complaint_number TEXT UNIQUE,
      customer_id INTEGER NOT NULL, contract_id INTEGER, category TEXT,
      priority TEXT DEFAULT 'medium', subject TEXT NOT NULL, description TEXT,
      assigned_to INTEGER, resolution TEXT, status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, resolved_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS service_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, assignment_number TEXT UNIQUE,
      customer_id INTEGER NOT NULL, contract_id INTEGER, technician_id INTEGER,
      service_type TEXT, scheduled_date TEXT NOT NULL, scheduled_time TEXT, address TEXT,
      instructions TEXT, status TEXT DEFAULT 'assigned', completed_at DATETIME, notes TEXT,
      rating INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS geofence_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT, technician_id INTEGER NOT NULL,
      assignment_id INTEGER, action TEXT NOT NULL, latitude REAL, longitude REAL,
      address TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS call_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, lead_id INTEGER,
      employee_id INTEGER, direction TEXT DEFAULT 'outbound', duration INTEGER DEFAULT 0,
      notes TEXT, recording_url TEXT, call_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS field_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, assignment_id INTEGER, technician_id INTEGER,
      customer_id INTEGER, report_date TEXT, findings TEXT, actions_taken TEXT,
      chemicals_used TEXT, photos TEXT, customer_signature TEXT,
      status TEXT DEFAULT 'draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, certificate_number TEXT UNIQUE,
      customer_id INTEGER, type TEXT DEFAULT 'service', title TEXT, description TEXT,
      service_date TEXT, valid_from TEXT, valid_until TEXT, issued_by TEXT, pdf_path TEXT,
      customer_address TEXT, contact_period TEXT, method TEXT, chemicals TEXT,
      premise_address TEXT, ref_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sku TEXT UNIQUE,
      category TEXT, description TEXT, unit TEXT DEFAULT 'pcs', quantity REAL DEFAULT 0,
      min_quantity REAL DEFAULT 0, cost_price REAL DEFAULT 0, selling_price REAL DEFAULT 0,
      supplier_id INTEGER, location TEXT, status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, inventory_id INTEGER NOT NULL,
      type TEXT NOT NULL, quantity REAL NOT NULL, reference_type TEXT,
      reference_id INTEGER, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, expense_number TEXT UNIQUE, date TEXT NOT NULL,
      category TEXT, description TEXT, amount REAL NOT NULL, vendor_id INTEGER,
      payment_method TEXT, receipt_path TEXT, approved_by INTEGER,
      status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS receipt_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, voucher_number TEXT UNIQUE, date TEXT NOT NULL,
      party_name TEXT, party_type TEXT, amount REAL NOT NULL, payment_method TEXT,
      description TEXT, reference TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payment_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, voucher_number TEXT UNIQUE, date TEXT NOT NULL,
      party_name TEXT, party_type TEXT, amount REAL NOT NULL, payment_method TEXT,
      description TEXT, approved_by TEXT, reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, date TEXT NOT NULL,
      check_in TEXT, check_out TEXT, status TEXT DEFAULT 'present', notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, month TEXT NOT NULL,
      year INTEGER NOT NULL, basic_salary REAL DEFAULT 0, allowances REAL DEFAULT 0,
      deductions REAL DEFAULT 0, overtime REAL DEFAULT 0, bonus REAL DEFAULT 0,
      tax REAL DEFAULT 0, net_salary REAL DEFAULT 0, status TEXT DEFAULT 'pending',
      paid_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, template TEXT, message TEXT,
      recipient_count INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0,
      delivered_count INTEGER DEFAULT 0, status TEXT DEFAULT 'draft',
      scheduled_at TEXT, sent_at TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS audit_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, auditor_id INTEGER,
      inspection_date TEXT, location TEXT, checklist TEXT, findings TEXT,
      score REAL DEFAULT 0, status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customer_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL,
      document_type TEXT NOT NULL, reference_id INTEGER, file_name TEXT NOT NULL,
      file_path TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customer_document_email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL,
      status TEXT NOT NULL, sent_to TEXT, sent_at TEXT, error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaultData();
  runMigrations();
  saveDb();
  
  // Auto-save every 5 seconds
  setInterval(saveDb, 5000);
}

function seedDefaultData() {
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get();
  if (customerCount && customerCount.count > 0) return;

  // Customers
  const insertCustomer = db.prepare(`INSERT INTO customers (name, email, phone, address, city, state, property_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const customers = [
    ['Rajesh Kumar', 'rajesh@email.com', '+91 98765 43210', '123 MG Road', 'Mumbai', 'Maharashtra', 'Residential', 'active'],
    ['Priya Sharma', 'priya@email.com', '+91 98765 43211', '456 Park Street', 'Delhi', 'Delhi', 'Commercial', 'active'],
    ['Amit Patel', 'amit@email.com', '+91 98765 43212', '789 Lake View', 'Ahmedabad', 'Gujarat', 'Industrial', 'active'],
    ['Sunita Reddy', 'sunita@email.com', '+91 98765 43213', '321 Banjara Hills', 'Hyderabad', 'Telangana', 'Residential', 'active'],
    ['Vikram Singh', 'vikram@email.com', '+91 98765 43214', '654 Sector 21', 'Chandigarh', 'Punjab', 'Commercial', 'active'],
    ['Hotel Grand Palace', 'info@grandpalace.com', '+91 98765 43215', '100 Marine Drive', 'Mumbai', 'Maharashtra', 'Commercial', 'active'],
    ['Green Valley Apartments', 'gv.apt@email.com', '+91 98765 43216', '200 Whitefield', 'Bangalore', 'Karnataka', 'Residential', 'active'],
    ['Food Corp India', 'contact@fci.com', '+91 98765 43217', '50 Industrial Area', 'Pune', 'Maharashtra', 'Industrial', 'active'],
  ];
  customers.forEach(c => insertCustomer.run(...c));

  // Technicians
  const insertTech = db.prepare(`INSERT INTO technicians (name, email, phone, specialization, license_number, status) VALUES (?, ?, ?, ?, ?, ?)`);
  [['Suresh Field','suresh@company.com','+91 99001 00001','Termite Control','PCO-2024-001','available'],
   ['Ramesh Field','ramesh@company.com','+91 99001 00002','Rodent Control','PCO-2024-002','on-job'],
   ['Deepak Field','deepak@company.com','+91 99001 00003','Fumigation','PCO-2024-003','available'],
   ['Kiran Field','kiran@company.com','+91 99001 00004','General Pest Control','PCO-2024-004','available']
  ].forEach(t => insertTech.run(...t));

  // Employees
  const insertEmp = db.prepare(`INSERT INTO employees (name, email, phone, role, department, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  [['Admin User','admin@pestcontrol.com','+91 99000 00001','Admin','Management',75000,'active'],
   ['Sales Manager','sales@pestcontrol.com','+91 99000 00002','Manager','Sales',55000,'active'],
   ['Field Supervisor','supervisor@pestcontrol.com','+91 99000 00003','Supervisor','Operations',45000,'active'],
   ['Accountant','accounts@pestcontrol.com','+91 99000 00004','Accountant','Finance',50000,'active']
  ].forEach(e => insertEmp.run(...e));

  // Vendors
  const insertVendor = db.prepare(`INSERT INTO vendors (name, email, phone, company, category, status) VALUES (?, ?, ?, ?, ?, ?)`);
  [['ChemSupply Co','info@chemsupply.com','+91 88000 00001','ChemSupply Pvt Ltd','Chemicals','active'],
   ['PestEquip Inc','sales@pestequip.com','+91 88000 00002','PestEquip India','Equipment','active'],
   ['SafeGuard PPE','orders@safeguard.com','+91 88000 00003','SafeGuard Solutions','Safety Equipment','active']
  ].forEach(v => insertVendor.run(...v));

  // Leads
  const insertLead = db.prepare(`INSERT INTO leads (name, email, phone, source, status, priority, pest_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  [['Manoj Tiwari','manoj@email.com','+91 87654 32100','Website','new','high','Termites','Urgent termite issue'],
   ['Neha Gupta','neha@email.com','+91 87654 32101','Referral','contacted','medium','Cockroaches','Kitchen pest problem'],
   ['Office Complex','admin@office.com','+91 87654 32102','Google Ads','qualified','high','Rodents','Annual contract inquiry'],
   ['School ABC','principal@school.com','+91 87654 32103','Cold Call','new','medium','General Pests','Campus pest control'],
   ['Restaurant XYZ','manager@rest.com','+91 87654 32104','Walk-in','proposal','high','Cockroaches','FSSAI compliance']
  ].forEach(l => insertLead.run(...l));

  // Inventory
  const insertInv = db.prepare(`INSERT INTO inventory (name, sku, category, unit, quantity, min_quantity, cost_price, selling_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [['Imidacloprid 17.8 SL','CHEM-001','Chemical','litre',50,10,800,1200,'active'],
   ['Fipronil 5 SC','CHEM-002','Chemical','litre',30,10,1200,1800,'active'],
   ['Bifenthrin 10 EC','CHEM-003','Chemical','litre',40,15,600,950,'active'],
   ['Compression Sprayer 5L','EQP-001','Equipment','pcs',10,3,2500,4000,'active'],
   ['ULV Fogger Machine','EQP-002','Equipment','pcs',5,2,15000,25000,'active'],
   ['Bait Stations (10pk)','EQP-003','Equipment','pack',20,5,300,550,'active'],
   ['Safety Goggles','SAF-001','Safety','pcs',50,20,150,300,'active'],
   ['N95 Mask','SAF-002','Safety','pcs',100,30,50,120,'active'],
   ['Gloves Box','SAF-003','Safety','box',25,10,200,400,'active']
  ].forEach(i => insertInv.run(...i));

  // Contracts
  const insertContract = db.prepare(`INSERT INTO contracts (contract_number, customer_id, title, service_type, frequency, start_date, end_date, value, billing_cycle, billing_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [['CNT-2025-001',1,'Annual Termite Protection','Termite Control','quarterly','2025-01-01','2025-12-31',24000,'quarterly',6000,'active'],
   ['CNT-2025-002',6,'Hotel Pest Management','General Pest Control','monthly','2025-01-01','2025-12-31',120000,'monthly',10000,'active'],
   ['CNT-2025-003',7,'Apartment Complex AMC','Comprehensive Pest','monthly','2025-03-01','2026-02-28',180000,'monthly',15000,'active'],
   ['CNT-2024-010',2,'Office Rodent Control','Rodent Control','monthly','2024-06-01','2025-08-31',36000,'monthly',3000,'expiring']
  ].forEach(c => insertContract.run(...c));

  // Invoices
  const insertInvoice = db.prepare(`INSERT INTO invoices (invoice_number, customer_id, contract_id, title, items, subtotal, tax_rate, tax_amount, discount, total, paid_amount, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [['INV-2025-001',1,1,'Termite Treatment Q1','[{"name":"Termite Treatment","qty":1,"rate":6000}]',6000,18,1080,0,7080,7080,'2025-02-15','paid'],
   ['INV-2025-002',6,2,'Monthly Pest Control - Jan','[{"name":"GPC Service","qty":1,"rate":10000}]',10000,18,1800,0,11800,11800,'2025-02-10','paid'],
   ['INV-2025-003',6,2,'Monthly Pest Control - Feb','[{"name":"GPC Service","qty":1,"rate":10000}]',10000,18,1800,0,11800,5000,'2025-03-10','partial'],
   ['INV-2025-004',7,3,'Apartment AMC - March','[{"name":"Comprehensive Pest","qty":1,"rate":15000}]',15000,18,2700,0,17700,0,'2025-04-05','unpaid'],
   ['INV-2025-005',2,4,'Rodent Control Service','[{"name":"Rodent Treatment","qty":1,"rate":3000}]',3000,18,540,0,3540,0,'2025-03-20','overdue']
  ].forEach(i => insertInvoice.run(...i));

  // Service Assignments
  const insertAssignment = db.prepare(`INSERT INTO service_assignments (assignment_number, customer_id, contract_id, technician_id, service_type, scheduled_date, scheduled_time, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [['SA-2025-001',1,1,1,'Termite Treatment','2025-03-15','10:00','123 MG Road, Mumbai','completed'],
   ['SA-2025-002',6,2,2,'General Pest Control','2026-08-10','09:00','100 Marine Drive, Mumbai','in-progress'],
   ['SA-2025-003',7,3,4,'Comprehensive Pest','2026-08-12','08:00','200 Whitefield, Bangalore','assigned'],
   ['SA-2025-004',2,4,2,'Rodent Control','2026-08-15','11:00','456 Park Street, Delhi','assigned'],
   ['SA-2025-005',3,null,3,'Fumigation','2026-08-20','07:00','789 Lake View, Ahmedabad','assigned']
  ].forEach(a => insertAssignment.run(...a));

  // Complaints
  const insertComplaint = db.prepare(`INSERT INTO complaints (complaint_number, customer_id, category, priority, subject, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  [['CMP-2025-001',1,'Service Quality','medium','Termites still visible','Termite activity in garage area.','open'],
   ['CMP-2025-002',6,'Scheduling','low','Technician arrived late','2 hours late without intimation.','resolved'],
   ['CMP-2025-003',7,'Effectiveness','high','Cockroach issue not resolved','Problem persists in common areas.','in-progress']
  ].forEach(c => insertComplaint.run(...c));

  // Expenses
  const insertExpense = db.prepare(`INSERT INTO expenses (expense_number, date, category, description, amount, vendor_id, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  [['EXP-2025-001','2025-03-01','Chemicals','Monthly chemical purchase',25000,1,'Bank Transfer','approved'],
   ['EXP-2025-002','2025-03-05','Equipment','Sprayer nozzle replacement',3500,2,'UPI','approved'],
   ['EXP-2025-003','2025-03-10','Fuel','Vehicle fuel',8000,null,'Cash','pending'],
   ['EXP-2025-004','2025-03-12','Safety','PPE restocking',5000,3,'Bank Transfer','approved']
  ].forEach(e => insertExpense.run(...e));

  // Attendance
  const insertAtt = db.prepare(`INSERT INTO attendance (employee_id, date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)`);
  const today = new Date().toISOString().split('T')[0];
  for (let empId = 1; empId <= 4; empId++) insertAtt.run(empId, today, '09:00', '18:00', 'present');
  for (let techId = 1; techId <= 4; techId++) insertAtt.run(techId, today, '08:00', '17:00', 'present');

  // Settings
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);
  [['company_name','ADHUNIK PEST CONTROL PVT. LTD.'],
   ['company_email','info@adhunikpestcontrol.com'],
   ['company_email2','rdinfotech2016@gmail.com'],
   ['company_phone','+91 8609387288'],
   ['company_phone2','+91 9134153884'],
   ['company_address','PROMODGARH, P.O.-GOURANGA NAGAR, P.S.-New Town, PIN-700162'],
   ['company_reg_office','C/O BARUN DAS, UCHILDAHA, HAROA, North 24 PARGANAS, West Bengal-743425'],
   ['company_cin','U74999WB2019PTC230500'],
   ['company_tan','CALA24665E'],
   ['company_gstin','19AARCA9483H1ZV'],
   ['company_msme','WB14E0020935'],
   ['company_iso','20EQBB82'],
   ['company_license','P19685'],
   ['company_website','www.adhunikpestcontrol.com'],
   ['company_bank_name','INDIAN OVERSEAS BANK'],
   ['company_bank_account','212202000006246'],
   ['company_bank_ifsc','IOBA0002122'],
   ['company_bank_branch','BAGUHATI'],
   ['company_upi','8609387288'],
   ['tax_rate','18'],['currency','INR'],['currency_symbol','\u20B9'],
   ['sac_code','998531']
  ].forEach(s => insertSetting.run(s[0], s[1]));

  console.log('Database seeded with default data.');
}

function getDb() { return db; }

function runMigrations() {
  // Add new columns to existing tables if they don't exist
  const addCols = (table, cols) => {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
    cols.forEach(([name, type, def]) => {
      if (!existing.includes(name)) {
        try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type} DEFAULT ${def || 'NULL'}`); } catch(e) {}
      }
    });
  };
  addCols('invoices', [
    ['gst_type','TEXT',"'none'"],['sgst','REAL','0'],['cgst','REAL','0'],['igst','REAL','0'],
    ['sac_code','TEXT'],['warranty_from','TEXT'],['warranty_to','TEXT'],['warranty_note','TEXT'],
    ['contact_person','TEXT'],['booking_id','TEXT'],['service_period','TEXT'],
    ['service_count','INTEGER'],['per_service_rate','REAL'],['amount_in_words','TEXT'],
    ['terms_conditions','TEXT'],['invoice_type','TEXT',"'standard'"]
  ]);
  addCols('certificates', [
    ['customer_address','TEXT'],['contact_period','TEXT'],['method','TEXT'],
    ['chemicals','TEXT'],['premise_address','TEXT'],['ref_number','TEXT']
  ]);
  addCols('quotations', [
    ['gst_type','TEXT',"'none'"],['sgst','REAL','0'],['cgst','REAL','0'],['igst','REAL','0'],
    ['sac_code','TEXT'],['warranty_note','TEXT'],['contact_person','TEXT'],['terms_conditions','TEXT']
  ]);
  addCols('customers', [
    ['gstin','TEXT'],['contact_person','TEXT'],['lead_id','INTEGER'],['company_name','TEXT'],
    ['post_office','TEXT'],['mouza','TEXT'],['village','TEXT'],['para','TEXT'],
    ['service_type','TEXT'],['service_frequency','TEXT'],['service_rate','REAL'],['service_count','INTEGER'],
    ['contract_start_date','TEXT'],['contract_end_date','TEXT'],['service_day','TEXT'],['service_time','TEXT'],
    ['payment_terms','TEXT'],['advance_amount','REAL'],['treatment_method','TEXT'],['chemicals_used','TEXT']
  ]);
  addCols('leads', [
    ['post_office','TEXT'],['mouza','TEXT'],['village','TEXT'],['para','TEXT'],['pin_code','TEXT']
  ]);
  console.log('Migrations checked.');
}

module.exports = { getDb, initializeDatabase, saveDb, get db() { return db; } };
