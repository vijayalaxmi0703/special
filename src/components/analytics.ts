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

/** Visitor device tracking — detect browser, OS, and screen dimensions.
    Fire-and-forget, fails silently if Supabase unavailable or insert fails. */
function getBrowserFromUserAgent(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Chromium")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera";
  return "Other";
}

function getOSFromUserAgent(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Linux")) return "Linux";
  return "Other";
}

function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;

  // Check for iPad first (iPad has different User Agent now)
  if (ua.includes("ipad")) {
    return "Tablet";
  }

  // Check for iPhone/iPod
  if (ua.includes("iphone") || ua.includes("ipod")) {
    return "Mobile";
  }

  // Check for Android
  if (ua.includes("android")) {
    // Android tablets typically have wider screens
    if (screenWidth >= 768) {
      return "Tablet";
    }
    return "Mobile";
  }

  // Check for Windows Phone
  if (ua.includes("windows phone") || ua.includes("iemobile")) {
    return "Mobile";
  }

  // Check for other tablet indicators
  if (ua.includes("tablet") || ua.includes("kindle") || ua.includes("playbook")) {
    return "Tablet";
  }

  // Default to Desktop for everything else
  return "Desktop";
}

async function sendVisit(): Promise<void> {
  if (!supabase) {
    if (import.meta.env.DEV) {
      console.log("[analytics] trackVisit skipped (Supabase not configured)");
    }
    return;
  }

  try {
    const device_type = getDeviceType();

    if (import.meta.env.DEV) {
      console.log("[analytics] inserting visit:", {
        device_type,
      });
    }

    const { error } = await supabase
      .from("visits")
      .insert({
        device_type,
      });

    if (error && import.meta.env.DEV) {
      console.error("[analytics] visit insert failed:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }
  } catch (thrown) {
    if (import.meta.env.DEV) {
      console.error("[analytics] sendVisit() threw:", thrown);
    }
  }
}

export function trackVisit(): void {
  void sendVisit();
}