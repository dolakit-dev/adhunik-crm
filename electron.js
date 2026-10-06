const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

let mainWindow = null;
const PORT = 3456;

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function createWindow() {
  console.log('[Electron] Creating window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Adhunik Pest Control CRM',
    backgroundColor: '#f0f2f5',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Application menu
  const execPage = (page) => { if (mainWindow) mainWindow.webContents.executeJavaScript(`navigateTo('${page}')`); };
  
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'Dashboard', click: () => execPage('dashboard') },
      { label: 'Refresh', accelerator: 'F5', click: () => mainWindow.reload() },
      { type: 'separator' },
      { label: 'Exit', accelerator: 'Alt+F4', click: () => { app.isQuitting = true; app.quit(); } },
    ]},
    { label: 'Sales', submenu: [
      { label: 'Leads', click: () => execPage('leads') },
      { label: 'Pipeline', click: () => execPage('lead-pipeline') },
      { label: 'Inspections', click: () => execPage('inspections') },
      { label: 'Quotations', click: () => execPage('quotations') },
      { label: 'Contracts', click: () => execPage('manage-contracts') },
      { label: 'Invoices', click: () => execPage('invoices') },
      { label: 'Complaints', click: () => execPage('manage-complaints') },
    ]},
    { label: 'Operations', submenu: [
      { label: 'Assign Services', click: () => execPage('assign-services') },
      { label: 'Assigned Services', click: () => execPage('assigned-services') },
      { label: 'Track Technicians', click: () => execPage('tracking') },
      { label: 'Calendar', click: () => execPage('calendar') },
      { label: 'Field Reports', click: () => execPage('field-reports') },
    ]},
    { label: 'People', submenu: [
      { label: 'Customers', click: () => execPage('customers') },
      { label: 'Technicians', click: () => execPage('technicians') },
      { label: 'Employees', click: () => execPage('employees') },
      { label: 'Vendors', click: () => execPage('vendors') },
    ]},
    { label: 'Accounting', submenu: [
      { label: 'Receipt Voucher', click: () => execPage('receipt-voucher') },
      { label: 'Payment Voucher', click: () => execPage('payment-voucher') },
      { label: 'Expenses', click: () => execPage('expenses') },
      { label: 'General Ledger', click: () => execPage('general-ledger') },
      { label: 'Payroll', click: () => execPage('payroll') },
    ]},
    { label: 'Help', submenu: [
      { label: 'Dev Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
      { label: 'About', click: () => {
        dialog.showMessageBox(mainWindow, {
          type: 'info', title: 'About PestShield Pro',
          message: 'PestShield Pro CRM v1.0.0',
          detail: 'Complete Pest Control Business Management System\n\n2026 PestShield Pro',
          buttons: ['OK']
        });
      }},
    ]},
  ]));

  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] Window ready, showing...');
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  console.log(`[Electron] Loading http://localhost:${PORT}`);
  mainWindow.loadURL(`http://localhost:${PORT}`);
}

// ===== START =====
app.whenReady().then(async () => {
  console.log('[Electron] App ready, starting server...');

  try {
    const { startServer } = require('./server');
    await startServer(PORT);
    console.log(`[Electron] Server started on port ${PORT}`);

    createWindow();
    console.log('[Electron] PestShield Pro is ready!');
  } catch (err) {
    console.error('[Electron] Error:', err.message);
    try {
      dialog.showErrorBox('Error', 'Failed to start: ' + err.message);
    } catch(e) {}
    app.quit();
  }
});

app.on('window-all-closed', () => {});
app.on('activate', () => { if (!mainWindow) createWindow(); else mainWindow.show(); });
app.on('before-quit', () => { app.isQuitting = true; });
