# NKY. METH. JHS IGF Tracker

**Nyankyerenease Methodist JHS Internally Generated Funds Tracker** — a Progressive
Web App for recording, reconciling and reporting on the funds a school
collects during a 14-week term (PTA levies, morning classes, sports levies,
Friday worship offerings, uniform sales, and any collection type an
administrator creates later).

Every dashboard figure and report is computed live from the `transactions`
table — nothing is stored as a separately maintained total — so the numbers
you see always trace back to an individual, attributable collection:

**Who collected the money? What was it for? How much? Was it handed over and reconciled?**

## Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS v4, React Router, TanStack Query
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Storage/Edge Functions as needed)
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **PWA:** vite-plugin-pwa (installable, offline app shell, "financial entries require internet" gate)

## Project status

This repository currently implements **Phase 1 (Foundation)** of the build
plan: the database schema, RLS policies, business-logic triggers, reporting
functions, sample data, authentication, role-based navigation and the live
Dashboard. Every other module (Collections entry, Students, Classes, Staff,
Uniform Sales, Cash Handover, Reports, Terms, Audit Logs, Settings) is
routed and role-gated but renders a "coming in Phase N" placeholder — see
`src/App.tsx` for the phase each screen is assigned to and `src/pages/PlaceholderPage.tsx`.

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (pick a region close to Ghana, e.g. `eu-west` on AWS).
2. Note the **Project URL** and **anon/public API key** from *Project Settings → API*. You will need these for step 5.
3. Install the Supabase CLI if you don't have it: `npm install -g supabase`.
4. Log in and link the CLI to your project:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

## 3. Run the database migrations

The schema, triggers and RLS policies live in `supabase/migrations/`, applied in order:

| File | Contents |
| --- | --- |
| `0001_schema.sql` | All 18 tables, constraints, indexes |
| `0002_functions_triggers.sql` | Numbering, term/week auto-generation, obligation balances, stock decrement, cash-handover discrepancy detection, audit logging |
| `0003_rls_policies.sql` | Row Level Security for every table |
| `0004_reporting_functions.sql` | Dashboard/report aggregate functions |
| `0005_grants.sql` | Baseline table/sequence GRANTs for the `authenticated` role (required before RLS is even evaluated) |
| `0006_staff_profile_sync.sql` | Keeps a staff member's login-account role/name in sync when their staff record changes |
| `0007_fix_trigger_rls_gaps.sql` | Fixes three triggers that write to a second table (receipts, student_obligations, uniform_items) as a side effect — they now run as SECURITY DEFINER so a teacher's own insert isn't blocked by RLS on that second table |

Push them to your linked project:

```bash
supabase db push
```

## 4. Seed sample data (optional but recommended)

`supabase/seed.sql` creates a full, clearly-fictional dataset — 18 staff, 6
classes, 60 students, a 14-week active term, all six default collection
types, uniform inventory, 250+ sample transactions covering every payment
status, cash handovers in every status (including a resolved and an
unresolved discrepancy) — so every screen and report can be exercised
immediately.

```bash
supabase db reset   # applies all migrations, then seed.sql, against your linked project
```

(`db reset` is safe on a fresh project; it re-runs migrations + seed from
scratch. Don't run it against a project that already has real data.)

Remove the sample dataset later from the Settings screen once real school
data has been entered — see the note at the bottom of `seed.sql` for the
manual SQL if you need to do it directly.

## 5. Configure environment variables

```bash
cp .env.example .env
```

Fill in the two values from step 2:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Only the anon/public key ever belongs in the frontend. The `service_role`
key must never be committed or shipped to the browser.

## 6. Run locally

```bash
npm run dev
```

Open the printed local URL. On a phone or tablet on the same network, use
your machine's LAN IP instead of `localhost` to test the installable PWA.

## 7. Create the first administrator

The seed data creates 18 **staff records** (including a "System
Administrator" row, `STF-0001`) but does not create Supabase Auth logins for
them — auth accounts must be created explicitly so passwords are set
securely, not seeded in plain SQL.

1. In the Supabase dashboard, go to **Authentication → Users → Add user** and create an account for yourself with a strong password.
2. Open **Table editor → profiles** and confirm a row was created for that user (a trigger does this automatically); set its `role` column to `admin`.
3. Open **Table editor → staff**, find (or create) your staff row, and set its `profile_id` to the new user's UUID (from Authentication → Users) so the app can link your login to your staff identity.
4. Sign in at `/login` with that email/password.

Repeat step 3 (linking `profile_id`) for any other seeded staff member you
want to log in as during testing — set their `role`/`user_role` to
`headteacher`, `accounts`, or leave as `teacher` to test that role's
restricted view.

## 8. Deploy

**Frontend (Vercel):** live at **https://nky-meth-jhs-igf.vercel.app**

Deployed via the Vercel CLI, logged in with `npx vercel login` (device-code
flow — approve in your browser, no password ever typed into the CLI), linked
with `npx vercel link --yes --project nky-meth-jhs-igf`, and pushed with
`npx vercel --prod`. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
as encrypted Environment Variables on the Vercel project (Production +
Preview) — set them for a new project with:

```bash
printf '%s' 'https://your-project-ref.supabase.co' | npx vercel env add VITE_SUPABASE_URL production
printf '%s' 'your-anon-public-key' | npx vercel env add VITE_SUPABASE_ANON_KEY production
```

To redeploy after making changes: `npx vercel --prod` from the project
directory. To deploy automatically on every push instead, connect a GitHub
repository from the Vercel project's Settings → Git.

**Backend:** Supabase is already your production database once you've
pushed migrations to it (step 3) — there's nothing extra to deploy. Enable
Point-in-Time Recovery or scheduled backups under *Project Settings →
Database → Backups* before going live with real financial data.

## 9. Replace sample data with real school data

Once real staff, students, classes and collection amounts are ready:

1. Add real staff via **Staff → Add Staff** (or edit the seeded rows — don't delete a staff record that already has transactions against it).
2. Import or add real students via **Students**.
3. Adjust collection type default amounts under **Settings** if PTA/Sports/Morning Classes rates differ from the seeded GH₵50 / GH₵15 / GH₵2.
4. Run the cleanup query noted at the bottom of `supabase/seed.sql` to clear sample transactions, handovers and obligations once you're ready to go live.

## User roles

| Role | Can do |
| --- | --- |
| **Administrator** | Everything: staff/student/class management, terms, collection types, void transactions, reconciliation, audit logs, settings |
| **Headteacher** | Read-only across dashboard, all reports, reconciliation status — cannot edit or void financial records |
| **Accounts / IGF Officer** | Record collections, receive handovers, reconcile, generate receipts/reports |
| **Teacher / Collector** | Record collections for their assigned class, submit cash handovers, view only their own transactions |

Authorization is enforced by **Postgres Row Level Security**, not just
hidden UI — see `supabase/migrations/0003_rls_policies.sql`.

## Database documentation

The 18 tables and their relationships are defined in
`supabase/migrations/0001_schema.sql` (schema) and `0002_functions_triggers.sql`
(business logic: transaction/receipt numbering, automatic 14-week term
calendar generation, student obligation balance tracking, uniform stock
decrement, cash-handover discrepancy detection, and audit logging on every
sensitive table). TypeScript types mirroring the schema live in
`src/types/domain.ts`.

## Test accounts

No accounts are seeded automatically (see step 7) — this is deliberate so
no default password ever ships in source control. Create your own via the
Supabase dashboard as described above.
