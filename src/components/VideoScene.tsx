import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { VolumeX } from "lucide-react";

/**
 * VideoScene — ARCHITECTURE REWRITE (this round).
 *
 * Previous rounds kept patching a watchdog/retry system layered on top
 * of a video element that was still entangled with React state,
 * Framer Motion, animated particles, and arbitrary timers (6s/12s/30s
 * strike counters). That combination was still fragile on real mobile
 * hardware — the report was that it can still stop/freeze on mobile.
 *
 * This round is a genuine redesign, not another patch: the video is
 * now a self-contained native media player, deliberately decoupled
 * from everything else in the app.
 *
 * WHY THE OLD DESIGN COULD STILL FAIL ON MOBILE (root cause):
 *
 *   1. It used a strike-based watchdog polling `currentTime` every 3s
 *      and forcing the scene to "finish" after a fixed number of
 *      stalled checks, or an unconditional 30s ceiling regardless of
 *      cause. A perfectly recoverable mobile buffering pause (common
 *      on cellular networks, and especially common right after a
 *      background tab regains focus) could get force-skipped by a
 *      timer that had no actual knowledge of whether the video was
 *      about to resume on its own.
 *   2. It called `video.load()` as part of that retry path — which
 *      resets the whole media pipeline (decoder, buffer, network
 *      request) — precisely while playback was already struggling,
 *      making a temporary stall *more* likely to turn into a real
 *      failure instead of less.
 *   3. Framer Motion `animate={{ opacity, scale }}` was applied to the
 *      frame wrapping the live <video> element every render, plus 14
 *      continuously-animated particle spans and a pulsing blurred glow
 *      layered on top — all fighting the mobile GPU/decoder for the
 *      same frame budget as the video decode itself, right when the
 *      device needs every spare cycle for smooth playback.
 *   4. Multiple pointer/touch handlers (`onPointerEnter`,
 *      `onPointerDown`, a separate frame `onClick`, plus the app's own
 *      global tap-to-advance handler) all had some path to touching
 *      playback, which is exactly the kind of overlapping-handler mess
 *      that produces inconsistent mobile behavior.
 *
 * WHAT'S DIFFERENT NOW:
 *
 *   - No watchdog, no strike counter, no 6s/12s/30s timers anywhere in
 *     this file. Playback progress is judged ONLY by real native
 *     media events (`playing`, `waiting`, `stalled`, `progress`,
 *     `timeupdate`, `canplay`, `ended`, `error`) — never by polling,
 *     never by a clock.
 *   - `video.load()` is called in exactly one place: `reset()`, used
 *     only by Replay. It is never called as part of normal playback,
 *     buffering recovery, or error handling.
 *   - `currentTime`/`playbackRate`/`volume`/`muted` are each set once,
 *     at the moments described in the numbered items below — never
 *     continuously reassigned while the video plays.
 *   - The frame is a plain element with a CSS `transition: opacity`
 *     for entering/exiting. No Framer Motion anywhere in this file, no
 *     particles, no animated glow, no backdrop-blur, no animated
 *     shadow — the video gets the mobile GPU/decoder's full budget.
 *   - Exactly ONE pointer handler drives all in-scene interaction (see
 *     `handlePointerDown` below): the wrapper's own `onPointerDown`.
 *     Nothing else in this file, and nothing in App.tsx, reaches into
 *     playback control anymore.
 *   - `onComplete()` (which lifts App.tsx's `videoReleased` gate and
 *     lets the story continue) is called from exactly two places: the
 *     native `ended` event, or a genuinely permanent media error (see
 *     item 6/`isPermanentError` below) — never from buffering, never
 *     from a play() rejection, never from a timer.
 *   - React's own timeline is already frozen for the duration of this
 *     scene by App.tsx's existing `videoReleased` gate (the "video"
 *     segment's gate caps `elapsed` right at the segment's start until
 *     this component calls `onComplete()`) — this file doesn't need to
 *     do anything extra to "pause" the timeline, it only needs to
 *     never call `onComplete()` prematurely.
 *
 * DEBUG LOGGING (item 15): every native media event below logs
 * currentTime/duration/readyState/networkState/paused/muted/error —
 * enough to tell apart autoplay-policy rejections, buffering/network
 * stalls, decode errors, and (via the absence of expected logs) a
 * frozen main thread. `progress`/`timeupdate` are throttled to ~1/sec
 * so the logging itself can't become a mobile perf problem.
 */

type Stage = "idle" | "loading" | "ready" | "playing" | "buffering" | "ended" | "error";

export type VideoSceneHandle = {
  /** Used only by App.tsx's replay(). The one place `.load()` is
      allowed to run outside first mount. */
  reset: () => void;
};

type Props = {
  /** True exactly while `phase === "video"`. This is the only signal
      this component reacts to for starting/stopping playback. */
  active: boolean;
  onComplete: () => void;
  /** Fires the instant the video's native `ended` event fires — before
      the hold beat below. App.tsx uses this (not a timer) to resume
      background music exactly when the memory's own audio actually
      stops. */
  onEnded?: () => void;
  /** Frame's own max-height, in vh — passed down from App.tsx so the
      frame's actual on-screen size always matches the geometry the
      bunny's paw line was tuned against. */
  frameMaxHVh?: number;
  /** Frame's margin from the screen's bottom edge, in vh. */
  frameBottomVh?: number;
};

/** How long the scene holds on the final frame after `ended` before
    calling onComplete — a deliberate, short visual beat, NOT a
    playback-progress mechanism. Native `ended` has already fired by
    the time this runs; this timer only ever delays onComplete, it can
    never bring it forward or substitute for a real event. */
const END_HOLD_MS = 900;

/** Throttle window for the very-high-frequency `progress`/`timeupdate`
    debug logs, so the logging itself never becomes a mobile perf cost. */
const LOG_THROTTLE_MS = 1000;

const VideoScene = forwardRef<VideoSceneHandle, Props>(function VideoScene(
  { active, onComplete, onEnded, frameMaxHVh = 75, frameBottomVh = 3 },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [isMuted, setIsMuted] = useState(true);

  const completedRef = useRef(false);
  const endedFiredRef = useRef(false);
  const endHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Mirrors `active`/`stage` for the native event listeners, which are
      attached exactly once (mount-only) since the <video> element
      itself is persistent for the app's whole lifetime and never
      recreated. */
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const stageRef = useRef<Stage>("idle");
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const lastProgressLogRef = useRef(0);
  const lastTimeUpdateLogRef = useRef(0);

  /** ITEM 15 — DEBUG LOGGING: every call logs the full diagnostic
      snapshot the brief asks for, so a real mobile failure can be
      classified afterward as (A) autoplay policy, (B) buffering/
      network, (C) decode, (D) JS freeze, (E) element reset, or
      (F) React re-render interference. */
  const logEvent = (label: string, extra?: Record<string, unknown>) => {
    const video = videoRef.current;
    // eslint-disable-next-line no-console
    console.log(`[VideoScene] ${label}`, {
      currentTime: video?.currentTime,
      duration: video?.duration,
      readyState: video?.readyState,
      networkState: video?.networkState,
      paused: video?.paused,
      muted: video?.muted,
      errorCode: video?.error?.code,
      errorMessage: video?.error?.message,
      ...extra,
    });
  };

  /** ITEM 3/4 — always starts MUTED (mobile browsers can reject
      unmuted autoplay outright; muted autoplay is permitted almost
      everywhere), and only actually calls `.play()` once the element
      is genuinely ready. `video.muted`/`video.playsInline` are the
      only properties this function touches, and it touches them
      exactly once per playback start — never on a loop, never on a
      timer. A rejected play() is logged and left alone: the `canplay`/
      `loadedmetadata` listeners below will naturally retry once the
      browser reports readiness, and the scene's own pointer handler
      gives the user a direct, real-gesture way to unmute/resume too. */
  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    setIsMuted(true);
    logEvent("attempting play() (muted)");
    video
      .play()
      .then(() => {
        logEvent("play() resolved");
      })
      .catch((err) => {
        logEvent("play() rejected — leaving element as-is, will retry on next canplay/gesture", {
          err: String(err),
        });
      });
  };

  /** Only actually starts playback once the element has reported
      enough readiness — see item 4. `HAVE_FUTURE_DATA` (readyState 3)
      is the same bar the native `canplay` event itself fires at. */
  const tryStartIfReady = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= 3) {
      startPlayback();
    }
    // Otherwise: do nothing here. The `loadedmetadata`/`canplay`
    // listeners below will call tryStartIfReady() again the moment the
    // browser itself reports readiness — no polling, no timer.
  };

  /* Drives playback purely off the `active` prop — never off mount,
     never off a timer. This is the ONLY place that starts or stops
     playback in response to the story reaching/leaving this scene. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      completedRef.current = false;
      endedFiredRef.current = false;
      setStage((s) => (s === "idle" ? "loading" : s));
      tryStartIfReady();
    } else {
      video.pause();
      setStage("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /* Native listeners, attached ONCE for the element's entire lifetime.
     This is the single source of truth for playback state — nothing
     in this file infers progress from elapsed wall-clock time. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      logEvent("loadedmetadata");
      if (activeRef.current && stageRef.current === "loading") tryStartIfReady();
    };

    const handleCanPlay = () => {
      logEvent("canplay");
      if (
        activeRef.current &&
        (stageRef.current === "loading" || stageRef.current === "buffering")
      ) {
        tryStartIfReady();
      }
    };

    const handlePlaying = () => {
      logEvent("playing");
      setStage("playing");
    };

    /* ITEM 5 — buffering must NEVER finish the scene. `waiting` fires
       when the browser genuinely has to pause for more data; this only
       ever updates the (purely cosmetic) stage label so the "still
       loading" state is visible if needed — it never touches
       `onComplete`, never touches `elapsed`, never calls `.load()`. */
    const handleWaiting = () => {
      logEvent("waiting (buffering)");
      if (activeRef.current) setStage("buffering");
    };

    const handleStalled = () => {
      logEvent("stalled");
      // Deliberately a no-op beyond logging — see item 5/6. The
      // browser owns recovery; `canplay`/`playing` will fire again on
      // their own once data resumes, and this file must not race it
      // with a `.load()` or a forced skip.
    };

    const handleProgress = () => {
      const now = performance.now();
      if (now - lastProgressLogRef.current < LOG_THROTTLE_MS) return;
      lastProgressLogRef.current = now;
      logEvent("progress");
    };

    const handleTimeUpdate = () => {
      const now = performance.now();
      if (now - lastTimeUpdateLogRef.current < LOG_THROTTLE_MS) return;
      lastTimeUpdateLogRef.current = now;
      logEvent("timeupdate");
    };

    /* ITEM 1/13 — the ONLY path that ever calls onComplete() for a
       normal, successful playthrough. Nothing here estimates
       completion from elapsed time or a timer. */
    const handleEnded = () => {
      logEvent("ended");
      setStage("ended");
      if (!endedFiredRef.current) {
        endedFiredRef.current = true;
        onEnded?.();
      }
      // A short, fixed visual hold on the final frame — NOT a
      // playback-progress mechanism. `ended` has already fired; this
      // can only delay onComplete, never substitute for the event.
      endHoldTimer.current = setTimeout(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        onComplete();
      }, END_HOLD_MS);
    };

    /* ITEM 6 — no more "retry once, then finish" behavior, and no
       arbitrary timers. A transient error (the overwhelmingly common
       mobile case — a dropped range request, a momentary decoder
       hiccup) is logged in full and otherwise left alone: the scene
       stays visible, playback state is untouched, and the browser is
       given the chance to recover on its own (a subsequent `canplay`/
       `playing` event will resume the visible stage). onComplete() is
       only ever called here if the browser itself reports a state that
       is unambiguously permanent — either a real MediaError with code
       MEDIA_ERR_SRC_NOT_SUPPORTED (4, the codec/source itself is
       unusable, more data will never help), or networkState
       NETWORK_NO_SOURCE (3, the browser has given up finding a valid
       source entirely). Every other MediaError code (ABORTED,
       NETWORK, DECODE) is treated as recoverable and just logged. */
    const handleError = () => {
      const err = video.error;
      logEvent("error", {
        errorCodeName:
          err?.code === 1
            ? "MEDIA_ERR_ABORTED"
            : err?.code === 2
              ? "MEDIA_ERR_NETWORK"
              : err?.code === 3
                ? "MEDIA_ERR_DECODE"
                : err?.code === 4
                  ? "MEDIA_ERR_SRC_NOT_SUPPORTED"
                  : "none",
      });

      const isPermanent = err?.code === 4 || video.networkState === 3;
      if (!isPermanent) {
        logEvent("error treated as transient — scene stays visible, no action taken");
        return;
      }
      if (!activeRef.current) {
        logEvent(
          "permanent error ignored — scene isn't active yet, will re-evaluate when it becomes active",
        );
        return;
      }
      logEvent("permanent, unrecoverable media error while active — completing the scene");
      if (!endedFiredRef.current) {
        endedFiredRef.current = true;
        onEnded?.();
      }
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleStalled);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleStalled);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (endHoldTimer.current) clearTimeout(endHoldTimer.current);
    },
    [],
  );

  /** ITEM 12 — exactly ONE pointer handler drives every in-scene
      interaction (no separate onClick/onTouchStart/onPointerDown
      combo, and App.tsx's global tap-to-advance never reaches into
      playback anymore — see App.tsx's skip()). A tap:
        - unmutes (a real, direct user gesture on this exact element —
          exactly what mobile browsers require to permit sound), if
          currently muted; otherwise
        - pauses/resumes playback.
      Never touches currentTime, playbackRate, or calls load(). */
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.muted) {
      video.muted = false;
      setIsMuted(false);
      logEvent("unmuted via user gesture");
      if (video.paused) {
        video
          .play()
          .catch((err) => logEvent("resume-with-sound play() rejected", { err: String(err) }));
      }
      return;
    }

    if (video.paused) {
      video.play().catch((err) => logEvent("manual resume play() rejected", { err: String(err) }));
    } else {
      video.pause();
      logEvent("paused via user gesture");
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      /** ITEM 11 — Replay is the one and only place `.load()` runs
          outside of first mount. Fully resets the element back to a
          clean state and waits for real readiness again before the
          next `active` transition starts playback. */
      reset: () => {
        const video = videoRef.current;
        if (video) {
          video.pause();
          video.currentTime = 0;
          video.load();
        }
        completedRef.current = false;
        endedFiredRef.current = false;
        if (endHoldTimer.current) clearTimeout(endHoldTimer.current);
        setIsMuted(true);
        setStage("idle");
      },
    }),
    [],
  );

  const visible = active && stage !== "idle";

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center px-5"
      style={{
        paddingBottom: `${frameBottomVh}vh`,
        pointerEvents: active ? "auto" : "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
      onPointerDown={handlePointerDown}
    >
      {/* ITEM 8/9 — no particles, no animated glow, no backdrop-blur,
          no animated shadow, no Framer Motion anywhere in this
          component: the frame is a plain, visually-unchanged container
          (same border/background as before) so the mobile GPU/decoder
          budget goes to the actual video instead of decorative
          effects. A short CSS opacity transition (above, and on the
          frame below) is all that's used for entering/exiting. */}
      <div
        className="relative w-[96vw] max-w-3xl overflow-hidden rounded-[22px]"
        style={{
          border: "1px solid rgba(247, 209, 158, 0.35)",
          backgroundColor: "rgba(20, 10, 40, 0.55)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        <video
          ref={videoRef}
          src="/video/memory.mp4"
          playsInline
          muted={isMuted}
          preload="metadata"
          controls={false}
          className="block w-full"
          style={{ objectFit: "contain", maxHeight: `${frameMaxHVh}vh` }}
        />

        {isMuted && (stage === "playing" || stage === "buffering") && (
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-cream/30 bg-black/50 px-3 py-1.5 text-xs text-cream">
            <VolumeX size={14} /> Tap for sound
          </div>
        )}
      </div>
    </div>
  );
});

export default VideoScene;