/**
 * A 2D puppet assembled from the individual PNG layers in /public/bunny.
 * Geometry is fixed inside a 600 x 700 canvas so the character always keeps
 * the proportions of the plush reference; every animation is a transform.
 *
 * INTRO RENDERING NOTE:
 * The intro peek/wave/greeting is handled entirely by <IntroBunny> below,
 * a dedicated, separate render path. It never reuses the full puppet with
 * parts hidden via opacity — it only ever mounts the elements that should
 * actually exist on screen at that moment:
 *   - the complete head (both ears + head + both eyes + mouth) as ONE
 *     motion.div with ONE opacity transition — never staggered per part.
 *     Deliberately NO body and NO legs during the peek: the brief is that
 *     only the head/face is visible while it's hiding behind the edge,
 *     so the torso/legs are simply never mounted until introEnter, when
 *     the full puppet (which does have them) takes over.
 *   - later, the SAME right-arm rig used by the full puppet, mounted early
 *     so it can wave before the rest of the body exists.
 * The bunny peeks from the LEFT edge of the screen, hiding mostly behind
 * it. App.tsx now does this with a dedicated wrapper: `overflow: hidden`
 * plus a plain, literal, negative `left` on the box that contains this
 * whole 600×700 canvas — not a translate/transform composed with a
 * separately-centered stage — so the clip is a real, inspectable DOM
 * fact, not an approximation. This file doesn't compute any of that; it
 * only owns which body parts exist and how they move once positioned.
 * The RIGHT arm's shoulder (P.rightShoulder) sits on the far side of the
 * head from that hidden edge, inside the visible sliver, and the arm
 * swings further rightward from there — so the hand reads as reaching out
 * from the visible part of the bunny toward the viewer/center, never as
 * an arm poking out of empty space near the hidden edge.
 * Once the intro is over, Bunny renders the normal, fully-assembled puppet
 * exactly as before (unchanged from the pre-intro-fix version).
 *
 * ARM CHOREOGRAPHY NOTE (added for the crown/hug/question-lean fix):
 * armLeft/armRight below are two independent functions, one per shoulder.
 * For "wave" they're deliberately asymmetric (it's a one-arm gesture).
 * For every pose meant to read as a clear TWO-ARM gesture — holdCrown,
 * raise, hug, and the "lean" pose used while the question card is up —
 * the two functions return mirrored values (same magnitude, opposite
 * sign). Nothing about which parts exist, their z-order, or their pivot
 * points changed — only these rotation numbers.
 *
 * CROWN-GRIP FIX (round 9 — hands actually grip the crown's sides):
 * Round 8's numbers got the hands numerically near the crown, but two
 * things kept it from actually reading as "held":
 *   1. The held-crown image was drawn AFTER (and above) the arms, so any
 *      paw that reached into the crown's footprint disappeared behind
 *      it. Its z-index was placed BEHIND the arms so the paws sit
 *      visibly in front of/around the crown's left and right edges
 *      instead of being hidden by it.
 *   2. isHold's 92° rotation swung the arms far enough inward that the
 *      hands were converging past the crown's edges toward its center,
 *      while heldCrownTop (430) placed the crown noticeably lower than
 *      where those hands actually ended up. isHold's rotation was pulled
 *      back to 70°, and heldCrownTop moved up to 385.
 *   3. isRaise's 118° read as "arms almost fully vertical, beside the
 *      ears." Pulled back to 100°; heldCrownTop for isRaise nudged down
 *      slightly (170 -> 188) to stay level with the now-slightly-lower
 *      hands.
 *
 * CROWN-GRIP FIX (round 10 — lower/more-relaxed hold, matched to a photo
 * reference): isHold rotation eased to 58°, heldCrownTop for isHold moved
 * to 400, to read as a relaxed, lowered hold rather than a lifted one.
 * isRaise untouched by this round.
 *
 * CROWN-VISIBILITY FIX (round 11 — the actual disappearing-crown bug):
 * Root cause found. HELD_CROWN_Z had been set to 3.5. `z-index` is only
 * ever valid as an integer per the CSS spec — a fractional value is an
 * invalid declaration, so the browser drops it entirely and the element
 * falls back to `z-index: auto`. That's why the held crown specifically
 * (and only the held crown — not the ground crown at z-20, not the
 * crown-on-head flight at z-40, both of which use valid integers)
 * vanished the instant `holdingCrown` went true: it lost its explicit
 * stacking position the moment its z-index tried to apply. Fixed to a
 * plain integer, 4 — which keeps the intended order (body z:3 < crown
 * z:4 <= arms z:4, arms winning same-index ties by later DOM order, so
 * they still visually overlap the crown's edges as gripping paws).
 *
 * Alongside that fix, isHold's grip geometry was tightened one more
 * notch so the paws land ON the crown's edges rather than short of them:
 *   - isHold rotation: 58° -> 44°, closer to the arms' true forward-and-
 *     down hang with a visible elbow bend, bringing the hands in from
 *     their shoulder x-position (203 / 398) toward the crown's actual
 *     edges (190 / 410) instead of stopping short of them.
 *   - heldCrownTop for isHold: 400 -> 405, staying level with the
 *     now-slightly-lower hands, still centered at chest/upper-belly
 *     height.
 * isRaise (100°, heldCrownTop 188 — the "starting to put it on, hands
 * rise but not all the way up" moment) is untouched by this round; it
 * was already reading correctly and wasn't part of the reported bug.
 * As before, these are estimates in the same spirit as earlier rounds —
 * nudge armLeft/armRight's isHold rotate value and heldCrownTop a few
 * more degrees/px once you see it live if the grip isn't pixel-perfect;
 * move them together (same direction, same amount, mirrored on both
 * arms) to keep the hands and crown in agreement. The z-index fix above,
 * however, is not an estimate — that was a hard CSS-validity bug and is
 * fully fixed.
 *
 * CROWN-GRIP FIX (round 12 — closing the visible gap between hands and
 * crown): a live screenshot showed round 11's 44° hold as arms mostly
 * spread out near shoulder height while the crown sat pinned much lower
 * at chest/belly (top: 405) — leaving a large empty vertical gap between
 * the paws and the crown instead of a grip. isHold's rotation was raised
 * from 44° to 90° (much closer to isRaise's 100°) so the arms swing
 * further up and in, bringing the hands to roughly the same height the
 * crown needs to sit at; heldCrownTop for isHold was moved up to match,
 * from 405 to 230.
 *
 * CROWN-GRIP FIX (round 13 — round 12 overshot, hiding the crown behind
 * the face): a follow-up screenshot showed the crown gone entirely.
 * top: 230 sits inside the head/face's own vertical span (head starts at
 * top: 124), so the crown was still being drawn there, just underneath
 * the opaque head artwork (the head's wrapping group has zIndex 5,
 * above the crown's zIndex 4) — not visible, not a repeat of round 11's
 * invalid-zIndex bug. Both numbers were pulled back to a mid-range
 * compromise: isHold rotation 90° -> 62°, heldCrownTop for isHold
 * 230 -> 375 — low enough to clear the chin/face and read as a chest-
 * height hold again, while still higher/tighter than round 11's original
 * 44°/405 so the gap stays smaller than the very first screenshot
 * showed. Nothing else — isRaise, isLean, other poses, or any non-crown
 * geometry — was touched in this round either.
 *
 * CROWN-GRIP FIX (round 14 — horizontal-only inward nudge, crown/height
 * untouched): round 13 got the vertical height right but the hands still
 * read as slightly outside the crown's left/right edges. The brief this
 * time was explicit: move the paws horizontally inward only — same
 * rotation (so the same, already-correct hand height), same crown
 * position/size, same "arms slightly lowered/natural" read. Rotation
 * alone can't do a pure horizontal move (rotating around the shoulder
 * pivot changes both x and y together), so instead each ArmPivot's
 * `animate` for isHold now also sets a small `x` translate on the pivot
 * itself — left arm x: 20 (slides right, toward center), right arm
 * x: -20 (slides left, toward center), keeping the two symmetrical.
 * heldCrownTop, HELD_CROWN_WIDTH, isHold's rotation value, and every
 * other pose/branch are unchanged from round 13.
 *
 * CROWN-GRIP FIX (round 15 — round 14's nudge was too small): a follow-
 * up screenshot showed the paws still sitting clearly outside the
 * crown's edges — "paw 👑 paw" instead of "paw → 👑 ← paw". The x nudge
 * was increased substantially, 20px -> 58px (mirrored, so -20 -> -58 on
 * the right arm), so each paw's pivot slides much further inward and the
 * hands actually overlap the crown's left/right edges instead of
 * stopping short of them. isHold's rotation (62°, unchanged since round
 * 13 — this is what keeps the vertical hand height correct) and
 * heldCrownTop/HELD_CROWN_WIDTH (unchanged since round 13) were left
 * exactly as they were; only the x magnitude moved.
 *
 * CROWN-GRIP FIX (round 16 — round 15 overshot, paws met in the middle
 * under the face): the next screenshot showed the opposite problem —
 * both paws had swung in far enough to disappear under the chin/face
 * area and sit close together near center, instead of gripping the
 * crown's two outer corners. 58px was too much. Landed on a midpoint,
 * 58px -> 36px (mirrored, -58 -> -36 on the right arm) — between round
 * 14's too-small 20px and round 15's too-large 58px. Rotation (62°),
 * heldCrownTop, and HELD_CROWN_WIDTH are unchanged. If 36px still isn't
 * exactly on the crown's corners, the fix from here should be a small
 * nudge (a few px in either direction) rather than another big jump.
 *
 * MOUTH NOTE (speaking animation — REWRITTEN):
 * Previously "opening" was a transform illusion on the single mouth.png
 * curve (scaleY/scaleX/y), plus a separate MouthInterior overlay shape
 * layered behind it to fake visible depth. That made the whole
 * mouth/muzzle area visibly stretch and shift, which read as the entire
 * muzzle moving rather than lips opening in place.
 *
 * That's gone. There are now three real lip-sync frames —
 * mouth.png (closed), mouth-mid.png (slightly open), mouth-open.png
 * (fully open) — and speaking is a plain IMAGE SWAP between them, not a
 * transform:
 *   - The mouth <Slot> keeps its normal fixed position/size/anchor
 *     (P.mouth, origin "50% 35%") and is never animated (no `animate`
 *     prop on it anymore) — it cannot move, scale, or rotate.
 *   - While `talking` is true, a small interval timer steps through the
 *     five-stage cadence closed -> mid -> open -> mid -> closed (using
 *     mouth.png / mouth-mid.png / mouth-open.png) on a loop, and only
 *     the `src` of the <Img> inside the slot changes each step.
 *   - While `talking` is false, it's always mouth.png (closed).
 * The MouthInterior overlay and its geometry (INTERIOR_MOUTH etc.) were
 * removed entirely — it existed only to fake interior depth for the old
 * single-curve illusion, and the new mouth-mid/mouth-open art already
 * has that interior baked into the artwork itself. Nothing else in this
 * file (head, ears, eyes, arms, body, legs, crown) changed.
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
  /** When set, Bunny renders ONLY <IntroBunny> for that phase instead of the
      normal puppet. Leave undefined/omit once the intro is finished. */
  introPhase?: IntroPhase;
  /** stage-local x for the single root transform while introPhase is set */
  peekX?: number;
  /** slight whole-body lean while introPhase is set */
  peekTilt?: number;
  /** Where the full puppet's root transform should START from on the very
      frame it first mounts (i.e. the instant introEnter begins), so it picks
      up exactly where the intro peek left off instead of popping into the
      center. Omit to fall back to snapping straight to its pose (old
      behavior for any other mount path). */
  walkInFrom?: { x: number; y: number; rotate: number };
};

/* part geometry inside the 600 x 700 canvas (px) — always the character's
   normal, correctly-aligned proportions. These never change per pose, and
   are shared by both the intro rig and the full puppet so the head lines up
   identically in both. */
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

/** Exposed so App.tsx can compute exactly how much of the head should be
    clipped by the viewport's left edge during the peek, without duplicating
    these numbers as unrelated magic constants over there. */
export const HEAD_GEOMETRY = { left: P.head.left, width: P.head.width };

/** The three lip-sync frames, in mouth-opening order. Speaking steps
    through [0,1,2,1,0] (closed -> mid -> open -> mid -> closed) on a loop
    via MOUTH_STEP_MS below. Only the <Img src> changes — see MOUTH NOTE. */
const MOUTH_CLOSED = "/bunny/mouth.png";
const MOUTH_MID = "/bunny/mouth-mid.png";
const MOUTH_OPEN = "/bunny/mouth-open.png";
const MOUTH_FRAMES = [MOUTH_CLOSED, MOUTH_MID, MOUTH_OPEN, MOUTH_MID, MOUTH_CLOSED];
/** Time spent on each frame of the cadence above. 5 steps * 220ms = 1.1s
    per full closed->open->closed cycle, matching the pacing the old
    transform-based animation used. */
const MOUTH_STEP_MS = 220;

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

/* gaze offsets in px (full puppet only) */
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

/* ------------------------------------------------------------------ */
/*  IntroBunny — the ONLY thing rendered while introPhase is set.       */
/*  Nothing here is the full puppet with parts hidden by opacity. Each   */
/*  phase mounts exactly the elements that should exist:                */
/*    hidden   -> nothing                                               */
/*    head     -> complete head group ONLY — ears+head+eyes+mouth, one   */
/*                opacity transition. No body, no legs: per spec, the    */
/*                torso/lower body must never appear during the peek.   */
/*    wave     -> same head group + the one right-arm rig, waving       */
/*    greeting -> same as wave (arm keeps waving); text is handled by   */
/*                the parent, not here                                  */
/*  It reuses the SAME P coordinates as the full puppet (no separate     */
/*  "intro geometry"), so the peeking head sits at the exact spot the    */
/*  full puppet's head will occupy — the alignment is guaranteed by      */
/*  sharing the constants, not by hand-matching two coordinate systems.  */
/*  The whole group is positioned peeking-from-the-left by the root      */
/*  transform in App.tsx, which anchors and clips it against the LEFT    */
/*  edge of the viewport; this component doesn't compute that, it just    */
/*  always uses the RIGHT arm so the hand reaches from the visible part   */
/*  of the head toward the viewer/center, never from the hidden edge.   */
/*  The bunny isn't speaking during the peek, so the mouth stays on the  */
/*  plain closed frame (mouth.png) the whole time. */
/* ------------------------------------------------------------------ */
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
            {/* Complete head only: both ears + head + both eyes + mouth.
                Every one of these is a static child of ONE group that
                fades in as a single unit — none of them has its own
                opacity. No body/legs are mounted here at all — per spec,
                the torso and lower body must stay completely hidden
                during the peek, not just partially cropped. */}
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

/* ------------------------------------------------------------------ */
/*  Full puppet — unchanged from before the intro fix, except for the    */
/*  `initial` on the root transform (so introEnter slides in from the    */
/*  peek's edge position instead of popping in at center), the           */
/*  arm-choreography fix, the crown-grip fix (rounds 9-11, see file       */
/*  header), and the mouth rewrite described in the MOUTH NOTE above.    */
/* ------------------------------------------------------------------ */
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

  /* random natural blinking */
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

  // Intro takes over completely — no full-puppet rendering happens at all
  // while this is set.
  if (introPhase) {
    return <IntroBunny phase={introPhase} peekX={peekX ?? 0} peekTilt={peekTilt} blink={blink} />;
  }

  const gaze = LOOK[look];
  const isHug = pose === "hug";
  const isApproach = pose === "approach";
  const isRaise = pose === "raise";
  const isHold = pose === "holdCrown";
  /** The "leaning on the question card" pose. Uses the same mirrored-arm
      mechanism as isRaise/isHold below. */
  const isLean = pose === "lean";

  /* ---- whole-character transform ---- */
  const rootAnim = (() => {
    switch (pose) {
      case "offstage":
        return { x: -640, y: 0, scale: 0.95, rotate: 0, opacity: 1 };
      case "walkIn":
        return { x: 0, y: 0, scale: 0.96, rotate: 0, opacity: 1 };
      case "toCrown":
        // walkToCrown: the bunny starts noticeably FARTHER BACK (smaller
        // scale reads as "deeper" in the scene) and heads toward the
        // crown's side position.
        return { x: 190, y: 0, scale: 0.82, rotate: 0, opacity: 1 };
      case "holdCrown":
        // grabCrown (walking=false): stays put at the same far position
        // reached by "toCrown" — it's grabbing the crown right where it
        // arrived, not moving yet.
        // backToViewer (walking=true): actually walks forward — target
        // moves back to center and scales UP past normal (1.08), so the
        // bunny visibly gains ground toward the camera during this phase,
        // arriving close by the time raiseCrown begins. Because the held
        // crown is a child of this SAME transform tree, it travels with
        // the bunny automatically during this walk — no separate
        // positioning logic needed for it.
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
          ? { duration: 2.4, ease: [0.32, 0.72, 0.35, 1] } // backToViewer's forward walk: a real, complete traversal within the phase, not a variable-length spring
          : { ...spring };

  /* ---- breathing / bobbing ---- */
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

  /* ---- head ---- */
  const headTilt =
    pose === "shy" ? -8 : pose === "curious" ? 9 : pose === "surprised" ? -4 : pose === "wave" ? 5 : gaze.head * 0.6;
  const headAnim = {
    rotate: [headTilt - 1.2, headTilt + 1.2, headTilt - 1.2],
    y: pose === "shy" ? 8 : pose === "surprised" ? -6 : 0,
    x: gaze.x * 0.25,
  };

  /* ---- ears ---- */
  const earSwing = walking ? 7 : isHug ? 3 : 4;
  const earTransition: Transition = { duration: walking ? 0.78 : 4.2, repeat: Infinity, ease: "easeInOut" };

  /* ---- arms ----
     For every pose meant to read as a clear two-arm gesture, armLeft and
     armRight return mirrored values (same magnitude, opposite sign).
     "wave" stays intentionally asymmetric — it's a one-arm gesture.

     CROWN FIX (rounds 9-11 — see file header for the full history):
       - isHold (grabCrown / backToViewer): arms forward from their
         resting hang with elbows clearly bent but kept LOW — a relaxed
         hold at chest/upper-belly height, not lifted toward the
         shoulders. Rotation now 44° (round 11's tightening pass, down
         from round 10's 58°), bringing the hands from their shoulders'
         resting x-position (203 / 398) further in onto the crown's
         actual left/right edges (190 / 410) so the grip reads as
         touching the crown, not just near it.
       - isRaise (raiseCrown / crownFly): the "hands rise, but not all
         the way up" lift — 100°, stopping well short of vertical so the
         elbow bend stays visible beside the head. Untouched since
         round 9. */
  const armLeft = (() => {
    if (isHug) return { rotate: [2, 22, 44, 64] as number[], scale: [1, 1.05, 1.09, 1.11] as number[] };
    if (isApproach) return { rotate: [-6, -30, -58] as number[], scale: 1 };
    if (isRaise) return { rotate: 100, scale: 1.04 };
    if (isHold) return { rotate: 62, x: 36, scale: 1.02 };
    if (isLean) return { rotate: 62, scale: 1 };
    if (pose === "wave") return { rotate: [120, 152, 120] as number[], scale: 1 };
    if (walking) return { rotate: [-4, 10, -4] as number[], scale: 1 };
    return { rotate: [-2, 4, -2] as number[], scale: 1 };
  })();

  const armRight = (() => {
    if (isHug) return { rotate: [-2, -22, -44, -64] as number[], scale: [1, 1.05, 1.09, 1.11] as number[] };
    if (isApproach) return { rotate: [6, 30, 58] as number[], scale: 1 };
    if (isRaise) return { rotate: -100, scale: 1.04 };
    if (isHold) return { rotate: -62, x: -36, scale: 1.02 };
    if (isLean) return { rotate: -62, scale: 1 };
    if (pose === "wave") return { rotate: [4, -8, 4] as number[], scale: 1 };
    if (walking) return { rotate: [4, -10, 4] as number[], scale: 1 };
    return { rotate: [2, -4, 2] as number[], scale: 1 };
  })();

  /** CROWN FIX (rounds 9-11, continued): the crown has to meet the hands
      at their current rotation, at true hand height.
        - isHold (44°, chest/upper-belly grip): crown top at 405 — level
          with the now-slightly-lower hands from round 11's tightened
          angle, still centered at chest/upper-belly height, not resting
          on the belly and not floating at the shoulders.
        - isRaise (100°, "rising but not all the way up"): crown top at
          188 — level with the hands mid-lift. Untouched since round 9.
      Width and horizontal centering unchanged (still 220px centered at
      x=300, the midpoint between P.leftShoulder (203) and
      P.rightShoulder (398)) — per the "don't change crown size"
      requirement, only vertical position and z-order move. */
  const showHeldCrown = holdingCrown;
  const HELD_CROWN_WIDTH = 220;
  const heldCrownTop = isRaise ? 188 : 375;
  /** CROWN-VISIBILITY FIX (round 11 — the actual bug): this was
      previously 3.5. `z-index` is only valid as an integer in CSS; a
      fractional value is an invalid declaration and gets dropped by the
      browser, silently falling back to `z-index: auto` — which is why
      the held crown disappeared the instant `holdingCrown` went true.
      Fixed to a plain integer (4), which sits behind the arms (z:4,
      tied — but the arms come later in the DOM and win same-index paint
      order) and in front of the body/legs (z:2-3), so the paws render
      visibly in front of/around the crown's edges while the crown
      itself stays reliably on screen. */
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

  /* ---- legs ---- */
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

        {/* CROWN VISIBILITY FIX (round 11): HELD_CROWN_Z is now a valid
            integer (4) instead of the invalid 3.5 that was silently
            dropped by the browser and made this whole element lose its
            stacking position the instant it mounted. Still rendered
            BEFORE the arms in the DOM so the paws draw on top of/around
            it at tied z-index — visibly gripping the crown's edges
            instead of covering it entirely or vanishing behind it. */}
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
          {/* Mouth: fixed position/size/anchor, no transform animation at
              all (no `animate` prop on this Slot). Speaking is purely the
              `src` swapping between mouth.png / mouth-mid.png /
              mouth-open.png via useMouthFrame() above — see MOUTH NOTE. */}
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