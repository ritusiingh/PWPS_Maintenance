const express = require('express');
const { db } = require('../models/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, bhk, block } = req.query;
    let sql = 'SELECT * FROM flats WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND (flat_number LIKE ? OR owner_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (bhk) { sql += ' AND bhk_type = ?'; params.push(bhk); }
    if (block) { sql += ' AND block = ?'; params.push(block); }
    sql += ' ORDER BY flat_number ASC';
    res.json(await db.all(sql, ...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const total = await db.get('SELECT COUNT(*) as count FROM flats');
    const byBHK = await db.all('SELECT bhk_type, COUNT(*) as count, AVG(carpet_area_sqft) as avgArea, AVG(uds_area_sqft) as avgUDS FROM flats GROUP BY bhk_type');
    const byBlock = await db.all('SELECT block, COUNT(*) as count FROM flats GROUP BY block');
    const totalArea = await db.get('SELECT SUM(carpet_area_sqft) as carpet, SUM(super_buildup_sqft) as super, SUM(uds_area_sqft) as uds FROM flats');
    res.json({ total: total.count, byBHK, byBlock, totalArea });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const flat = await db.get('SELECT * FROM flats WHERE id = ?', req.params.id);
    if (!flat) return res.status(404).json({ error: 'Flat not found' });
    res.json(flat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { flat_number, block, floor, bhk_type, carpet_area_sqft, super_buildup_sqft, uds_area_sqft, owner_name, owner_email, owner_phone, is_occupied, tenant_name } = req.body;
    if (!flat_number || !bhk_type || !carpet_area_sqft || !uds_area_sqft || !owner_name) return res.status(400).json({ error: 'flat_number, bhk_type, carpet_area_sqft, uds_area_sqft, owner_name required' });
    const result = await db.run('INSERT INTO flats (flat_number, block, floor, bhk_type, carpet_area_sqft, super_buildup_sqft, uds_area_sqft, owner_name, owner_email, owner_phone, is_occupied, tenant_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      flat_number, block||null, floor||null, bhk_type, carpet_area_sqft, super_buildup_sqft||(carpet_area_sqft*1.3), uds_area_sqft, owner_name, owner_email||null, owner_phone||null, is_occupied??1, tenant_name||null);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Flat added' });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Flat number already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { flats } = req.body;
    if (!Array.isArray(flats) || !flats.length) return res.status(400).json({ error: 'Array of flats required' });
    let inserted = 0;
    for (const f of flats) {
      try {
        await db.run('INSERT OR IGNORE INTO flats (flat_number,block,floor,bhk_type,carpet_area_sqft,super_buildup_sqft,uds_area_sqft,owner_name,owner_email,owner_phone) VALUES (?,?,?,?,?,?,?,?,?,?)',
          f.flat_number, f.block||null, f.floor||null, f.bhk_type, f.carpet_area_sqft, f.super_buildup_sqft||(f.carpet_area_sqft*1.3), f.uds_area_sqft, f.owner_name, f.owner_email||null, f.owner_phone||null);
        inserted++;
      } catch { /* skip duplicates */ }
    }
    res.json({ message: `${inserted} flats imported`, total: flats.length, inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { flat_number, block, floor, bhk_type, carpet_area_sqft, super_buildup_sqft, uds_area_sqft, owner_name, owner_email, owner_phone, is_occupied, tenant_name } = req.body;
    await db.run('UPDATE flats SET flat_number=?,block=?,floor=?,bhk_type=?,carpet_area_sqft=?,super_buildup_sqft=?,uds_area_sqft=?,owner_name=?,owner_email=?,owner_phone=?,is_occupied=?,tenant_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
      flat_number, block, floor, bhk_type, carpet_area_sqft, super_buildup_sqft, uds_area_sqft, owner_name, owner_email, owner_phone, is_occupied, tenant_name, req.params.id);
    res.json({ message: 'Flat updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.run('DELETE FROM flats WHERE id = ?', req.params.id);
    res.json({ message: 'Flat deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
