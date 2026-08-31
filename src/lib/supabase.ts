import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * FIX (previous version of this file crashed the whole app):
 * @supabase/supabase-js's createClient() throws synchronously —
 * "supabaseKey is required." — the instant it's called with an empty
 * key. The old version of this file called createClient() unconditionally,
 * with `?? ""` fallbacks, so when the env vars were missing that throw
 * happened during module evaluation, before React ever rendered. Because
 * this file is imported by analytics.ts, which is imported by App.tsx,
 * the crash propagated all the way up to the root route's error boundary
 * — that's the "This page didn't load" screen and the "supabaseKey is
 * required" error at supabase.ts:58.
 *
 * The fix: never call createClient() unless both required values are
 * actually present. When they're missing, `supabase` below is `null`
 * instead — analytics.ts checks for that and no-ops instead of calling
 * anything on it. The rest of the app doesn't touch this file at all, so
 * it now loads normally with or without Supabase configured.
 *
 * KEY NAMING (verified against this project's actual .env.local, not
 * guessed): this project already has real credentials checked in
 * locally, but under Supabase's newer "publishable key" naming rather
 * than the older "anon key" naming:
 *
 *   VITE_SUPABASE_URL=https://ihiyhdkurmhbsnbvcwhd.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
 *
 * (Supabase renamed "anon key" -> "publishable key" and "service_role
 * key" -> "secret key" — the sb_publishable_... prefix is the new
 * format. Same purpose, safe to expose client-side, new name.) This
 * file reads VITE_SUPABASE_PUBLISHABLE_KEY first, matching what's
 * already in your .env.local, and falls back to VITE_SUPABASE_ANON_KEY
 * for compatibility if you ever use an older-style Supabase project.
 * With .env.local already containing the right values, local dev needs
 * no further setup.
 *
 * VERCEL SETUP: add both of these in Project Settings → Environment
 * Variables (values from Supabase → Project Settings → API):
 *
 *   VITE_SUPABASE_URL             = https://ihiyhdkurmhbsnbvcwhd.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_7xi6vmDIu053xIK2op-GFA__PUF7EON
 *
 * (These are the exact values already sitting in your local .env.local —
 * copy them in as-is.) Do NOT put a secret/service-role key here; this
 * is a client-side file and ships to the browser.
 *
 * If the Supabase table these events insert into doesn't exist yet:
 *
 *   create table teacher_day_events (
 *     id bigint generated always as identity primary key,
 *     event text not null,
 *     session_id text not null,
 *     created_at timestamptz not null default now()
 *   );
 *
 *   alter table teacher_day_events enable row level security;
 *
 *   create policy "Allow anonymous inserts"
 *     on teacher_day_events for insert
 *     to anon
 *     with check (true);
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (import.meta.env.DEV && !isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) " +
      "are not set. Analytics is disabled — the rest of the site works normally.",
  );
}

// `null` when not configured — NEVER call createClient() with a missing
// key, since it throws synchronously rather than failing gracefully.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;