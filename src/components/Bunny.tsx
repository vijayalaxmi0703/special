/**
 * MOUTH NOTE (speaking animation): speaking is a plain image swap
 * between mouth.png (closed), mouth-mid.png (slightly open), and
 * mouth-open.png (fully open), driven by useMouthFrame() below.
 *
 * PRODUCTION ASSET-LOADING FIX (new): every static PNG the bunny needs
 * for its first render (body/head/ears/arms/legs/pupils) plus the three
 * mouth frames are now preloaded together at module load, via the exact
 * same "new Image(); img.src = ..." mechanism this file previously used
 * for the mouth frames alone. This is what actually fixes the "bunny
 * assembles itself piece by piece on Vercel" symptom — before this
 * change, nothing was preloaded, so every part loaded lazily,
 * independently, whenever its own <img> mounted, and on a real CDN
 * connection each part painted whenever its own request happened to
 * resolve. The crown is deliberately kept OUT of this eager list (see
 * CROWN_ASSET below) since it isn't needed until much later in the
 * story — it's preloaded separately on browser idle time instead, so it
 * doesn't compete with first-paint bandwidth.
 *
 * ⚠️ KNOWN GAP — VERIFIED AGAINST THE ACTUAL PROJECT FILES:
 * /bunny/mouth-mid.png and /bunny/mouth-open.png are referenced here but
 * DO NOT currently exist in public/bunny/ — only mouth.png does. I can't
 * fabricate artwork, so the mouth will still only ever show the closed
 * frame until you add those two PNGs (same 111px-wide geometry as
 * mouth.png, same folder) to your project. Preloading files that 404
 * doesn't break anything — the closed frame still renders — but the
 * mid/open swap will have nothing to show until they exist.
 *
 * VIDEO SCENE NOTE (round 4 — holdFrame now literally reuses "lean"):
 * round 2 had tried an earlier "holdMemory" pose (rotate 56/-56, scale
 * 1.4 — copied unmodified from the crown-holding pose, tuned for
 * gripping a small, round, CENTERED object) and round 3 replaced it
 * with a separately-invented "holdFrame" pose (rotate 46/-46, scale
 * 1.12) reasoning that the plain "lean" numbers (rotate 62/-62, scale
 * 1) — the ones the QUESTION SCENE itself uses — wouldn't carry over
 * to the wider/taller video frame.
 *
 * Per this round's EXPLICIT instruction — "use the question scene bunny
 * hand position as the visual reference... do NOT invent a new hand
 * pose... reuse its relevant arm/hand positioning values" — that
 * round-3 invention is gone. "holdFrame" now returns the exact same
 * { rotate: 62/-62, scale: 1 } as "lean", unmodified. The video frame's
 * own size/position (App.tsx's VIDEO_BUNNY_* constants — the clip
 * window, scale-down, and bottom offset that place this repositioned
 * copy of the bunny at the frame's top edge) are untouched by this
 * change; only the arm rotation/scale numbers themselves were swapped
 * to literally match "lean" instead of using invented values.
 * Everything else about the bunny (art, colors, other poses, the
 * mouth/blink logic) is untouched.
 *
 * CROWN-WHILE-HELD FIX (verified against the real repo): the uploaded
 * project's Props type already declared `holdingCrown?: boolean`, and
 * App.tsx already passed it in — but this component never actually
 * destructured it, and never rendered any crown image while holding it.
 * That's the real cause of "the crown disappears" during the
 * grab/carry sequence: the ground crown fades out when walkToCrown
 * ends, and nothing filled the gap until crownFly. Fixed below by
 * reading the prop and rendering /crown.png between the paws whenever
 * it's true — no path/case-sensitivity issue was involved; the asset
 * itself was always fine at /crown.png.
 */
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";

export const STAGE_W = 600;
export const STAGE_H = 700;

export type BunnyPose =
  | "offstage"
  | "idle"
  | "walkIn"
  | "talk"
  | "shy"
  | "surprised"
  | "happy"
  | "curious"
  | "lean"
  | "toCrown"
  | "holdCrown"
  | "raise"
  | "holdFrame"
  | "approach"
  | "hug"
  | "release"
  | "wave"
  | "sit";

export type LookTarget = "viewer" | "crown" | "shy" | "up" | "down" | "left" | "right" | "away";

/** The four intro states. Anything other than these renders the normal puppet. */
export type IntroPhase = "hidden" | "head" | "wave" | "greeting";

type Props = {
  pose?: BunnyPose;
  look?: LookTarget;
  talking?: boolean;
  /** The master timeline's `elapsed` clock (ms), passed straight through
      from App.tsx. Drives the mouth animation — see useMouthFrame above
      for why this replaced an internal setInterval. Defaults to a
      Date.now()-based fallback so this prop can be omitted (e.g. by
      IntroBunny's call sites, which never talk) without crashing. */
  talkClockMs?: number;
  walking?: boolean;
  smiling?: boolean;
  holdingCrown?: boolean;
  introPhase?: IntroPhase;
  peekX?: number;
  peekTilt?: number;
  walkInFrom?: { x: number; y: number; rotate: number };
};

const P = {
  leftEar: { left: 172, top: 6, width: 98, z: 1 },
  rightEar: { left: 330, top: 6, width: 98, z: 1 },
  body: { left: 170, top: 348, width: 260, z: 3 },
  leftLeg: { left: 206, top: 548, width: 88, z: 2 },
  rightLeg: { left: 306, top: 548, width: 88, z: 2 },
  head: { left: 140, top: 124, width: 320, z: 4 },
  leftShoulder: { left: 203, top: 408, z: 4 },
  rightShoulder: { left: 398, top: 408, z: 4 },
  leftPupil: { left: 197, top: 248, width: 50, z: 6 },
  rightPupil: { left: 347, top: 248, width: 50, z: 6 },
  mouth: { left: 241, top: 265, width: 111, z: 6 },
};

export const HEAD_GEOMETRY = { left: P.head.left, width: P.head.width };

/** The three lip-sync frames, in mouth-opening order. Speaking steps
    through [0,1,2,1,0] (closed -> mid -> open -> mid -> closed) on a loop
    via MOUTH_STEP_MS below. Only the <Img src> changes. */
const MOUTH_CLOSED = "/bunny/mouth.png";
const MOUTH_MID = "/bunny/mouth-mid.png";
const MOUTH_OPEN = "/bunny/mouth-open.png";
const MOUTH_FRAMES = [MOUTH_CLOSED, MOUTH_MID, MOUTH_OPEN, MOUTH_MID, MOUTH_CLOSED];
const MOUTH_STEP_MS = 220;

/** Every static PNG the bunny needs for its very first paint. This is
    the actual fix for the piece-by-piece loading bug — see PRODUCTION
    ASSET-LOADING FIX above. Paths verified against public/bunny/ in the
    uploaded project. */
const CRITICAL_BUNNY_ASSETS = [
  "/bunny/body.png",
  "/bunny/head.png",
  "/bunny/left-ear.png",
  "/bunny/right-ear.png",
  "/bunny/left-arm.png",
  "/bunny/right-arm.png",
  "/bunny/left-leg.png",
  "/bunny/right-leg.png",
  "/bunny/left-pupil.png",
  "/bunny/right-pupil.png",
  MOUTH_CLOSED,
  MOUTH_MID,
  MOUTH_OPEN,
];

/** Crown lives at /crown.png (site root) — verified directly against
    public/crown.png in the uploaded project. It's needed much later
    (the crown scene), so it's deliberately kept OUT of the critical
    eager-preload list above and fetched once the browser is idle
    instead, so it doesn't compete with first-paint bandwidth. */
const CROWN_ASSET = "/crown.png";

function preloadImages(sources: string[]) {
  sources.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

if (typeof window !== "undefined") {
  preloadImages(CRITICAL_BUNNY_ASSETS);

  const scheduleIdle: (cb: () => void) => void =
    "requestIdleCallback" in window
      ? (cb) => (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
      : (cb) => window.setTimeout(cb, 1500);
  scheduleIdle(() => preloadImages([CROWN_ASSET]));
}

/** Hook: returns the mouth image src to show right now, derived purely
    from `clockMs` — the same master `elapsed` clock App.tsx's single
    rAF loop already drives the entire rest of the timeline with —
    instead of an independent `setInterval`.

    MOBILE FIX ("mouth animation stops midway"): the previous version
    ran its own `setInterval(..., MOUTH_STEP_MS)`, a second, completely
    separate timer from the master clock. Independent timers like this
    are exactly the kind of thing mobile browsers can throttle, delay,
    or (under sustained main-thread/memory pressure — e.g. while the
    3 always-large, oversized mouth PNGs this file used to preload were
    still ~2MB/6MB-decoded-bitmap each; see the asset-size fix noted at
    the top of this file) silently stop advancing, with nothing to
    notice or recover — a `setInterval` callback that stops firing
    doesn't throw or unmount, it just quietly stops. There was no way
    to tell it had died, and no self-healing.

    Deriving the frame purely from `clockMs` removes that whole failure
    mode: there's no separate timer to stall, drift, or leak. Every
    render simply asks "given how much time has passed since talking
    started, which frame should be showing right now?" — if a frame is
    skipped because the browser was momentarily busy, the very next
    render (driven by the same clock that's already reliably driving
    every other on-screen change) lands on the *correct* frame for
    the actual elapsed time instead of continuing from wherever a
    stalled interval left off. `talkStartRef` records the clock value
    at the instant `talking` turns true so the cycle still restarts at
    the closed frame each time a talking phase begins, exactly like the
    previous implementation. */
function useMouthFrame(talking: boolean, clockMs: number): string {
  const talkStartRef = useRef<number | null>(null);

  useEffect(() => {
    talkStartRef.current = talking ? clockMs : null;
    // Only the true/false transition should reset the start point —
    // clockMs changes every frame and must not retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talking]);

  if (!talking || talkStartRef.current === null) return MOUTH_CLOSED;
  const sinceStart = Math.max(0, clockMs - talkStartRef.current);
  const idx = Math.floor(sinceStart / MOUTH_STEP_MS) % MOUTH_FRAMES.length;
  return MOUTH_FRAMES[idx]!;
}

/** MOUTH POSITION FIX: the reported "whole mouth moving up/down" bug is
    the mouth's own container box changing SIZE when the src swaps
    between mouth.png / mouth-mid.png / mouth-open.png. Previously the
    mouth was a plain `<img className="w-full">` with no explicit
    height, so its rendered height was whatever each individual PNG's
    own natural aspect ratio produced — if the three frames aren't
    pixel-identical in size (very likely, since they're separate
    exported assets), the image's bottom edge (and, depending on how
    each frame's artwork is centered on its own canvas, the apparent
    position of the drawn mouth shape) shifts every time the frame
    changes, even though the container's `top`/`left` never move.
    Fixed here by measuring mouth.png's OWN natural aspect ratio once
    (it's guaranteed to exist and is never itself animated) and locking
    the mouth's box to that exact size permanently; every frame is then
    rendered with `object-fit: contain` inside that fixed box, so the
    box itself can never resize regardless of what the other frames'
    own dimensions turn out to be. This doesn't touch the mouth's
    position (still driven only by the static P.mouth left/top), any
    existing mouth PNGs, or the mouth-opening logic above — it only
    stops the BOX from silently changing size under the fixed anchor. */
function useMouthBoxSize(width: number): { width: number; height: number } | null {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
      setSize({ width, height: width * ratio });
    };
    img.src = MOUTH_CLOSED;
  }, [width]);

  return size;
}

type Part = { left: number; top: number; width: number; z: number };
type Pivot = { left: number; top: number; z: number };

const spring: Transition = { type: "spring", stiffness: 60, damping: 16, mass: 1.1 };
const smooth: Transition = { duration: 1.1, ease: [0.22, 1, 0.36, 1] };
const fade: Transition = { duration: 0.5, ease: "easeInOut" };

const Slot = ({
  p,
  origin,
  children,
  ...rest
}: {
  p: Part;
  origin: string;
  children: React.ReactNode;
} & React.ComponentProps<typeof motion.div>) => (
  <motion.div
    className="pointer-events-none absolute"
    style={{ left: p.left, top: p.top, width: p.width, zIndex: p.z, transformOrigin: origin }}
    {...rest}
  >
    {children}
  </motion.div>
);

const Img = ({ src, alt = "" }: { src: string; alt?: string }) => (
  <img src={src} alt={alt} className="pointer-events-none block w-full select-none" draggable={false} />
);

const ArmPivot = ({
  p,
  imageLeft,
  imageTop,
  src,
  animate,
  transition,
}: {
  p: Pivot;
  imageLeft: number;
  imageTop: number;
  src: string;
  animate: NonNullable<React.ComponentProps<typeof motion.div>["animate"]>;
  transition: Transition;
}) => (
  <motion.div
    className="pointer-events-none absolute"
    style={{ left: p.left, top: p.top, width: 1, height: 1, zIndex: p.z, transformOrigin: "0 0" }}
    animate={animate}
    transition={transition}
  >
    <div className="absolute" style={{ left: imageLeft, top: imageTop, width: 96 }}>
      <Img src={src} />
    </div>
  </motion.div>
);

const LOOK: Record<LookTarget, { x: number; y: number; head: number }> = {
  viewer: { x: 0, y: 0, head: 0 },
  crown: { x: 11, y: 4, head: 5 },
  shy: { x: -4, y: 8, head: -6 },
  up: { x: 0, y: -8, head: -3 },
  down: { x: 0, y: 9, head: 4 },
  left: { x: -11, y: 0, head: -7 },
  right: { x: 11, y: 0, head: 7 },
  away: { x: 8, y: -6, head: 6 },
};

function IntroBunny({
  phase,
  peekX,
  peekTilt,
  blink,
}: {
  phase: IntroPhase;
  peekX: number;
  peekTilt: number;
  blink: boolean;
}) {
  const headOn = phase !== "hidden";
  const armOn = phase === "wave" || phase === "greeting";

  return (
    <motion.div
      className="relative"
      style={{ width: STAGE_W, height: STAGE_H, transformOrigin: "50% 100%" }}
      animate={{ x: peekX, y: 6, scale: 1, rotate: peekTilt }}
      transition={smooth}
    >
      <AnimatePresence>
        {headOn && (
          <motion.div
            key="intro-head-group"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            <Slot p={P.leftEar} origin="60% 92%">
              <Img src="/bunny/left-ear.png" />
            </Slot>
            <Slot p={P.rightEar} origin="40% 92%">
              <Img src="/bunny/right-ear.png" />
            </Slot>
            <Slot p={P.head} origin="50% 80%">
              <Img src="/bunny/head.png" />
            </Slot>
            <Slot
              p={P.leftPupil}
              origin="50% 50%"
              animate={{ scaleY: blink ? 0.08 : 1 }}
              transition={{ duration: 0.1 }}
            >
              <Img src="/bunny/left-pupil.png" />
            </Slot>
            <Slot
              p={P.rightPupil}
              origin="50% 50%"
              animate={{ scaleY: blink ? 0.08 : 1 }}
              transition={{ duration: 0.1 }}
            >
              <Img src="/bunny/right-pupil.png" />
            </Slot>
            <Slot p={P.mouth} origin="50% 35%">
              <Img src={MOUTH_CLOSED} />
            </Slot>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {armOn && (
          <motion.div
            key="intro-arm-group"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            <ArmPivot
              p={P.rightShoulder}
              imageLeft={-18}
              imageTop={-13}
              src="/bunny/right-arm.png"
              animate={{ rotate: [-104, -118, -104], scale: 1.05 }}
              transition={{ duration: 0.45, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BunnyImpl({
  pose = "idle",
  look = "viewer",
  talking = false,
  talkClockMs,
  walking = false,
  smiling = false,
  holdingCrown = false,
  introPhase,
  peekX,
  peekTilt = 0,
  walkInFrom,
}: Props) {
  const [blink, setBlink] = useState(false);
  // Fallback clock (wall-clock ms) covers any call site that doesn't
  // pass talkClockMs — talking will be false there anyway (IntroBunny
  // never talks), so this value is never actually read in practice.
  const mouthSrc = useMouthFrame(talking, talkClockMs ?? Date.now());
  const mouthBox = useMouthBoxSize(P.mouth.width);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 130);
          loop();
        },
        2200 + Math.random() * 3800,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  if (introPhase) {
    return <IntroBunny phase={introPhase} peekX={peekX ?? 0} peekTilt={peekTilt} blink={blink} />;
  }

  const gaze = LOOK[look];
  const isHug = pose === "hug";
  const isApproach = pose === "approach";
  const isRaise = pose === "raise";
  const isHold = pose === "holdCrown";
  const isLean = pose === "lean";
  const isHoldFrame = pose === "holdFrame";

  const rootAnim = (() => {
    switch (pose) {
      case "offstage":
        return { x: -640, y: 0, scale: 0.95, rotate: 0, opacity: 1 };
      case "walkIn":
        return { x: 0, y: 0, scale: 0.96, rotate: 0, opacity: 1 };
      case "toCrown":
        return { x: 190, y: 0, scale: 0.82, rotate: 0, opacity: 1 };
      case "holdCrown":
        return walking
          ? { x: 0, y: 0, scale: 1.08, rotate: 0, opacity: 1 }
          : { x: 190, y: 0, scale: 0.82, rotate: 0, opacity: 1 };
      case "approach":
        return { x: 0, y: [0, 6, 14, 24] as number[], scale: [1, 1.15, 1.4, 1.65] as number[], rotate: 0, opacity: 1 };
      case "hug":
        return { x: 0, y: 44, scale: 1.75, rotate: 0, opacity: 1 };
      case "release":
        return { x: 0, y: 8, scale: 1.15, rotate: 0, opacity: 1 };
      case "sit":
        return { x: 0, y: 30, scale: 0.88, rotate: 0, opacity: 1 };
      default:
        return { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };
    }
  })();

  const rootTransition: Transition = isApproach
    ? { duration: 3.2, ease: "easeInOut" }
    : isHug
      ? { duration: 1.4, ease: [0.22, 1, 0.36, 1] }
      : pose === "walkIn"
        ? { duration: 3.4, ease: [0.32, 0.72, 0.35, 1] }
        : isHold && walking
          ? { duration: 2.4, ease: [0.32, 0.72, 0.35, 1] }
          : { ...spring };

  const bobAnim = walking
    ? { y: [0, -9, 0, -9, 0], rotate: [0, -1.1, 0, 1.1, 0] }
    : isHug
      ? { y: [0, -5, 0], rotate: [0, 0.6, 0] }
      : { y: [0, -5, 0], rotate: [0, 0.5, 0, -0.5, 0] };
  const bobTransition: Transition = {
    duration: walking ? 0.78 : isHug ? 2.6 : 4.6,
    repeat: Infinity,
    ease: "easeInOut",
  };

  const headTilt =
    pose === "shy" ? -8 : pose === "curious" ? 9 : pose === "surprised" ? -4 : pose === "wave" ? 5 : gaze.head * 0.6;
  const headAnim = {
    rotate: [headTilt - 1.2, headTilt + 1.2, headTilt - 1.2],
    y: pose === "shy" ? 8 : pose === "surprised" ? -6 : 0,
    x: gaze.x * 0.25,
  };

  const earSwing = walking ? 7 : isHug ? 3 : 4;
  const earTransition: Transition = { duration: walking ? 0.78 : 4.2, repeat: Infinity, ease: "easeInOut" };

  /* holdFrame: a purpose-built pose for the (large, scaled/clipped-in
     App.tsx) video scene — see the VIDEO SCENE NOTE at the top of this
     file for why "holdMemory" and "lean" were each wrong for this
     target. Both arms rotate up moderately (less than "raise", more
     than "lean") and scale up slightly less than the crown grip
     ("holdCrown" is 1.4, tuned for a small centered object) so the two
     paws land spread apart near the bottom of App.tsx's clip window —
     left paw toward the left, right paw toward the right — instead of
     crossing over the centerline the way a tighter "grip" rotation
     would. */
  const armLeft = (() => {
    if (isHug) return { rotate: [2, 22, 44, 64] as number[], scale: [1, 1.05, 1.09, 1.11] as number[] };
    if (isApproach) return { rotate: [-6, -30, -58] as number[], scale: 1 };
    if (isRaise) return { rotate: 100, scale: 1.04 };
    if (isHold) return { rotate: 56, scale: 1.4 };
    // holdFrame: reuses the QUESTION SCENE's exact "lean" arm values
    // (not an invented rotation/scale) — see the VIDEO SCENE NOTE above.
    if (isHoldFrame) return { rotate: 62, scale: 1 };
    if (isLean) return { rotate: 62, scale: 1 };
    if (pose === "wave") return { rotate: [120, 152, 120] as number[], scale: 1 };
    if (walking) return { rotate: [-4, 10, -4] as number[], scale: 1 };
    return { rotate: [-2, 4, -2] as number[], scale: 1 };
  })();

  const armRight = (() => {
    if (isHug) return { rotate: [-2, -22, -44, -64] as number[], scale: [1, 1.05, 1.09, 1.11] as number[] };
    if (isApproach) return { rotate: [6, 30, 58] as number[], scale: 1 };
    if (isRaise) return { rotate: -100, scale: 1.04 };
    if (isHold) return { rotate: -56, scale: 1.4 };
    // holdFrame: reuses the QUESTION SCENE's exact "lean" arm values
    // (not an invented rotation/scale) — see the VIDEO SCENE NOTE above.
    if (isHoldFrame) return { rotate: -62, scale: 1 };
    if (isLean) return { rotate: -62, scale: 1 };
    if (pose === "wave") return { rotate: [4, -8, 4] as number[], scale: 1 };
    if (walking) return { rotate: [4, -10, 4] as number[], scale: 1 };
    return { rotate: [2, -4, 2] as number[], scale: 1 };
  })();

  const showHeldCrown = holdingCrown;
  const HELD_CROWN_WIDTH = 220;
  const heldCrownTop = isRaise ? 188 : 375;
  const HELD_CROWN_Z = 4;

  const armTransition: Transition = isHug
    ? { duration: 1.2, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 0.8, 1] }
    : isRaise || isHold || isLean || isHoldFrame
      ? { type: "spring", stiffness: 55, damping: 15 }
      : isApproach
        ? { duration: 3.2, ease: "easeInOut" }
        : {
          duration: pose === "wave" ? 0.6 : walking ? 0.78 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        };

  const legTransition: Transition = { duration: 0.78, repeat: Infinity, ease: "easeInOut" };
  const legIdleTransition: Transition = { duration: 4.6, repeat: Infinity, ease: "easeInOut" };
  const legL = walking ? { rotate: [9, -9, 9] } : { rotate: [0.8, -0.8, 0.8] };
  const legR = walking ? { rotate: [-9, 9, -9] } : { rotate: [-0.8, 0.8, -0.8] };

  const pupil = { x: gaze.x, y: gaze.y, scaleY: blink ? 0.08 : 1 };
  const pupilTransition: Transition = { x: spring, y: spring, scaleY: { duration: 0.1 } };

  return (
    <motion.div
      className="relative"
      style={{ width: STAGE_W, height: STAGE_H, transformOrigin: "50% 100%" }}
      initial={walkInFrom ? { x: walkInFrom.x, y: walkInFrom.y, scale: 1, rotate: walkInFrom.rotate, opacity: 1 } : false}
      animate={rootAnim}
      transition={rootTransition}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 100%" }}
        animate={bobAnim}
        transition={bobTransition}
      >
        <Slot
          p={P.leftEar}
          origin="60% 92%"
          animate={{ rotate: [-earSwing, earSwing * 0.4, -earSwing] }}
          transition={{ rotate: earTransition }}
        >
          <Img src="/bunny/left-ear.png" />
        </Slot>
        <Slot
          p={P.rightEar}
          origin="40% 92%"
          animate={{ rotate: [earSwing, -earSwing * 0.4, earSwing] }}
          transition={{ rotate: earTransition }}
        >
          <Img src="/bunny/right-ear.png" />
        </Slot>

        <Slot
          p={P.body}
          origin="50% 90%"
          animate={{ scaleY: [1, 1.018, 1], scaleX: [1, 0.992, 1] }}
          transition={{ scaleY: legIdleTransition, scaleX: legIdleTransition }}
        >
          <Img src="/bunny/body.png" alt="A soft white plush bunny" />
        </Slot>

        <Slot p={P.leftLeg} origin="50% 8%" animate={legL} transition={{ rotate: walking ? legTransition : legIdleTransition }}>
          <Img src="/bunny/left-leg.png" />
        </Slot>
        <Slot p={P.rightLeg} origin="50% 8%" animate={legR} transition={{ rotate: walking ? legTransition : legIdleTransition }}>
          <Img src="/bunny/right-leg.png" />
        </Slot>

        <AnimatePresence>
          {showHeldCrown && (
            <motion.div
              key="held-crown"
              className="pointer-events-none absolute"
              style={{
                left: 300,
                marginLeft: -HELD_CROWN_WIDTH / 2,
                width: HELD_CROWN_WIDTH,
                zIndex: HELD_CROWN_Z,
                transformOrigin: "50% 70%",
              }}
              initial={{ opacity: 0, top: heldCrownTop + 12, scale: 0.85 }}
              animate={{ opacity: 1, top: heldCrownTop, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 55, damping: 15 }}
            >
              <Img src={CROWN_ASSET} alt="A golden crown held between both hands" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: "50% 60%", zIndex: 5 }}
          animate={headAnim}
          transition={{ rotate: { duration: 4.6, repeat: Infinity, ease: "easeInOut" }, default: spring }}
        >
          <Slot p={P.head} origin="50% 80%" animate={{ scale: [1, 1.006, 1] }} transition={legIdleTransition}>
            <Img src="/bunny/head.png" />
          </Slot>
          <Slot p={P.leftPupil} origin="50% 50%" animate={pupil} transition={pupilTransition}>
            <Img src="/bunny/left-pupil.png" />
          </Slot>
          <Slot p={P.rightPupil} origin="50% 50%" animate={pupil} transition={pupilTransition}>
            <Img src="/bunny/right-pupil.png" />
          </Slot>
          {/* Mouth: position/size come ONLY from P.mouth (fixed above) and
              are never animated — no x/y/scale/rotate on this Slot or its
              container. Only the <Img src> swaps between the three frames
              via mouthSrc, driven purely by useMouthFrame(). This mouth
              naturally moves WITH the head because it's nested inside the
              same headAnim motion.div above, but has zero independent
              motion of its own. */}
          {/* Mouth: position comes ONLY from P.mouth (fixed above) and
              is never animated — no x/y/scale/rotate on this Slot or
              its container. The inner box below is locked to
              mouth.png's own natural aspect ratio (see
              useMouthBoxSize) so it can never resize when mouthSrc
              swaps to mouth-mid.png/mouth-open.png; each frame is
              rendered with object-fit: contain inside that fixed box.
              Only the <img src> itself changes, driven purely by
              useMouthFrame(). */}
          <Slot p={P.mouth} origin="50% 35%">
            <div style={{ width: P.mouth.width, height: mouthBox?.height, position: "relative" }}>
              <img
                src={mouthSrc}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 block h-full w-full select-none"
                style={{ objectFit: "contain" }}
              />
            </div>
          </Slot>
        </motion.div>

        <ArmPivot
          p={P.leftShoulder}
          imageLeft={-79}
          imageTop={-13}
          src="/bunny/left-arm.png"
          animate={armLeft}
          transition={armTransition}
        />
        <ArmPivot
          p={P.rightShoulder}
          imageLeft={-18}
          imageTop={-13}
          src="/bunny/right-arm.png"
          animate={armRight}
          transition={armTransition}
        />
      </motion.div>
    </motion.div>
  );
}

/** MOBILE PERF FIX (general lag): App.tsx's single rAF clock updates
    `elapsed` every animation frame, which by default re-renders this
    entire component (and its many motion.div children) 60 times a
    second even during long stretches where nothing about the bunny
    actually needs to change — most phases aren't talking, so the new
    clock-driven mouth (see useMouthFrame above) doesn't need a fresh
    `talkClockMs` on every one of those renders either. This comparator
    skips the re-render whenever every prop that could actually change
    the visible output is unchanged — except it deliberately keeps
    re-rendering every frame while `talking` is true, since that's
    exactly when a fresh `talkClockMs` is what drives the mouth. Nothing
    about the visual design, timing, or behavior changes — this only
    removes redundant renders where the output would've been pixel
    identical anyway. */
function bunnyPropsAreEqual(prev: Props, next: Props): boolean {
  if (prev.talking !== next.talking) return false;
  if (next.talking && prev.talkClockMs !== next.talkClockMs) return false;
  return (
    prev.pose === next.pose &&
    prev.look === next.look &&
    prev.walking === next.walking &&
    prev.smiling === next.smiling &&
    prev.holdingCrown === next.holdingCrown &&
    prev.introPhase === next.introPhase &&
    prev.peekX === next.peekX &&
    prev.peekTilt === next.peekTilt &&
    prev.walkInFrom === next.walkInFrom
  );
}

const Bunny = memo(BunnyImpl, bunnyPropsAreEqual);
export default Bunny;