import { AnimatePresence, motion } from "framer-motion";
import { VolumeX } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * VideoScene — "a special memory is being revealed."
 *
 * ROOT-CAUSE AUDIO FIX (this round):
 *
 * Previously this component (and its <video> element) was only mounted
 * while `phase === "video"` (App.tsx wrapped it in
 * `<AnimatePresence>{phase === "video" && <VideoScene/>}</AnimatePresence>`).
 * That meant a BRAND NEW <video> DOM node was created every time the
 * scene was entered, and `video.play()` was first called from inside a
 * `useEffect` — i.e. NOT synchronously inside a user gesture's call
 * stack. Browsers only allow unmuted autoplay either (a) inside the
 * exact call stack of a user gesture, or (b) on a specific
 * HTMLMediaElement that has previously been granted a "user gesture"
 * play on THAT SAME element. Because the element was destroyed and
 * recreated every time, condition (b) could never be satisfied, and
 * condition (a) didn't hold either (the phase change comes from a raf
 * timeline / gate, not directly from the click handler) — so unmuted
 * play() was reliably rejected, silently falling back to the muted
 * branch. That's the actual root cause of "video plays but no audio."
 *
 * The fix: this component is now ALWAYS mounted by App.tsx (never
 * conditionally unmounted), and visibility/interactivity is controlled
 * purely by the `active` prop (true while `phase === "video"`). That
 * means there is exactly ONE <video> element for the entire lifetime of
 * the app. App.tsx's existing first-gesture / "FIX 3" gesture-linked
 * flow (the same mechanism that already unlocks the background/hug
 * <audio> tracks) now ALSO calls `prime()` (exposed below via
 * `useImperativeHandle`) on every such gesture. `prime()` does a
 * silent (volume 0) play()+pause() cycle on this exact <video> element.
 * Because that first successful play() happens inside a real user
 * gesture, the browser marks THIS element as having gesture-based
 * playback history — so later, when `active` flips true (no gesture
 * required at that moment), the real `video.play()` with
 * `muted = false` is allowed to proceed with sound, because it's the
 * same DOM node that was already gesture-activated earlier. No
 * additional mute/unmute button was added; the existing "tap for
 * sound" fallback stays only as a last-resort safety net for browsers
 * that don't honor the priming (it should now rarely if ever appear).
 *
 * Lifecycle (driven by the `active` prop instead of mount/unmount):
 *   idle -(active becomes true)-> entering -> playing -> holding (1.5s
 *   after `ended`) -> fading (900ms) -> done -(active becomes false)-> idle
 *
 * `onEnded` fires the instant the video's native `ended` event fires —
 * App.tsx uses that (not a timer, and not `onComplete`) to resume the
 * background music exactly when the memory's own audio actually stops.
 * `onComplete` fires later, after the hold+fade beat, and is what
 * App.tsx uses to lift the `videoReleased` gate so the virtual timeline
 * continues into Final Affirmation.
 *
 * Exposed imperative handle (used by App.tsx):
 *   - prime(): silent gesture-linked unlock, see above. Safe to call on
 *     every gesture; a no-op after the first successful call.
 *   - togglePauseResume(): pauses/resumes the ACTUAL <video> element.
 *     Used by App.tsx's existing tap-to-advance ("skip") handler so that
 *     clicking the middle of the screen during the video scene pauses/
 *     resumes playback instead of doing nothing.
 *   - reset(): used by App.tsx's replay() so a fresh run starts the
 *     memory from the beginning instead of wherever a previous run left
 *     off.
 */

type Stage = "idle" | "entering" | "playing" | "holding" | "fading" | "done";

const HOLD_MS = 1500;
const FADE_MS = 900;

export type VideoSceneHandle = {
  prime: () => void;
  togglePauseResume: () => void;
  reset: () => void;
};

type Props = {
  /** True exactly while `phase === "video"`. Drives playback start/stop
      and visibility — this component is otherwise always mounted. */
  active: boolean;
  onComplete: () => void;
  /** Fires the instant the video's native `ended` event fires — before
      the hold/fade beat below. App.tsx uses this (not a timer) to
      resume background music exactly when the memory's own audio
      actually stops. */
  onEnded?: () => void;
  /** Frame's own max-height, in vh — passed down from App.tsx so the
      frame's actual on-screen size always matches the geometry the
      bunny's paw line was tuned against. */
  frameMaxHVh?: number;
  /** Frame's margin from the screen's bottom edge, in vh. */
  frameBottomVh?: number;
};

const VideoScene = forwardRef<VideoSceneHandle, Props>(function VideoScene(
  { active, onComplete, onEnded, frameMaxHVh = 75, frameBottomVh = 3 },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [needsUnmute, setNeedsUnmute] = useState(false);

  const completedRef = useRef(false);
  const endedFiredRef = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Bumped every time `active` becomes true; async play() attempts
      check this so a rapid active->inactive->active cycle can never
      apply a stale attempt's result. */
  const runTokenRef = useRef(0);
  /** Mirrors `active` for the native ended/error listeners, which are
      attached once (mount-only) since the element itself never
      unmounts anymore. */
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  /** True once a silent, gesture-linked play()+pause() has actually
      succeeded on this element — see `prime()` below. */
  const primedRef = useRef(false);
  /** Guards the one-shot retry-on-error below so a genuinely broken
      video can still fall through to finish() rather than retrying
      forever. Reset every time `active` newly becomes true. */
  const retriedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  /** TEMPORARY DIAGNOSTICS — safe to delete once the audio path is
      confirmed working on the real target device/browser; only reads
      state, never changes behavior. */
  const logVideoState = (label: string) => {
    const video = videoRef.current;
    if (!video) return;
    // eslint-disable-next-line no-console
    console.log(`[VideoScene DEBUG] ${label}`, {
      muted: video.muted,
      volume: video.volume,
      paused: video.paused,
      readyState: video.readyState,
      currentSrc: video.currentSrc,
      currentTime: video.currentTime,
      duration: video.duration,
      networkState: video.networkState,
      error: video.error ? { code: video.error.code, message: video.error.message } : null,
    });
  };

  const attemptPlay = async (video: HTMLVideoElement, token: number) => {
    logVideoState("before unmuted play() attempt");
    try {
      // The only place `muted`/`volume` are set for real playback — no
      // React-controlled `muted` JSX prop exists on the element, so a
      // re-render can never silently reassert a stale value here.
      video.muted = false;
      video.volume = 1;
      await video.play();
      if (runTokenRef.current !== token) return;
      logVideoState("unmuted play() resolved");
      setStage("playing");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[VideoScene DEBUG] unmuted play() REJECTED:", err);
      try {
        video.muted = true;
        await video.play();
        if (runTokenRef.current !== token) return;
        logVideoState("fallback muted play() resolved (needs tap-to-unmute)");
        setNeedsUnmute(true);
        setStage("playing");
      } catch (err2) {
        // eslint-disable-next-line no-console
        console.error("[VideoScene DEBUG] fallback muted play() ALSO REJECTED — skipping scene:", err2);
        if (runTokenRef.current !== token) return;
        finish();
      }
    }
  };

  /* Drives playback purely off the `active` prop instead of mount. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      const token = ++runTokenRef.current;
      completedRef.current = false;
      endedFiredRef.current = false;
      retriedRef.current = false;
      setNeedsUnmute(false);
      setStage("entering");
      video.currentTime = 0;
      void attemptPlay(video, token);
    } else {
      runTokenRef.current++; // invalidate any in-flight attempt from this run
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      video.pause();
      setStage("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /* Native listeners attached ONCE — the element itself is now
     persistent for the app's whole lifetime, so there's no need (and
     no opportunity) to re-attach these per scene entry. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (!activeRef.current) return;
      logVideoState("native `ended` event fired");
      if (!endedFiredRef.current) {
        endedFiredRef.current = true;
        onEnded?.();
      }
      setStage("holding");
      holdTimer.current = setTimeout(() => {
        setStage("fading");
        fadeTimer.current = setTimeout(() => {
          setStage("done");
          finish();
        }, FADE_MS);
      }, HOLD_MS);
    };

    /** ROOT CAUSE OF "video scene skipped on mobile": this element has
        had `src="/video/memory.mp4"` and `preload="auto"` set since
        mount (so the browser starts fetching/buffering the 9MB memory
        clip in the background, long before the video scene is ever
        reached — which is exactly what we want for preloading). But
        this `error` listener is attached ONCE for the component's
        entire lifetime and, until this fix, reacted to ANY `error`
        event by immediately calling `finish()` — which flips
        `videoReleased` in App.tsx permanently true.

        On a flaky/slow mobile connection it's common for that
        background preload fetch to hiccup (an aborted range request,
        a transient network error, the OS deprioritizing/pausing an
        off-screen media element's buffering, mobile Safari's stricter
        concurrent-media-element limits when the bg/hug <audio>
        elements are also preloading) and fire a native `error` event
        on the <video> element WHILE THE VIDEO SCENE ISN'T EVEN ACTIVE
        YET. Because `completedRef`/`videoReleased` latch permanently
        (only reset by replay()), that one stray early error silently
        marked the whole scene "already finished" minutes before the
        timeline ever got there — so when the timeline actually
        reached the video phase, App.tsx's gate saw `videoReleased`
        already true and let `elapsed` sail straight through the
        video's slot in a single frame, i.e. the scene was skipped
        with nothing ever visibly playing. Desktop's faster, steadier
        connections rarely if ever trigger this; mobile does, reliably.

        Fix: only ever treat a real `error` event as "the video failed,
        move on" while the video scene is actually the active phase
        (mirrors the existing `activeRef` guard already used in
        `handleEnded` above). An error that fires during background
        preloading, before the scene is reached, is now just logged
        and ignored — the browser will still have another chance to
        (re)buffer by the time `active` actually flips true, since the
        `active` effect calls `attemptPlay()` again at that point
        regardless of any earlier hiccup. */
    const handleError = () => {
      if (!activeRef.current) {
        // eslint-disable-next-line no-console
        console.warn("[VideoScene] ignored a pre-scene media error (likely a background preload hiccup):", video.error);
        return;
      }
      // One-shot retry: a genuine error while the scene IS active (a
      // real network drop mid-playback, not the pre-scene case above)
      // still deserves one reload+replay attempt before we give up and
      // skip — a single transient blip shouldn't cost the whole scene.
      if (!retriedRef.current) {
        retriedRef.current = true;
        // eslint-disable-next-line no-console
        console.warn("[VideoScene] media error during the active scene — retrying once:", video.error);
        const token = ++runTokenRef.current;
        video.load();
        void attemptPlay(video, token);
        return;
      }
      if (!endedFiredRef.current) {
        endedFiredRef.current = true;
        onEnded?.();
      }
      finish();
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    },
    [],
  );

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    setNeedsUnmute(false);
    void video.play().catch((err) => {
      // eslint-disable-next-line no-console
      console.log("[VideoScene DEBUG] handleUnmute play() rejected:", err);
    });
  };

  /** Shared pause/resume core — used by both the on-frame click handler
      and the imperative `togglePauseResume()` (which App.tsx's
      tap-to-advance "skip" calls for clicks on the middle of the
      screen during the video scene). */
  const handleTogglePauseResume = () => {
    const video = videoRef.current;
    if (!video) return;
    if (needsUnmute) {
      handleUnmute();
      return;
    }
    if (stage !== "entering" && stage !== "playing") return;
    if (video.paused) {
      void video.play().catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[VideoScene DEBUG] manual resume play() FAILED:", err);
      });
    } else {
      video.pause();
    }
  };
const handleSceneTap = (e: React.MouseEvent) => {
  e.stopPropagation();

  if (needsUnmute) {
    handleUnmute();
    return;
  }

  handleTogglePauseResume();
};
  const handleFrameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleTogglePauseResume();
  };

  useImperativeHandle(
    ref,
    () => ({
      /** Silent, gesture-linked play()+pause() cycle so this exact
          <video> element is granted gesture-based playback permission
          ahead of time — see the top-of-file note. Safe to call from
          every gesture; a no-op once already primed. */
      prime: () => {
        if (primedRef.current) return;
        const video = videoRef.current;
        if (!video) return;
        video.muted = false;
        video.volume = 0;
        video
          .play()
          .then(() => {
            primedRef.current = true;
            video.pause();
            video.currentTime = 0;
          })
          .catch(() => {
            // Still blocked — leave primedRef false so the next gesture
            // (App.tsx's passive listener fires on every
            // pointerdown/keydown/touchstart) retries automatically.
            video.pause();
          });
      },
      togglePauseResume: handleTogglePauseResume,
      reset: () => {
        const video = videoRef.current;
        if (video) {
          video.pause();
          // .load() clears any stale `video.error` from a previous run
          // (e.g. the retried-and-still-failed case above) so a fresh
          // run always starts from a clean media state, not one still
          // carrying a prior error.
          video.load();
          video.currentTime = 0;
        }
        runTokenRef.current++;
        completedRef.current = false;
        endedFiredRef.current = false;
        retriedRef.current = false;
        setNeedsUnmute(false);
        setStage("idle");
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needsUnmute, stage],
  );

  const fadingOut = stage === "fading" || stage === "done";
  const visible = active && stage !== "idle" && stage !== "done";

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-end justify-center px-5"
      style={{ paddingBottom: `${frameBottomVh}vh`, pointerEvents: active ? "auto" : "none" }}
      onClick={handleSceneTap}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Slightly dim the existing night sky behind the memory */}
      <motion.div
        className="absolute inset-0 bg-black"
        animate={{ opacity: visible && !fadingOut ? 0.45 : 0 }}
        transition={{ duration: 1 }}
      />

      {/* Floating particles / sparkles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-gold/70"
            style={{
              left: `${6 + ((i * 37) % 90)}%`,
              width: i % 3 === 0 ? 4 : 2,
              height: i % 3 === 0 ? 4 : 2,
              filter: "blur(0.5px)",
            }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{
              y: visible && !fadingOut ? ["100%", "-10%"] : "100%",
              opacity: visible && !fadingOut ? [0, 0.9, 0] : 0,
            }}
            transition={{
              duration: 6 + (i % 5),
              delay: i * 0.4,
              repeat: visible && !fadingOut ? Infinity : 0,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Cinematic glowing frame around the video. onClick here (not on
          the full-screen wrapper above) is the "click the video ->
          pause / click again -> resume" target — scoped to just the
          frame so it never doubles up with the scene-wide tap-to-unmute
          above. App.tsx's own tap-to-advance also reaches
          togglePauseResume() (via the imperative handle) for clicks
          outside the frame but still within the video scene. */}
      <motion.div
        className="pointer-events-auto relative w-[96vw] max-w-3xl rounded-[22px] p-[2px]"
        style={{
          background: "linear-gradient(160deg, rgba(247,209,158,0.55), rgba(232,168,255,0.35))",
        }}
        onClick={handleFrameClick}
        animate={{ opacity: visible ? (fadingOut ? 0 : 1) : 0, scale: visible ? (fadingOut ? 0.94 : 1) : 0.88 }}
        transition={{ duration: fadingOut ? 0.9 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* soft pulsing ambient glow — the "subtle animated border" */}
        <motion.div
          className="pointer-events-none absolute -inset-1 rounded-[26px]"
          style={{ background: "radial-gradient(closest-side, rgba(232,168,255,0.45), transparent 70%)" }}
          animate={{ opacity: visible && !fadingOut ? [0.35, 0.75, 0.35] : 0 }}
          transition={{ duration: 3.2, repeat: visible && !fadingOut ? Infinity : 0, ease: "easeInOut" }}
        />

        <div
          className="relative overflow-hidden rounded-[20px] backdrop-blur-md"
          style={{
            backgroundColor: "rgba(20, 10, 40, 0.35)",
            border: "1px solid rgba(247, 209, 158, 0.25)",
            boxShadow: "0 0 40px rgba(232,168,255,0.3), 0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          <video
            ref={videoRef}
            src="/video/memory.mp4"
            playsInline
            preload="auto"
            className="block w-full"
            style={{ objectFit: "contain", maxHeight: `${frameMaxHVh}vh` }}
          />

          <AnimatePresence>
            {needsUnmute && (stage === "entering" || stage === "playing") && (
              <motion.button
                key="unmute"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnmute();
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-cream/30 bg-black/50 px-3 py-1.5 text-xs text-cream backdrop-blur-sm"
              >
                <VolumeX size={14} /> Tap for sound
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default VideoScene;