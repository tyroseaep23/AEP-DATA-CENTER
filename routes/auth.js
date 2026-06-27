const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { sendAdminApprovalNotification, sendWelcomeEmail } = require('../services/emailService');

// Check site password
router.post('/check-password', (req, res) => {
  const { password } = req.body;
  const db = getDb();
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'site_password'").get();
  if (setting && setting.value === password) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Incorrect site password' });
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, team, tenure_months, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = getDb();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Validate team (unless admin/co-owner emails)
    const EXEMPT_EMAILS = ['tyroseeip@gmail.com', 'jaredhammill@icloud.com'];
    if (!EXEMPT_EMAILS.includes(email.toLowerCase()) && !team) {
      return res.status(400).json({ error: 'Team selection is required' });
    }

    if (team) {
      const teamExists = db.prepare('SELECT id FROM teams WHERE name = ?').get(team);
      if (!teamExists) {
        return res.status(400).json({ error: 'Invalid team selection' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    // Determine role and auto-approval
    let role = 'agent';
    let approved = 0;

    if (email.toLowerCase() === 'tyroseeip@gmail.com') {
      role = 'admin';
      approved = 1;
    } else if (email.toLowerCase() === 'jaredhammill@icloud.com') {
      role = 'co-owner';
      approved = 1;
    }

    db.prepare(`
      INSERT INTO users (id, name, email, phone, team, tenure_months, role, approved, active, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, name, email, phone, team || null, tenure_months || 0, role, approved, passwordHash);

    // Send admin notification for non-admin accounts
    if (approved === 0) {
      try {
        await sendAdminApprovalNotification({ name, email, phone, team });
      } catch (e) {
        console.error('Email notification failed:', e.message);
      }
    }

    if (approved === 1) {
      const token = generateToken(id);
      const user = db.prepare('SELECT id, name, email, role, team, approved FROM users WHERE id = ?').get(id);
      return res.json({ success: true, token, user, approved: true });
    }

    res.json({
      success: true,
      approved: false,
      message: 'Account created! Your account is pending approval from the admin. You will be notified when approved.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.approved) {
      return res.status(403).json({
        error: 'Your account is pending admin approval. Please check back soon.',
        pending: true
      });
    }

    // Update last login
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;

    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json(safeUser);
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
