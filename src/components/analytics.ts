import { supabase } from "../lib/supabase";

/**
 * TEMPORARY DIAGNOSTIC BUILD.
 */

export type AnalyticsEvent =
  | "page_opened"
  | "no_attempt"
  | "yes_clicked"
  | "crown_started"
  | "hug_started"
  | "experience_completed";

const SESSION_KEY = "teacher_day_session";

function createSessionId(): string {
  // Modern browsers
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback for HTTP/LAN environments where randomUUID isn't available
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
    console.error("[analytics] sessionStorage THREW:", e);

    return "no-storage-" + createSessionId();
  }
}

console.log("[analytics] MODULE LOADED. Env check:", {
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});

console.log(
  "[analytics] Supabase URL:",
  import.meta.env.VITE_SUPABASE_URL
);

async function send(
  event: AnalyticsEvent,
  meta?: Record<string, unknown>
) {
  const session_id = getSessionId();

  console.log("[analytics] INSERTING:", {
    event,
    session_id,
    meta,
  });

  try {
    const { error } = await supabase
      .from("teacher_day_events")
      .insert({
        event,
        session_id,
      });

    if (error) {
      console.error("[analytics] INSERT FAILED:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    } else {
      console.log("[analytics] INSERT SUCCESS");
    }
  } catch (thrown) {
    console.error(
      "[analytics] send() THREW:",
      thrown
    );
  }
}

export function track(
  event: AnalyticsEvent,
  meta?: Record<string, unknown>
) {
  console.log(
    "[analytics] TRACK CALLED:",
    event,
    meta ?? {}
  );

  void send(event, meta);
}