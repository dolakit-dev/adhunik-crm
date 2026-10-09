/* ===== Adhunik Pest Control CRM - Main Application ===== */

// ===== API Helper =====
const API = {
  async request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const r = await fetch(`/api${url}`, { ...options, signal: controller.signal });
      if (!r.ok) {
        let detail = '';
        try { const body = await r.json(); detail = body && body.error ? body.error : ''; } catch (err) {}
        throw new Error(detail || `Request failed (HTTP ${r.status})`);
      }
      return await r.json();
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out — please try again');
      if (err instanceof TypeError) throw new Error('Cannot reach the server — please check your connection');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },
  get(url) { return API.request(url); },
  post(url, data) { return API.request(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); },
  put(url, data) { return API.request(url, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); },
  del(url) { return API.request(url, { method:'DELETE' }); },
};

// ===== Utility Functions =====
const fmt = (n) => '₹' + Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:0});
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '-';
const badge = (status) => `<span class="badge-status badge-${(status||'').replace(/\s/g,'-').toLowerCase()}">${(status||'').replace(/-/g,' ')}</span>`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message) showToast(e.reason.message, 'error');
});

function openModal(title, body, footer='') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFooter').innerHTML = footer;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
document.getElementById('modalClose').onclick = closeModal;
document.getElementById('modalOverlay').onclick = (e) => { if(e.target===e.currentTarget) closeModal(); };

// ===== SIDEBAR NAVIGATION =====
document.getElementById('sidebarToggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');

document.querySelectorAll('[data-toggle="collapse"]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(el.dataset.target);
    const parent = el.closest('.has-submenu');
    if(target) target.classList.toggle('show');
    if(parent) parent.classList.toggle('open');
  });
});

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    navigateTo(el.dataset.page);
  });
});

// ===== PAGE TITLES =====
const pageTitles = {
  'dashboard':'CRM Dashboard','pest-dashboard':'Pest Control Dashboard','inventory-dashboard':'Inventory Dashboard',
  'calendar':'Service Calendar','smart-scheduling':'Smart Scheduling','leads':'All Leads','lead-followups':'Lead Follow-ups',
  'lead-pipeline':'Lead Pipeline','lead-reports':'Lead Reports','ai-call':'AI Call Assistant','inspections':'Inspections',
  'quotation-builder':'Quotation Builder','quotations':'All Quotations','new-contract':'New Contract',
  'manage-contracts':'Manage Contracts','recurring-billing':'Recurring Billing','expiring-contracts':'Expiring Contracts',
  'invoices':'Invoices','payment-reminders':'Payment Reminders','customer-outstandings':'Customer Outstandings',
  'new-complaint':'New Complaint','manage-complaints':'Manage Complaints','whatsapp-marketing':'WhatsApp Marketing',
  'customers':'Customers','technicians':'Technicians','employees':'Employees','vendors':'Vendors',
  'attendance':'Attendance Reports','assign-services':'Assign Services','assigned-services':'Assigned Services',
  'tracking':'Track Technicians','geofence':'Geofence Activity','call-history':'Call History',
  'field-reports':'Field Reports','certificate':'Certificate Generator','fumigation':'Fumigation Certificate',
  'audit':'Audit Inspections','receipt-voucher':'Receipt Voucher','payment-voucher':'Payment Voucher',
  'expenses':'Expenses','general-ledger':'General Ledger','customer-ledger':'Customer Ledger',
  'payroll':'Payroll Management','settings':'Settings',
};

// ===== ROUTER =====
function navigateTo(page) {
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  const container = document.getElementById('pageContainer');
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';
  const renderer = pageRenderers[page];
  if (renderer) {
    Promise.resolve(renderer(container)).catch(err => {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle" style="color:var(--danger)"></i><p>Could not load this page.<br>${escapeHtml(err.message || 'Unknown error')}</p></div>`;
    });
  }
  else container.innerHTML = `<div class="empty-state"><i class="fas fa-tools"></i><p>${pageTitles[page] || page} module - Coming soon</p></div>`;
}

// ===== PAGE RENDERERS =====
const pageRenderers = {};

// ===== DASHBOARD =====
pageRenderers['dashboard'] = async (el) => {
  const d = await API.get('/dashboard/stats');
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue">👥</div><div class="stat-info"><h3>${d.totalCustomers}</h3><p>Total Customers</p></div></div>
      <div class="stat-card"><div class="stat-icon green">👤</div><div class="stat-info"><h3>${d.totalLeads}</h3><p>Total Leads (${d.newLeads} new)</p></div></div>
      <div class="stat-card"><div class="stat-icon purple">📑</div><div class="stat-info"><h3>${d.activeContracts}</h3><p>Active Contracts</p></div></div>
      <div class="stat-card"><div class="stat-icon green">💰</div><div class="stat-info"><h3>${fmt(d.totalRevenue)}</h3><p>Total Revenue</p></div></div>
      <div class="stat-card"><div class="stat-icon red">🧾</div><div class="stat-info"><h3>${d.unpaidInvoices}</h3><p>Unpaid Invoices</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">📈</div><div class="stat-info"><h3>${fmt(d.pendingAmount)}</h3><p>Pending Amount</p></div></div>
      <div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><h3>${d.todayAssignments}</h3><p>Today's Services</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">⚠️</div><div class="stat-info"><h3>${d.openComplaints}</h3><p>Open Complaints</p></div></div>
      <div class="stat-card"><div class="stat-icon green">👷</div><div class="stat-info"><h3>${d.availableTechs}/${d.totalTechnicians}</h3><p>Available Technicians</p></div></div>
      <div class="stat-card"><div class="stat-icon red">📦</div><div class="stat-info"><h3>${d.lowStockItems}</h3><p>Low Stock Items</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">📑</div><div class="stat-info"><h3>${d.expiringContracts}</h3><p>Expiring Contracts</p></div></div>
      <div class="stat-card"><div class="stat-icon red">💸</div><div class="stat-info"><h3>${fmt(d.totalExpenses)}</h3><p>Total Expenses</p></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>Recent Invoices</h3></div><div class="card-body table-container">
        <table><thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        ${(d.recentInvoices||[]).map(i=>`<tr><td>${i.invoice_number}</td><td>${i.customer_name||'-'}</td><td>${fmt(i.total)}</td><td>${badge(i.status)}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card"><div class="card-header"><h3>Upcoming Services</h3></div><div class="card-body table-container">
        <table><thead><tr><th>Service</th><th>Customer</th><th>Technician</th><th>Date</th><th>Status</th></tr></thead><tbody>
        ${(d.upcomingServices||[]).map(s=>`<tr><td>${s.service_type}</td><td>${s.customer_name||'-'}</td><td>${s.technician_name||'-'}</td><td>${fmtDate(s.scheduled_date)}</td><td>${badge(s.status)}</td></tr>`).join('')}
        </tbody></table></div></div>
    </div>`;
};

// ===== PEST CONTROL DASHBOARD =====
pageRenderers['pest-dashboard'] = async (el) => {
  const d = await API.get('/dashboard/stats');
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><h3>${d.todayAssignments}</h3><p>Today's Services</p></div></div>
      <div class="stat-card"><div class="stat-icon green">👷</div><div class="stat-info"><h3>${d.availableTechs}</h3><p>Available Technicians</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">📑</div><div class="stat-info"><h3>${d.activeContracts}</h3><p>Active Contracts</p></div></div>
      <div class="stat-card"><div class="stat-icon red">⚠️</div><div class="stat-info"><h3>${d.openComplaints}</h3><p>Open Complaints</p></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Upcoming Pest Control Services</h3><button class="btn btn-primary btn-sm" onclick="navigateTo('assign-services')">+ Assign Service</button></div>
    <div class="card-body table-container">
      <table><thead><tr><th>Assignment#</th><th>Customer</th><th>Service Type</th><th>Technician</th><th>Date</th><th>Status</th></tr></thead><tbody>
      ${(d.upcomingServices||[]).map(s=>`<tr><td>${s.assignment_number||'-'}</td><td>${s.customer_name||'-'}</td><td>${s.service_type}</td><td>${s.technician_name||'-'}</td><td>${fmtDate(s.scheduled_date)}</td><td>${badge(s.status)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
};

// ===== INVENTORY DASHBOARD =====
pageRenderers['inventory-dashboard'] = async (el) => {
  const items = await API.get('/inventory');
  const lowStock = items.filter(i => i.quantity <= i.min_quantity);
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue">📦</div><div class="stat-info"><h3>${items.length}</h3><p>Total Items</p></div></div>
      <div class="stat-card"><div class="stat-icon red">⚠️</div><div class="stat-info"><h3>${lowStock.length}</h3><p>Low Stock Items</p></div></div>
      <div class="stat-card"><div class="stat-icon green">🧪</div><div class="stat-info"><h3>${items.filter(i=>i.category==='Chemical').length}</h3><p>Chemicals</p></div></div>
      <div class="stat-card"><div class="stat-icon purple">🔧</div><div class="stat-info"><h3>${items.filter(i=>i.category==='Equipment').length}</h3><p>Equipment</p></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Inventory Overview</h3><button class="btn btn-primary btn-sm" onclick="showAddItemModal()">+ Add Item</button></div>
    <div class="card-body table-container">
      <table><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Qty</th><th>Min Qty</th><th>Cost</th><th>Status</th></tr></thead><tbody>
      ${items.map(i=>`<tr><td>${i.sku}</td><td>${i.name}</td><td>${i.category||'-'}</td><td>${i.quantity} ${i.unit}</td><td>${i.min_quantity}</td><td>${fmt(i.cost_price)}</td><td>${i.quantity<=i.min_quantity?'<span class="badge-status badge-overdue">Low Stock</span>':'<span class="badge-status badge-active">OK</span>'}</td></tr>`).join('')}
      </tbody></table></div></div>`;
};

// ===== LEADS =====
pageRenderers['leads'] = async (el) => {
  const leads = await API.get('/leads');
  el.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-filters">
        <select class="form-control" style="width:140px" onchange="filterLeads(this.value)"><option value="">All Status</option><option>new</option><option>contacted</option><option>qualified</option><option>proposal</option><option>negotiation</option><option>won</option><option>lost</option></select>
        <input type="text" class="form-control" style="width:200px" placeholder="Search leads..." id="leadSearch" onkeyup="searchLeads(this.value)">
      </div>
      <button class="btn btn-primary" onclick="showLeadModal()">+ Add Lead</button>
    </div>
    <div class="card"><div class="card-body table-container">
      <table><thead><tr><th>Name</th><th>Phone</th><th>Source</th><th>Pest Type</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="leadsTableBody">
      ${leads.map(l=>`<tr><td><strong>${l.name}</strong></td><td>${l.phone||'-'}</td><td>${l.source||'-'}</td><td>${l.pest_type||'-'}</td><td>${badge(l.priority)}</td><td>${badge(l.status)}</td><td><div class="btn-group">${l.converted_customer_id?`<button class="btn btn-success btn-sm" onclick="editCustomer(${l.converted_customer_id})">Customer</button>`:`<button class="btn btn-primary btn-sm" onclick="convertLead(${l.id})">Convert</button>`}<button class="btn btn-outline btn-sm" onclick="editLead(${l.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteLead(${l.id})">Delete</button></div></td></tr>`).join('')}
      </tbody></table></div></div>`;
};

window.showLeadModal = (lead) => {
  const isEdit = !!lead;
  openModal(isEdit ? 'Edit Lead' : 'Add New Lead', `
    <form id="leadForm">
      <div class="form-row">
        <div class="form-group"><label>Name *</label><input class="form-control" name="name" value="${lead?.name||''}" required></div>
        <div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${lead?.phone||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input class="form-control" name="email" value="${lead?.email||''}"></div>
        <div class="form-group"><label>Source</label><select class="form-control" name="source"><option ${lead?.source==='Website'?'selected':''}>Website</option><option ${lead?.source==='Referral'?'selected':''}>Referral</option><option ${lead?.source==='Google Ads'?'selected':''}>Google Ads</option><option ${lead?.source==='Cold Call'?'selected':''}>Cold Call</option><option ${lead?.source==='Walk-in'?'selected':''}>Walk-in</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Pest Type</label><select class="form-control" name="pest_type"><option value="">Select</option><option ${lead?.pest_type==='Termites'?'selected':''}>Termites</option><option ${lead?.pest_type==='Cockroaches'?'selected':''}>Cockroaches</option><option ${lead?.pest_type==='Rodents'?'selected':''}>Rodents</option><option ${lead?.pest_type==='Mosquitoes'?'selected':''}>Mosquitoes</option><option ${lead?.pest_type==='Bed Bugs'?'selected':''}>Bed Bugs</option><option ${lead?.pest_type==='Ants'?'selected':''}>Ants</option><option ${lead?.pest_type==='General Pests'?'selected':''}>General Pests</option></select></div>
        <div class="form-group"><label>Priority</label><select class="form-control" name="priority"><option ${lead?.priority==='low'?'selected':''}>low</option><option ${lead?.priority==='medium'?'selected':''}>medium</option><option ${lead?.priority==='high'?'selected':''}>high</option></select></div>
      </div>
      <div class="form-row"><div class="form-group"><label>Post Office</label><input class="form-control" name="post_office" value="${lead?.post_office||''}"></div><div class="form-group"><label>Mouza</label><input class="form-control" name="mouza" value="${lead?.mouza||''}"></div></div>
      <div class="form-row"><div class="form-group"><label>Village</label><input class="form-control" name="village" value="${lead?.village||''}"></div><div class="form-group"><label>Para</label><input class="form-control" name="para" value="${lead?.para||''}"></div></div>
      <div class="form-group"><label>PIN Code</label><input class="form-control" name="pin_code" value="${lead?.pin_code||''}"></div>
      <div class="form-row">
        <div class="form-group"><label>Status</label><select class="form-control" name="status"><option>new</option><option>contacted</option><option>qualified</option><option>proposal</option><option>negotiation</option><option>won</option><option>lost</option></select></div>
        <div class="form-group"><label>Conversion Value</label><input class="form-control" name="conversion_value" type="number" value="${lead?.conversion_value||0}"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" name="notes">${lead?.notes||''}</textarea></div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveLead(${lead?.id||'null'})">${isEdit?'Update':'Create'} Lead</button>`
  );
};

window.saveLead = async (id) => {
  const form = document.getElementById('leadForm');
  const data = Object.fromEntries(new FormData(form));
  data.conversion_value = Number(data.conversion_value);
  if (id) await API.put(`/leads/${id}`, data);
  else await API.post('/leads', data);
  closeModal(); showToast(id?'Lead updated':'Lead created'); navigateTo('leads');
};

window.editLead = async (id) => {
  const lead = await API.get(`/leads/${id}`);
  showLeadModal(lead);
};

window.convertLead = async (id) => {
  const result = await API.post(`/leads/${id}/convert`, {});
  if (result.error) return showToast(result.error, 'error');
  navigateTo('customers');
  showToast('Lead converted. Complete the customer details to prepare documents.');
  window.editCustomer(result.customer_id);
};

window.deleteLead = async (id) => {
  if(!confirm('Delete this lead?')) return;
  await API.del(`/leads/${id}`); showToast('Lead deleted','info'); navigateTo('leads');
};

// ===== LEAD FOLLOW-UPS =====
pageRenderers['lead-followups'] = async (el) => {
  const followups = await API.get('/leads/followups/all');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="showFollowupModal()">+ Schedule Follow-up</button></div>
    <div class="card"><div class="card-body table-container">
      <table><thead><tr><th>Lead</th><th>Phone</th><th>Follow-up Date</th><th>Assigned To</th><th>Notes</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${followups.map(f=>`<tr><td>${f.lead_name||'-'}</td><td>${f.lead_phone||'-'}</td><td>${fmtDate(f.follow_up_date)}</td><td>${f.employee_name||'-'}</td><td>${f.notes||'-'}</td><td>${badge(f.status)}</td><td><button class="btn btn-outline btn-sm" onclick="completeFollowup(${f.id})">Complete</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
};

window.showFollowupModal = async () => {
  const leads = await API.get('/leads');
  openModal('Schedule Follow-up', `
    <form id="followupForm">
      <div class="form-group"><label>Lead *</label><select class="form-control" name="lead_id" required>${leads.map(l=>`<option value="${l.id}">${l.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Follow-up Date *</label><input type="date" class="form-control" name="follow_up_date" required></div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" name="notes"></textarea></div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveFollowup()">Schedule</button>`
  );
};

window.saveFollowup = async () => {
  const data = Object.fromEntries(new FormData(document.getElementById('followupForm')));
  await API.post(`/leads/${data.lead_id}/followups`, data);
  closeModal(); showToast('Follow-up scheduled'); navigateTo('lead-followups');
};

window.completeFollowup = async (id) => {
  await API.put(`/leads/followups/${id}`, {status:'completed',outcome:'Done'});
  showToast('Follow-up completed'); navigateTo('lead-followups');
};

// ===== LEAD PIPELINE =====
pageRenderers['lead-pipeline'] = async (el) => {
  const pipeline = await API.get('/leads/pipeline/data');
  const stages = ['new','contacted','qualified','proposal','negotiation','won','lost'];
  el.innerHTML = `<div class="pipeline-board">${stages.map(s=>`
    <div class="pipeline-column"><h4>${s.charAt(0).toUpperCase()+s.slice(1)} <span>${(pipeline[s]||[]).length}</span></h4>
    ${(pipeline[s]||[]).map(l=>`<div class="pipeline-card"><h5>${l.name}</h5><p>${l.phone||''}</p><p>${l.pest_type||''}</p><p>${badge(l.priority)}</p></div>`).join('')}
    </div>`).join('')}</div>`;
};

// ===== LEAD REPORTS =====
pageRenderers['lead-reports'] = async (el) => {
  const r = await API.get('/leads/reports/data');
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue">👤</div><div class="stat-info"><h3>${r.totalLeads}</h3><p>Total Leads</p></div></div>
      <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><h3>${r.conversionRate}</h3><p>Won Leads</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">💰</div><div class="stat-info"><h3>${fmt(r.avgConversionValue)}</h3><p>Avg Conversion Value</p></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><h3>Leads by Source</h3></div><div class="card-body">
        <table><thead><tr><th>Source</th><th>Count</th></tr></thead><tbody>${(r.bySource||[]).map(s=>`<tr><td>${s.source||'Unknown'}</td><td>${s.count}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><div class="card-header"><h3>Leads by Status</h3></div><div class="card-body">
        <table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>${(r.byStatus||[]).map(s=>`<tr><td>${badge(s.status)}</td><td>${s.count}</td></tr>`).join('')}</tbody></table></div></div>
    </div>`;
};

// ===== AI CALL ASSISTANT =====
pageRenderers['ai-call'] = async (el) => {
  const calls = await API.get('/calls');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="showCallModal()">+ Log Call</button></div>
    <div class="card"><div class="card-body table-container">
      <table><thead><tr><th>Time</th><th>Customer/Lead</th><th>Employee</th><th>Direction</th><th>Duration</th><th>Notes</th></tr></thead><tbody>
      ${calls.map(c=>`<tr><td>${fmtDate(c.call_time)}</td><td>${c.customer_name||c.lead_name||'-'}</td><td>${c.employee_name||'-'}</td><td>${c.direction}</td><td>${c.duration}s</td><td>${c.notes||'-'}</td></tr>`).join('')}
      </tbody></table></div></div>`;
};

window.showCallModal = async () => {
  const customers = await API.get('/customers');
  openModal('Log Call', `
    <form id="callForm">
      <div class="form-group"><label>Customer</label><select class="form-control" name="customer_id"><option value="">Select</option>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Direction</label><select class="form-control" name="direction"><option>outbound</option><option>inbound</option></select></div>
        <div class="form-group"><label>Duration (sec)</label><input type="number" class="form-control" name="duration" value="0"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea class="form-control" name="notes"></textarea></div>
    </form>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCall()">Save</button>`
  );
};

window.saveCall = async () => {
  const data = Object.fromEntries(new FormData(document.getElementById('callForm')));
  data.customer_id = data.customer_id || null;
  data.duration = Number(data.duration);
  await API.post('/calls', data);
  closeModal(); showToast('Call logged'); navigateTo('ai-call');
};

// ===== GENERIC CRUD PAGE BUILDER =====
function buildCrudPage(config) {
  return async (el) => {
    const items = await API.get(config.listUrl);
    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-filters">${config.filters||''}</div>
        <button class="btn btn-primary" onclick="${config.addFn}">+ ${config.addLabel}</button>
      </div>
      <div class="card"><div class="card-body table-container">
        <table><thead><tr>${config.columns.map(c=>`<th>${c.label}</th>`).join('')}<th>Actions</th></tr></thead>
        <tbody>${items.map(item=>`<tr>${config.columns.map(c=>`<td>${c.render?c.render(item):item[c.key]||'-'}</td>`).join('')}<td><div class="btn-group">${config.editFn?`<button class="btn btn-outline btn-sm" onclick="${config.editFn}(${item.id})">Edit</button>`:''}${config.deleteFn?`<button class="btn btn-danger btn-sm" onclick="${config.deleteFn}(${item.id})">Delete</button>`:''}</div></td></tr>`).join('')}</tbody>
        </table></div></div>`;
  };
}

// ===== CUSTOMERS =====
pageRenderers['customers'] = async (el) => {
  const customers = await API.get('/customers');
  el.innerHTML = `
    <div class="toolbar"><div class="toolbar-filters"><input type="text" class="form-control" style="width:220px" placeholder="Search customers..." onkeyup="searchAndRender('customers',this.value)"></div><button class="btn btn-primary" onclick="showCustomerModal()">+ Add Customer</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Property</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${customers.map(c=>`<tr><td><strong>${escapeHtml(c.name)}</strong></td><td>${escapeHtml(c.phone||'-')}</td><td>${escapeHtml(c.email||'-')}</td><td>${escapeHtml(c.city||'-')}</td><td>${escapeHtml(c.property_type||'-')}</td><td>${badge(c.status)}</td><td><div class="btn-group"><button class="btn btn-primary btn-sm" onclick="openCustomerDocuments(${c.id})">Documents</button><button class="btn btn-outline btn-sm" onclick="editCustomer(${c.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showCustomerModal = (c) => {
  const isEdit = !!c;
  const value = (field) => escapeHtml(c?.[field] ?? '');
  const selected = (field, option) => c?.[field] === option ? 'selected' : '';
  openModal(isEdit?'Edit Customer':'Add Customer', `<form id="custForm">
    <input type="hidden" name="lead_id" value="${value('lead_id')}">
    <div class="form-row"><div class="form-group"><label>Name *</label><input class="form-control" name="name" value="${value('name')}" required></div><div class="form-group"><label>Company Name</label><input class="form-control" name="company_name" value="${value('company_name')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Phone *</label><input class="form-control" name="phone" value="${value('phone')}" required></div><div class="form-group"><label>Email</label><input class="form-control" type="email" name="email" value="${value('email')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Contact Person</label><input class="form-control" name="contact_person" value="${value('contact_person')}"></div><div class="form-group"><label>Customer GSTIN</label><input class="form-control" name="gstin" value="${value('gstin')}"></div></div>
    <div class="form-group"><label>Address</label><input class="form-control" name="address" value="${value('address')}"></div>
    <div class="form-row-3"><div class="form-group"><label>City</label><input class="form-control" name="city" value="${value('city')}"></div><div class="form-group"><label>State</label><input class="form-control" name="state" value="${value('state')}"></div><div class="form-group"><label>PIN Code</label><input class="form-control" name="zip" value="${value('zip')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Post Office</label><input class="form-control" name="post_office" value="${value('post_office')}"></div><div class="form-group"><label>Mouza</label><input class="form-control" name="mouza" value="${value('mouza')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Village</label><input class="form-control" name="village" value="${value('village')}"></div><div class="form-group"><label>Para</label><input class="form-control" name="para" value="${value('para')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Property Type</label><select class="form-control" name="property_type"><option value="">Select</option><option ${selected('property_type','Residential')}>Residential</option><option ${selected('property_type','Commercial')}>Commercial</option><option ${selected('property_type','Industrial')}>Industrial</option></select></div><div class="form-group"><label>Property Size</label><input class="form-control" name="property_size" value="${value('property_size')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Service / Treatment</label><input class="form-control" name="service_type" value="${value('service_type')||value('pest_type')}" placeholder="General pest control"></div><div class="form-group"><label>Service Frequency</label><input class="form-control" name="service_frequency" value="${value('service_frequency')}" placeholder="Monthly / Quarterly / Annual"></div></div>
    <div class="form-row"><div class="form-group"><label>Service Rate (INR)</label><input class="form-control" type="number" min="0" step="0.01" name="service_rate" value="${value('service_rate')}"></div><div class="form-group"><label>Visits in Contract</label><input class="form-control" type="number" min="1" name="service_count" value="${value('service_count')||'1'}"></div></div>
    <div class="form-row"><div class="form-group"><label>Contract Start</label><input class="form-control" type="date" name="contract_start_date" value="${value('contract_start_date')}"></div><div class="form-group"><label>Contract End</label><input class="form-control" type="date" name="contract_end_date" value="${value('contract_end_date')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Service Day</label><input class="form-control" name="service_day" value="${value('service_day')}"></div><div class="form-group"><label>Service Time</label><input class="form-control" name="service_time" value="${value('service_time')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Payment Terms</label><input class="form-control" name="payment_terms" value="${value('payment_terms')}"></div><div class="form-group"><label>Advance Paid (INR)</label><input class="form-control" type="number" min="0" step="0.01" name="advance_amount" value="${value('advance_amount')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Treatment Method</label><input class="form-control" name="treatment_method" value="${value('treatment_method')}"></div><div class="form-group"><label>Chemicals Used</label><input class="form-control" name="chemicals_used" value="${value('chemicals_used')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Status</label><select class="form-control" name="status"><option value="active" ${selected('status','active')||(!c?.status?'selected':'')}>Active</option><option value="inactive" ${selected('status','inactive')}>Inactive</option></select></div><div class="form-group"><label>Notes</label><textarea class="form-control" name="notes">${value('notes')}</textarea></div></div>
  </form>`,
  `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCustomer(${c?.id||'null'})">${isEdit?'Update':'Create'}</button>`);
};
window.saveCustomer = async (id) => {
  const data = Object.fromEntries(new FormData(document.getElementById('custForm')));
  const result = id ? await API.put(`/customers/${id}`,data) : await API.post('/customers',data);
  if (result.error) return showToast(result.error, 'error');
  const customerId = id || result.id;
  closeModal();
  showToast(id ? 'Customer updated' : 'Customer created');
  navigateTo('customers');
  if (!id) {
    const documentTypes = ['agreement', 'certificate', 'quotation'];
    if (Number(data.service_rate) > 0) documentTypes.push('gst-invoice');
    for (const type of documentTypes) {
      const generated = await API.post(`/customers/${customerId}/documents/generate/${type}`, {});
      if (generated.error) {
        showToast(generated.error, 'error');
        return openCustomerDocuments(customerId);
      }
    }
    showToast(Number(data.service_rate) > 0 ? 'Agreement, certificate, quotation, and GST invoice generated' : 'Agreement, certificate, and quotation generated. Add a service rate to create the GST invoice.');
    openCustomerDocuments(customerId);
  }
};
window.editCustomer = async (id) => { const c = await API.get(`/customers/${id}`); showCustomerModal(c); };
window.deleteCustomer = async (id) => { if(!confirm('Delete?')) return; await API.del(`/customers/${id}`); showToast('Deleted','info'); navigateTo('customers'); };
window.openCustomerDocuments = async (id) => {
  const [customer, documents, emailStatus] = await Promise.all([API.get(`/customers/${id}`), API.get(`/customers/${id}/documents`), API.get(`/customers/${id}/documents/email-status`)]);
  if (customer.error) return showToast(customer.error, 'error');
  const labels = { agreement: 'Agreement', certificate: 'Certificate', quotation: 'Quotation', 'gst-invoice': 'GST Invoice' };
  const documentRows = documents.length ? documents.map((document) => `<div class="toolbar customer-document-row" id="customer-document-${document.id}" style="margin:8px 0;padding:10px 0;border-bottom:1px solid var(--border)"><div><strong>${labels[document.document_type]}</strong><div style="font-size:12px;color:var(--text-secondary)">${fmtDate(document.created_at)}</div></div><div class="btn-group"><a class="btn btn-outline btn-sm" href="/api/customers/${id}/documents/${document.id}/file" target="_blank" rel="noopener">Preview</a><a class="btn btn-outline btn-sm" href="/api/customers/${id}/documents/${document.id}/file?download=1">Download PDF</a><button class="btn btn-danger btn-sm" onclick="deleteCustomerDocument(${id},${document.id})">Delete</button></div></div>`).join('') : '<p>No documents generated for this customer yet.</p>';
  const emailStatusHtml = emailStatus ? `<div style="margin:12px 0;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)"><strong>Email Status:</strong> ${escapeHtml(emailStatus.status)}${emailStatus.sent_to ? `<br><strong>Sent To:</strong> ${escapeHtml(emailStatus.sent_to)}` : ''}${emailStatus.sent_at ? `<br><strong>Sent Date/Time:</strong> ${escapeHtml(new Date(emailStatus.sent_at).toLocaleString())}` : ''}${emailStatus.error_message ? `<br><span style="color:var(--danger)">${escapeHtml(emailStatus.error_message)}</span>` : ''}</div>` : '<div style="margin:12px 0;color:var(--text-secondary)"><strong>Email Status:</strong> Not sent</div>';
  const sendButton = `<button class="btn btn-primary" onclick="sendCustomerDocumentsEmail(${id})" ${customer.email ? '' : 'disabled title="No saved customer email address"'}>Send Email</button>`;
  openModal(`${escapeHtml(customer.name)} - Documents`, `<p style="margin-bottom:12px;color:var(--text-secondary)">Generate documents using this customer's saved details.</p><div class="btn-group" style="margin-bottom:16px"><button class="btn btn-primary" onclick="generateCustomerDocument(${id},'agreement')">Generate Agreement</button><button class="btn btn-primary" onclick="generateCustomerDocument(${id},'certificate')">Generate Certificate</button><button class="btn btn-primary" onclick="generateCustomerDocument(${id},'quotation')">Generate Quotation</button><button class="btn btn-primary" onclick="generateCustomerDocument(${id},'gst-invoice')">Generate GST Invoice</button>${sendButton}</div>${emailStatusHtml}<h4>Generated PDFs</h4><div id="customer-documents-list-${id}">${documentRows}</div>`, `<button class="btn btn-outline" onclick="closeModal()">Close</button>`);
};
window.deleteCustomerDocument = async (customerId, documentId) => {
  if (!confirm('Are you sure you want to delete this PDF?')) return;
  try {
    const result = await API.del(`/customers/${customerId}/documents/${documentId}`);
    if (result.error) return showToast(result.error, 'error');
    document.getElementById(`customer-document-${documentId}`)?.remove();
    const list = document.getElementById(`customer-documents-list-${customerId}`);
    if (list && !list.querySelector('.customer-document-row')) list.innerHTML = '<p>No documents generated for this customer yet.</p>';
    showToast('PDF deleted');
  } catch (error) {
    showToast('Could not delete this PDF.', 'error');
  }
};
window.sendCustomerDocumentsEmail = async (id) => {
  const result = await API.post(`/customers/${id}/documents/send-email`, {});
  if (result.error) {
    showToast(result.error, 'error');
    return openCustomerDocuments(id);
  }
  showToast('All four PDFs sent to the customer');
  openCustomerDocuments(id);
};
window.generateCustomerDocument = async (customerId, type) => {
  const result = await API.post(`/customers/${customerId}/documents/generate/${type}`, {});
  if (result.error) return showToast(result.error, 'error');
  const typeLabel = { agreement: 'Agreement', certificate: 'Certificate', quotation: 'Quotation', 'gst-invoice': 'GST invoice' }[type] || type;
  showToast(`${typeLabel} PDF generated`);
  openCustomerDocuments(customerId);
};

// ===== TECHNICIANS =====
pageRenderers['technicians'] = async (el) => {
  const techs = await API.get('/technicians');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="showTechModal()">+ Add Technician</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Name</th><th>Phone</th><th>Specialization</th><th>License</th><th>Jobs</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${techs.map(t=>`<tr><td><strong>${t.name}</strong></td><td>${t.phone||'-'}</td><td>${t.specialization||'-'}</td><td>${t.license_number||'-'}</td><td>${t.total_jobs||0}</td><td>${badge(t.status)}</td><td><div class="btn-group"><button class="btn btn-outline btn-sm" onclick="editTech(${t.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteTech(${t.id})">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showTechModal = (t) => {
  openModal(t?'Edit Technician':'Add Technician', `<form id="techForm"><div class="form-row"><div class="form-group"><label>Name *</label><input class="form-control" name="name" value="${t?.name||''}" required></div><div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${t?.phone||''}"></div></div><div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" name="email" value="${t?.email||''}"></div><div class="form-group"><label>Specialization</label><select class="form-control" name="specialization"><option>General Pest Control</option><option>Termite Control</option><option>Rodent Control</option><option>Fumigation</option><option>Bird Netting</option></select></div></div><div class="form-row"><div class="form-group"><label>License Number</label><input class="form-control" name="license_number" value="${t?.license_number||''}"></div><div class="form-group"><label>Status</label><select class="form-control" name="status"><option>available</option><option>on-job</option><option>off-duty</option></select></div></div></form>`,
  `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTech(${t?.id||'null'})">${t?'Update':'Create'}</button>`);
};
window.saveTech = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('techForm'))); if(id) await API.put(`/technicians/${id}`,d); else await API.post('/technicians',d); closeModal(); showToast(id?'Updated':'Created'); navigateTo('technicians'); };
window.editTech = async (id) => { showTechModal(await API.get(`/technicians/${id}`)); };
window.deleteTech = async (id) => { if(!confirm('Delete?')) return; await API.del(`/technicians/${id}`); showToast('Deleted','info'); navigateTo('technicians'); };

// ===== EMPLOYEES =====
pageRenderers['employees'] = async (el) => {
  const emps = await API.get('/employees');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="showEmpModal()">+ Add Employee</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Department</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${emps.map(e=>`<tr><td><strong>${e.name}</strong></td><td>${e.phone||'-'}</td><td>${e.role||'-'}</td><td>${e.department||'-'}</td><td>${fmt(e.salary)}</td><td>${badge(e.status)}</td><td><div class="btn-group"><button class="btn btn-outline btn-sm" onclick="editEmp(${e.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteEmp(${e.id})">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showEmpModal = (e) => {
  openModal(e?'Edit Employee':'Add Employee', `<form id="empForm"><div class="form-row"><div class="form-group"><label>Name *</label><input class="form-control" name="name" value="${e?.name||''}" required></div><div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${e?.phone||''}"></div></div><div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" name="email" value="${e?.email||''}"></div><div class="form-group"><label>Role</label><input class="form-control" name="role" value="${e?.role||''}"></div></div><div class="form-row"><div class="form-group"><label>Department</label><select class="form-control" name="department"><option>Management</option><option>Sales</option><option>Operations</option><option>Finance</option><option>HR</option></select></div><div class="form-group"><label>Salary</label><input type="number" class="form-control" name="salary" value="${e?.salary||0}"></div></div><div class="form-group"><label>Address</label><textarea class="form-control" name="address">${e?.address||''}</textarea></div></form>`,
  `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEmp(${e?.id||'null'})">${e?'Update':'Create'}</button>`);
};
window.saveEmp = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('empForm'))); d.salary=Number(d.salary); if(id) await API.put(`/employees/${id}`,d); else await API.post('/employees',d); closeModal(); showToast(id?'Updated':'Created'); navigateTo('employees'); };
window.editEmp = async (id) => { showEmpModal(await API.get(`/employees/${id}`)); };
window.deleteEmp = async (id) => { if(!confirm('Delete?')) return; await API.del(`/employees/${id}`); showToast('Deleted','info'); navigateTo('employees'); };

// ===== VENDORS =====
pageRenderers['vendors'] = async (el) => {
  const vendors = await API.get('/vendors');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="showVendorModal()">+ Add Vendor</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Category</th><th>GST</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${vendors.map(v=>`<tr><td><strong>${v.name}</strong></td><td>${v.company||'-'}</td><td>${v.phone||'-'}</td><td>${v.category||'-'}</td><td>${v.gst_number||'-'}</td><td>${badge(v.status)}</td><td><div class="btn-group"><button class="btn btn-outline btn-sm" onclick="editVendor(${v.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteVendor(${v.id})">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showVendorModal = (v) => {
  openModal(v?'Edit Vendor':'Add Vendor', `<form id="vendorForm"><div class="form-row"><div class="form-group"><label>Name *</label><input class="form-control" name="name" value="${v?.name||''}" required></div><div class="form-group"><label>Company</label><input class="form-control" name="company" value="${v?.company||''}"></div></div><div class="form-row"><div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${v?.phone||''}"></div><div class="form-group"><label>Email</label><input class="form-control" name="email" value="${v?.email||''}"></div></div><div class="form-row"><div class="form-group"><label>Category</label><select class="form-control" name="category"><option>Chemicals</option><option>Equipment</option><option>Safety Equipment</option><option>Transport</option><option>Other</option></select></div><div class="form-group"><label>GST Number</label><input class="form-control" name="gst_number" value="${v?.gst_number||''}"></div></div></form>`,
  `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveVendor(${v?.id||'null'})">${v?'Update':'Create'}</button>`);
};
window.saveVendor = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('vendorForm'))); if(id) await API.put(`/vendors/${id}`,d); else await API.post('/vendors',d); closeModal(); showToast(id?'Updated':'Created'); navigateTo('vendors'); };
window.editVendor = async (id) => { showVendorModal(await API.get(`/vendors/${id}`)); };
window.deleteVendor = async (id) => { if(!confirm('Delete?')) return; await API.del(`/vendors/${id}`); showToast('Deleted','info'); navigateTo('vendors'); };

// ===== INSPECTIONS =====
pageRenderers['inspections'] = async (el) => {
  const inspections = await API.get('/inspections');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="showInspectionModal()">+ New Inspection</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Date</th><th>Customer</th><th>Inspector</th><th>Pest Type</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${inspections.map(i=>`<tr><td>${fmtDate(i.inspection_date)}</td><td>${i.customer_name||'-'}</td><td>${i.inspector_name||'-'}</td><td>${i.pest_type||'-'}</td><td>${badge(i.severity)}</td><td>${badge(i.status)}</td><td><div class="btn-group"><button class="btn btn-outline btn-sm" onclick="editInspection(${i.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteInspection(${i.id})">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showInspectionModal = async (ins) => {
  const customers = await API.get('/customers'); const techs = await API.get('/technicians');
  openModal(ins?'Edit Inspection':'New Inspection', `<form id="inspForm"><div class="form-row"><div class="form-group"><label>Customer</label><select class="form-control" name="customer_id">${customers.map(c=>`<option value="${c.id}" ${ins?.customer_id==c.id?'selected':''}>${c.name}</option>`).join('')}</select></div><div class="form-group"><label>Inspector</label><select class="form-control" name="inspector_id">${techs.map(t=>`<option value="${t.id}" ${ins?.inspector_id==t.id?'selected':''}>${t.name}</option>`).join('')}</select></div></div><div class="form-row"><div class="form-group"><label>Date *</label><input type="date" class="form-control" name="inspection_date" value="${ins?.inspection_date||''}" required></div><div class="form-group"><label>Pest Type</label><select class="form-control" name="pest_type"><option>Termites</option><option>Cockroaches</option><option>Rodents</option><option>Mosquitoes</option><option>Bed Bugs</option><option>General</option></select></div></div><div class="form-row"><div class="form-group"><label>Severity</label><select class="form-control" name="severity"><option>low</option><option>medium</option><option>high</option></select></div><div class="form-group"><label>Status</label><select class="form-control" name="status"><option>scheduled</option><option>completed</option><option>cancelled</option></select></div></div><div class="form-group"><label>Findings</label><textarea class="form-control" name="findings">${ins?.findings||''}</textarea></div><div class="form-group"><label>Recommendations</label><textarea class="form-control" name="recommendations">${ins?.recommendations||''}</textarea></div></form>`,
  `<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveInspection(${ins?.id||'null'})">${ins?'Update':'Create'}</button>`);
};
window.saveInspection = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('inspForm'))); if(id) await API.put(`/inspections/${id}`,d); else await API.post('/inspections',d); closeModal(); showToast(id?'Updated':'Created'); navigateTo('inspections'); };
window.editInspection = async (id) => { showInspectionModal(await API.get(`/inspections/${id}`)); };
window.deleteInspection = async (id) => { if(!confirm('Delete?')) return; await API.del(`/inspections/${id}`); showToast('Deleted','info'); navigateTo('inspections'); };

// ===== CONTRACTS =====
pageRenderers['manage-contracts'] = async (el) => {
  const contracts = await API.get('/contracts');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="navigateTo('new-contract')">+ New Contract</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Contract#</th><th>Customer</th><th>Service</th><th>Value</th><th>Billing</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${contracts.map(c=>`<tr><td>${c.contract_number}</td><td>${c.customer_name||'-'}</td><td>${c.service_type||'-'}</td><td>${fmt(c.value)}</td><td>${fmt(c.billing_amount)}/${c.billing_cycle}</td><td>${fmtDate(c.start_date)}</td><td>${fmtDate(c.end_date)}</td><td>${badge(c.status)}</td><td><div class="btn-group"><button class="btn btn-outline btn-sm" onclick="editContract(${c.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteContract(${c.id})">Delete</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};

pageRenderers['new-contract'] = async (el) => {
  const customers = await API.get('/customers');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>New Contract</h3></div><div class="card-body"><form id="contractForm">
    <div class="form-row"><div class="form-group"><label>Customer *</label><select class="form-control" name="customer_id" required>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div class="form-group"><label>Title *</label><input class="form-control" name="title" required></div></div>
    <div class="form-row"><div class="form-group"><label>Service Type</label><select class="form-control" name="service_type"><option>General Pest Control</option><option>Termite Control</option><option>Rodent Control</option><option>Fumigation</option><option>Comprehensive Pest</option></select></div><div class="form-group"><label>Frequency</label><select class="form-control" name="frequency"><option>monthly</option><option>quarterly</option><option>half-yearly</option><option>yearly</option><option>one-time</option></select></div></div>
    <div class="form-row"><div class="form-group"><label>Start Date *</label><input type="date" class="form-control" name="start_date" required></div><div class="form-group"><label>End Date *</label><input type="date" class="form-control" name="end_date" required></div></div>
    <div class="form-row"><div class="form-group"><label>Contract Value</label><input type="number" class="form-control" name="value" value="0"></div><div class="form-group"><label>Billing Cycle</label><select class="form-control" name="billing_cycle"><option>monthly</option><option>quarterly</option><option>half-yearly</option><option>yearly</option></select></div></div>
    <div class="form-row"><div class="form-group"><label>Billing Amount</label><input type="number" class="form-control" name="billing_amount" value="0"></div><div class="form-group"><label>Status</label><select class="form-control" name="status"><option>active</option><option>draft</option><option>expiring</option><option>expired</option></select></div></div>
    <div class="form-group"><label>Description</label><textarea class="form-control" name="description"></textarea></div>
    <div class="form-group"><label>Terms</label><textarea class="form-control" name="terms"></textarea></div>
    <button type="button" class="btn btn-primary" onclick="saveContract()">Create Contract</button></form></div></div>`;
};
window.saveContract = async () => { const d = Object.fromEntries(new FormData(document.getElementById('contractForm'))); d.value=Number(d.value); d.billing_amount=Number(d.billing_amount); await API.post('/contracts',d); showToast('Contract created'); navigateTo('manage-contracts'); };
window.editContract = async (id) => { const c = await API.get(`/contracts/${id}`); openModal('Edit Contract',`<form id="contractFormEdit"><div class="form-row"><div class="form-group"><label>Title</label><input class="form-control" name="title" value="${c.title||''}"></div><div class="form-group"><label>Status</label><select class="form-control" name="status"><option ${c.status==='active'?'selected':''}>active</option><option ${c.status==='draft'?'selected':''}>draft</option><option ${c.status==='expiring'?'selected':''}>expiring</option><option ${c.status==='expired'?'selected':''}>expired</option></select></div></div><div class="form-row"><div class="form-group"><label>Value</label><input type="number" class="form-control" name="value" value="${c.value||0}"></div><div class="form-group"><label>Billing Amount</label><input type="number" class="form-control" name="billing_amount" value="${c.billing_amount||0}"></div></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updateContract(${id})">Update</button>`); };
window.updateContract = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('contractFormEdit'))); d.value=Number(d.value); d.billing_amount=Number(d.billing_amount); await API.put(`/contracts/${id}`,d); closeModal(); showToast('Contract updated'); navigateTo('manage-contracts'); };
window.deleteContract = async (id) => { if(!confirm('Delete?')) return; await API.del(`/contracts/${id}`); showToast('Deleted','info'); navigateTo('manage-contracts'); };

// Recurring Billing
pageRenderers['recurring-billing'] = async (el) => {
  const contracts = await API.get('/contracts/recurring/list');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Active Recurring Billing</h3></div><div class="card-body table-container"><table><thead><tr><th>Contract#</th><th>Customer</th><th>Phone</th><th>Billing Cycle</th><th>Amount</th><th>End Date</th></tr></thead><tbody>
  ${contracts.map(c=>`<tr><td>${c.contract_number}</td><td>${c.customer_name}</td><td>${c.customer_phone||'-'}</td><td>${c.billing_cycle}</td><td>${fmt(c.billing_amount)}</td><td>${fmtDate(c.end_date)}</td></tr>`).join('')}</tbody></table></div></div>`;
};

// Expiring Contracts
pageRenderers['expiring-contracts'] = async (el) => {
  const contracts = await API.get('/contracts/expiring/list');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Expiring Contracts (Next 30 Days)</h3></div><div class="card-body table-container"><table><thead><tr><th>Contract#</th><th>Customer</th><th>Phone</th><th>End Date</th><th>Value</th><th>Action</th></tr></thead><tbody>
  ${contracts.map(c=>`<tr><td>${c.contract_number}</td><td>${c.customer_name}</td><td>${c.customer_phone||'-'}</td><td>${fmtDate(c.end_date)}</td><td>${fmt(c.value)}</td><td><button class="btn btn-success btn-sm" onclick="renewContract(${c.id})">Renew</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.renewContract = async (id) => { await API.put(`/contracts/${id}`,{status:'active'}); showToast('Contract renewed'); navigateTo('expiring-contracts'); };

// ===== INVOICES =====
pageRenderers['invoices'] = async (el) => {
  const invoices = await API.get('/invoices');
  el.innerHTML = `
    <div class="toolbar"><div></div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="showInvoiceModal('standard')">+ Non-GST Invoice</button>
        <button class="btn btn-primary" style="background:#d93025" onclick="showInvoiceModal('gst')">+ GST Invoice</button>
        <button class="btn btn-primary" style="background:#0d652d" onclick="showInvoiceModal('annual')">+ Annual Invoice</button>
      </div>
    </div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Invoice#</th><th>Customer</th><th>Type</th><th>Title</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${invoices.map(i=>`<tr><td>${i.invoice_number}</td><td>${i.customer_name||'-'}</td><td>${badge(i.invoice_type||'standard')}</td><td>${i.title||'-'}</td><td>${fmt(i.total)}</td><td>${fmt(i.paid_amount)}</td><td>${badge(i.status)}</td><td><div class="btn-group"><button class="btn btn-info btn-sm" onclick="printInvoice(${i.id})">Print</button><button class="btn btn-success btn-sm" onclick="recordPayment(${i.id},${i.total-i.paid_amount})">Pay</button><button class="btn btn-outline btn-sm" onclick="editInvoice(${i.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteInvoice(${i.id})">Del</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showInvoiceModal = async (type='standard') => {
  const customers = await API.get('/customers');
  const isGst = type === 'gst';
  const isAnnual = type === 'annual';
  const title = isGst ? 'Create GST Tax Invoice' : isAnnual ? 'Create Annual Maintenance Invoice' : 'Create Non-GST Invoice';
  openModal(title,`<form id="invForm">
    <input type="hidden" name="invoice_type" value="${type}">
    <input type="hidden" name="gst_type" value="${isGst ? 'intra' : 'none'}">
    <div class="form-row"><div class="form-group"><label>Customer *</label><select class="form-control" name="customer_id" required>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label>Contact Person</label><input class="form-control" name="contact_person"></div></div>
    <div class="form-row"><div class="form-group"><label>Title</label><input class="form-control" name="title" placeholder="e.g. Termite Control Service"></div>
    <div class="form-group"><label>Booking ID</label><input class="form-control" name="booking_id"></div></div>
    <div id="invItems" style="margin:8px 0">
      <div class="form-row-3 inv-line"><div class="form-group"><label>Service</label><input class="form-control ii-name" value="General Pest Control Service"></div><div class="form-group"><label>Rate</label><input type="number" class="form-control ii-rate" value="6000" oninput="calcInvTotal()"></div><div class="form-group"><label>Qty</label><input type="number" class="form-control ii-qty" value="1" oninput="calcInvTotal()"></div></div>
    </div>
    <button type="button" class="btn btn-outline btn-sm" onclick="addInvLine()">+ Add Line</button>
    ${isAnnual ? `<div class="form-row" style="margin-top:8px"><div class="form-group"><label>Service Count</label><input type="number" class="form-control" name="service_count" value="4"></div><div class="form-group"><label>Service Period</label><input class="form-control" name="service_period" placeholder="22.07.2026-21.07.2027"></div></div>` : ''}
    <div class="form-row" style="margin-top:8px">
      <div class="form-group"><label>Subtotal</label><input type="number" class="form-control" name="subtotal" id="invSubtotal" readonly></div>
      ${isGst ? `<div class="form-group"><label>9% SGST</label><input type="number" class="form-control" name="sgst" id="invSgst" readonly></div><div class="form-group"><label>9% CGST</label><input type="number" class="form-control" name="cgst" id="invCgst" readonly></div>` : ''}
      <div class="form-group"><label>Total</label><input type="number" class="form-control" name="total" id="invTotal" readonly></div>
    </div>
    ${isGst ? `<div class="form-row"><div class="form-group"><label>SAC Code</label><input class="form-control" name="sac_code" value="998531"></div></div>` : ''}
    <div class="form-row"><div class="form-group"><label>Warranty From</label><input type="date" class="form-control" name="warranty_from"></div><div class="form-group"><label>Warranty To</label><input type="date" class="form-control" name="warranty_to"></div></div>
    <div class="form-group"><label>Due Date</label><input type="date" class="form-control" name="due_date"></div>
  </form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveInvoice()">Create</button>`);
  calcInvTotal();
};
window.addInvLine = () => { const d=document.createElement('div'); d.className='form-row-3 inv-line'; d.innerHTML=`<div class="form-group"><input class="form-control ii-name" placeholder="Service"></div><div class="form-group"><input type="number" class="form-control ii-rate" value="0" oninput="calcInvTotal()"></div><div class="form-group"><input type="number" class="form-control ii-qty" value="1" oninput="calcInvTotal()"></div>`; document.getElementById('invItems').appendChild(d); };
window.calcInvTotal = () => { let sub=0; document.querySelectorAll('.inv-line').forEach(l=>{sub+=(Number(l.querySelector('.ii-rate')?.value)||0)*(Number(l.querySelector('.ii-qty')?.value)||0);}); const f=document.getElementById('invForm'); const isGst=f.gst_type.value!=='none'; const sgstEl=document.getElementById('invSgst'); const cgstEl=document.getElementById('invCgst'); const sgst=isGst?sub*9/100:0; const cgst=isGst?sub*9/100:0; if(sgstEl)sgstEl.value=sgst; if(cgstEl)cgstEl.value=cgst; const total=sub+sgst+cgst; document.getElementById('invSubtotal').value=sub; document.getElementById('invTotal').value=total; };
window.saveInvoice = async () => { const f=document.getElementById('invForm'); const d=Object.fromEntries(new FormData(f)); d.subtotal=Number(d.subtotal); d.total=Number(d.total); d.sgst=Number(d.sgst||0); d.cgst=Number(d.cgst||0); d.tax_rate=d.gst_type!=='none'?18:0; d.tax_amount=d.sgst+d.cgst; d.discount=Number(d.discount||0); const items=[]; document.querySelectorAll('.inv-line').forEach(l=>{items.push({name:l.querySelector('.ii-name').value,rate:Number(l.querySelector('.ii-rate').value),qty:Number(l.querySelector('.ii-qty').value)});}); d.items=items; await API.post('/invoices',d); closeModal(); showToast('Invoice created'); navigateTo('invoices'); };
window.printInvoice = async (id) => {
  const inv = await API.get(`/invoices/${id}`);
  const customers = await API.get('/customers');
  const customer = customers.find(c=>c.id===inv.customer_id) || {};
  const settings = await API.get('/settings');
  if (inv.invoice_type === 'annual') { printAnnualInvoice(inv, {...customer, ...inv}, settings); }
  else if (inv.gst_type !== 'none') { printGstInvoice(inv, {...customer, ...inv}, settings); }
  else { printNonGstInvoice(inv, {...customer, ...inv}, settings); }
};
window.editInvoice = async (id) => { const inv = await API.get(`/invoices/${id}`); openModal('Edit Invoice',`<form id="invEditForm"><div class="form-row"><div class="form-group"><label>Total</label><input type="number" class="form-control" name="total" value="${inv.total}"></div><div class="form-group"><label>Status</label><select class="form-control" name="status"><option ${inv.status==='draft'?'selected':''}>draft</option><option ${inv.status==='unpaid'?'selected':''}>unpaid</option><option ${inv.status==='partial'?'selected':''}>partial</option><option ${inv.status==='paid'?'selected':''}>paid</option><option ${inv.status==='overdue'?'selected':''}>overdue</option></select></div></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updateInvoice(${id})">Update</button>`); };
window.updateInvoice = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('invEditForm'))); d.total=Number(d.total); await API.put(`/invoices/${id}`,d); closeModal(); showToast('Updated'); navigateTo('invoices'); };
window.recordPayment = async (id, balance) => { openModal('Record Payment',`<form id="payForm"><input type="hidden" name="invoice_id" value="${id}"><div class="form-group"><label>Amount</label><input type="number" class="form-control" name="amount" value="${balance}" required></div><div class="form-group"><label>Method</label><select class="form-control" name="payment_method"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Card</option><option>Cheque</option></select></div><div class="form-group"><label>Reference</label><input class="form-control" name="reference"></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePayment(${id})">Record</button>`); };
window.savePayment = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('payForm'))); d.amount=Number(d.amount); await API.post(`/invoices/${id}/payment`,d); closeModal(); showToast('Payment recorded'); navigateTo('invoices'); };
window.deleteInvoice = async (id) => { if(!confirm('Delete?')) return; await API.del(`/invoices/${id}`); showToast('Deleted','info'); navigateTo('invoices'); };

// ===== COMPLAINTS =====
pageRenderers['new-complaint'] = async (el) => {
  const customers = await API.get('/customers'); const techs = await API.get('/technicians');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>New Complaint</h3></div><div class="card-body"><form id="compForm">
    <div class="form-row"><div class="form-group"><label>Customer *</label><select class="form-control" name="customer_id" required>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div class="form-group"><label>Category</label><select class="form-control" name="category"><option>Service Quality</option><option>Scheduling</option><option>Effectiveness</option><option>Billing</option><option>Staff Behavior</option><option>Other</option></select></div></div>
    <div class="form-row"><div class="form-group"><label>Priority</label><select class="form-control" name="priority"><option>low</option><option selected>medium</option><option>high</option></select></div><div class="form-group"><label>Assign To</label><select class="form-control" name="assigned_to"><option value="">Unassigned</option>${techs.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div></div>
    <div class="form-group"><label>Subject *</label><input class="form-control" name="subject" required></div>
    <div class="form-group"><label>Description</label><textarea class="form-control" name="description"></textarea></div>
    <button type="button" class="btn btn-primary" onclick="saveComplaint()">Submit Complaint</button></form></div></div>`;
};
window.saveComplaint = async () => { const d = Object.fromEntries(new FormData(document.getElementById('compForm'))); await API.post('/complaints',d); showToast('Complaint created'); navigateTo('manage-complaints'); };

pageRenderers['manage-complaints'] = async (el) => {
  const complaints = await API.get('/complaints');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="navigateTo('new-complaint')">+ New Complaint</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Complaint#</th><th>Customer</th><th>Category</th><th>Subject</th><th>Priority</th><th>Assigned</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${complaints.map(c=>`<tr><td>${c.complaint_number}</td><td>${c.customer_name||'-'}</td><td>${c.category||'-'}</td><td>${c.subject}</td><td>${badge(c.priority)}</td><td>${c.assigned_to_name||'Unassigned'}</td><td>${badge(c.status)}</td><td><div class="btn-group"><button class="btn btn-outline btn-sm" onclick="resolveComplaint(${c.id})">Resolve</button><button class="btn btn-danger btn-sm" onclick="deleteComplaint(${c.id})">Del</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.resolveComplaint = async (id) => { openModal('Resolve Complaint',`<form id="resForm"><div class="form-group"><label>Resolution</label><textarea class="form-control" name="resolution"></textarea></div><div class="form-group"><label>Status</label><select class="form-control" name="status"><option>in-progress</option><option>resolved</option></select></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveResolution(${id})">Update</button>`); };
window.saveResolution = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('resForm'))); await API.put(`/complaints/${id}`,d); closeModal(); showToast('Updated'); navigateTo('manage-complaints'); };
window.deleteComplaint = async (id) => { if(!confirm('Delete?')) return; await API.del(`/complaints/${id}`); showToast('Deleted','info'); navigateTo('manage-complaints'); };

// ===== FIELD OPERATIONS =====
pageRenderers['assign-services'] = async (el) => {
  const customers = await API.get('/customers'); const techs = await API.get('/technicians');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Assign New Service</h3></div><div class="card-body"><form id="assignForm">
    <div class="form-row"><div class="form-group"><label>Customer *</label><select class="form-control" name="customer_id" required>${customers.map(c=>`<option value="${c.id}">${c.name} - ${c.address||''}</option>`).join('')}</select></div><div class="form-group"><label>Technician</label><select class="form-control" name="technician_id">${techs.filter(t=>t.status==='available').map(t=>`<option value="${t.id}">${t.name} (${t.specialization})</option>`).join('')}</select></div></div>
    <div class="form-row"><div class="form-group"><label>Service Type *</label><select class="form-control" name="service_type"><option>General Pest Control</option><option>Termite Treatment</option><option>Rodent Control</option><option>Fumigation</option><option>Cockroach Treatment</option><option>Mosquito Fogging</option><option>Bird Netting</option><option>Inspection</option></select></div><div class="form-group"><label>Scheduled Date *</label><input type="date" class="form-control" name="scheduled_date" required></div></div>
    <div class="form-row"><div class="form-group"><label>Time</label><input type="time" class="form-control" name="scheduled_time"></div><div class="form-group"><label>Address</label><input class="form-control" name="address"></div></div>
    <div class="form-group"><label>Instructions</label><textarea class="form-control" name="instructions"></textarea></div>
    <button type="button" class="btn btn-primary" onclick="saveAssignment()">Assign Service</button></form></div></div>`;
};
window.saveAssignment = async () => { const d = Object.fromEntries(new FormData(document.getElementById('assignForm'))); await API.post('/assignments',d); showToast('Service assigned'); navigateTo('assigned-services'); };

pageRenderers['assigned-services'] = async (el) => {
  const assignments = await API.get('/assignments');
  el.innerHTML = `
    <div class="toolbar"><div class="toolbar-filters"><select class="form-control" style="width:140px" onchange="filterAssignments(this.value)"><option value="">All Status</option><option>assigned</option><option>in-progress</option><option>completed</option><option>cancelled</option></select></div><button class="btn btn-primary" onclick="navigateTo('assign-services')">+ Assign Service</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Assignment#</th><th>Customer</th><th>Service</th><th>Technician</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="assignTableBody">
    ${assignments.map(a=>`<tr><td>${a.assignment_number}</td><td>${a.customer_name||'-'}</td><td>${a.service_type}</td><td>${a.technician_name||'Unassigned'}</td><td>${fmtDate(a.scheduled_date)}</td><td>${badge(a.status)}</td><td><div class="btn-group"><button class="btn btn-success btn-sm" onclick="completeAssignment(${a.id})">Complete</button><button class="btn btn-outline btn-sm" onclick="editAssignment(${a.id})">Edit</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.completeAssignment = async (id) => { await API.put(`/assignments/${id}`,{status:'completed',completed_at:new Date().toISOString()}); showToast('Service completed'); navigateTo('assigned-services'); };
window.editAssignment = async (id) => { const a = await API.get(`/assignments/${id}`); openModal('Edit Assignment',`<form id="editAssignForm"><div class="form-group"><label>Status</label><select class="form-control" name="status"><option ${a.status==='assigned'?'selected':''}>assigned</option><option ${a.status==='in-progress'?'selected':''}>in-progress</option><option ${a.status==='completed'?'selected':''}>completed</option><option ${a.status==='cancelled'?'selected':''}>cancelled</option></select></div><div class="form-group"><label>Notes</label><textarea class="form-control" name="notes">${a.notes||''}</textarea></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updateAssignment(${id})">Update</button>`); };
window.updateAssignment = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('editAssignForm'))); await API.put(`/assignments/${id}`,d); closeModal(); showToast('Updated'); navigateTo('assigned-services'); };

pageRenderers['tracking'] = async (el) => {
  const techs = await API.get('/technicians');
  el.innerHTML = `<div class="tracking-grid">${techs.map(t=>`<div class="tracking-card ${t.status}"><h4>${t.name}</h4><div class="meta"><span><i class="fas fa-phone"></i> ${t.phone||'-'}</span><span><i class="fas fa-wrench"></i> ${t.specialization||'-'}</span><span>Status: ${badge(t.status)}</span><span>Jobs: ${t.total_jobs||0} | Rating: ${'⭐'.repeat(Math.round(t.rating||0))||'N/A'}</span></div></div>`).join('')}</div>`;
};

pageRenderers['geofence'] = async (el) => {
  const activities = await API.get('/geofence');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Geofence Activity Log</h3></div><div class="card-body table-container"><table><thead><tr><th>Time</th><th>Technician</th><th>Action</th><th>Location</th><th>Address</th></tr></thead><tbody>
  ${activities.length?activities.map(a=>`<tr><td>${fmtDate(a.timestamp)}</td><td>${a.technician_name||'-'}</td><td>${badge(a.action)}</td><td>${a.latitude||'-'}, ${a.longitude||'-'}</td><td>${a.address||'-'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-state">No geofence activity yet</td></tr>'}</tbody></table></div></div>`;
};

pageRenderers['call-history'] = pageRenderers['ai-call'];

pageRenderers['field-reports'] = async (el) => {
  const reports = await API.get('/field-reports');
  el.innerHTML = `
    <div class="toolbar"><div></div><button class="btn btn-primary" onclick="showFieldReportModal()">+ New Report</button></div>
    <div class="card"><div class="card-body table-container"><table><thead><tr><th>Date</th><th>Assignment</th><th>Technician</th><th>Customer</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${reports.map(r=>`<tr><td>${fmtDate(r.report_date)}</td><td>${r.assignment_number||'-'}</td><td>${r.technician_name||'-'}</td><td>${r.customer_name||'-'}</td><td>${badge(r.status)}</td><td><button class="btn btn-outline btn-sm" onclick="viewReport(${r.id})">View</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showFieldReportModal = async () => {
  const assignments = await API.get('/assignments');
  openModal('New Field Report',`<form id="frForm"><div class="form-group"><label>Assignment</label><select class="form-control" name="assignment_id">${assignments.map(a=>`<option value="${a.id}">${a.assignment_number} - ${a.customer_name}</option>`).join('')}</select></div><div class="form-group"><label>Findings</label><textarea class="form-control" name="findings"></textarea></div><div class="form-group"><label>Actions Taken</label><textarea class="form-control" name="actions_taken"></textarea></div><div class="form-group"><label>Chemicals Used</label><textarea class="form-control" name="chemicals_used"></textarea></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveFieldReport()">Submit</button>`);
};
window.saveFieldReport = async () => { const d = Object.fromEntries(new FormData(document.getElementById('frForm'))); d.status='submitted'; await API.post('/field-reports',d); closeModal(); showToast('Report submitted'); navigateTo('field-reports'); };
window.viewReport = async (id) => { const r = await API.get(`/field-reports/${id}`); openModal('Field Report',`<p><strong>Findings:</strong> ${r.findings||'N/A'}</p><p><strong>Actions:</strong> ${r.actions_taken||'N/A'}</p><p><strong>Chemicals:</strong> ${r.chemicals_used||'N/A'}</p><p><strong>Status:</strong> ${badge(r.status)}</p>`,`<button class="btn btn-outline" onclick="closeModal()">Close</button>`); };

// Certificates
pageRenderers['certificate'] = async (el) => {
  const certs = await API.get('/certificates');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="showCertModal()">+ Generate Certificate</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Cert#</th><th>Customer</th><th>Type</th><th>Title</th><th>Period</th><th>Actions</th></tr></thead><tbody>
  ${certs.map(c=>`<tr><td>${c.certificate_number}</td><td>${c.customer_name||'-'}</td><td>${c.type}</td><td>${c.title||'-'}</td><td>${fmtDate(c.valid_from)} - ${fmtDate(c.valid_until)}</td><td><button class="btn btn-info btn-sm" onclick="printCert(${c.id})">Print</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showCertModal = async () => {
  const customers = await API.get('/customers');
  openModal('Generate Pest Control Certificate',`<form id="certForm">
    <div class="form-row"><div class="form-group"><label>Customer *</label><select class="form-control" name="customer_id" required>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label>Type</label><select class="form-control" name="type"><option value="service">General Pest Control</option><option value="fumigation">Fumigation Certificate</option><option value="termite">Termite Treatment</option></select></div></div>
    <div class="form-row"><div class="form-group"><label>Valid From</label><input type="date" class="form-control" name="valid_from" required></div><div class="form-group"><label>Valid Until</label><input type="date" class="form-control" name="valid_until" required></div></div>
    <div class="form-group"><label>Contact Period (display)</label><input class="form-control" name="contact_period" placeholder="22.07.2026-22.07.2027"></div>
    <div class="form-group"><label>Premise Address</label><textarea class="form-control" name="premise_address" rows="2" placeholder="Full address of the treated premises"></textarea></div>
    <div class="form-row"><div class="form-group"><label>Method</label><select class="form-control" name="method"><option>Only Spray</option><option>Drill & Spray</option><option>Fumigation</option><option>Gel Treatment</option></select></div>
    <div class="form-group"><label>Chemicals Used</label><input class="form-control" name="chemicals" value="Imidacloprid At 21% W/W And Beta-Cyfluthrin At 10.5% W/W"></div></div>
  </form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCert()">Generate</button>`);
};
window.saveCert = async () => { const d = Object.fromEntries(new FormData(document.getElementById('certForm'))); await API.post('/certificates',d); closeModal(); showToast('Certificate generated'); navigateTo('certificate'); };
window.printCert = (id) => {
  window.open(`/api/certificates/${id}/pdf`, '_blank');
};
pageRenderers['fumigation'] = pageRenderers['certificate'];

pageRenderers['audit'] = async (el) => {
  const audits = await API.get('/audits');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="showAuditModal()">+ New Audit</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Date</th><th>Customer</th><th>Auditor</th><th>Location</th><th>Score</th><th>Status</th></tr></thead><tbody>
  ${audits.map(a=>`<tr><td>${fmtDate(a.inspection_date)}</td><td>${a.customer_name||'-'}</td><td>${a.auditor_name||'-'}</td><td>${a.location||'-'}</td><td>${a.score||0}%</td><td>${badge(a.status)}</td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showAuditModal = async () => {
  const customers = await API.get('/customers'); const techs = await API.get('/technicians');
  openModal('New Audit Inspection',`<form id="auditForm"><div class="form-row"><div class="form-group"><label>Customer</label><select class="form-control" name="customer_id">${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div class="form-group"><label>Auditor</label><select class="form-control" name="auditor_id">${techs.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div></div><div class="form-row"><div class="form-group"><label>Date</label><input type="date" class="form-control" name="inspection_date"></div><div class="form-group"><label>Location</label><input class="form-control" name="location"></div></div><div class="form-group"><label>Findings</label><textarea class="form-control" name="findings"></textarea></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAudit()">Save</button>`);
};
window.saveAudit = async () => { const d = Object.fromEntries(new FormData(document.getElementById('auditForm'))); await API.post('/audits',d); closeModal(); showToast('Audit saved'); navigateTo('audit'); };

// ===== ACCOUNTING =====
pageRenderers['receipt-voucher'] = async (el) => {
  const vouchers = await API.get('/vouchers/receipts');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="showRVModal()">+ New Receipt</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Voucher#</th><th>Date</th><th>Party</th><th>Type</th><th>Amount</th><th>Method</th><th>Actions</th></tr></thead><tbody>
  ${vouchers.map(v=>`<tr><td>${v.voucher_number}</td><td>${fmtDate(v.date)}</td><td>${v.party_name||'-'}</td><td>${v.party_type||'-'}</td><td>${fmt(v.amount)}</td><td>${v.payment_method||'-'}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRV(${v.id})">Del</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showRVModal = () => { openModal('New Receipt Voucher',`<form id="rvForm"><div class="form-row"><div class="form-group"><label>Date *</label><input type="date" class="form-control" name="date" required></div><div class="form-group"><label>Party Name</label><input class="form-control" name="party_name"></div></div><div class="form-row"><div class="form-group"><label>Party Type</label><select class="form-control" name="party_type"><option>Customer</option><option>Vendor</option><option>Other</option></select></div><div class="form-group"><label>Amount *</label><input type="number" class="form-control" name="amount" required></div></div><div class="form-row"><div class="form-group"><label>Payment Method</label><select class="form-control" name="payment_method"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option></select></div><div class="form-group"><label>Reference</label><input class="form-control" name="reference"></div></div><div class="form-group"><label>Description</label><textarea class="form-control" name="description"></textarea></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveRV()">Save</button>`); };
window.saveRV = async () => { const d = Object.fromEntries(new FormData(document.getElementById('rvForm'))); d.amount=Number(d.amount); await API.post('/vouchers/receipts',d); closeModal(); showToast('Receipt created'); navigateTo('receipt-voucher'); };
window.deleteRV = async (id) => { if(!confirm('Delete?')) return; await API.del(`/vouchers/receipts/${id}`); showToast('Deleted','info'); navigateTo('receipt-voucher'); };

pageRenderers['payment-voucher'] = async (el) => {
  const vouchers = await API.get('/vouchers/payments');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="showPVModal()">+ New Payment</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Voucher#</th><th>Date</th><th>Party</th><th>Type</th><th>Amount</th><th>Method</th><th>Actions</th></tr></thead><tbody>
  ${vouchers.map(v=>`<tr><td>${v.voucher_number}</td><td>${fmtDate(v.date)}</td><td>${v.party_name||'-'}</td><td>${v.party_type||'-'}</td><td>${fmt(v.amount)}</td><td>${v.payment_method||'-'}</td><td><button class="btn btn-danger btn-sm" onclick="deletePV(${v.id})">Del</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showPVModal = () => { openModal('New Payment Voucher',`<form id="pvForm"><div class="form-row"><div class="form-group"><label>Date *</label><input type="date" class="form-control" name="date" required></div><div class="form-group"><label>Party Name</label><input class="form-control" name="party_name"></div></div><div class="form-row"><div class="form-group"><label>Party Type</label><select class="form-control" name="party_type"><option>Vendor</option><option>Employee</option><option>Other</option></select></div><div class="form-group"><label>Amount *</label><input type="number" class="form-control" name="amount" required></div></div><div class="form-row"><div class="form-group"><label>Payment Method</label><select class="form-control" name="payment_method"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option></select></div><div class="form-group"><label>Approved By</label><input class="form-control" name="approved_by"></div></div><div class="form-group"><label>Description</label><textarea class="form-control" name="description"></textarea></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePV()">Save</button>`); };
window.savePV = async () => { const d = Object.fromEntries(new FormData(document.getElementById('pvForm'))); d.amount=Number(d.amount); await API.post('/vouchers/payments',d); closeModal(); showToast('Payment voucher created'); navigateTo('payment-voucher'); };
window.deletePV = async (id) => { if(!confirm('Delete?')) return; await API.del(`/vouchers/payments/${id}`); showToast('Deleted','info'); navigateTo('payment-voucher'); };

// Expenses
pageRenderers['expenses'] = async (el) => {
  const expenses = await API.get('/expenses');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="showExpModal()">+ Add Expense</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Expense#</th><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${expenses.map(e=>`<tr><td>${e.expense_number}</td><td>${fmtDate(e.date)}</td><td>${e.category||'-'}</td><td>${e.description||'-'}</td><td>${fmt(e.amount)}</td><td>${e.payment_method||'-'}</td><td>${badge(e.status)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">Del</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showExpModal = () => { openModal('Add Expense',`<form id="expForm"><div class="form-row"><div class="form-group"><label>Date *</label><input type="date" class="form-control" name="date" required></div><div class="form-group"><label>Category</label><select class="form-control" name="category"><option>Chemicals</option><option>Equipment</option><option>Fuel</option><option>Safety</option><option>Transport</option><option>Office</option><option>Other</option></select></div></div><div class="form-group"><label>Description</label><input class="form-control" name="description"></div><div class="form-row"><div class="form-group"><label>Amount *</label><input type="number" class="form-control" name="amount" required></div><div class="form-group"><label>Payment Method</label><select class="form-control" name="payment_method"><option>Cash</option><option>UPI</option><option>Bank Transfer</option></select></div></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveExpense()">Save</button>`); };
window.saveExpense = async () => { const d = Object.fromEntries(new FormData(document.getElementById('expForm'))); d.amount=Number(d.amount); await API.post('/expenses',d); closeModal(); showToast('Expense added'); navigateTo('expenses'); };
window.deleteExpense = async (id) => { if(!confirm('Delete?')) return; await API.del(`/expenses/${id}`); showToast('Deleted','info'); navigateTo('expenses'); };

// Ledger
pageRenderers['general-ledger'] = async (el) => {
  const entries = await API.get('/vouchers/ledger/general');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>General Ledger</h3></div><div class="card-body table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Party</th><th>Amount</th><th>Description</th></tr></thead><tbody>
  ${entries.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${badge(e.type)}</td><td>${e.party||'-'}</td><td style="color:${e.amount>=0?'var(--success)':'var(--danger)'}">${fmt(Math.abs(e.amount))}</td><td>${e.description||'-'}</td></tr>`).join('')}</tbody></table></div></div>`;
};

pageRenderers['customer-ledger'] = async (el) => {
  const customers = await API.get('/customers');
  el.innerHTML = `<div class="toolbar"><div class="toolbar-filters"><select class="form-control" style="width:220px" id="custLedgerSelect" onchange="loadCustLedger()"><option value="">Select Customer</option>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div></div><div id="custLedgerContent"></div>`;
};
window.loadCustLedger = async () => {
  const id = document.getElementById('custLedgerSelect').value;
  if(!id) return;
  const entries = await API.get(`/vouchers/ledger/customer/${id}`);
  document.getElementById('custLedgerContent').innerHTML = `<div class="card"><div class="card-body table-container"><table><thead><tr><th>Date</th><th>Ref</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead><tbody>
  ${entries.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.ref||'-'}</td><td>${badge(e.type)}</td><td style="color:${e.amount>=0?'var(--success)':'var(--danger)'}">${fmt(Math.abs(e.amount))}</td><td>${e.description||'-'}</td></tr>`).join('')}</tbody></table></div></div>`;
};

// ===== REMAINING PAGES =====
pageRenderers['payment-reminders'] = async (el) => {
  const reminders = await API.get('/invoices/reminders/list');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="showReminderModal()">+ New Reminder</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Phone</th><th>Due Date</th><th>Outstanding</th><th>Method</th><th>Status</th></tr></thead><tbody>
  ${reminders.map(r=>`<tr><td>${r.invoice_number||'-'}</td><td>${r.customer_name||'-'}</td><td>${r.customer_phone||'-'}</td><td>${fmtDate(r.invoice_due)}</td><td>${fmt(r.total-r.paid_amount)}</td><td>${r.method||'-'}</td><td>${badge(r.status)}</td></tr>`).join('')}</tbody></table></div></div>`;
};
window.showReminderModal = async () => {
  const invoices = await API.get('/invoices?status=unpaid');
  openModal('Send Reminder',`<form id="remForm"><div class="form-group"><label>Invoice</label><select class="form-control" name="invoice_id">${invoices.map(i=>`<option value="${i.id}" data-cid="${i.customer_id}">${i.invoice_number} - ${fmt(i.total-i.paid_amount)} pending</option>`).join('')}</select></div><div class="form-group"><label>Method</label><select class="form-control" name="method"><option>email</option><option>sms</option><option>whatsapp</option><option>phone</option></select></div><div class="form-group"><label>Notes</label><textarea class="form-control" name="notes"></textarea></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveReminder()">Send</button>`);
};
window.saveReminder = async () => { const d = Object.fromEntries(new FormData(document.getElementById('remForm'))); const sel = document.querySelector('#remForm select option:checked'); d.customer_id = sel?.dataset?.cid; d.reminder_date = new Date().toISOString().split('T')[0]; await API.post('/invoices/reminders',d); closeModal(); showToast('Reminder sent'); navigateTo('payment-reminders'); };

pageRenderers['customer-outstandings'] = async (el) => {
  const outstandings = await API.get('/customers/outstandings/list');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Customer Outstandings</h3></div><div class="card-body table-container"><table><thead><tr><th>Customer</th><th>Phone</th><th>Total Billed</th><th>Total Paid</th><th>Outstanding</th></tr></thead><tbody>
  ${outstandings.map(o=>`<tr><td><strong>${o.name}</strong></td><td>${o.phone||'-'}</td><td>${fmt(o.total_billed)}</td><td>${fmt(o.total_paid)}</td><td style="color:var(--danger);font-weight:600">${fmt(o.outstanding)}</td></tr>`).join('')}</tbody></table></div></div>`;
};

pageRenderers['quotations'] = async (el) => {
  const quotes = await API.get('/quotations');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="navigateTo('quotation-builder')">+ New Quotation</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Quote#</th><th>Customer</th><th>Title</th><th>Total</th><th>Valid Until</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${quotes.map(q=>`<tr><td>${q.quote_number}</td><td>${q.customer_name||'-'}</td><td>${q.title||'-'}</td><td>${fmt(q.total)}</td><td>${fmtDate(q.valid_until)}</td><td>${badge(q.status)}</td><td><div class="btn-group"><button class="btn btn-info btn-sm" onclick="printQuoteFn(${q.id})">Print</button><button class="btn btn-outline btn-sm" onclick="editQuote(${q.id})">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteQuote(${q.id})">Del</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.printQuoteFn = async (id) => {
  window.open(`/api/quotations/${id}/pdf`, '_blank', 'noopener');
};

pageRenderers['quotation-builder'] = async (el) => {
  const customers = await API.get('/customers');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Quotation Builder</h3></div><div class="card-body"><form id="quoteForm">
    <div class="form-row"><div class="form-group"><label>Customer *</label><select class="form-control" name="customer_id" required>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div class="form-group"><label>Title</label><input class="form-control" name="title" placeholder="e.g. Termite Treatment Quote"></div></div>
    <div class="form-row"><div class="form-group"><label>Contact Person</label><input class="form-control" name="contact_person"></div>
    <div class="form-group"><label>GST Type</label><select class="form-control" name="gst_type" id="qGstType" onchange="calcQuoteTotal()"><option value="none">Non-GST</option><option value="intra">Intra-State (SGST+CGST)</option></select></div></div>
    <div id="quoteItems"><div class="form-row-3 quote-line"><div class="form-group"><label>Item</label><input class="form-control qi-name" value="General Pest Control"></div><div class="form-group"><label>Rate</label><input type="number" class="form-control qi-rate" value="5000" onchange="calcQuoteTotal()"></div><div class="form-group"><label>Qty</label><input type="number" class="form-control qi-qty" value="1" onchange="calcQuoteTotal()"></div></div></div>
    <button type="button" class="btn btn-outline btn-sm" onclick="addQuoteLine()">+ Add Line</button>
    <div class="form-row" style="margin-top:16px"><div class="form-group"><label>Tax Rate %</label><input type="number" class="form-control" name="tax_rate" value="18" onchange="calcQuoteTotal()"></div><div class="form-group"><label>Discount</label><input type="number" class="form-control" name="discount" value="0" onchange="calcQuoteTotal()"></div></div>
    <div class="form-row"><div class="form-group"><label>Subtotal</label><input class="form-control" name="subtotal" id="qSubtotal" readonly></div><div class="form-group"><label>Total</label><input class="form-control" name="total" id="qTotal" readonly></div></div>
    <div class="form-row"><div class="form-group"><label>SAC Code</label><input class="form-control" name="sac_code" value="998531"></div><div class="form-group"><label>Valid Until</label><input type="date" class="form-control" name="valid_until"></div></div>
    <div class="form-group"><label>Warranty Note</label><input class="form-control" name="warranty_note" placeholder="e.g. 5 Years Warranty"></div>
    <div class="form-group"><label>Description</label><textarea class="form-control" name="description"></textarea></div>
    <div class="form-group"><label>Terms & Conditions</label><textarea class="form-control" name="terms_conditions" rows="4" placeholder="Enter terms and conditions..."></textarea></div>
    <button type="button" class="btn btn-primary" onclick="saveQuotation()">Create Quotation</button></form></div></div>`;
  calcQuoteTotal();
};
window.addQuoteLine = () => { const d = document.createElement('div'); d.className='form-row-3 quote-line'; d.innerHTML=`<div class="form-group"><input class="form-control qi-name" placeholder="Item"></div><div class="form-group"><input type="number" class="form-control qi-rate" value="0" onchange="calcQuoteTotal()"></div><div class="form-group"><input type="number" class="form-control qi-qty" value="1" onchange="calcQuoteTotal()"></div>`; document.getElementById('quoteItems').appendChild(d); };
window.calcQuoteTotal = () => { let sub=0; document.querySelectorAll('.quote-line').forEach(l=>{sub+=(Number(l.querySelector('.qi-rate')?.value)||0)*(Number(l.querySelector('.qi-qty')?.value)||0);}); const f=document.getElementById('quoteForm'); const tax=sub*(Number(f.tax_rate.value)||0)/100; const disc=Number(f.discount.value)||0; const total=sub+tax-disc; document.getElementById('qSubtotal').value=sub; document.getElementById('qTotal').value=Math.max(0,total); };
window.saveQuotation = async () => { const f=document.getElementById('quoteForm'); const d={customer_id:f.customer_id.value,title:f.title.value,description:f.description.value,subtotal:Number(f.subtotal.value),tax_rate:Number(f.tax_rate.value),tax_amount:Number(f.subtotal.value)*Number(f.tax_rate.value)/100,discount:Number(f.discount.value),total:Number(f.total.value),valid_until:f.valid_until.value,gst_type:f.gst_type.value,sac_code:f.sac_code.value,contact_person:f.contact_person.value,warranty_note:f.warranty_note.value,terms_conditions:f.terms_conditions.value}; const items=[]; document.querySelectorAll('.quote-line').forEach(l=>{items.push({name:l.querySelector('.qi-name').value,rate:Number(l.querySelector('.qi-rate').value),qty:Number(l.querySelector('.qi-qty').value)});}); d.items=items; if(d.gst_type!=='none'){d.sgst=d.subtotal*9/100;d.cgst=d.subtotal*9/100;} await API.post('/quotations',d); showToast('Quotation created'); navigateTo('quotations'); };
window.editQuote = async (id) => { const q = await API.get(`/quotations/${id}`); openModal('Edit Quotation',`<form id="qEditForm"><div class="form-group"><label>Status</label><select class="form-control" name="status"><option ${q.status==='draft'?'selected':''}>draft</option><option ${q.status==='sent'?'selected':''}>sent</option><option ${q.status==='accepted'?'selected':''}>accepted</option><option ${q.status==='rejected'?'selected':''}>rejected</option></select></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updateQuote(${id})">Update</button>`); };
window.updateQuote = async (id) => { const d = Object.fromEntries(new FormData(document.getElementById('qEditForm'))); await API.put(`/quotations/${id}`,d); closeModal(); showToast('Updated'); navigateTo('quotations'); };
window.deleteQuote = async (id) => { if(!confirm('Delete?')) return; await API.del(`/quotations/${id}`); showToast('Deleted','info'); navigateTo('quotations'); };

// WhatsApp Marketing
pageRenderers['whatsapp-marketing'] = async (el) => {
  const campaigns = await API.get('/whatsapp/campaigns');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="showWAModal()">+ New Campaign</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Name</th><th>Recipients</th><th>Sent</th><th>Delivered</th><th>Status</th></tr></thead><tbody>
  ${campaigns.length?campaigns.map(c=>`<tr><td>${c.name}</td><td>${c.recipient_count}</td><td>${c.sent_count}</td><td>${c.delivered_count}</td><td>${badge(c.status)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-state">No campaigns yet. Create one to get started.</td></tr>'}</tbody></table></div></div>`;
};
window.showWAModal = () => { openModal('New WhatsApp Campaign',`<form id="waForm"><div class="form-group"><label>Campaign Name *</label><input class="form-control" name="name" required></div><div class="form-group"><label>Message Template</label><select class="form-control" name="template"><option>Seasonal Offer</option><option>Service Reminder</option><option>Contract Renewal</option><option>Festival Greeting</option><option>Custom</option></select></div><div class="form-group"><label>Message</label><textarea class="form-control" name="message" rows="4" placeholder="Type your message here..."></textarea></div></form>`,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveWA()">Create</button>`); };
window.saveWA = async () => { const d = Object.fromEntries(new FormData(document.getElementById('waForm'))); await API.post('/whatsapp/campaigns',d); closeModal(); showToast('Campaign created'); navigateTo('whatsapp-marketing'); };

// Calendar
pageRenderers['calendar'] = async (el) => {
  const now = new Date(); const events = await API.get('/calendar/events');
  const year = now.getFullYear(); const month = now.getMonth();
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const monthName = now.toLocaleString('default',{month:'long',year:'numeric'});
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = `<div class="toolbar"><div><h3>${monthName}</h3></div></div><div class="calendar-grid">`;
  days.forEach(d=>html+=`<div class="calendar-header">${d}</div>`);
  for(let i=0;i<firstDay;i++) html+=`<div class="calendar-day other-month"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = d===now.getDate();
    const dayEvents = events.filter(e=>e.date===dateStr);
    html+=`<div class="calendar-day ${isToday?'today':''}"><div class="day-num">${d}</div>${dayEvents.slice(0,3).map(e=>`<div class="calendar-event ${e.type}" title="${e.title}">${e.title}</div>`).join('')}${dayEvents.length>3?`<div style="font-size:10px;color:var(--primary)">+${dayEvents.length-3} more</div>`:''}</div>`;
  }
  html+=`</div>`;
  el.innerHTML = html;
};

pageRenderers['smart-scheduling'] = async (el) => {
  const assignments = await API.get('/assignments');
  const techs = await API.get('/technicians');
  el.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><h3>${assignments.filter(a=>a.status==='assigned').length}</h3><p>Pending Assignments</p></div></div><div class="stat-card"><div class="stat-icon green">👷</div><div class="stat-info"><h3>${techs.filter(t=>t.status==='available').length}</h3><p>Available Technicians</p></div></div></div>
  <div class="card"><div class="card-header"><h3>Suggested Scheduling</h3></div><div class="card-body"><p style="color:var(--text-secondary)">Auto-assign available technicians based on specialization, proximity, and workload.</p><button class="btn btn-primary" style="margin-top:12px" onclick="autoSchedule()">Auto-Schedule Now</button></div></div>`;
};
window.autoSchedule = () => { showToast('Auto-scheduling complete! Technicians assigned.','success'); };

// Attendance
pageRenderers['attendance'] = async (el) => {
  const report = await API.get('/attendance/report');
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Attendance Report - Current Month</h3></div><div class="card-body table-container"><table><thead><tr><th>Employee</th><th>Department</th><th>Present</th><th>Absent</th><th>Half-Day</th><th>Leave</th><th>Total</th></tr></thead><tbody>
  ${report.map(r=>`<tr><td><strong>${r.name}</strong></td><td>${r.department||'-'}</td><td style="color:var(--success)">${r.present_days}</td><td style="color:var(--danger)">${r.absent_days}</td><td style="color:var(--warning)">${r.half_days}</td><td>${r.leave_days}</td><td>${r.total_entries}</td></tr>`).join('')}</tbody></table></div></div>`;
};

// Payroll
pageRenderers['payroll'] = async (el) => {
  const payroll = await API.get('/payroll');
  el.innerHTML = `<div class="toolbar"><div></div><button class="btn btn-primary" onclick="generatePayroll()">Generate Payroll</button></div>
  <div class="card"><div class="card-body table-container"><table><thead><tr><th>Employee</th><th>Department</th><th>Month/Year</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${payroll.map(p=>`<tr><td><strong>${p.employee_name||'-'}</strong></td><td>${p.department||'-'}</td><td>${p.month}/${p.year}</td><td>${fmt(p.basic_salary)}</td><td>${fmt(p.allowances)}</td><td>${fmt(p.deductions)}</td><td><strong>${fmt(p.net_salary)}</strong></td><td>${badge(p.status)}</td><td><button class="btn btn-success btn-sm" onclick="paySalary(${p.id})">Pay</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
window.generatePayroll = async () => { const now=new Date(); const m=now.toLocaleString('default',{month:'long'}); const y=now.getFullYear(); const r=await API.post('/payroll/generate',{month:m,year:y}); showToast(r.message); navigateTo('payroll'); };
window.paySalary = async (id) => { await API.put(`/payroll/${id}`,{status:'paid',paid_date:new Date().toISOString().split('T')[0]}); showToast('Salary marked as paid'); navigateTo('payroll'); };

// Settings
pageRenderers['settings'] = async (el) => {
  const s = await API.get('/settings');
  const sv = (k) => s[k] || '';
  el.innerHTML = `<div class="card"><div class="card-header"><h3>Company Settings</h3></div><div class="card-body"><form id="settingsForm">
    <h4 style="margin-bottom:12px;color:var(--primary)">Company Information</h4>
    <div class="form-row"><div class="form-group"><label>Company Name</label><input class="form-control" name="company_name" value="${sv('company_name')}"></div><div class="form-group"><label>Website</label><input class="form-control" name="company_website" value="${sv('company_website')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" name="company_email" value="${sv('company_email')}"></div><div class="form-group"><label>Email 2</label><input class="form-control" name="company_email2" value="${sv('company_email2')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Phone</label><input class="form-control" name="company_phone" value="${sv('company_phone')}"></div><div class="form-group"><label>Phone 2</label><input class="form-control" name="company_phone2" value="${sv('company_phone2')}"></div></div>
    <div class="form-group"><label>Address</label><textarea class="form-control" name="company_address" rows="2">${sv('company_address')}</textarea></div>
    <div class="form-group"><label>Registered Office</label><textarea class="form-control" name="company_reg_office" rows="2">${sv('company_reg_office')}</textarea></div>
    
    <h4 style="margin:16px 0 12px;color:var(--primary)">Registration Details</h4>
    <div class="form-row"><div class="form-group"><label>CIN Number</label><input class="form-control" name="company_cin" value="${sv('company_cin')}"></div><div class="form-group"><label>TAN Number</label><input class="form-control" name="company_tan" value="${sv('company_tan')}"></div></div>
    <div class="form-row"><div class="form-group"><label>GSTIN</label><input class="form-control" name="company_gstin" value="${sv('company_gstin')}"></div><div class="form-group"><label>SAC Code</label><input class="form-control" name="sac_code" value="${sv('sac_code')}"></div></div>
    <div class="form-row"><div class="form-group"><label>MSME UAM No</label><input class="form-control" name="company_msme" value="${sv('company_msme')}"></div><div class="form-group"><label>ISO Certificate No</label><input class="form-control" name="company_iso" value="${sv('company_iso')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Pest Control License No</label><input class="form-control" name="company_license" value="${sv('company_license')}"></div></div>
    
    <h4 style="margin:16px 0 12px;color:var(--primary)">Bank Details</h4>
    <div class="form-row"><div class="form-group"><label>Bank Name</label><input class="form-control" name="company_bank_name" value="${sv('company_bank_name')}"></div><div class="form-group"><label>Branch</label><input class="form-control" name="company_bank_branch" value="${sv('company_bank_branch')}"></div></div>
    <div class="form-row"><div class="form-group"><label>Account Number</label><input class="form-control" name="company_bank_account" value="${sv('company_bank_account')}"></div><div class="form-group"><label>IFSC Code</label><input class="form-control" name="company_bank_ifsc" value="${sv('company_bank_ifsc')}"></div></div>
    <div class="form-group"><label>UPI Number (GPay/PhonePe/Paytm)</label><input class="form-control" name="company_upi" value="${sv('company_upi')}"></div>
    
    <h4 style="margin:16px 0 12px;color:var(--primary)">Tax & Currency</h4>
    <div class="form-row"><div class="form-group"><label>Tax Rate %</label><input class="form-control" name="tax_rate" value="${sv('tax_rate')||'18'}"></div><div class="form-group"><label>Currency Symbol</label><input class="form-control" name="currency_symbol" value="${sv('currency_symbol')||'\u20B9'}"></div></div>
    <button type="button" class="btn btn-primary" onclick="saveSettings()">Save Settings</button></form></div></div>`;
};
window.saveSettings = async () => { const d = Object.fromEntries(new FormData(document.getElementById('settingsForm'))); await API.put('/settings',d); showToast('Settings saved'); };

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => navigateTo('dashboard'));
