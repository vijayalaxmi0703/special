/**
 * (unchanged header — see previous rounds; only the MOUTH NOTE gets one
 * more addition below.)
 *
 * MOUTH NOTE (speaking animation — REWRITTEN, + MOBILE PRELOAD FIX):
 * Previously "opening" was a transform illusion on the single mouth.png
 * curve (scaleY/scaleX/y). That's gone — speaking is a plain image swap
 * between mouth.png (closed), mouth-mid.png (slightly open), and
 * mouth-open.png (fully open), driven by useMouthFrame() below.
 *
 * MOBILE FIX: the swap logic itself has no mouse/hover/desktop-only
 * dependency — it's a plain setInterval + src change, which works
 * identically on touch devices. The actual bug is that nothing ever
 * touched mouth-mid.png / mouth-open.png before the first time
 * `talking` goes true. On a fast local/dev network that first fetch is
 * invisible; on a real mobile network it can land AFTER its 220ms frame
 * window has already passed, making swaps look skipped or the mouth
 * look stuck closed. The fix is a plain, one-time image preload for all
 * three frames at module load (guarded for SSR), so every device has
 * them decoded and cached well before the bunny ever starts talking —
 * nothing about the animation mechanism itself changed.
 */
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { useEffect, useState } from "react";

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
    via MOUTH_STEP_MS below. Only the <Img src> changes — see MOUTH NOTE. */
const MOUTH_CLOSED = "/bunny/mouth.png";
const MOUTH_MID = "/bunny/mouth-mid.png";
const MOUTH_OPEN = "/bunny/mouth-open.png";
const MOUTH_FRAMES = [MOUTH_CLOSED, MOUTH_MID, MOUTH_OPEN, MOUTH_MID, MOUTH_CLOSED];
const MOUTH_STEP_MS = 220;

/** MOBILE PRELOAD FIX: fetch/decode all three mouth frames once, as
    soon as this module loads, instead of leaving the browser to
    request mouth-mid.png / mouth-open.png for the first time on the
    bunny's first spoken word. Guarded for SSR (no `window` on the
    server) exactly like computeFit() elsewhere in this codebase does.
    Doesn't change what's shown or when — purely ensures the assets are
    already cached by the time useMouthFrame() below starts swapping
    between them, on any device/network. */
if (typeof window !== "undefined") {
  [MOUTH_CLOSED, MOUTH_MID, MOUTH_OPEN].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

/** Hook: returns the mouth image src to show right now. Advances through
    MOUTH_FRAMES on an interval while `talking` is true; snaps back to (and
    stays on) the closed frame the instant `talking` goes false. This is
    the entire "speaking animation" — no transforms involved. */
function useMouthFrame(talking: boolean): string {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!talking) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % MOUTH_FRAMES.length);
    }, MOUTH_STEP_MS);
    return () => clearInterval(id);
  }, [talking]);

  return talking ? MOUTH_FRAMES[frame]! : MOUTH_CLOSED;
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
            <Slot p={P.leftEar} origin="60% 92%" animate={{ rotate: 0 }}>
              <Img src="/bunny/left-ear.png" />
            </Slot>
            <Slot p={P.rightEar} origin="40% 92%" animate={{ rotate: 0 }}>
              <Img src="/bunny/right-ear.png" />
            </Slot>
            <Slot p={P.head} origin="50% 80%" animate={{ scale: 1 }}>
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

export default function Bunny({
  pose = "idle",
  look = "viewer",
  talking = false,
  walking = false,
  smiling = false,
  holdingCrown = false,
  introPhase,
  peekX,
  peekTilt = 0,
  walkInFrom,
}: Props) {
  const [blink, setBlink] = useState(false);
  const mouthSrc = useMouthFrame(talking);

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

  const armLeft = (() => {
    if (isHug) return { rotate: [2, 22, 44, 64] as number[], scale: [1, 1.05, 1.09, 1.11] as number[] };
    if (isApproach) return { rotate: [-6, -30, -58] as number[], scale: 1 };
    if (isRaise) return { rotate: 100, scale: 1.04 };
    if (isHold) return { rotate: 56, scale: 1.4 };
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
    : isRaise || isHold || isLean
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
              <Img src="/crown.png" alt="A golden crown held between both hands" />
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
          <Slot p={P.mouth} origin="50% 35%">
            <Img src={mouthSrc} />
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