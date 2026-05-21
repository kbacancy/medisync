# MediSync Deployment Guide

## Step 1 — Supabase Production Setup

### 1a. Create a new Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users (e.g. Singapore `ap-southeast-1`)
3. Set a strong database password and save it securely

### 1b. Run database migrations
In **SQL Editor** → New query, run each file in order:

```
supabase/schema.sql
supabase/migrations/phase6_fhir_realtime_push.sql
```

### 1c. Enable Realtime
Go to **Database → Replication** and enable the following tables:
- `appointments`
- `adherence_logs`
- `care_alerts`

The Phase 6 migration already ran `ALTER PUBLICATION supabase_realtime ADD TABLE care_alerts`. Verify `appointments` and `adherence_logs` are also added.

### 1d. Configure Auth email templates (optional)
Go to **Auth → Email Templates** and customise the confirmation and magic-link emails to use the MediSync brand.

### 1e. Generate VAPID keys
```bash
npx web-push generate-vapid-keys
```
Save the output — you will need these in Step 2.

---

## Step 2 — Vercel Deployment

### 2a. Push code to GitHub
```bash
git add .
git commit -m "feat: production-ready MediSync v1.0"
git push origin main
```

### 2b. Import project in Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Vercel auto-detects Next.js — no framework override needed

### 2c. Add environment variables
In **Vercel → Project → Settings → Environment Variables**, add all of the following:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From same page (anon public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | From same page (service_role secret) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL, e.g. `https://medisync.vercel.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | From Step 1e |
| `VAPID_PRIVATE_KEY` | From Step 1e |
| `VAPID_SUBJECT` | `mailto:ketan.mistry@bacancy.com` |

### 2d. Deploy
Click **Deploy**. Vercel builds and deploys automatically. Subsequent `git push` triggers auto-redeploy.

### 2e. Update NEXT_PUBLIC_APP_URL
After the first deploy, copy your Vercel production URL and update `NEXT_PUBLIC_APP_URL` to match. Redeploy if needed.

---

## Step 3 — Post-Deployment Verification

### Run seed against production
Update `.env.local` to point to your **production** Supabase project, then:
```bash
npm run seed
```
Restore `.env.local` to dev values afterwards.

### Verify health endpoint
```bash
curl https://your-app.vercel.app/api/health
```
Expected:
```json
{ "status": "ok", "services": { "database": "connected", "auth": "ok" } }
```

### Test demo logins
1. Open the production URL
2. Login as `dr.james.carter@medisync.dev` / `MediSync2024!` → should land on `/dashboard`
3. Login as `sarah.jenkins@medisync.dev` / `MediSync2024!` → should land on `/medications`

### Verify Realtime (two tabs test)
1. Open `/telehealth` in Tab 1 as the doctor
2. Open Supabase SQL Editor
3. Insert a test care alert:
   ```sql
   INSERT INTO care_alerts (patient_id, type, message, severity)
   SELECT id, 'test', 'Realtime test alert', 'high'
   FROM patients LIMIT 1;
   ```
4. Tab 1 should show a red toast immediately

### Test push notification flow (mobile)
1. Login as Sarah Jenkins on a mobile browser
2. Navigate to `/medications`
3. Allow notification permission when prompted
4. Check that the service worker registers (DevTools → Application → Service Workers)

---

## Step 4 — Supabase RLS Verification

Run these checks in the Supabase SQL Editor to verify row-level security:

```sql
-- Verify a patient cannot read another patient's prescriptions
-- (replace UUIDs with actual seeded values)
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<sarah_profile_id>", "role": "authenticated"}';

SELECT * FROM prescriptions WHERE patient_id = '<james_patient_id>';
-- Should return 0 rows
```

For a full RLS audit, test each demo account in an incognito tab and confirm:
- Patients see only their own medications, logs, and dispense records
- Clinicians can see all patients but patients cannot see each other
- The `drug_interactions` table is readable by all authenticated users
- `prescription_overrides` is restricted to clinicians only

---

## Rollback Procedure

If a deployment causes issues:
1. In Vercel → Deployments → find the last good deploy → **Promote to Production**
2. If schema migration caused issues, restore from Supabase automatic backups (Pro plan) or manually revert the specific migration

---

## Monitoring

- **Vercel Analytics** — enable in Project Settings for Core Web Vitals
- **Supabase Dashboard** → Reports → shows query performance and auth metrics
- **`/api/health`** — wire this into any uptime monitor (e.g. Better Uptime, UptimeRobot)
