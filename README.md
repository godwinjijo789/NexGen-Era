<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# NexGen Era

NexGen Era is a React/Vite quiz application backed by Supabase Authentication, PostgreSQL, and Realtime. The frontend deploys to Vercel without a separate API server.

## Local Development

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project's API settings. `VITE_GEMINI_API_KEY` is optional and enables AI quiz generation.
3. Run `npm run dev`.

## Supabase Setup

On a fresh Supabase project, run every SQL file in `supabase/migrations/` in filename order in the Supabase SQL Editor. For an existing project, run only migrations that have not already been applied, in filename order; do not rerun migrations already executed. Later migrations add live scoring, cover images, folder sessions, and synchronization fixes; skipping them can cause PIN joins, missing covers, or result-reveal errors. In Authentication settings, enable Email/Password and Anonymous sign-ins. For the first administrator, promote the account after registration with `UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';` in the SQL Editor.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel for Preview and Production. `VITE_GEMINI_API_KEY` is optional if AI quiz generation is needed. Never use a service-role key in the frontend.

## Existing Accounts

The previous backend stored passwords as PBKDF2 hashes in SQLite. These hashes cannot be imported as Supabase Auth credentials; users must create new Supabase accounts. Existing quizzes and history were browser-local and are not automatically available on another device; recreate quizzes after cutover.
