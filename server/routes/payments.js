const express = require('express');
const { db } = require('../models/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendEmail, paymentConfirmationHTML } = require('../utils/email');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { flat_id, month, year } = req.query;
    let sql = 'SELECT p.*, f.flat_number, f.owner_name, mb.bill_month, mb.bill_year, mb.total_amount as bill_amount, u.name as recorded_by_name FROM payments p JOIN flats f ON p.flat_id = f.id JOIN maintenance_bills mb ON p.bill_id = mb.id LEFT JOIN users u ON p.recorded_by = u.id WHERE 1=1';
    const params = [];
    if (flat_id) { sql += ' AND p.flat_id = ?'; params.push(flat_id); }
    if (month) { sql += ' AND mb.bill_month = ?'; params.push(month); }
    if (year) { sql += ' AND mb.bill_year = ?'; params.push(year); }
    sql += ' ORDER BY p.created_at DESC';
    res.json(await db.all(sql, ...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { bill_id, flat_id, amount, payment_date, payment_mode, transaction_id, reference_number, remarks } = req.body;
    if (!bill_id || !flat_id || !amount || !payment_date) return res.status(400).json({ error: 'bill_id, flat_id, amount, payment_date required' });
    const bill = await db.get('SELECT * FROM maintenance_bills WHERE id = ?', bill_id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const result = await db.run('INSERT INTO payments (bill_id,flat_id,amount,payment_date,payment_mode,transaction_id,reference_number,remarks,recorded_by) VALUES (?,?,?,?,?,?,?,?,?)',
      bill_id, flat_id, amount, payment_date, payment_mode||'offline', transaction_id||null, reference_number||null, remarks||null, req.user.id);

    const totalPaid = await db.get('SELECT SUM(amount) as total FROM payments WHERE bill_id = ?', bill_id);
    const paid = totalPaid?.total || 0;
    let status = 'pending';
    if (paid >= bill.total_amount) status = 'paid';
    else if (paid > 0) status = 'partial';
    await db.run('UPDATE maintenance_bills SET status = ? WHERE id = ?', status, bill_id);

    // Send confirmation email async
    const flat = await db.get('SELECT * FROM flats WHERE id = ?', flat_id);
    if (flat?.owner_email) {
      sendEmail(flat.owner_email, 'Payment Confirmation - PWPS Maintenance',
        paymentConfirmationHTML(flat.owner_name, flat.flat_number, amount, transaction_id, payment_date), null, flat_id).catch(() => {});
    }

    res.status(201).json({ id: result.lastInsertRowid, message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const payment = await db.get('SELECT * FROM payments WHERE id = ?', req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    await db.run('DELETE FROM payments WHERE id = ?', req.params.id);
    const bill = await db.get('SELECT * FROM maintenance_bills WHERE id = ?', payment.bill_id);
    if (bill) {
      const totalPaid = await db.get('SELECT SUM(amount) as total FROM payments WHERE bill_id = ?', payment.bill_id);
      const paid = totalPaid?.total || 0;
      let status = 'pending';
      if (paid >= bill.total_amount) status = 'paid';
      else if (paid > 0) status = 'partial';
      await db.run('UPDATE maintenance_bills SET status = ? WHERE id = ?', status, payment.bill_id);
    }
    res.json({ message: 'Payment deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
