let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

function cleanPhone(phone) {
  // Convert (859) 693-7600 to +18596937600
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

async function sendSMS(to, message) {
  const client = getTwilioClient();
  if (!client) {
    console.log(`[SMS SKIPPED - no Twilio credentials] To: ${to} | Message: ${message}`);
    return;
  }
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: cleanPhone(to)
    });
  } catch (err) {
    console.error(`SMS failed to ${to}:`, err.message);
  }
}

async function sendDailyReminderSMS(user) {
  const message = `⏰ AEP REMINDER: Hey ${user.name}! It's 8:30 PM — time to submit your daily numbers & KPIs on the AEP Data Center. DON'T BE LATE! 🏆`;
  await sendSMS(user.phone, message);
}

module.exports = { sendSMS, sendDailyReminderSMS };
