const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendAccountApprovedEmail } = require('../services/emailService');

// All admin routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

// Get all users (with personal info)
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT id, name, email, phone, team, tenure_months, role, approved, active,
             created_at, approved_at, last_login
      FROM users ORDER BY created_at DESC
    `).all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get pending approvals
router.get('/pending', (req, res) => {
  try {
    const db = getDb();
    const pending = db.prepare(`
      SELECT id, name, email, phone, team, tenure_months, created_at
      FROM users WHERE approved = 0 AND active = 1
      ORDER BY created_at DESC
    `).all();
    res.json({ pending });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Approve a user
router.post('/approve/:id', async (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare(`
      UPDATE users SET approved = 1, approved_at = datetime('now') WHERE id = ?
    `).run(req.params.id);

    // Send approval email
    try {
      await sendAccountApprovedEmail(user);
    } catch (e) {
      console.error('Approval email failed:', e.message);
    }

    res.json({ success: true, message: `${user.name}'s account has been approved` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Deactivate a user (removes access but keeps data)
router.post('/deactivate/:id', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot deactivate admin account' });

    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `${user.name}'s account has been deactivated. Their data is preserved.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reactivate a user
router.post('/reactivate/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE users SET active = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// Deny/delete pending account
router.delete('/users/:id', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin account' });

    // Only delete if never approved (pending account)
    if (user.approved === 0) {
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'Pending account denied and removed' });
    } else {
      // If approved, just deactivate to preserve data
      db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'Account deactivated. Data preserved in agency totals.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// Get all incentives
router.get('/incentives', (req, res) => {
  try {
    const db = getDb();
    const incentives = db.prepare('SELECT * FROM incentives ORDER BY created_at DESC').all();
    res.json({ incentives });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incentives' });
  }
});

// Add incentive
router.post('/incentives', (req, res) => {
  try {
    const { title, description, expires_at } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO incentives (id, title, description, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, title, description || '', expires_at || null, req.user.id);

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add incentive' });
  }
});

// Delete incentive
router.delete('/incentives/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM incentives WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete incentive' });
  }
});

// Toggle incentive active/inactive
router.post('/incentives/:id/toggle', (req, res) => {
  try {
    const db = getDb();
    const incentive = db.prepare('SELECT * FROM incentives WHERE id = ?').get(req.params.id);
    if (!incentive) return res.status(404).json({ error: 'Incentive not found' });
    db.prepare('UPDATE incentives SET active = ? WHERE id = ?').run(incentive.active ? 0 : 1, req.params.id);
    res.json({ success: true, active: !incentive.active });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle incentive' });
  }
});

// Change site password
router.post('/site-password', (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }
    const db = getDb();
    db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'site_password'").run(new_password);
    res.json({ success: true, message: 'Site password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update site password' });
  }
});

// Get site settings
router.get('/settings', (req, res) => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

module.exports = router;
