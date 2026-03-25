const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');
const { authMiddleware, adminOnly, generateToken } = require('../middleware/auth');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, flat_id: user.flat_id } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/register', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { email, password, name, phone, role, flat_id } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name required' });
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run('INSERT INTO users (email, password, name, phone, role, flat_id) VALUES (?, ?, ?, ?, ?, ?)', email, hash, name, phone || null, role || 'resident', flat_id || null);
    res.status(201).json({ id: result.lastInsertRowid, message: 'User created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email, role, phone, flat_id, created_at FROM users WHERE id = ?', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await db.all('SELECT u.id, u.name, u.email, u.role, u.phone, u.flat_id, u.is_active, u.created_at, f.flat_number FROM users u LEFT JOIN flats f ON u.flat_id = f.id ORDER BY u.created_at DESC');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, role, flat_id, is_active, password } = req.body;
    if (password) {
      await db.run('UPDATE users SET name=?, email=?, phone=?, role=?, flat_id=?, is_active=?, password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', name, email, phone, role, flat_id, is_active, bcrypt.hashSync(password, 10), req.params.id);
    } else {
      await db.run('UPDATE users SET name=?, email=?, phone=?, role=?, flat_id=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', name, email, phone, role, flat_id, is_active, req.params.id);
    }
    res.json({ message: 'User updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password)) return res.status(400).json({ error: 'Current password incorrect' });
    await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', bcrypt.hashSync(newPassword, 10), req.user.id);
    res.json({ message: 'Password updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
