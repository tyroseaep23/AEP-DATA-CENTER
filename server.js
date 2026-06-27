require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const submissionRoutes = require('./routes/submissions');
const teamRoutes = require('./routes/teams');
const leaderboardRoutes = require('./routes/leaderboards');
const adminRoutes = require('./routes/admin');
const matchupRoutes = require('./routes/matchups');
const { sendDailyReminders } = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matchups', matchupRoutes);

// Public incentives endpoint (authenticated but not admin-only)
app.get('/api/incentives', (req, res) => {
  const { authenticateToken } = require('./middleware/auth');
  authenticateToken(req, res, () => {
    const { getDb } = require('./database');
    const db = getDb();
    const incentives = db.prepare("SELECT * FROM incentives WHERE active = 1 ORDER BY created_at DESC").all();
    res.json({ incentives });
  });
});

// Serve frontend for all non-API routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Schedule daily reminders at 8:30 PM Eastern Time
cron.schedule('30 20 * * *', () => {
  console.log('[CRON] Sending 8:30 PM EST daily reminders...');
  sendDailyReminders();
}, {
  timezone: 'America/New_York'
});

// Public endpoint for registration (no auth needed)
app.get('/api/public/teams', (req, res) => {
  const { getDb } = require('./database');
  const db = getDb();
  const teams = db.prepare('SELECT name FROM teams ORDER BY name').all();
  res.json({ teams: teams.map(t => t.name) });
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║      AEP DATA CENTER — LIVE            ║');
  console.log('║  American Equity Partners              ║');
  console.log(`║  Running on port ${PORT}                  ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`🔑 Site Password: ${process.env.SITE_PASSWORD || 'AEP1'}`);
  console.log(`👑 Admin Login: tyroseeip@gmail.com / AEPAdmin2024!`);
  console.log(`🤝 Co-Owner Login: jaredhammill@icloud.com / AEPJared2024!`);
  console.log('');
  console.log('THE BEST IS YET TO COME 🏆');
});

// NOTE: public teams endpoint added inline above - add this before app.listen:
