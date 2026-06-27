const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

const AEP_STYLE = `
  font-family: Arial, sans-serif;
  background-color: #0D0D0D;
  color: #FFFFFF;
`;

const GOLD = '#C9A227';

async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[EMAIL SKIPPED - no credentials] To: ${to} | Subject: ${subject}`);
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'AEP Data Center <noreply@aepdatacenter.com>',
    to,
    subject,
    html
  });
}

async function sendAdminApprovalNotification(user) {
  const html = `
    <div style="${AEP_STYLE} padding: 30px; max-width: 600px; margin: 0 auto;">
      <div style="border-bottom: 3px solid ${GOLD}; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: ${GOLD}; margin: 0;">AEP DATA CENTER</h1>
        <p style="color: #888; margin: 5px 0 0 0;">New Account Approval Required</p>
      </div>
      <h2 style="color: ${GOLD};">New Agent Registration</h2>
      <p>A new agent has registered and requires your approval:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><td style="padding: 8px; color: #888;">Name:</td><td style="padding: 8px; color: #fff; font-weight: bold;">${user.name}</td></tr>
        <tr><td style="padding: 8px; color: #888;">Email:</td><td style="padding: 8px; color: #fff;">${user.email}</td></tr>
        <tr><td style="padding: 8px; color: #888;">Phone:</td><td style="padding: 8px; color: #fff;">${user.phone}</td></tr>
        <tr><td style="padding: 8px; color: #888;">Team:</td><td style="padding: 8px; color: ${GOLD}; font-weight: bold;">${user.team || 'N/A'}</td></tr>
      </table>
      <p style="color: #888; margin-top: 20px;">Log in to the AEP Data Center admin dashboard to approve or deny this account.</p>
      <p style="color: ${GOLD}; font-style: italic; margin-top: 25px;">THE BEST IS YET TO COME — BUILT BY PRODUCERS FOR PRODUCERS</p>
    </div>
  `;
  await sendEmail('tyroseeip@gmail.com', `[AEP] New Account Pending Approval: ${user.name}`, html);
}

async function sendAccountApprovedEmail(user) {
  const html = `
    <div style="${AEP_STYLE} padding: 30px; max-width: 600px; margin: 0 auto;">
      <div style="border-bottom: 3px solid ${GOLD}; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: ${GOLD}; margin: 0;">AEP DATA CENTER</h1>
      </div>
      <h2 style="color: ${GOLD};">Welcome to the Team, ${user.name}!</h2>
      <p>Your account has been approved! You now have full access to the AEP Data Center.</p>
      <div style="background: #1A1A1A; border-left: 4px solid ${GOLD}; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold;">Log in now and start submitting your daily numbers!</p>
        <p style="margin: 5px 0 0 0; color: #888;">Remember to submit by 8:30 PM EST daily to track your performance.</p>
      </div>
      <p style="color: ${GOLD}; font-style: italic; margin-top: 25px; font-size: 18px; text-align: center;">
        "THE BEST IS YET TO COME" — American Equity Partners
      </p>
      <p style="text-align: center; color: #888; font-size: 12px;">BUILT BY PRODUCERS FOR PRODUCERS | DON'T BE LATE</p>
    </div>
  `;
  await sendEmail(user.email, '🏆 Welcome to AEP Data Center - Account Approved!', html);
}

async function sendDailyReminderEmail(user) {
  const html = `
    <div style="${AEP_STYLE} padding: 30px; max-width: 600px; margin: 0 auto;">
      <div style="border-bottom: 3px solid ${GOLD}; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: ${GOLD}; margin: 0;">AEP DATA CENTER</h1>
        <p style="color: #888;">Daily Numbers Reminder</p>
      </div>
      <h2 style="color: ${GOLD};">⏰ Time to Submit Your Daily Numbers!</h2>
      <p>Hey ${user.name}! It's 8:30 PM — don't let the day close without submitting your data points.</p>
      <div style="background: #1A1A1A; border-left: 4px solid ${GOLD}; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: ${GOLD};">Submit today:</p>
        <ul style="margin: 10px 0; color: #ccc;">
          <li>Calls Made</li>
          <li>Appointments Set</li>
          <li>Presentations</li>
          <li>Sales & Production (AP)</li>
          <li>Lead Spend</li>
          <li>Daily Deposits</li>
          <li>Daily Recruits</li>
          <li>All 4 KPIs</li>
        </ul>
      </div>
      <p style="color: ${GOLD}; font-style: italic; margin-top: 25px; font-size: 16px; text-align: center;">
        DON'T BE LATE — THE BEST IS YET TO COME!
      </p>
    </div>
  `;
  await sendEmail(user.email, '⏰ AEP Reminder: Submit Your Daily Numbers Now!', html);
}

module.exports = {
  sendAdminApprovalNotification,
  sendAccountApprovedEmail,
  sendDailyReminderEmail
};
