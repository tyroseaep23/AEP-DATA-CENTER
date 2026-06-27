const { getDb } = require('../database');
const { sendDailyReminderEmail } = require('./emailService');
const { sendDailyReminderSMS } = require('./smsService');

async function sendDailyReminders() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Get all active, approved agents who have NOT submitted today
    const usersToRemind = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone
      FROM users u
      WHERE u.active = 1 AND u.approved = 1
        AND u.email NOT IN ('tyroseeip@gmail.com', 'jaredhammill@icloud.com')
        AND u.id NOT IN (
          SELECT user_id FROM submissions WHERE date = ?
        )
    `).all(today);

    console.log(`Sending reminders to ${usersToRemind.length} agents...`);

    for (const user of usersToRemind) {
      try {
        await sendDailyReminderEmail(user);
      } catch (e) {
        console.error(`Email reminder failed for ${user.name}:`, e.message);
      }

      try {
        await sendDailyReminderSMS(user);
      } catch (e) {
        console.error(`SMS reminder failed for ${user.name}:`, e.message);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('Daily reminders sent successfully');
  } catch (err) {
    console.error('Scheduler error:', err);
  }
}

module.exports = { sendDailyReminders };
