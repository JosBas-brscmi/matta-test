# BROWAVE MATTA CENTER (MVP)

This repository is a deployable MVP for:
- IQ Assessment (timed, randomized)
- English Assessment (timed, randomized)
- Aptitude & Personality (timed, randomized)
- Candidate login via Netlify Identity
- Immediate results + PDF download
- Result delivery to MA Center email (SendGrid)
- Optional persistence + admin dashboard (Supabase)

## IMPORTANT (IP / Test Content)
This MVP ships with an ORIGINAL demo question bank for functional testing only.
Do NOT copy or scrape proprietary test items from third-party sites unless you have explicit written permission or a license.

## Local run
1) Install Node.js 20+
2) `npm install`
3) `npm run dev`

## Netlify deploy (gives you a real URL)
1) Push this repo to GitHub
2) Netlify: Add new site -> Import from Git
3) Enable **Identity**
   - Registration: Invite only OR Open (your choice)
   - Email verification: ON
4) Environment variables (Site settings -> Environment variables)
   - `MA_CENTER_EMAIL` = your receiving mailbox
   - `SENDGRID_API_KEY` = SendGrid API key (optional)
   - `SENDGRID_FROM_EMAIL` = verified sender in SendGrid (optional)

### Optional: Supabase persistence + Admin dashboard
Create a Supabase project and run:

```sql
create table if not exists public.matta_results (
  id uuid primary key default gen_random_uuid(),
  test_key text not null,
  candidate_email text not null,
  submitted_at timestamptz not null,
  score_percent int,
  score_correct int,
  score_total int,
  payload_json jsonb not null
);

create index if not exists idx_matta_results_submitted_at on public.matta_results (submitted_at desc);
```

Then set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_ALLOWLIST_EMAILS` (comma-separated emails for /admin access), optional

## Customization
- Replace `/public/matta-logo.png` with your official logo as needed.
- Replace `src/data/questionBank.json` with your licensed or internally-created item banks.
- Adjust durations and item counts in `src/lib.ts`.
