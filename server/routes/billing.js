const express = require('express');
const { db } = require('../models/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { calculateAll, saveSnapshot } = require('../utils/calculator');
const { generateInvoicePDF } = require('../utils/invoice');
const { sendEmail, maintenanceReminderHTML } = require('../utils/email');
const router = express.Router();

router.get('/calculate', authMiddleware, async (req, res) => {
  try { res.json(await calculateAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/calculate/generate-bills', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { month, year, method, dueDate } = req.body;
    if (!month || !year || !method) return res.status(400).json({ error: 'month, year, method required' });
    const existing = await db.get('SELECT COUNT(*) as count FROM maintenance_bills WHERE bill_month = ? AND bill_year = ?', month, year);
    if (existing.count > 0) return res.status(409).json({ error: `Bills already exist for ${month} ${year}. Delete first.` });
    const { results } = await calculateAll();
    if (!results?.length) return res.status(400).json({ error: 'No flats or charges configured' });
    const billDate = new Date().toISOString().split('T')[0];
    const due = dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    let count = 0;
    for (const r of results) {
      const amount = r[method].total;
      await db.run('INSERT INTO maintenance_bills (flat_id,bill_month,bill_year,bill_date,due_date,calculation_method,base_amount,total_amount,bill_details) VALUES (?,?,?,?,?,?,?,?,?)',
        r.flat_id, month, year, billDate, due, method, amount, amount, JSON.stringify(r[method].breakdown));
      count++;
    }
    await saveSnapshot(month, year);
    res.json({ message: `${count} bills generated for ${month} ${year}`, count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/bills', authMiddleware, async (req, res) => {
  try {
    const { month, year, status, flat_id } = req.query;
    let sql = 'SELECT mb.*, f.flat_number, f.owner_name, f.bhk_type, f.block FROM maintenance_bills mb JOIN flats f ON mb.flat_id = f.id WHERE 1=1';
    const params = [];
    if (month) { sql += ' AND mb.bill_month = ?'; params.push(month); }
    if (year) { sql += ' AND mb.bill_year = ?'; params.push(year); }
    if (status) { sql += ' AND mb.status = ?'; params.push(status); }
    if (flat_id) { sql += ' AND mb.flat_id = ?'; params.push(flat_id); }
    sql += ' ORDER BY mb.bill_year DESC, mb.bill_month DESC, f.flat_number ASC';
    res.json(await db.all(sql, ...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/bills/:id/invoice', authMiddleware, async (req, res) => {
  try {
    const bill = await db.get('SELECT * FROM maintenance_bills WHERE id = ?', req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const flat = await db.get('SELECT * FROM flats WHERE id = ?', bill.flat_id);
    const payment = await db.get('SELECT * FROM payments WHERE bill_id = ? ORDER BY created_at DESC LIMIT 1', bill.id);
    const charges = await db.all('SELECT * FROM service_charges WHERE is_active = 1');
    const pdfBuffer = await generateInvoicePDF(bill, flat, charges, payment);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${flat.flat_number}-${bill.bill_month}-${bill.bill_year}.pdf`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ error: 'Failed to generate invoice' }); }
});

router.delete('/bills/month', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });
    const result = await db.run('DELETE FROM maintenance_bills WHERE bill_month = ? AND bill_year = ?', month, year);
    res.json({ message: `${result.changes} bills deleted` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/bills/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.run('DELETE FROM payments WHERE bill_id = ?', req.params.id);
    await db.run('DELETE FROM maintenance_bills WHERE id = ?', req.params.id);
    res.json({ message: 'Bill deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bills/manual', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { flat_id, bill_month, bill_year, calculation_method, total_amount, due_date, bill_details } = req.body;
    if (!flat_id || !bill_month || !bill_year || !total_amount) return res.status(400).json({ error: 'flat_id, bill_month, bill_year, total_amount required' });
    const flat = await db.get('SELECT * FROM flats WHERE id = ?', flat_id);
    if (!flat) return res.status(404).json({ error: 'Flat not found' });
    const billDate = new Date().toISOString().split('T')[0];
    const due = due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const method = calculation_method || 'hybrid';
    const details = bill_details ? JSON.stringify([{ service: 'Manual Entry', totalCost: total_amount, share: total_amount, method }]) : '[]';
    const result = await db.run('INSERT INTO maintenance_bills (flat_id,bill_month,bill_year,bill_date,due_date,calculation_method,base_amount,total_amount,bill_details) VALUES (?,?,?,?,?,?,?,?,?)',
      flat_id, bill_month, Number(bill_year), billDate, due, method, total_amount, total_amount, details);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Bill created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bills/send-reminders', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { month, year } = req.body;
    const pendingBills = await db.all("SELECT mb.*, f.flat_number, f.owner_name, f.owner_email FROM maintenance_bills mb JOIN flats f ON mb.flat_id = f.id WHERE mb.bill_month = ? AND mb.bill_year = ? AND mb.status IN ('pending','overdue') AND f.owner_email IS NOT NULL AND f.owner_email != ''", month, year);
    let sent = 0;
    for (const bill of pendingBills) {
      const html = maintenanceReminderHTML(bill.owner_name, bill.flat_number, bill.total_amount, bill.bill_month, bill.bill_year, bill.due_date);
      const result = await sendEmail(bill.owner_email, `Maintenance Payment Reminder - ${bill.bill_month} ${bill.bill_year}`, html, null, bill.flat_id);
      if (result.success) sent++;
    }
    res.json({ message: `${sent} reminders sent`, sent, total: pendingBills.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
