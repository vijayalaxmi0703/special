import { supabase } from "../lib/supabase";

/**
 * Analytics: fire-and-forget, append-only event logging.
 * Every track() call is a single INSERT into the existing Supabase
 * table — events are never updated or deleted, so a session's full
 * journey stays intact even after "completed" is recorded.
 */

export type AnalyticsEvent =
  | "page_opened"
  | "hi_shown"
  | "question_shown"
  | "no_clicked"
  | "no_attempt"
  | "yes_clicked"
  | "dr_scene"
  | "crown_scene"
  | "video_scene"
  | "hug_scene"
  | "completed";

const SESSION_KEY = "teacher_day_session";

function createSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback for environments where randomUUID isn't available
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

function getSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = createSessionId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[analytics] sessionStorage threw:", e);
    }
    return "no-storage-" + createSessionId();
  }
}

async function send(
  event: AnalyticsEvent,
  meta?: Record<string, unknown>
) {
  // FIX: `supabase` is `null` whenever VITE_SUPABASE_URL /
  // VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) aren't
  // configured — see src/lib/supabase.ts. No-op here instead of calling
  // .from() on null, which would throw. The site continues working
  // normally either way; only event tracking is skipped.
  if (!supabase) {
    if (import.meta.env.DEV) {
      console.log("[analytics] skipped (Supabase not configured):", event);
    }
    return;
  }

  const session_id = getSessionId();

  if (import.meta.env.DEV) {
    console.log("[analytics] inserting:", { event, session_id, meta });
  }

  try {
    // Always an INSERT — analytics rows are append-only. Never call
    // .update()/.upsert() here; a later event (e.g. "completed") must
    // never overwrite or remove an earlier row.
    const { error } = await supabase
      .from("teacher_day_events")
      .insert({ event, session_id });

    if (error && import.meta.env.DEV) {
      console.error("[analytics] insert failed:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }
  } catch (thrown) {
    if (import.meta.env.DEV) {
      console.error("[analytics] send() threw:", thrown);
    }
  }
}

export function track(
  event: AnalyticsEvent,
  meta?: Record<string, unknown>
) {
  void send(event, meta);
}