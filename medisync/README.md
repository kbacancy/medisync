# MediSync — Clinical Medication Management Platform

A full-stack healthcare platform for clinicians and patients, built with Next.js 16 and Supabase. Features real-time telehealth waiting rooms, FHIR R4-compliant medication APIs, PDC adherence scoring, DDI warnings, and offline-capable patient dose logging.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database & Auth | Supabase (Postgres, Auth, Realtime) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Forms | react-hook-form + Zod v4 |
| Notifications | Sonner toasts + Web Push |
| State | Zustand v5 |
| FHIR | Custom R4 adapter (no external library) |

---

## Architecture

```
src/
├── app/
│   ├── (auth)/         Login, register
│   ├── (clinician)/    Dashboard, patients, telehealth, schedule
│   ├── (patient)/      Medications timeline, adherence, profile
│   └── api/
│       ├── v1/         FHIR-compliant API routes
│       │   ├── prescriptions/new/
│       │   ├── pharmacy/dispense/
│       │   └── adherence/log-dose/
│       ├── notifications/schedule/
│       ├── ddi-check/
│       └── health/
├── components/
│   ├── clinician/      Sidebar, header, notification bell
│   ├── medications/    DoseCard, timeline, inventory
│   ├── patient/        Header, tab bar, offline banner
│   ├── telehealth/     Waiting room (realtime), care alerts
│   └── ui/             shadcn components + ErrorBoundary
└── lib/
    ├── fhir/           FHIR R4 adapter (toFHIR*, fromFHIR*)
    ├── pdc/            PDC calculator, risk scoring
    ├── supabase/       Server, client, middleware clients
    ├── stores/         Zustand notification store
    ├── offline/        LocalStorage sync queue
    ├── notifications/  Web Push utilities
    └── seed/           Demo data seed script
```

---

## Getting Started

### Prerequisites
- Node.js 18.17+
- npm 9+
- Supabase account (free tier works)

### 1. Clone and install
```bash
git clone https://github.com/your-org/medisync.git
cd medisync
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Fill in your values — see the **Environment Variables** section below.

### 3. Set up the database
1. Create a new Supabase project
2. Open **SQL Editor** in the Supabase dashboard
3. Run `supabase/schema.sql` (main schema + RLS)
4. Run `supabase/migrations/phase6_fhir_realtime_push.sql` (Phase 6 tables)

### 4. Generate VAPID keys for push notifications
```bash
npx web-push generate-vapid-keys
```
Copy the output into `.env.local`.

### 5. Seed demo data
```bash
npm run seed
```

### 6. Start the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Doctor | dr.james.carter@medisync.dev | MediSync2024! |
| Patient (high adherence) | sarah.jenkins@medisync.dev | MediSync2024! |
| Patient (critical) | james.wilson@medisync.dev | MediSync2024! |
| Patient (moderate) | aisha.johnson@medisync.dev | MediSync2024! |
| Patient (high risk) | robert.chen@medisync.dev | MediSync2024! |
| Coordinator | coordinator@medisync.dev | MediSync2024! |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push only | VAPID public key |
| `VAPID_PRIVATE_KEY` | Push only | VAPID private key — never expose client-side |
| `VAPID_SUBJECT` | Push only | VAPID contact email (`mailto:...`) |

---

## API Routes

### FHIR v1 (return FHIR R4 resources)

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/prescriptions/new` | Create prescription. Accepts FHIR or native payload. Runs DDI check, returns 409 on severe interaction. |
| `POST` | `/api/v1/pharmacy/dispense` | Record pharmacy dispense. Triggers low-inventory care alert at <=5 days supply. |
| `POST` | `/api/v1/adherence/log-dose` | Log dose. Recalculates PDC, updates risk_level, fires adherence_drop alert if PDC < 80%. |

### Internal

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/adherence/log-dose` | Legacy dose logger |
| `POST` | `/api/prescriptions/new` | Legacy prescription creator |
| `POST` | `/api/pharmacy/dispense` | Legacy dispense |
| `POST` | `/api/ddi-check` | Drug interaction check |
| `POST` | `/api/notifications/schedule` | Schedule web push dose reminder |
| `GET` | `/api/health` | Health check — DB connectivity + version |

---

## Key Features

### Clinician View
- **Dashboard** — patient stats, PDC leaderboard, today's appointments
- **Telehealth Center** — 3-column layout: waiting room (realtime), video panel, EHR
- **Patients** — full patient list with PDC scores, risk badges, last activity
- **DDI Warnings** — real-time drug interaction check when prescribing
- **Care Alerts** — live toast notifications for critical patient events

### Patient View
- **Medication Timeline** — today's doses grouped by time slot
- **Dose Actions** — Take / Skip / Snooze with offline support
- **Inventory Bar** — visual days-remaining indicator per medication
- **Push Notifications** — browser-native dose reminders
- **Offline Sync** — dose actions queued in localStorage, synced on reconnect

### FHIR R4 Layer
- `toFHIRMedicationRequest` — Prescription to MedicationRequest
- `toFHIRMedicationDispense` — DispenseRecord to MedicationDispense
- `toFHIRMedicationStatement` — AdherenceLog to MedicationStatement
- `fromFHIRMedicationRequest` — inbound FHIR parsing

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npm run seed     # Populate database with demo data
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step Vercel + Supabase production deployment.

---

## License

Private — MediSync © 2024 Bacancy Technology
