const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Submit or update daily data
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      date,
      calls = 0,
      appointments = 0,
      presentations = 0,
      sales = 0,
      production = 0,
      lead_spend = 0,
      deposits = 0,
      recruits = 0,
      kpi_faith = 0,
      kpi_physical = 0,
      kpi_reel = 0,
      kpi_sale_or_pres = 0
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const db = getDb();
    const userId = req.user.id;

    // Check if submission exists for this date
    const existing = db.prepare('SELECT id FROM submissions WHERE user_id = ? AND date = ?').get(userId, date);

    if (existing) {
      // Update existing submission
      db.prepare(`
        UPDATE submissions SET
          calls = ?, appointments = ?, presentations = ?, sales = ?,
          production = ?, lead_spend = ?, deposits = ?, recruits = ?,
          kpi_faith = ?, kpi_physical = ?, kpi_reel = ?, kpi_sale_or_pres = ?,
          updated_at = datetime('now')
        WHERE user_id = ? AND date = ?
      `).run(
        calls, appointments, presentations, sales,
        production, lead_spend, deposits, recruits,
        kpi_faith ? 1 : 0, kpi_physical ? 1 : 0, kpi_reel ? 1 : 0, kpi_sale_or_pres ? 1 : 0,
        userId, date
      );
    } else {
      // Insert new submission
      db.prepare(`
        INSERT INTO submissions (id, user_id, date, calls, appointments, presentations, sales,
          production, lead_spend, deposits, recruits,
          kpi_faith, kpi_physical, kpi_reel, kpi_sale_or_pres)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), userId, date, calls, appointments, presentations, sales,
        production, lead_spend, deposits, recruits,
        kpi_faith ? 1 : 0, kpi_physical ? 1 : 0, kpi_reel ? 1 : 0, kpi_sale_or_pres ? 1 : 0
      );
    }

    res.json({ success: true, message: 'Data submitted successfully' });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Failed to submit data: ' + err.message });
  }
});

// Get my submissions
router.get('/mine', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period } = req.query; // day, week, month, year, all
    const userId = req.user.id;

    let dateFilter = '';
    const today = new Date().toISOString().split('T')[0];

    switch (period) {
      case 'day':
        dateFilter = `AND date = '${today}'`;
        break;
      case 'week':
        dateFilter = `AND date >= date('now', 'weekday 0', '-6 days')`;
        break;
      case 'month':
        dateFilter = `AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`;
        break;
      case 'year':
        dateFilter = `AND strftime('%Y', date) = strftime('%Y', 'now')`;
        break;
      default:
        dateFilter = '';
    }

    const submissions = db.prepare(`
      SELECT * FROM submissions WHERE user_id = ? ${dateFilter} ORDER BY date DESC
    `).all(userId);

    // Calculate totals
    const totals = {
      calls: 0, appointments: 0, presentations: 0, sales: 0,
      production: 0, lead_spend: 0, deposits: 0, recruits: 0,
      kpi_faith: 0, kpi_physical: 0, kpi_reel: 0, kpi_sale_or_pres: 0,
      all_kpis: 0
    };

    for (const s of submissions) {
      totals.calls += s.calls;
      totals.appointments += s.appointments;
      totals.presentations += s.presentations;
      totals.sales += s.sales;
      totals.production += s.production;
      totals.lead_spend += s.lead_spend;
      totals.deposits += s.deposits;
      totals.recruits += s.recruits;
      totals.kpi_faith += s.kpi_faith;
      totals.kpi_physical += s.kpi_physical;
      totals.kpi_reel += s.kpi_reel;
      totals.kpi_sale_or_pres += s.kpi_sale_or_pres;
      if (s.kpi_faith && s.kpi_physical && s.kpi_reel && s.kpi_sale_or_pres) {
        totals.all_kpis++;
      }
    }

    // Ratios
    const ratios = {
      calls_per_appointment: totals.appointments > 0 ? (totals.calls / totals.appointments).toFixed(1) : 'N/A',
      appointments_per_presentation: totals.presentations > 0 ? (totals.appointments / totals.presentations).toFixed(1) : 'N/A',
      presentations_per_sale: totals.sales > 0 ? (totals.presentations / totals.sales).toFixed(1) : 'N/A',
      avg_ap_per_sale: totals.sales > 0 ? (totals.production / totals.sales).toFixed(0) : 'N/A',
      close_ratio: totals.presentations > 0 ? ((totals.sales / totals.presentations) * 100).toFixed(1) : 'N/A'
    };

    res.json({ submissions, totals, ratios });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Get today's submission for current user
router.get('/today', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const submission = db.prepare('SELECT * FROM submissions WHERE user_id = ? AND date = ?').get(req.user.id, today);
    res.json({ submission: submission || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today\'s submission' });
  }
});

module.exports = router;
