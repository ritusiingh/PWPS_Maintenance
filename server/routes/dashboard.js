const express = require('express');
const { db } = require('../models/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const totalFlats = (await db.get('SELECT COUNT(*) as c FROM flats')).c;
    const totalUsers = (await db.get('SELECT COUNT(*) as c FROM users WHERE is_active = 1')).c;
    const now = new Date();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();

    const bs = (await db.get(`SELECT COUNT(*) as total_bills, SUM(total_amount) as total_billed, SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) as total_collected, SUM(CASE WHEN status='pending' THEN total_amount ELSE 0 END) as total_pending, SUM(CASE WHEN status='overdue' THEN total_amount ELSE 0 END) as total_overdue, COUNT(CASE WHEN status='paid' THEN 1 END) as paid_count, COUNT(CASE WHEN status='pending' THEN 1 END) as pending_count, COUNT(CASE WHEN status='overdue' THEN 1 END) as overdue_count FROM maintenance_bills WHERE bill_month = ? AND bill_year = ?`, currentMonth, currentYear)) || {};

    const paymentsTotal = await db.get('SELECT SUM(p.amount) as total FROM payments p JOIN maintenance_bills mb ON p.bill_id = mb.id WHERE mb.bill_month = ? AND mb.bill_year = ?', currentMonth, currentYear);
    const expenseTotal = await db.get("SELECT SUM(amount) as total FROM expenses WHERE strftime('%m', expense_date) = ? AND strftime('%Y', expense_date) = ?", String(now.getMonth() + 1).padStart(2, '0'), String(currentYear));

    const monthlyTrend = await db.all("SELECT bill_month, bill_year, SUM(total_amount) as billed, SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) as collected, COUNT(*) as bills FROM maintenance_bills GROUP BY bill_year, bill_month ORDER BY bill_year DESC LIMIT 6");

    const allTimeBills = await db.get("SELECT COUNT(*) as total, COUNT(CASE WHEN status='paid' THEN 1 END) as paid FROM maintenance_bills");

    res.json({ totalFlats, totalUsers, currentMonth, currentYear, billsSummary: bs, paymentsCollected: paymentsTotal?.total || 0, expenses: expenseTotal?.total || 0, monthlyTrend: (monthlyTrend || []).reverse(), collectionRate: allTimeBills.total > 0 ? Math.round((allTimeBills.paid / allTimeBills.total) * 100) : 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/expense-vs-collection', authMiddleware, async (req, res) => {
  try {
    const collections = await db.all('SELECT mb.bill_month as month, mb.bill_year as year, SUM(p.amount) as collected FROM payments p JOIN maintenance_bills mb ON p.bill_id = mb.id GROUP BY mb.bill_year, mb.bill_month');
    const expenses = await db.all("SELECT strftime('%Y', expense_date) as year, strftime('%m', expense_date) as month_num, SUM(amount) as spent FROM expenses GROUP BY year, month_num");
    res.json({ collections, expenses });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/expenses', authMiddleware, async (req, res) => {
  try {
    res.json(await db.all('SELECT e.*, u.name as recorded_by_name FROM expenses e LEFT JOIN users u ON e.recorded_by = u.id ORDER BY e.expense_date DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/expenses', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { category, description, amount, expense_date, vendor_name, bill_reference } = req.body;
    if (!category || !description || !amount || !expense_date) return res.status(400).json({ error: 'category, description, amount, expense_date required' });
    const result = await db.run('INSERT INTO expenses (category, description, amount, expense_date, vendor_name, bill_reference, recorded_by) VALUES (?,?,?,?,?,?,?)', category, description, amount, expense_date, vendor_name||null, bill_reference||null, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/expenses/:id', authMiddleware, adminOnly, async (req, res) => {
  try { await db.run('DELETE FROM expenses WHERE id = ?', req.params.id); res.json({ message: 'Expense deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await db.all('SELECT * FROM settings');
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP", key, String(value));
    }
    res.json({ message: 'Settings updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
