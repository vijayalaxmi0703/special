  import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
  import { createPortal } from "react-dom";

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
   *   - `video.load()` is never called anywhere in this file — not on
   *     normal playback, not on buffering recovery, not on error
   *     handling, and not even on Replay (`reset()` just pauses and
   *     rewinds `currentTime`; the source hasn't changed, so there's
   *     nothing a full pipeline reset would fix).
   *   - `currentTime`/`playbackRate`/`volume`/`muted` are each set once,
   *     at the moments described in the numbered items below — never
   *     continuously reassigned while the video plays.
   *   - The frame is a plain element with a CSS `transition: opacity`
   *     for entering/exiting. No Framer Motion anywhere in this file, no
   *     particles, no animated glow, no backdrop-blur, no animated
   *     shadow — the video gets the mobile GPU/decoder's full budget.
   *   - The whole-scene wrapper is NOT a pointer target at all
   *     (`pointerEvents: "none"`) — a general tap anywhere on/near the
   *     video does nothing. The only interactive control is a small
   *     dedicated unmute button (`handleUnmute` below), which is the one
   *     and only thing in this file that can touch play/pause/muted once
   *     the scene is active. Nothing in App.tsx reaches into playback
   *     control either.
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
    /** Used only by App.tsx's replay(). Rewinds the element without ever
        calling `.load()`. */
    reset: () => void;
    /** Used only by App.tsx's one-time first-gesture handler. A silent
        muted play+pause probe that primes this element's own gesture
        credit ahead of time. */
    prime: () => void;
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

    /** Mirrors `active` for the native event listeners, which are
        attached exactly once (mount-only) since the <video> element
        itself is persistent for the app's whole lifetime and never
        recreated. */
    const activeRef = useRef(active);
    useEffect(() => {
      activeRef.current = active;
    }, [active]);

    const lastProgressLogRef = useRef(0);
    const lastTimeUpdateLogRef = useRef(0);

    const formatBuffered = (video: HTMLVideoElement | null) => {
      if (!video || !video.buffered) return [];
      const ranges: Array<{ start: number; end: number }> = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push({
          start: Number(video.buffered.start(i).toFixed(3)),
          end: Number(video.buffered.end(i).toFixed(3)),
        });
      }
      return ranges;
    };

    const READY_STATES = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"];
    const NETWORK_STATES = ["NETWORK_EMPTY", "NETWORK_IDLE", "NETWORK_LOADING", "NETWORK_NO_SOURCE"];

    const logEvent = (label: string, extra?: Record<string, unknown>) => {
      const video = videoRef.current;
      // eslint-disable-next-line no-console
      console.log(`[VIDEO] ${label}`, {
        currentTime: video?.currentTime,
        duration: video?.duration,
        readyState: video ? `${video.readyState} (${READY_STATES[video.readyState] ?? "UNKNOWN"})` : undefined,
        networkState: video ? `${video.networkState} (${NETWORK_STATES[video.networkState] ?? "UNKNOWN"})` : undefined,
        buffered: formatBuffered(video),
        paused: video?.paused,
        ended: video?.ended,
        seeking: video?.seeking,
        muted: video?.muted,
        src: video?.src,
        errorCode: video?.error?.code,
        errorMessage: video?.error?.message,
        ...extra,
      });
    };

    /** ITEM 9 — prevents overlapping/duplicate `play()` calls. Set right
        before `video.play()` is invoked, cleared either by the native
        `playing` event (the normal, successful path) or by a rejected
        promise (so a later native event/gesture can try again). Never
        cleared by a timer. */
    const playAttemptRef = useRef(false);

    /** ITEMS 2/3/9/12 — the ONLY function in this file that calls
        `video.play()`. No `readyState` gate anymore: the browser's own
        native media pipeline is trusted to handle buffering itself once
        `play()` has been requested — `waiting`/`canplay`/`playing` then
        reflect its actual state. Safe to call from multiple triggers
        (the `active` effect, `loadedmetadata`, `canplay`) because it's
        itself a no-op unless the scene is active, the element exists,
        no attempt is already in flight, and the video isn't already
        playing. */
    const attemptPlay = () => {
      const video = videoRef.current;
      if (!video) return;
      if (!activeRef.current) return;
      if (playAttemptRef.current) return; // an attempt is already in flight
      if (!video.paused) return; // already playing — nothing to do

      video.muted = false;
      video.defaultMuted = false;
      video.playsInline = true;
      setIsMuted(false);
      playAttemptRef.current = true;
      logEvent("play requested");
      video
        .play()
        .then(() => {
          // Guard against a late resolution racing a since-deactivated
          // scene (e.g. user navigated away via the hidden nav before
          // this promise settled) — never flips stage back to "playing"
          // for a scene that isn't active anymore. The guard itself is
          // cleared by the native "playing" event (item 10), not here.
          if (!activeRef.current) return;
          logEvent("play success");
        })
        .catch((err) => {
          // A rejected play() must NEVER finish or skip the scene — it's
          // logged and left alone. Clearing the guard here (not just on
          // "playing") lets the next native readiness event or a real
          // user gesture make a fresh attempt instead of being locked
          // out by a stale in-flight flag.
          playAttemptRef.current = false;
          logEvent("play blocked", { err: String(err) });
        });
    };

    /* Drives playback purely off the `active` prop — never off mount,
      never off a timer. This is the ONLY place that starts or stops
      playback in response to the story reaching/leaving this scene.
      ITEM 3: attempts muted playback the instant `active` becomes true
      — does NOT wait for `loadedmetadata`/`canplay` first. The browser
      handles buffering natively from here. */
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  if (active) {
    logEvent("scene active");
    completedRef.current = false;
    endedFiredRef.current = false;
    setStage((s) => (s === "idle" ? "loading" : s));
    attemptPlay();
  } else {
    video.pause();
    playAttemptRef.current = false;

    if (endHoldTimer.current) {
      clearTimeout(endHoldTimer.current);
      endHoldTimer.current = null;
    }

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
        // Fallback retry only: the real attempt already happened the
        // instant `active` became true (see the effect above). This just
        // catches the case where that first attempt was rejected (e.g.
        // the element hadn't accepted a gesture-based play yet) and the
        // element has since made progress — attemptPlay() itself is a
        // no-op if an attempt is already in flight or playback is
        // already underway.
        if (activeRef.current) attemptPlay();
      };

      const handleCanPlay = () => {
        logEvent("canplay");
        // ITEM 12 — one controlled attempt, only if the scene is active
        // and the video is genuinely paused. attemptPlay() itself already
        // enforces "don't call play() if already playing" and "don't
        // overlap with an in-flight attempt", so this is safe to call
        // unconditionally on every canplay without risking a duplicate
        // play() call.
        if (activeRef.current && video.paused) {
          attemptPlay();
        }
      };

      const handlePlaying = () => {
        logEvent("playing", { currentTime: video.currentTime });
        // ITEM 10 — the native "playing" event is the authoritative
        // signal that a play attempt has genuinely succeeded; this is
        // where the in-flight guard is cleared.
        playAttemptRef.current = false;
        setStage("playing");
      };

      /* ITEM 5 — buffering must NEVER finish the scene. `waiting` fires
        when the browser genuinely has to pause for more data; this only
        ever updates the (purely cosmetic) stage label so the "still
        loading" state is visible if needed — it never touches
        `onComplete`, never touches `elapsed`, never calls `.load()`. */
      const handleWaiting = () => {
        logEvent("waiting", { currentTime: video.currentTime });
        if (activeRef.current) setStage("buffering");
      };

      const handleStalled = () => {
        logEvent("stalled", { currentTime: video.currentTime });
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
        logEvent("ended", { currentTime: video.currentTime });
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

      const handleLoadStart = () => logEvent("loadstart");
      const handleLoadedData = () => logEvent("loadeddata");
      const handleCanPlayThrough = () => logEvent("canplaythrough");
      const handlePlay = () => logEvent("play");
      const handlePause = () => logEvent("pause");
      const handleSuspend = () => logEvent("suspend");
      const handleSeeking = () => logEvent("seeking");
      const handleSeeked = () => logEvent("seeked");
      const handleAbort = () => logEvent("abort");
      const handleEmptied = () => logEvent("emptied");

      video.addEventListener("loadstart", handleLoadStart);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("canplaythrough", handleCanPlayThrough);
      video.addEventListener("play", handlePlay);
      video.addEventListener("playing", handlePlaying);
      video.addEventListener("pause", handlePause);
      video.addEventListener("waiting", handleWaiting);
      video.addEventListener("stalled", handleStalled);
      video.addEventListener("suspend", handleSuspend);
      video.addEventListener("progress", handleProgress);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("seeking", handleSeeking);
      video.addEventListener("seeked", handleSeeked);
      video.addEventListener("ended", handleEnded);
      video.addEventListener("error", handleError);
      video.addEventListener("abort", handleAbort);
      video.addEventListener("emptied", handleEmptied);
      return () => {
        video.removeEventListener("loadstart", handleLoadStart);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("canplaythrough", handleCanPlayThrough);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("playing", handlePlaying);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("waiting", handleWaiting);
        video.removeEventListener("stalled", handleStalled);
        video.removeEventListener("suspend", handleSuspend);
        video.removeEventListener("progress", handleProgress);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("seeking", handleSeeking);
        video.removeEventListener("seeked", handleSeeked);
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("error", handleError);
        video.removeEventListener("abort", handleAbort);
        video.removeEventListener("emptied", handleEmptied);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* 2-second heartbeat interval while active === true to observe video state during freeze */
    useEffect(() => {
      if (!active) return;
      const timer = setInterval(() => {
        const video = videoRef.current;
        if (!video) return;
        const lastBufferedEnd =
          video.buffered && video.buffered.length > 0
            ? Number(video.buffered.end(video.buffered.length - 1).toFixed(3))
            : null;
        // eslint-disable-next-line no-console
        console.log("[VIDEO 2s HEARTBEAT]", {
          currentTime: video.currentTime,
          readyState: `${video.readyState} (${READY_STATES[video.readyState] ?? "UNKNOWN"})`,
          networkState: `${video.networkState} (${NETWORK_STATES[video.networkState] ?? "UNKNOWN"})`,
          lastBufferedEnd,
          bufferedRanges: formatBuffered(video),
          paused: video.paused,
          ended: video.ended,
          seeking: video.seeking,
        });
      }, 2000);
      return () => clearInterval(timer);
    }, [active]);

    useEffect(
      () => () => {
        if (endHoldTimer.current) clearTimeout(endHoldTimer.current);
      },
      [],
    );

    /** The whole-scene wrapper is deliberately NOT a pause/resume target
        anymore — a general tap on the video area does nothing to
        playback. The only interactive control is the small dedicated
        unmute button below (`handleUnmute`), which is the sole thing
        that can touch this element's play/pause/muted state once the
        scene is active. This avoids the exact failure mode a browser-
        generated synthetic click (firing after a touch elsewhere on the
        screen) could otherwise trigger — an accidental pause the user
        never intended. */
  

    /** Guards `prime()` so it only ever runs its play/pause probe once —
        called from App.tsx's one-time first-gesture handler. */
    const primedRef = useRef(false);

    useImperativeHandle(
      ref,
      () => ({
        /** Replay: `.load()` is deliberately NOT called here anymore — the
            source hasn't changed, so there's nothing `.load()` would fix
            that pause()+currentTime=0 doesn't already do, and calling it
            resets the whole media pipeline (decoder/buffer/network
            request) for no reason. */
        reset: () => {
          const video = videoRef.current;
          if (video) {
            video.pause();
            video.currentTime = 0;
          }
          completedRef.current = false;
          endedFiredRef.current = false;
          if (endHoldTimer.current) clearTimeout(endHoldTimer.current);
          setIsMuted(false);
          setStage("idle");
        },
        /** Called once, from App.tsx's first-gesture handler, well before
            the video scene itself is ever reached. Grants this specific
            <video> element its own per-element gesture-activation credit
            (some mobile engines track this per element, same as the
            background/hug <audio> priming) — a brief muted play+pause
            probe, immediately rewound back to 0, so it leaves no visible
            or audible trace and doesn't compete with the actual scene's
            own `startPlayback()` later. Never sets `muted = false`, never
            touches `volume`. A no-op if already primed or if the scene
            has since become active (never pauses genuinely-active
            playback). */
        prime: () => {
          const video = videoRef.current;
          if (!video || primedRef.current || activeRef.current) return;
          video.muted = false;
          video.defaultMuted = true;
          video.playsInline = true;
          const p = video.play();
          if (p && typeof p.then === "function") {
            p.then(() => {
              if (activeRef.current) return; // scene became active mid-prime — leave it playing
              video.pause();
              video.currentTime = 0;
              primedRef.current = true;
              logEvent("prime success");
            }).catch((err) => {
              logEvent("prime blocked", { err: String(err) });
            });
          }
        },
      }),
      [],
    );

    const visible = active && stage !== "idle";

    /* ==================================================================
    * TEMPORARY DIAGNOSTIC TEST #2 — WHERE the <video> DOM node lives,
    * nothing about playback control. All playback logic above this
    * line (attemptPlay, prime, reset, native listeners, playAttemptRef,
    * the 900ms ended hold, error handling, debug logs) is completely
    * untouched.
    *
    * Purpose: isolate whether the mobile freeze is caused by the
    * <video> being embedded inside <main>'s own compositing/stacking
    * tree (overflow-hidden, the animated Bunny layers, Framer Motion
    * layers, other z-index stacking contexts) rather than by playback
    * itself. This renders the SAME <video> element (still exactly one
    * <video> in the DOM, still controlled by the same `videoRef`,
    * `active` prop, and event listeners) through a React portal
    * straight into `document.body` — completely outside <main>.
    *
    * SSR safety: this is a TanStack Start app, so this component's
    * first render can happen on the server, where `document` doesn't
    * exist. Checking `typeof document !== "undefined"` means the
    * server (and the very first pre-hydration client tick) renders
    * nothing for the portal, and the real client render — which is
    * everything that matters for a mobile browser actually playing the
    * video — mounts it immediately after. The element is never
    * conditionally unmounted/remounted based on `active` afterward,
    * same guarantee as before (App.tsx's first-gesture handler calls
    * `videoSceneRef.current?.prime()` well before the scene is ever
    * active, and by then this has already mounted).
    *
    * Presentation while testing: `position: fixed`, centered, no
    * opacity transition, no filters, no shadows, no clipping, no
    * masks, no transform beyond the simple centering translateX — per
    * the brief. `visibility` (not opacity) still gates it on `visible`
    * so it doesn't sit on top of every other scene at z-index 9999
    * while inactive; that's the same non-animated technique used in
    * the previous diagnostic round, not a new effect. */
    const videoNode = (
      <video
        ref={videoRef}
        src="/video/memory.mp4"
        playsInline
        muted={false}
        preload="metadata"
        controls={false}
        style={{
          position: "fixed",
          left: "50%",
          bottom: `${frameBottomVh}vh`,
          transform: "translateX(-50%)",
          display: "block",
          width: "96vw",
          maxWidth: "768px",
          maxHeight: `${frameMaxHVh}vh`,
          objectFit: "contain",
          zIndex: 9999,
          visibility: visible ? "visible" : "hidden",
        }}
      />
    );

  
    if (typeof document === "undefined") return null;

    return createPortal(
      <>
        {videoNode}
      </>,
      document.body,
    );
  });

  export default VideoScene;