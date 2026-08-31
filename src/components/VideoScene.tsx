import { AnimatePresence, motion } from "framer-motion";
import { VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * VideoScene — "a special memory is being revealed."
 *
 * Mounted ONLY while `phase === "video"` (App.tsx wraps it in
 * <AnimatePresence>{phase === "video" && <VideoScene .../>}</AnimatePresence>).
 * That mount/unmount boundary is what gives it a fresh, single-fire
 * lifecycle every time it's genuinely entered — no separate "have I
 * already started" flag is needed at the App.tsx level, and the
 * mount-only effect below (empty dep array) is what prevents App.tsx's
 * per-frame re-renders (the `elapsed` clock) from ever restarting the
 * video or re-attaching listeners.
 *
 * Lifecycle:
 *   entering -> playing -> holding (1.5s after `ended`) -> fading (900ms) -> done
 * `done` calls onComplete(), which App.tsx uses to lift the same kind
 * of gate the question scene already uses (see VIDEO_SEGMENT / gateMs
 * in App.tsx) — so the virtual timeline simply stalls on this phase
 * until the memory has actually played out, then continues on its own
 * into the existing Final Affirmation phase.
 *
 * Playback: tries unmuted autoplay first (many mobile browsers allow
 * this once the page has already had a user gesture, which by this
 * point in the film it certainly has — taps to advance dialogue, the
 * YES/NO question, etc.). If that's rejected, retries muted (which is
 * essentially always allowed) and surfaces a small "tap for sound"
 * affordance. If the video can't play at all (missing file, decode
 * error, etc.), it fails soft: onComplete() fires immediately so the
 * experience continues straight into Final Affirmation rather than
 * getting stuck.
 */

type Stage = "entering" | "playing" | "holding" | "fading" | "done";

const HOLD_MS = 1500;
const FADE_MS = 900;

export default function VideoScene({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stage, setStage] = useState<Stage>("entering");
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [muted, setMuted] = useState(false);
  const completedRef = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      finish();
      return;
    }

    let cancelled = false;

    const attemptPlay = async () => {
      try {
        video.muted = false;
        await video.play();
        if (!cancelled) {
          setMuted(false);
          setStage("playing");
        }
      } catch {
        try {
          video.muted = true;
          await video.play();
          if (!cancelled) {
            setMuted(true);
            setNeedsUnmute(true);
            setStage("playing");
          }
        } catch {
          // Can't play at all — don't strand the viewer, skip gracefully.
          if (!cancelled) finish();
        }
      }
    };

    void attemptPlay();

    const handleEnded = () => {
      if (cancelled) return;
      setStage("holding");
      holdTimer.current = setTimeout(() => {
        if (cancelled) return;
        setStage("fading");
        fadeTimer.current = setTimeout(() => {
          if (cancelled) return;
          setStage("done");
          finish();
        }, FADE_MS);
      }, HOLD_MS);
    };

    const handleError = () => {
      if (!cancelled) finish();
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    return () => {
      cancelled = true;
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      video.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    setNeedsUnmute(false);
    void video.play().catch(() => {
      // Already playing, or a stray rejection — nothing to recover from here.
    });
  };

  const fadingOut = stage === "fading" || stage === "done";
  const visible = stage !== "done";

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.8 }}
    >
      {/* Slightly dim the existing night sky behind the memory */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: fadingOut ? 0 : 0.45 }}
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
            animate={{ y: fadingOut ? "100%" : ["100%", "-10%"], opacity: fadingOut ? 0 : [0, 0.9, 0] }}
            transition={{
              duration: 6 + (i % 5),
              delay: i * 0.4,
              repeat: fadingOut ? 0 : Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Cinematic glowing frame around the video */}
      <motion.div
        className="pointer-events-auto relative w-[86vw] max-w-md rounded-[22px] p-[2px]"
        style={{
          background: "linear-gradient(160deg, rgba(247,209,158,0.55), rgba(232,168,255,0.35))",
        }}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: fadingOut ? 0 : 1, scale: fadingOut ? 0.94 : 1 }}
        transition={{ duration: fadingOut ? 0.9 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* soft pulsing ambient glow — the "subtle animated border" */}
        <motion.div
          className="pointer-events-none absolute -inset-1 rounded-[26px]"
          style={{ background: "radial-gradient(closest-side, rgba(232,168,255,0.45), transparent 70%)" }}
          animate={{ opacity: fadingOut ? 0 : [0.35, 0.75, 0.35] }}
          transition={{ duration: 3.2, repeat: fadingOut ? 0 : Infinity, ease: "easeInOut" }}
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
            autoPlay
            muted={muted}
            preload="auto"
            className="block max-h-[56vh] w-full"
            style={{ objectFit: "contain" }}
          />

          <AnimatePresence>
            {needsUnmute && (
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
}