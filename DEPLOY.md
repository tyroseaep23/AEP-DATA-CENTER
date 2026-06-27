# AEP DATA CENTER — Deployment Guide
## American Equity Partners | Built by Producers for Producers

---

## QUICK START — Deploy to Render.com (FREE, ~5 minutes)

### Step 1: Upload to GitHub
1. Go to github.com and create a free account if you don't have one
2. Create a new repository called `aep-data-center`
3. Upload all files from this folder into that repo

### Step 2: Deploy on Render.com
1. Go to render.com and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `aep-data-center` repo
4. Configure:
   - **Name:** `aep-data-center`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** `Node`

### Step 3: Set Environment Variables on Render
In your Render service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | (any long random string, e.g. `AEP_Super_Secret_2024_XYZ789`) |
| `SITE_PASSWORD` | `AEP1` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_PASS` | your Gmail App Password (see below) |
| `EMAIL_FROM` | `AEP Data Center <noreply@aepdatacenter.com>` |
| `TWILIO_ACCOUNT_SID` | (from twilio.com — optional for SMS) |
| `TWILIO_AUTH_TOKEN` | (from twilio.com — optional) |
| `TWILIO_PHONE_NUMBER` | (from twilio.com — optional) |

### Step 4: Get your URL
Render gives you a URL like: `https://aep-data-center.onrender.com`

**For a custom domain** (like aepdatacenter.com):
1. Buy the domain at GoDaddy or Namecheap (~$12/year)
2. In Render → Custom Domains → Add your domain
3. Follow Render's DNS instructions

---

## YOUR LOGIN CREDENTIALS (Created automatically on first boot)

| Account | Email | Password |
|---------|-------|----------|
| **Admin (Ty Rose)** | tyroseeip@gmail.com | `AEPAdmin2024!` |
| **Co-Owner (Jared)** | jaredhammill@icloud.com | `AEPJared2024!` |

**IMPORTANT: Change both passwords after first login via your browser dev tools or by using the change-password API.**

---

## HOW AGENT ACCOUNT APPROVAL WORKS

Here's exactly how to tell your agents:

1. **Agents visit the site URL**
2. **Enter the site access code:** `AEP1` (you can change this in the Admin panel anytime)
3. **Click "Create Account"** and fill out: Full Name, Phone, Email, Team, Tenure, and Password
4. **After submitting:** They see "Account Pending Approval" — they cannot access anything yet
5. **You receive an email at tyroseeip@gmail.com** with their info
6. **You log in as admin → click the ADMIN tab** → you'll see "NEW ACCOUNT APPROVALS" with an APPROVE button
7. **Click APPROVE** → the agent immediately gets access and receives a welcome email

Tell agents: *"Create your account at [your URL], use code AEP1, then wait for an approval email from us — usually same day."*

---

## EMAIL SETUP (Gmail App Password)

1. Go to myaccount.google.com → Security → 2-Step Verification (turn on)
2. Then: Security → App Passwords
3. Create an app password for "Mail"
4. Use that 16-character password as `EMAIL_PASS` in Render

---

## SMS REMINDERS SETUP (Twilio — optional)

1. Go to twilio.com → Create a free account
2. Get a phone number (~$1/month)
3. Copy your Account SID, Auth Token, and phone number into Render env vars
4. Agents will automatically receive SMS at 8:30 PM EST if they haven't submitted

---

## FEATURES OVERVIEW

- **Site Password Gate** — AEP1 (changeable by admin)
- **Account Approval** — Admin-only approval required
- **Daily Submissions** — Calls, appointments, presentations, sales, AP, lead spend, deposits, recruits, 4 KPIs
- **Production Leaderboards** — Daily, Weekly, Monthly, YTD (Top 10)
- **Deposit Leaderboards** — Daily, Weekly, Monthly, YTD
- **KPI Tracker** — All 4 KPIs tracked individually and combined
- **Recruit Leaderboards** — Weekly, Monthly, YTD (Top 5)
- **Lead Spend Leaderboard** — All agents ranked highest to lowest
- **Close Ratio Leaderboard** — Min 5 presentations to qualify
- **Daily Matchups** — Random daily 1v1 (excludes Ty & Jared), resets midnight
- **Team Leaderboards** — Atlas, Crown, RoadMap, IEP, AEP ATL, Direct Agent to AEP
- **AEP Nation Overview** — Full agency YTD production, deposits, all conversion ratios
- **Analytics** — Struggling agent diagnosis, KPI vs production correlation, reel vs recruit analysis
- **Incentives** — Admin-only, shown to all agents
- **Admin Panel** — Pending approvals, account management, add/remove teams, site password, incentives
- **Daily Bible Verse & Motivational Quote** — Rotates daily for all agents
- **8:30 PM EST Reminders** — Email + SMS to agents who haven't submitted
- **Calendar Booking** — Embedded Google Calendar for 2:30-4 PM EST slots
- **Instagram Links** — @tyroseaep @jaredhammill @AEPMIAMI
- **Auto-Refresh** — Leaderboards refresh every 60 seconds

---

## DATA PROTECTION

When you deactivate or remove an agent account:
- Their LOGIN access is removed immediately
- Their production, deposits, sales, and ALL metrics REMAIN in AEP's totals permanently
- They will never be removed from leaderboard history
- Only their ability to submit new data is blocked

---

## TEAM LEADERS (displayed on team cards)

- **Atlas** — Declan Connolly
- **AEP ATL** — Brandon Nguyen, Aaron Prum, Nic Batugal
- **Crown** — Gabe Tram
- **RoadMap** — Dylan Bunch
- **IEP** — Jack McDevitt, Nick Paolella

---

*THE BEST IS YET TO COME | DON'T BE LATE | BUILT BY PRODUCERS FOR PRODUCERS*
*American Equity Partners — Founded by Ty Rose & Jared Hammill*
