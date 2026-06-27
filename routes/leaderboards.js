const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

function getDateFilter(period) {
  switch (period) {
    case 'day': return `AND s.date = date('now')`;
    case 'week': return `AND s.date >= date('now', 'weekday 1', '-7 days') AND s.date <= date('now')`;
    case 'month': return `AND strftime('%Y-%m', s.date) = strftime('%Y-%m', 'now')`;
    case 'year': return `AND strftime('%Y', s.date) = strftime('%Y', 'now')`;
    default: return `AND strftime('%Y', s.date) = strftime('%Y', 'now')`;
  }
}

// Production leaderboard
router.get('/production', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year', team, limit = 10 } = req.query;
    const dateFilter = getDateFilter(period);
    const teamFilter = team ? `AND u.team = '${team}'` : '';

    const rows = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.production) as total_production,
        SUM(s.sales) as total_sales,
        SUM(s.calls) as total_calls,
        SUM(s.appointments) as total_appointments,
        SUM(s.presentations) as total_presentations,
        COUNT(DISTINCT s.date) as days_submitted
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1
        ${dateFilter} ${teamFilter}
      GROUP BY u.id, u.name, u.team
      HAVING total_production > 0
      ORDER BY total_production DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ leaderboard: rows, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Deposits leaderboard
router.get('/deposits', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year', limit = 10 } = req.query;
    const dateFilter = getDateFilter(period);

    const rows = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.deposits) as total_deposits,
        COUNT(DISTINCT s.date) as days_submitted
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1 ${dateFilter}
      GROUP BY u.id, u.name, u.team
      HAVING total_deposits > 0
      ORDER BY total_deposits DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ leaderboard: rows, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deposits leaderboard' });
  }
});

// Lead spend leaderboard
router.get('/lead-spend', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year', limit = 50 } = req.query;
    const dateFilter = getDateFilter(period);

    const rows = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.lead_spend) as total_lead_spend,
        SUM(s.production) as total_production,
        SUM(s.deposits) as total_deposits
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1 ${dateFilter}
      GROUP BY u.id, u.name, u.team
      HAVING total_lead_spend > 0
      ORDER BY total_lead_spend DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ leaderboard: rows, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lead spend leaderboard' });
  }
});

// Recruits leaderboard
router.get('/recruits', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year', limit = 5 } = req.query;
    const dateFilter = getDateFilter(period);

    const rows = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.recruits) as total_recruits
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1 ${dateFilter}
      GROUP BY u.id, u.name, u.team
      HAVING total_recruits > 0
      ORDER BY total_recruits DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ leaderboard: rows, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recruits leaderboard' });
  }
});

// Close ratio leaderboard (min 5 presentations)
router.get('/close-ratio', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year', limit = 10 } = req.query;
    const dateFilter = getDateFilter(period);

    const rows = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.sales) as total_sales,
        SUM(s.presentations) as total_presentations,
        CASE WHEN SUM(s.presentations) > 0
          THEN ROUND((SUM(s.sales) * 100.0 / SUM(s.presentations)), 1)
          ELSE 0
        END as close_ratio
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1 ${dateFilter}
      GROUP BY u.id, u.name, u.team
      HAVING total_presentations >= 5
      ORDER BY close_ratio DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ leaderboard: rows, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch close ratio leaderboard' });
  }
});

// KPI leaderboard
router.get('/kpis', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year', limit = 10 } = req.query;
    const dateFilter = getDateFilter(period);

    const rows = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.kpi_faith) as faith_days,
        SUM(s.kpi_physical) as physical_days,
        SUM(s.kpi_reel) as reel_days,
        SUM(s.kpi_sale_or_pres) as sale_or_pres_days,
        SUM(CASE WHEN s.kpi_faith = 1 AND s.kpi_physical = 1 AND s.kpi_reel = 1 AND s.kpi_sale_or_pres = 1 THEN 1 ELSE 0 END) as all_kpis_days,
        COUNT(DISTINCT s.date) as days_submitted
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1 ${dateFilter}
      GROUP BY u.id, u.name, u.team
      HAVING days_submitted > 0
      ORDER BY all_kpis_days DESC, days_submitted DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ leaderboard: rows, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KPI leaderboard' });
  }
});

// Team leaderboard
router.get('/teams', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year' } = req.query;
    const dateFilter = getDateFilter(period);

    const teams = db.prepare('SELECT name FROM teams ORDER BY name').all();

    const teamStats = teams.map(team => {
      const stats = db.prepare(`
        SELECT
          COUNT(DISTINCT u.id) as agent_count,
          COALESCE(SUM(s.production), 0) as total_production,
          COALESCE(SUM(s.deposits), 0) as total_deposits,
          COALESCE(SUM(s.sales), 0) as total_sales,
          COALESCE(SUM(s.calls), 0) as total_calls,
          COALESCE(SUM(s.appointments), 0) as total_appointments,
          COALESCE(SUM(s.presentations), 0) as total_presentations,
          COALESCE(SUM(s.recruits), 0) as total_recruits,
          COALESCE(SUM(s.lead_spend), 0) as total_lead_spend,
          COALESCE(SUM(CASE WHEN s.kpi_faith=1 AND s.kpi_physical=1 AND s.kpi_reel=1 AND s.kpi_sale_or_pres=1 THEN 1 ELSE 0 END), 0) as all_kpis_days
        FROM users u
        LEFT JOIN submissions s ON u.id = s.user_id ${dateFilter}
        WHERE u.active = 1 AND u.approved = 1 AND u.team = ?
      `).get(team.name);

      return { team: team.name, ...stats };
    }).filter(t => t.agent_count > 0 || t.total_production > 0);

    teamStats.sort((a, b) => b.total_production - a.total_production);

    res.json({ teams: teamStats, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team leaderboard' });
  }
});

// AEP overall agency stats
router.get('/agency', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year' } = req.query;
    const dateFilter = getDateFilter(period);

    const stats = db.prepare(`
      SELECT
        COALESCE(SUM(s.production), 0) as total_production,
        COALESCE(SUM(s.deposits), 0) as total_deposits,
        COALESCE(SUM(s.sales), 0) as total_sales,
        COALESCE(SUM(s.calls), 0) as total_calls,
        COALESCE(SUM(s.appointments), 0) as total_appointments,
        COALESCE(SUM(s.presentations), 0) as total_presentations,
        COALESCE(SUM(s.recruits), 0) as total_recruits,
        COALESCE(SUM(s.lead_spend), 0) as total_lead_spend,
        COUNT(DISTINCT u.id) as active_submitters,
        COUNT(DISTINCT s.date || '_' || u.id) as total_daily_submissions,
        COALESCE(SUM(CASE WHEN s.kpi_faith=1 AND s.kpi_physical=1 AND s.kpi_reel=1 AND s.kpi_sale_or_pres=1 THEN 1 ELSE 0 END), 0) as all_kpis_total,
        CASE WHEN SUM(s.appointments) > 0 THEN ROUND(SUM(s.calls) * 1.0 / SUM(s.appointments), 1) ELSE 0 END as calls_per_appointment,
        CASE WHEN SUM(s.presentations) > 0 THEN ROUND(SUM(s.appointments) * 1.0 / SUM(s.presentations), 1) ELSE 0 END as appointments_per_presentation,
        CASE WHEN SUM(s.sales) > 0 THEN ROUND(SUM(s.presentations) * 1.0 / SUM(s.sales), 1) ELSE 0 END as presentations_per_sale,
        CASE WHEN SUM(s.sales) > 0 THEN ROUND(SUM(s.production) / SUM(s.sales), 0) ELSE 0 END as avg_ap_per_sale,
        CASE WHEN SUM(s.presentations) > 0 THEN ROUND(SUM(s.sales) * 100.0 / SUM(s.presentations), 1) ELSE 0 END as close_ratio
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id ${dateFilter}
      WHERE u.active = 1 AND u.approved = 1
    `).get();

    // Total approved agents
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE active = 1 AND approved = 1').get();

    // New agents (account created in last 30 days)
    const newAgents30 = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE active = 1 AND approved = 1
      AND created_at >= date('now', '-30 days')
    `).get();

    // Agents in first 90 days (created within last 90 days)
    const agentsIn90Days = db.prepare(`
      SELECT u.id, u.name, u.team, COALESCE(SUM(s.production), 0) as production
      FROM users u
      LEFT JOIN submissions s ON u.id = s.user_id ${dateFilter}
      WHERE u.active = 1 AND u.approved = 1
      AND u.created_at >= date('now', '-90 days')
      GROUP BY u.id, u.name, u.team
    `).all();

    const production90Days = agentsIn90Days.reduce((sum, a) => sum + (a.production || 0), 0);

    // New submitters this week
    const newSubmittersWeek = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN submissions s ON u.id = s.user_id
      WHERE u.created_at >= date('now', '-7 days')
      AND s.date >= date('now', '-7 days')
    `).get();

    // New submitters this month
    const newSubmittersMonth = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN submissions s ON u.id = s.user_id
      WHERE strftime('%Y-%m', u.created_at) = strftime('%Y-%m', 'now')
    `).get();

    res.json({
      stats,
      total_agents: agentCount.count,
      new_agents_30_days: newAgents30.count,
      agents_in_90_days: agentsIn90Days.length,
      production_90_days: production90Days,
      new_submitters_week: newSubmittersWeek.count,
      new_submitters_month: newSubmittersMonth.count,
      period
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agency stats' });
  }
});

// Struggling agents (submitting but low performance)
router.get('/struggling', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'month' } = req.query;
    const dateFilter = getDateFilter(period);

    const rows = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.calls) as total_calls,
        SUM(s.appointments) as total_appointments,
        SUM(s.presentations) as total_presentations,
        SUM(s.sales) as total_sales,
        SUM(s.production) as total_production,
        SUM(s.lead_spend) as total_lead_spend,
        SUM(s.deposits) as total_deposits,
        COUNT(DISTINCT s.date) as days_submitted,
        CASE WHEN SUM(s.presentations) > 0
          THEN ROUND(SUM(s.sales) * 100.0 / SUM(s.presentations), 1)
          ELSE 0 END as close_ratio,
        SUM(CASE WHEN s.kpi_faith=1 AND s.kpi_physical=1 AND s.kpi_reel=1 AND s.kpi_sale_or_pres=1 THEN 1 ELSE 0 END) as all_kpis_days
      FROM users u
      JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1 ${dateFilter}
        AND u.email NOT IN ('tyroseeip@gmail.com', 'jaredhammill@icloud.com')
      GROUP BY u.id, u.name, u.team
      HAVING days_submitted >= 3
        AND (total_production = 0 OR (total_calls > 30 AND total_sales = 0))
      ORDER BY total_calls DESC
    `).all();

    // Add diagnosis for each agent
    const diagnosed = rows.map(agent => {
      const issues = [];
      const suggestions = [];

      if (agent.total_calls > 20 && agent.total_appointments === 0) {
        issues.push('High call volume but zero appointments');
        suggestions.push('Work on your phone script and appointment-setting language');
      }
      if (agent.total_appointments > 5 && agent.total_presentations === 0) {
        issues.push('Setting appointments but not getting to presentations');
        suggestions.push('Focus on pre-appointment confirmation and follow-up');
      }
      if (agent.total_presentations > 3 && agent.total_sales === 0) {
        issues.push('Getting presentations but not closing');
        suggestions.push('Review your closing technique and objection handling');
      }
      if (agent.total_lead_spend > 500 && agent.total_production === 0) {
        issues.push('Spending on leads but generating no production');
        suggestions.push('Audit your lead source and dialer strategy with your team leader');
      }
      if (agent.all_kpis_days < agent.days_submitted * 0.5) {
        issues.push('Missing KPIs more than 50% of days');
        suggestions.push('Commit to hitting all 4 daily KPIs — top producers hit them consistently');
      }

      return { ...agent, issues, suggestions };
    });

    res.json({ agents: diagnosed, period });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch struggling agents' });
  }
});

// KPI correlation analysis
router.get('/kpi-analysis', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period = 'year' } = req.query;
    const dateFilter = getDateFilter(period);

    // Top producers hitting all KPIs
    const allData = db.prepare(`
      SELECT u.id, u.name, u.team,
        SUM(s.production) as total_production,
        SUM(s.recruits) as total_recruits,
        SUM(s.reel_days) as reel_days,
        COUNT(DISTINCT s.date) as days_submitted,
        SUM(CASE WHEN s.kpi_faith=1 AND s.kpi_physical=1 AND s.kpi_reel=1 AND s.kpi_sale_or_pres=1 THEN 1 ELSE 0 END) as all_kpis_days,
        SUM(s.kpi_reel) as reel_days
      FROM users u
      JOIN submissions s ON u.id = s.user_id
      WHERE u.active = 1 AND u.approved = 1 ${dateFilter}
      GROUP BY u.id, u.name, u.team
      HAVING days_submitted >= 5
    `).all();

    const withKPIs = allData.filter(a => a.all_kpis_days / a.days_submitted >= 0.8);
    const withoutKPIs = allData.filter(a => a.all_kpis_days / a.days_submitted < 0.5);

    const avg = arr => arr.length > 0 ? arr.reduce((s, a) => s + a, 0) / arr.length : 0;

    const kpiHittersAvgProduction = avg(withKPIs.map(a => a.total_production));
    const kpiMissersAvgProduction = avg(withoutKPIs.map(a => a.total_production));

    // Reel posters vs non-reel for recruiting
    const reelPosters = allData.filter(a => a.reel_days / a.days_submitted >= 0.8);
    const nonReelPosters = allData.filter(a => a.reel_days / a.days_submitted < 0.3);

    const reelPostersAvgRecruits = avg(reelPosters.map(a => a.total_recruits));
    const nonReelPostersAvgRecruits = avg(nonReelPosters.map(a => a.total_recruits));

    // Top producers percentage hitting KPIs
    const sortedByProduction = [...allData].sort((a, b) => b.total_production - a.total_production);
    const top25pct = sortedByProduction.slice(0, Math.max(1, Math.floor(sortedByProduction.length * 0.25)));
    const top25KpiHitPct = top25pct.length > 0
      ? (top25pct.filter(a => a.all_kpis_days / a.days_submitted >= 0.8).length / top25pct.length * 100).toFixed(0)
      : 0;

    res.json({
      kpi_hitters: {
        count: withKPIs.length,
        avg_production: kpiHittersAvgProduction.toFixed(0)
      },
      kpi_missers: {
        count: withoutKPIs.length,
        avg_production: kpiMissersAvgProduction.toFixed(0)
      },
      production_lift_from_kpis: kpiMissersAvgProduction > 0
        ? (((kpiHittersAvgProduction - kpiMissersAvgProduction) / kpiMissersAvgProduction) * 100).toFixed(0)
        : 0,
      reel_posters: {
        count: reelPosters.length,
        avg_recruits: reelPostersAvgRecruits.toFixed(1)
      },
      non_reel_posters: {
        count: nonReelPosters.length,
        avg_recruits: nonReelPostersAvgRecruits.toFixed(1)
      },
      top_producers_kpi_hit_pct: top25KpiHitPct,
      period
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KPI analysis' });
  }
});

module.exports = router;
