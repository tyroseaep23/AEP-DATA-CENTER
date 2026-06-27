const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all teams
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Add a new team (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM teams WHERE name = ?').get(name.trim());
    if (existing) {
      return res.status(400).json({ error: 'A team with this name already exists' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO teams (id, name, is_default) VALUES (?, ?, 0)').run(id, name.trim());

    res.json({ success: true, team: { id, name: name.trim() } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add team' });
  }
});

// Delete a team (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.is_default) return res.status(400).json({ error: 'Cannot delete default teams' });

    db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

module.exports = router;
