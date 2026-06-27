const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const EXCLUDED_EMAILS = ['tyroseeip@gmail.com', 'jaredhammill@icloud.com'];

// Seeded shuffle for deterministic daily matchups
function seededShuffle(arr, seed) {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dateSeed(dateStr) {
  return dateStr.replace(/-/g, '').split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0);
}

// Get or generate matchups for a given date
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Check if matchups already exist for this date
    let matchups = db.prepare(`
      SELECT m.*, u1.name as user1_name, u1.team as user1_team,
             u2.name as user2_name, u2.team as user2_team
      FROM matchups m
      JOIN users u1 ON m.user1_id = u1.id
      LEFT JOIN users u2 ON m.user2_id = u2.id
      WHERE m.date = ?
    `).all(date);

    if (matchups.length === 0) {
      // Generate new matchups
      const eligibleUsers = db.prepare(`
        SELECT id, name, team FROM users
        WHERE active = 1 AND approved = 1
        AND email NOT IN (${EXCLUDED_EMAILS.map(() => '?').join(',')})
        ORDER BY id
      `).all(...EXCLUDED_EMAILS);

      if (eligibleUsers.length >= 2) {
        const seed = dateSeed(date);
        const shuffled = seededShuffle(eligibleUsers, seed);
        const insertMatchup = db.prepare(`
          INSERT OR IGNORE INTO matchups (id, date, user1_id, user2_id)
          VALUES (?, ?, ?, ?)
        `);

        const insertMany = db.transaction((pairs) => {
          for (const [u1, u2] of pairs) {
            insertMatchup.run(uuidv4(), date, u1.id, u2 ? u2.id : null);
          }
        });

        const pairs = [];
        for (let i = 0; i < shuffled.length; i += 2) {
          pairs.push([shuffled[i], shuffled[i + 1] || null]);
        }
        insertMany(pairs);

        matchups = db.prepare(`
          SELECT m.*, u1.name as user1_name, u1.team as user1_team,
                 u2.name as user2_name, u2.team as user2_team
          FROM matchups m
          JOIN users u1 ON m.user1_id = u1.id
          LEFT JOIN users u2 ON m.user2_id = u2.id
          WHERE m.date = ?
        `).all(date);
      }
    }

    // Enrich with today's stats for each matchup
    const enriched = matchups.map(m => {
      const getStats = (userId) => {
        if (!userId) return null;
        return db.prepare(`
          SELECT calls, appointments, presentations, sales, production, recruits,
            kpi_faith, kpi_physical, kpi_reel, kpi_sale_or_pres
          FROM submissions WHERE user_id = ? AND date = ?
        `).get(userId, date) || {
          calls: 0, appointments: 0, presentations: 0, sales: 0,
          production: 0, recruits: 0, kpi_faith: 0, kpi_physical: 0, kpi_reel: 0, kpi_sale_or_pres: 0
        };
      };

      const stats1 = getStats(m.user1_id);
      const stats2 = getStats(m.user2_id);

      // Determine winners
      const winners = {};
      if (stats1 && stats2) {
        winners.production = stats1.production > stats2.production ? 'user1'
          : stats2.production > stats1.production ? 'user2' : 'tie';
        winners.sales = stats1.sales > stats2.sales ? 'user1'
          : stats2.sales > stats1.sales ? 'user2' : 'tie';
        winners.recruits = stats1.recruits > stats2.recruits ? 'user1'
          : stats2.recruits > stats1.recruits ? 'user2' : 'tie';

        const kpis1 = (stats1.kpi_faith + stats1.kpi_physical + stats1.kpi_reel + stats1.kpi_sale_or_pres);
        const kpis2 = (stats2.kpi_faith + stats2.kpi_physical + stats2.kpi_reel + stats2.kpi_sale_or_pres);
        winners.kpis = kpis1 > kpis2 ? 'user1' : kpis2 > kpis1 ? 'user2' : 'tie';
      }

      return { ...m, stats1, stats2, winners };
    });

    // Find current user's matchup
    const myMatchup = enriched.find(m =>
      m.user1_id === req.user.id || m.user2_id === req.user.id
    );

    res.json({ matchups: enriched, myMatchup: myMatchup || null, date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch matchups' });
  }
});

module.exports = router;
