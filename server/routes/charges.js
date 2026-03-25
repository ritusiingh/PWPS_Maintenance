const express = require('express');
const { db } = require('../models/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try { res.json(await db.all('SELECT * FROM service_charges ORDER BY category, service_name')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { service_name, description, monthly_total_cost, category } = req.body;
    if (!service_name || !monthly_total_cost) return res.status(400).json({ error: 'service_name and monthly_total_cost required' });
    const result = await db.run('INSERT INTO service_charges (service_name, description, monthly_total_cost, category) VALUES (?,?,?,?)', service_name, description||'', monthly_total_cost, category||'other');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Charge added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { service_name, description, monthly_total_cost, category, is_active } = req.body;
    await db.run('UPDATE service_charges SET service_name=?, description=?, monthly_total_cost=?, category=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', service_name, description, monthly_total_cost, category, is_active, req.params.id);
    res.json({ message: 'Charge updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try { await db.run('DELETE FROM service_charges WHERE id = ?', req.params.id); res.json({ message: 'Charge deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
