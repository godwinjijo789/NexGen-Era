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

Run `supabase/migrations/20260928000000_initial_schema.sql` and then `supabase/migrations/20260928000001_quiz_folders.sql` in the Supabase SQL Editor, in that order. The second migration adds quiz folders, folder membership, and folder score settings. In Authentication settings, enable Email/Password and Anonymous sign-ins. For the first administrator, promote the account after registration with `UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';` in the SQL Editor.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel for Preview and Production. `VITE_GEMINI_API_KEY` is optional if AI quiz generation is needed. Never use a service-role key in the frontend.

## Existing Accounts

The previous backend stored passwords as PBKDF2 hashes in SQLite. These hashes cannot be imported as Supabase Auth credentials; users must create new Supabase accounts. Existing quizzes and history were browser-local and are not automatically available on another device; recreate quizzes after cutover.
