import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import Bunny, { HEAD_GEOMETRY, STAGE_H, STAGE_W, type BunnyPose, type IntroPhase, type LookTarget } from "./Bunny";
import { Background, CrownGlow, Dialogue } from "./Scenery";
import QuestionCard from "./QuestionCard";
import { track } from "./analytics";

/** 🚨 No teacher name was present anywhere in the project files or
    prompts I was given, and the brief is explicit not to invent one —
    so this is the one placeholder in the whole file. Fill in the real
    name before shipping; everything else (the "Dr." reveal card) reads
    from this single constant. */
const TEACHER_NAME = "Sirisha";

export const DIALOGUE_LINES: string[] = [
  "Hi Mam... 😊",
  "How are u?",
  "I hope you're doing well.",
  "I just wanted to say a few things to you ..",
  "So please bear with me for just a few minutes😅.",
   "mam i could have just wished u today but..",
  "I have spent days coding this for u cuz ...",
  "I just wanted u to feel special today and hopefully make u smile a little",
  
];

export const HUG_LINES: string[] = [
  "Thank you...",
  "...for being such a wonderful teacher. ❤️",
  "I hope you always know how much you are appreciated.",
];

/* The full compliment question. Defined once, shared by the caption
  fallback (for when someone scrubs back to relive an already-answered
  moment) and by <QuestionCard> (for the live, unanswered moment) — so
  the two can never drift into showing different wording. */
const QUESTION_TEXT = "I believe you are one of the best lecturers a student could ask for. Do you agree?";

/**
 * PEEK POSITIONING — LITERAL LEFT/OVERFLOW-HIDDEN CLIP
 * (unchanged from the original — see Bunny.tsx for the full derivation.
 * Kept verbatim so the existing peek/wave/greeting scene is pixel-
 * identical to before.)
 */
const PEEK_VISIBLE_FRACTION = 0.72;
const HEAD_RIGHT = HEAD_GEOMETRY.left + HEAD_GEOMETRY.width; // 460
const computeLeftHidden = (fitVal: number) => -fitVal * (STAGE_W + 200);
const computeLeftVisible = (fitVal: number) => -fitVal * (HEAD_RIGHT - PEEK_VISIBLE_FRACTION * HEAD_GEOMETRY.width);
const PEEK_TILT = -4;
const peekTransition = { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const };

/* ================================================================== *
* VIRTUAL TIMELINE
*
* Same architecture as before: everything on screen is a pure function
* of one number, `elapsed`. Autoplay increments it every frame; the
* hidden nav adds/subtracts from it; the question gate simply caps how
* far forward it's allowed to go until answered.
*
* READING-TIME FIX: every caption used to hold for a flat 2000ms
* regardless of length. That fixed duration is gone. Instead, each
* phase's line array (TEXT_LINES) is run through `buildPhaseLines()`,
* which gives every individual line its own duration via
* `readDuration()` — longer sentences hold longer, short ones don't
* linger — and a phase's total duration in FLOW_DURATIONS is just the
* sum of its lines' durations. This is still entirely inside the same
* resolveTimeline() pass over TIMELINE; there is no separate per-message
* setTimeout anywhere. `hug` is now folded into this exact same
* mechanism too (it used to be a bespoke special case with two hardcoded
* beat offsets) — one less special case, same underlying idea.
* ================================================================== */

/** How long a single caption holds, purely as a function of its own
    character count — longer sentences get more time, short ones don't
    linger. Calibrated against the examples in the brief:
      ~25 chars  -> ~3.0s   ("This one is just for you.")
      ~49 chars  -> ~3.9s   ("Congratulations on your postgraduate...")
      ~104 chars -> ~6.2s   ("Seeing you manage so much...")
      ~113 chars -> ~6.5s   ("Managing college, your studies...")
    Clamped to a floor (so a two-word line doesn't vanish instantly) and
    a ceiling (so nothing holds indefinitely). */
const READ_BASE_MS = 2000;
const READ_MS_PER_CHAR = 40;
const READ_MIN_MS = 2500;
const READ_MAX_MS = 9000;

function readDuration(text: string): number {
  const raw = READ_BASE_MS + text.length * READ_MS_PER_CHAR;
  return Math.max(READ_MIN_MS, Math.min(READ_MAX_MS, raw));
}

/** A sentinel value inside a TEXT_LINES array: when the current line
    equals this, App.tsx renders the special "Dr. [Name]" reveal card
    instead of the normal bottom caption for that beat. Never shown as
    literal text. Given a fixed, slightly-generous hold (a deliberate,
    designed pause for that one emotional beat) rather than running the
    sentinel string itself through readDuration(). */
const NAME_CARD = "__NAME_CARD__";
const NAME_CARD_HOLD_MS = 3200;

/** Every phase that's "hold a caption, then move to the next line" maps
    here — this is the single source of both the text shown during a
    phase (App.tsx's dialogueLine computation) and, via
    buildPhaseLines()/readDuration(), how long that phase lasts. `hug` is
    included now too (previously handled separately with hardcoded beat
    offsets). `questionActive` is deliberately NOT in this map — it isn't
    a caption at all, it's a gate (see `answered` below). */
const TEXT_LINES: Partial<Record<string, string[]>> = {
  talk: DIALOGUE_LINES,
  questionSetup: ["Mam, I have a very important question…"],
  yesAffirm: ["Yes… it's true. ✨", "You are valued, appreciated, and remembered more than you know.. 🌷"],
  teacherImpact: [
    "In my eyes ur the sweetest, kindest, greatest and most amazing person💕🥰",
    "Your words, your patience, and the encouragement you give can stay with someone for a long time.",
  ],
  pgCongrats: [
    "And Mam… there's something else I want to congratulate you for.",
    "Congratulations on your postgraduate journey. 🎓",
    'Balancing your studies, college, and everything you manage at home is no small achievement.',
    "Seeing you manage so much and still keep moving forward inspires me to work harder and do better too. ✨",
    "I hope you’re always proud of how much you’re accomplishing, even on the days when it feels difficult."
  ],
  restMessage: [
    "It must get exhausting sometimes isnt it…",
    "So please remember to take some time for yourself too. ",
  ],
  drMoment: [
    "And someday…",
    NAME_CARD,
    "I can't wait to see 'Dr.' before your name. 😊",
    "Until then, I'll be quietly cheering for you. 🤍",
  ],
  preCrown: ["And for everything you do…", "you deserve this mam. 👑"],
  crownFly: ["There… Now that looks perfect.Exactly where it belongs."],
  finalAffirmation: [
    "So please remember…",
    "The little things you do may mean more to your students than you'll ever know. ✨",
    "Thank you for being someone worth looking up to. 🌷",
  ],
  preHug: ["And this one is just for you. 🤍"],
  hug: HUG_LINES,
};

/** A floor on a phase's TOTAL duration, applied by stretching its last
    line's hold time if the natural reading-time sum falls short. Only
    crownFly needs this: its one caption is short, but the phase's
    duration also has to cover the existing crown-fly visual (the flying
    crown image's 1.8s transition plus its glow/sparkle) — the caption
    text and the visual duration are two different concerns that happen
    to share this one phase. The 4600 here is the ORIGINAL fixed value
    this phase used before this change, kept as a minimum so the crown
    moment can't get cut shorter than it already was, even though its
    caption alone would only need ~4s. */
const PHASE_MIN_TOTAL_MS: Partial<Record<string, number>> = { crownFly: 4600 };

type LineSeg = { text: string; start: number; end: number };
type PhaseLines = { lines: LineSeg[]; total: number };

function buildPhaseLines(phaseKey: string, lines: string[]): PhaseLines {
  let t = 0;
  const segs: LineSeg[] = lines.map((text) => {
    const dur = text === NAME_CARD ? NAME_CARD_HOLD_MS : readDuration(text);
    const seg: LineSeg = { text, start: t, end: t + dur };
    t += dur;
    return seg;
  });
  const minTotal = PHASE_MIN_TOTAL_MS[phaseKey];
  if (minTotal && t < minTotal && segs.length > 0) {
    segs[segs.length - 1]!.end += minTotal - t;
    t = minTotal;
  }
  return { lines: segs, total: t };
}

const PHASE_LINES: Partial<Record<string, PhaseLines>> = Object.fromEntries(
  Object.entries(TEXT_LINES).map(([phase, lines]) => [phase, buildPhaseLines(phase, lines!)]),
);

const findLineIndex = (pl: PhaseLines, into: number): number => {
  for (let i = 0; i < pl.lines.length; i++) {
    if (into < pl.lines[i]!.end) return i;
  }
  return Math.max(0, pl.lines.length - 1);
};

/** Nominal duration for the "questionActive" phase on the timeline. Its
    real on-screen duration is governed entirely by the `answered` gate
    (see below), not by this number — this just needs to be small and
    positive so the phase occupies a well-formed, non-zero slot in the
    timeline. */
const QUESTION_GATE_MS = 100;

const FLOW_DURATIONS = [
  { phase: "introHidden", ms: 500 },
  { phase: "introPeek", ms: 2200 },
  { phase: "introWave", ms: 1400 },
  { phase: "introGreeting", ms: 2200 },
  { phase: "introEnter", ms: 2800 },
  { phase: "talk", ms: PHASE_LINES.talk!.total },
  { phase: "questionSetup", ms: PHASE_LINES.questionSetup!.total },
  { phase: "questionActive", ms: QUESTION_GATE_MS },
  { phase: "yesAffirm", ms: PHASE_LINES.yesAffirm!.total },
  { phase: "teacherImpact", ms: PHASE_LINES.teacherImpact!.total },
  { phase: "pgCongrats", ms: PHASE_LINES.pgCongrats!.total },
  { phase: "restMessage", ms: PHASE_LINES.restMessage!.total },
  { phase: "drMoment", ms: PHASE_LINES.drMoment!.total },
  { phase: "preCrown", ms: PHASE_LINES.preCrown!.total },
  { phase: "noticeCrown", ms: 2600 },
  { phase: "walkToCrown", ms: 2800 },
  { phase: "grabCrown", ms: 2200 },
  { phase: "backToViewer", ms: 2600 },
  { phase: "raiseCrown", ms: 1800 },
  { phase: "crownFly", ms: PHASE_LINES.crownFly!.total }, // floored at the original 4600 via PHASE_MIN_TOTAL_MS
  { phase: "finalAffirmation", ms: PHASE_LINES.finalAffirmation!.total },
  { phase: "preHug", ms: PHASE_LINES.preHug!.total },
  { phase: "approach", ms: 3400 },
  { phase: "hug", ms: PHASE_LINES.hug!.total },
  { phase: "release", ms: 3000 },
  { phase: "wave", ms: 4200 },
] as const;

type Phase = (typeof FLOW_DURATIONS)[number]["phase"] | "ending";

type Segment = { phase: Phase; start: number; end: number };

const TIMELINE: Segment[] = (() => {
  let t = 0;
  return FLOW_DURATIONS.map((f) => {
    const seg: Segment = { phase: f.phase, start: t, end: t + f.ms };
    t += f.ms;
    return seg;
  });
})();

const TOTAL_MS = TIMELINE[TIMELINE.length - 1]!.end;
const QUESTION_SEGMENT = TIMELINE.find((s) => s.phase === "questionActive")!;

const INTRO_PHASES: readonly Phase[] = ["introHidden", "introPeek", "introWave", "introGreeting"];

const introPhaseFor = (p: Phase): IntroPhase | undefined => {
  switch (p) {
    case "introHidden":
      return "hidden";
    case "introPeek":
      return "head";
    case "introWave":
      return "wave";
    case "introGreeting":
      return "greeting";
    default:
      return undefined;
  }
};

type ResolvedState = { phase: Phase; lineIndex: number };

/** Unchanged in spirit from before: a pure function of `elapsed`. The
    per-line lookup now uses each phase's own (possibly non-uniform) line
    durations via PHASE_LINES instead of dividing by a flat constant. */
function resolveTimeline(elapsed: number): ResolvedState {
  const clamped = Math.max(0, Math.min(elapsed, TOTAL_MS));

  if (clamped >= TOTAL_MS) {
    return { phase: "ending", lineIndex: 0 };
  }

  const seg = TIMELINE.find((s) => clamped < s.end) ?? TIMELINE[TIMELINE.length - 1]!;
  const into = clamped - seg.start;

  const pl = PHASE_LINES[seg.phase];
  const lineIndex = pl ? findLineIndex(pl, into) : 0;

  return { phase: seg.phase, lineIndex };
}

const computeFit = () => {
  if (typeof window === "undefined") return 0.5;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.min((h * 0.74) / STAGE_H, (w * 0.95) / STAGE_W);
};

const computeWalkInX = (fitVal: number, leftVisiblePx: number) => {
  if (typeof window === "undefined") return 0;
  const centerX = window.innerWidth / 2;
  return leftVisiblePx / fitVal - centerX / fitVal + 300;
};

/* ================================================================== *
* HIDDEN NAV TUNING (unchanged from before)
* ================================================================== */
const NAV_JUMP_MS = 5000;
const NAV_DOUBLE_TAP_JUMP_MS = 10000;
const DOUBLE_TAP_WINDOW_MS = 450;
const NAV_ZONE_WIDTH = "32%";

/* ================================================================== *
 * MUSIC SYSTEM (background.mp4 / hug.mp4)
 *
 * Reuses `muted` as the single source of truth for "is the mic/sound
 * button on" exactly as before — no second mic state, no second button,
 * mic button JSX/behavior untouched.
 *
 * Two real <audio> elements are still created exactly ONCE in a
 * mount-only effect and stored in refs (bgAudioRef / hugAudioRef).
 * Nothing here ever creates a second instance of either.
 *
 * FIX 1 — INSTANT FIRST START (no fade delay) via initialStartDoneRef.
 * FIX 2 — NO-DUCK ZONE for the crown/question sequence.
 * FIX 3 — gesture-linked play attempts from skip/nudge/mic button/the
 *         passive first-interaction listener.
 * FIX 4 — legacy synthesized hum removed; toggleSound() purely flips
 *         `muted`.
 * FIX 5 — volume set BEFORE play() (mobile WebKit ordering quirk).
 * FIX 6/7 — hug.mp4 gesture priming, with a re-check at resolution time
 *           so a stale prime can never pause playback that legitimately
 *           started in the meantime.
 *
 * FIX 8 — STICKY HUG LOCK:
 * `hugLockedRef` latches to true the FIRST time `phase === "hug"` is
 * seen, and never reverts (except replay()). Every decision in the
 * orchestration effect uses this sticky `hugActive` value instead of a
 * live per-render boolean, so hug.mp4 becomes and remains the permanent
 * track for the rest of the experience — it is never restarted, only
 * ducked/unducked in place, so `currentTime` carries through untouched
 * across the hug-scene boundary and every later mute/unmute.
 *
 * FIX 9 — `.load()` called on both tracks immediately after creation,
 * so buffering begins right away instead of only starting on the
 * first `.play()` — improves how reliably that first gesture-linked
 * play() actually resolves rather than rejecting on a slow mobile
 * network.
 *
 * FIX 10 — FINAL-SCREEN FADE-OUT (this round's addition):
 * Once `phase` reaches "ending" (the "Happy Teacher's Day, Mam!" screen
 * — the actual rendered completion state, not a page-load timer), let
 * whichever track is currently active keep playing for exactly
 * ENDING_MUSIC_HOLD_MS, then fade it to 0 and pause it. This is a
 * single new effect keyed only on `phase`, so it fires exactly once
 * per arrival at "ending" (React re-renders while phase stays "ending"
 * do not re-trigger it), and its cleanup cancels the pending fade if
 * the hidden nav ever moves `phase` away from "ending" before the
 * timer completes. It reads `hugLockedRef` — never re-derives from
 * `phase` — so it fades whichever of background.mp4 / hug.mp4 is
 * genuinely active, without switching tracks or restarting anything.
 * ================================================================== */
const MUSIC_VOLUME_FULL = 0.35;
const MUSIC_VOLUME_HUG_FULL = 0.6; // noticeably louder/more emotional than background
const MUSIC_VOLUME_DUCKED = 0.12;
const MUSIC_VOLUME_HUG_DUCKED = 0.24;
const MUSIC_FADE_MS = 900;
const MUSIC_MUTE_FADE_MS = 500;

/** FIX 10: how long the final screen lets the currently-playing music
    continue before fading it out. */
const ENDING_MUSIC_HOLD_MS = 3000;

/** FIX 2: the whole "crown scene → crown question → picking up the
    crown → walking with the crown" block. Music never ducks/un-ducks
    across this entire span — it just holds the same normal volume. */
const CROWN_SEQUENCE_PHASES = new Set<Phase>([
  "noticeCrown",
  "walkToCrown",
  "grabCrown",
  "backToViewer",
  "raiseCrown",
  "crownFly",
]);

type FadeToken = { current: number };

function fadeAudioVolume(audio: HTMLAudioElement, token: FadeToken, target: number, ms: number) {
  const myToken = ++token.current;
  const start = audio.volume;
  const startTime = performance.now();
  const step = (now: number) => {
    if (token.current !== myToken) return; // a newer fade has superseded this one
    const t = ms <= 0 ? 1 : Math.min(1, (now - startTime) / ms);
    audio.volume = start + (target - start) * t;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** FIX 5 — sets volume (and `.muted = false`, defensively) WHILE the
    element is still paused, and only then calls `.play()`, so the
    correct volume is already in effect the moment the OS actually
    starts the audio session. The returned Promise is properly awaited
    in try/catch: on rejection the element is simply left paused,
    already carrying the correct volume, so the very next real tap
    (skip / nudge / mic button / the passive first-interaction
    listener — all of which call this same helper) retries it. */
async function activateTrack(audio: HTMLAudioElement, targetVolume: number): Promise<void> {
  audio.muted = false;
  audio.volume = targetVolume;
  try {
    await audio.play();
  } catch {
    // Autoplay blocked — left paused at the correct volume; the next
    // gesture-linked call retries using this same instance.
  }
}

/** FIX 6/7 — plays a track at volume 0 and immediately pauses it,
    purely to grant it its own per-element gesture-activation credit
    ahead of time (mobile WebKit requires this per element, not once
    per page). isStillInactive() is re-checked right before
    pause()/volume-reset — if the track has since legitimately become
    the real active track (e.g. the timeline flipped into the hug
    scene while this call was in flight), priming backs off instead of
    killing genuine playback. */
async function primeTrack(audio: HTMLAudioElement, isStillInactive: () => boolean): Promise<void> {
  const priorVolume = audio.volume;
  audio.muted = false;
  audio.volume = 0;
  try {
    await audio.play();
    if (isStillInactive()) {
      audio.pause();
    }
  } catch {
    // Still blocked — a later gesture will retry via tryPlayActive().
  } finally {
    if (isStillInactive()) {
      audio.volume = priorVolume;
    }
  }
}

export default function App() {
  const [elapsed, setElapsed] = useState(0);
  /* Mic defaults ON (music allowed) — actual audible start still
     requires a browser-permitted play(), handled by FIX 3 above. */
  const [muted, setMuted] = useState(false);
  const [runId, setRunId] = useState(0);
  const [fit, setFit] = useState(() => computeFit());

  /* The ONE piece of state that lives outside the timeline: whether the
    question has been answered yet — a small interaction flag, not a
    second clock. Everything it touches is a read-only gate on the
    single `elapsed` value; it never stores a phase or a line index of
    its own. */
  const [answered, setAnswered] = useState(false);

  const lastTapRef = useRef<{ side: "left" | "right" | null; time: number }>({ side: null, time: 0 });

  /* Analytics guard: tracks which one-per-session event keys have
     already fired, so re-visiting a phase via the hidden nav (or a
     re-render) never sends a duplicate row. Reset in replay(). */
  const trackedRef = useRef<Set<string>>(new Set());
  const trackOnce = (key: string, evt: Parameters<typeof track>[0], meta?: Record<string, unknown>) => {
    if (trackedRef.current.has(key)) return;
    trackedRef.current.add(key);
    track(evt, meta);
  };

  /* MUSIC SYSTEM: the two persistent tracks + their fade tokens. See the
     MUSIC SYSTEM comment block above for the overall design. */
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const hugAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgFadeToken = useRef(0);
  const hugFadeToken = useRef(0);
  /** FIX 1: whether the very first ever activation (of either track)
      has happened yet — only that one moment skips the fade-up. */
  const initialStartDoneRef = useRef(false);
  /** FIX 5: always mirrors the orchestration effect's current
      `activeTarget`, so tryPlayActive() (called from skip/nudge/mic
      button/the passive listener) can pass the right volume into
      activateTrack() even though those call sites don't otherwise
      have access to `talking`/`phase`. Starts at the normal
      background level, matching the very first frame's true target. */
  const activeTargetRef = useRef(MUSIC_VOLUME_FULL);
  /** FIX 8: once the hug scene is ever reached, this latches to true
      and never resets (except replay()). Both the orchestration
      effect and isHugSceneRef below key off THIS, not the live
      `phase` — so background.mp4 can never become active again after
      the hug scene has happened. */
  const hugLockedRef = useRef(false);

  /* Always-current mirrors of `muted` / "is the hug scene active", read
     by the gesture-linked play attempts (FIX 3) so they never act on a
     stale value captured at mount time. isHugSceneRef now mirrors the
     STICKY hugLockedRef (kept in sync inside the orchestration effect
     below), not a live phase comparison. */
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const isHugSceneRef = useRef(false);

  useEffect(() => {
    const measure = () => setFit(computeFit());
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* MUSIC SYSTEM: create the two audio instances exactly once, on mount.
     Volume starts at 0 — nothing plays until either the mic/sound
     button turns the mic on, or the first user interaction with the
     page occurs while the mic is already on — so there's never an
     autoplay attempt before a user gesture. FIX 9: .load() called
     right away so buffering starts immediately rather than only on
     the first play() attempt. */
  useEffect(() => {
    const bg = new Audio("/music/background.mp4");
    bg.loop = true;
    bg.preload = "auto";
    bg.volume = 0;
    bg.load();

    const hug = new Audio("/music/hug.mp4");
    hug.loop = true;
    hug.preload = "auto";
    hug.volume = 0;
    hug.load();

    bgAudioRef.current = bg;
    hugAudioRef.current = hug;

    return () => {
      bg.pause();
      hug.pause();
      bg.src = "";
      hug.src = "";
      bgAudioRef.current = null;
      hugAudioRef.current = null;
    };
  }, []);

  /** FIX 3: the shared "try to start/resume the correct track right
      now" attempt. Reads the current scene from isHugSceneRef (kept
      in sync with the STICKY hugLockedRef), never a timer. Safe to
      call as often as needed. Called both from a passive page-wide
      listener (below) and synchronously from the app's existing
      click handlers (skip / nudge / mic button).

      FIX 6/7: also silently primes whichever track is NOT currently
      active, so its own first-ever .play() (triggered automatically
      later, when the timeline flips `phase` into that scene) already
      has the gesture credit it needs — and re-checks before pausing
      so it can never kill playback that started legitimately in the
      meantime. */
  const tryPlayActive = () => {
    if (mutedRef.current) return;
    const active = isHugSceneRef.current ? hugAudioRef.current : bgAudioRef.current;
    const inactive = isHugSceneRef.current ? bgAudioRef.current : hugAudioRef.current;
    if (active && active.paused) {
      void activateTrack(active, activeTargetRef.current);
    }
    if (inactive && inactive.paused) {
      const primedTrack = inactive;
      void primeTrack(primedTrack, () => {
        // Re-evaluated at resolution time, not call time — this is what
        // catches the scene having switched in between.
        const nowActive = isHugSceneRef.current ? hugAudioRef.current : bgAudioRef.current;
        return nowActive !== primedTrack;
      });
    }
  };

  /* Passive fallback: listens once, on mount, for the first
     pointerdown/touchstart/keydown ANYWHERE on the page and, if the mic
     is on and the active track is still paused, starts it. */
  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, tryPlayActive));
    return () => events.forEach((evt) => window.removeEventListener(evt, tryPlayActive));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* How far forward `elapsed` is currently allowed to go. Unanswered:
    capped just short of the end of the question segment, so autoplay
    stalls there and the phase stays resolved as "questionActive" for as
    long as it takes to answer. Answered: no cap at all. */
  const gateMs = answered ? TOTAL_MS : Math.max(QUESTION_SEGMENT.start, QUESTION_SEGMENT.end - 1);
  const gateRef = useRef(gateMs);
  useEffect(() => {
    gateRef.current = gateMs;
  }, [gateMs]);

  /* The ONE clock, unchanged in mechanism from before. */
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setElapsed((e) => Math.min(gateRef.current, e + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const { phase, lineIndex } = useMemo(() => resolveTimeline(elapsed), [elapsed]);

  /* page_opened fires once, on mount. */
  useEffect(() => {
    track("page_opened");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Every scene-progress event fires once, the first time its phase is
    reached — guarded by trackOnce() so re-visiting a phase via the
    hidden nav never spams duplicate rows. Each is a separate INSERT
    (see analytics.ts), and none of them are ever touched again once
    written, including when "completed" is added at the end. */
  useEffect(() => {
    if (phase === "introGreeting") trackOnce("hi_shown", "hi_shown");
    if (phase === "questionActive") trackOnce("question_shown", "question_shown");
    if (phase === "drMoment") trackOnce("dr_scene", "dr_scene");
    if (phase === "noticeCrown") trackOnce("crown_scene", "crown_scene");
    if (phase === "hug") trackOnce("hug_scene", "hug_scene");
    if (phase === "ending") trackOnce("completed", "completed");
  }, [phase]);

  const isIntro = (INTRO_PHASES as readonly string[]).includes(phase);

  const pose: BunnyPose = useMemo(() => {
    switch (phase) {
      case "introHidden":
      case "introPeek":
      case "introWave":
      case "introGreeting":
        // unused while introPhaseFor(phase) is set — Bunny renders the
        // dedicated intro rig instead, ignoring pose entirely.
        return "idle";
      case "introEnter":
        return "walkIn";
      case "talk":
        return "talk";
      case "questionSetup":
        return "talk";
      case "questionActive":
        // "Leaning on the question card" — see Bunny.tsx's new "lean"
        // pose (mirrored, both-arms-forward).
        return "lean";
      case "yesAffirm":
      case "teacherImpact":
      case "pgCongrats":
      case "restMessage":
      case "drMoment":
      case "preCrown":
      case "finalAffirmation":
      case "preHug":
        return "talk";
      case "noticeCrown":
        return "surprised";
      case "walkToCrown":
        return "toCrown";
      case "grabCrown":
        return "holdCrown";
      case "backToViewer":
        return "holdCrown";
      case "raiseCrown":
      case "crownFly":
        return "raise";
      case "approach":
        return "approach";
      case "hug":
        return "hug";
      case "release":
        return "release";
      case "wave":
        return "wave";
      default:
        return "sit";
    }
  }, [phase]);

  const look: LookTarget = useMemo(() => {
    if (isIntro) return "viewer";
    if (phase === "noticeCrown" || phase === "walkToCrown" || phase === "grabCrown") return "crown";
    if (phase === "talk") return lineIndex % 4 === 2 ? "shy" : "viewer";
    if (phase === "drMoment") return "up";
    if (phase === "restMessage") return "down";
    return "viewer";
  }, [phase, isIntro, lineIndex]);

  const introPh = introPhaseFor(phase);

  const leftHidden = computeLeftHidden(fit);
  const leftVisible = computeLeftVisible(fit);
  const peekTilt = isIntro && phase !== "introHidden" ? PEEK_TILT : 0;

  const walkInFrom = useMemo(
    () => ({ x: computeWalkInX(fit, leftVisible), y: 6, rotate: PEEK_TILT }),
    [fit, leftVisible],
  );

  const walking = phase === "introEnter" || phase === "backToViewer";
  const talking = [
    "talk",
    "questionSetup",
    "yesAffirm",
    "teacherImpact",
    "pgCongrats",
    "restMessage",
    "drMoment",
    "preCrown",
    "finalAffirmation",
    "preHug",
    "hug",
  ].includes(phase);
  const holdingCrown = phase === "grabCrown" || phase === "backToViewer" || phase === "raiseCrown";
  const groundCrown = phase === "noticeCrown" || phase === "walkToCrown";
  const smiling = ["introWave", "introGreeting", "wave", "release", "yesAffirm", "drMoment", "finalAffirmation"].includes(
    phase,
  );

  /* MUSIC SYSTEM: the one orchestration effect. Recomputes whenever
     `muted`, `phase`, or `talking` changes — each recomputation is
     idempotent (it just re-targets the existing two Audio instances),
     so it's safe to run as often as those values change.

     FIX 8: `hugActive` is derived from the STICKY `hugLockedRef`, not
     a live `phase === "hug"` comparison — the lock is set the first
     time phase reaches "hug" and never cleared (except replay()), so
     hug.mp4 remains the active track for every scene afterward. */
  useEffect(() => {
    const bg = bgAudioRef.current;
    const hug = hugAudioRef.current;
    if (!bg || !hug) return;

    if (phase === "hug") {
      hugLockedRef.current = true;
    }
    const hugActive = hugLockedRef.current;
    isHugSceneRef.current = hugActive;

    if (muted) {
      fadeAudioVolume(bg, bgFadeToken, 0, MUSIC_MUTE_FADE_MS);
      fadeAudioVolume(hug, hugFadeToken, 0, MUSIC_MUTE_FADE_MS);
      const pauseTimer = window.setTimeout(() => {
        bg.pause();
        hug.pause();
      }, MUSIC_MUTE_FADE_MS);
      return () => window.clearTimeout(pauseTimer);
    }

    const active = hugActive ? hug : bg;
    const inactive = hugActive ? bg : hug;
    const activeToken = hugActive ? hugFadeToken : bgFadeToken;
    const inactiveToken = hugActive ? bgFadeToken : hugFadeToken;

    // FIX 2: never duck/un-duck across the crown+question sequence —
    // the target volume simply doesn't move for that whole block.
    const inCrownSequence = CROWN_SEQUENCE_PHASES.has(phase);
    const effectiveTalking = talking && !inCrownSequence;

    const activeTarget = effectiveTalking
      ? hugActive
        ? MUSIC_VOLUME_HUG_DUCKED
        : MUSIC_VOLUME_DUCKED
      : hugActive
        ? MUSIC_VOLUME_HUG_FULL
        : MUSIC_VOLUME_FULL;
    activeTargetRef.current = activeTarget;

    if (active.paused) {
      // FIX 5: transitioning paused -> playing. activateTrack() sets
      // volume BEFORE calling play() and properly awaits/handles the
      // Promise. Reachable on mount, on unmute, on the hug scene's
      // first activation, or on a scene/talking change while already
      // unmuted; on rejection the element stays paused at the correct
      // volume, and FIX 3's gesture-linked calls retry it.
      initialStartDoneRef.current = true;
      void activateTrack(active, activeTarget);
    } else if (!initialStartDoneRef.current) {
      // Already playing somehow before the "first activation" flag was
      // set (defensive edge case) — just align the flag, no fade.
      initialStartDoneRef.current = true;
      active.volume = activeTarget;
    } else {
      // Already playing: e.g. hug.mp4 continuing on into every scene
      // after the hug, just ducking/unducking for talking — never
      // restarted, never reset to the beginning; currentTime carries
      // through untouched.
      fadeAudioVolume(active, activeToken, activeTarget, MUSIC_FADE_MS);
    }
    fadeAudioVolume(inactive, inactiveToken, 0, MUSIC_FADE_MS);

    const pauseTimer = window.setTimeout(() => {
      if (inactive.volume <= 0.001) inactive.pause();
    }, MUSIC_FADE_MS + 50);
    return () => window.clearTimeout(pauseTimer);
  }, [muted, phase, talking]);

  /** FIX 10 — FINAL-SCREEN FADE-OUT.
      Fires only when `phase` transitions to "ending" (the actual
      rendered completion screen). Waits ENDING_MUSIC_HOLD_MS, then
      fades whichever track is genuinely active (read from the same
      sticky hugLockedRef the orchestration effect above uses, never
      re-derived from `phase`) down to 0 and pauses it. Doesn't touch
      mute state, doesn't restart or switch tracks, doesn't run again
      on later re-renders while phase stays "ending" (the effect only
      re-runs when `phase` itself changes), and its cleanup clears the
      pending timeout if the hidden nav moves away from "ending"
      before the 3s elapse — so the fade can never fire late into the
      wrong scene. */
  useEffect(() => {
    if (phase !== "ending") return;

    const timer = window.setTimeout(() => {
      const hugActive = hugLockedRef.current;
      const active = hugActive ? hugAudioRef.current : bgAudioRef.current;
      const activeToken = hugActive ? hugFadeToken : bgFadeToken;
      if (active && !active.paused) {
        fadeAudioVolume(active, activeToken, 0, MUSIC_FADE_MS);
        window.setTimeout(() => {
          if (active.volume <= 0.001) active.pause();
        }, MUSIC_FADE_MS + 50);
      }
    }, ENDING_MUSIC_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [phase]);

  /* Tap-to-advance in the CENTER of the screen — jumps `elapsed` to the
    start of the next line (using that line's own end time, not a flat
    constant), which naturally rolls into the next phase once the
    current one's lines run out. Clamped to the same gate the clock
    itself respects, so tapping can't skip past an unanswered question
    either. */
  const skip = () => {
    // FIX 3: a real click handler is one of the most reliable places
    // for the browser to honor a play() call — piggyback on it.
    tryPlayActive();
    if (isIntro) {
      setElapsed(TIMELINE.find((s) => s.phase === "introEnter")!.start);
      return;
    }
    if (phase === "introEnter") {
      setElapsed(TIMELINE.find((s) => s.phase === "talk")!.start);
      return;
    }
    const pl = PHASE_LINES[phase];
    if (pl) {
      const seg = TIMELINE.find((s) => s.phase === phase)!;
      const nextLineStart = seg.start + pl.lines[lineIndex]!.end;
      setElapsed(Math.min(gateMs, nextLineStart));
    }
  };

  const replay = () => {
    setElapsed(0);
    setAnswered(false);
    lastTapRef.current = { side: null, time: 0 };
    trackedRef.current = new Set();
    initialStartDoneRef.current = false;
    hugLockedRef.current = false; // FIX 8: un-latch for the new run
    setRunId((r) => r + 1);
    track("page_opened");
  };

  /* ---- HIDDEN TIMELINE NAVIGATION ---- (unchanged mechanism from
    before — clamp is `gateMs`, so forward-nav can't skip past an
    unanswered question any more than autoplay can.) */
  const nudge = (direction: -1 | 1) => {
    // FIX 3: same reasoning as skip() above.
    tryPlayActive();
    const side = direction === -1 ? "left" : "right";
    const now = performance.now();
    const isDoubleTap = lastTapRef.current.side === side && now - lastTapRef.current.time < DOUBLE_TAP_WINDOW_MS;
    lastTapRef.current = { side, time: now };
    const amount = isDoubleTap ? NAV_DOUBLE_TAP_JUMP_MS : NAV_JUMP_MS;
    setElapsed((e) => Math.max(0, Math.min(gateMs, e + direction * amount)));
  };

  const handleYes = () => {
    if (answered) return;
    setAnswered(true);
    track("yes_clicked");
  };

  /* FIX 4: this used to also spin up four independent Web Audio
     oscillators as a synthesized "hum," entirely separate from
     background.mp4/hug.mp4 and capable of layering on top of them.
     That's removed — the mic button now purely toggles `muted`, which
     already drives both real tracks via the orchestration effect
     above. Button design, icon, aria-label, and click wiring below are
     unchanged. */
  const toggleSound = () => {
    tryPlayActive();
    setMuted((m) => !m);
  };

  const genericLine = TEXT_LINES[phase]?.[lineIndex] ?? null;
  const isNameCard = genericLine === NAME_CARD;

  const dialogueLine: string | null =
    phase === "introGreeting" || phase === "introEnter"
      ? DIALOGUE_LINES[0]!
      : phase === "questionActive"
        ? // While unanswered, <QuestionCard> below owns the question
        // text (so it isn't shown twice). Once answered, revisiting
        // this moment via the hidden nav shows it as a plain caption
        // like any other narrative beat.
        answered
          ? QUESTION_TEXT
          : null
        : isNameCard
          ? null
          : genericLine;

  return (
    <main
      onClick={skip}
      className="relative h-[100dvh] w-full overflow-hidden bg-background font-body select-none"
    >
      <Background showMoon={phase === "ending"} warm={["raiseCrown", "crownFly", "approach", "hug"].includes(phase)} />

      <AnimatePresence>
        {groundCrown && (
          <motion.img
            key="crown-ground"
            src="/crown.png"
            alt="A golden crown"
            className="pointer-events-none absolute bottom-[20dvh] right-[14vw] z-20 w-[22vw] max-w-[130px] drop-shadow-glow"
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ opacity: { duration: 1 }, y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } }}
          />
        )}
      </AnimatePresence>

      {introPh ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <motion.div
            className="absolute bottom-0"
            style={{ width: STAGE_W, height: STAGE_H, transformOrigin: "0% 100%" }}
            animate={{ left: introPh === "hidden" ? leftHidden : leftVisible, scale: fit }}
            transition={peekTransition}
          >
            <Bunny introPhase={introPh} peekX={0} peekTilt={peekTilt} />
          </motion.div>
        </div>
      ) : (
        <div
          className="absolute bottom-0 left-1/2 z-20"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            marginLeft: -STAGE_W / 2,
            transform: `scale(${fit})`,
            transformOrigin: "50% 100%",
          }}
        >
          <div className="h-full w-full">
            <Bunny
              pose={pose}
              look={look}
              talking={talking}
              walking={walking}
              smiling={smiling}
              holdingCrown={holdingCrown}
              walkInFrom={walkInFrom}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {phase === "hug" && (
          <motion.div
            key="hug-fx"
            className="pointer-events-none absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="absolute inset-0 bg-hug-vignette" />
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.svg
                key={i}
                viewBox="0 0 32 29"
                className="absolute h-6 w-6"
                style={{ left: `${8 + i * 7.5}%`, bottom: "-8%", color: i % 2 ? "#f9a8c4" : "#e8607f" }}
                animate={{ y: ["0vh", "-95vh"], opacity: [0, 1, 0], rotate: [0, i % 2 ? 18 : -18, 0] }}
                transition={{ duration: 7 + (i % 4), delay: i * 0.45, repeat: Infinity, ease: "easeOut" }}
              >
                <path
                  fill="currentColor"
                  d="M16 29S1 19.6 1 10.2A9.2 9.2 0 0 1 16 4.4 9.2 9.2 0 0 1 31 10.2C31 19.6 16 29 16 29z"
                />
              </motion.svg>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "crownFly" && (
          <motion.img
            key="crown-fly"
            src="/crown.png"
            alt="A golden crown"
            className="pointer-events-none absolute left-1/2 z-40 w-[34vw] max-w-[180px] drop-shadow-glow"
            initial={{ top: "44%", x: "-50%", scale: 0.8, opacity: 1 }}
            animate={{ top: "9%", x: "-50%", scale: 1, rotate: [0, -7, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
      <CrownGlow active={phase === "crownFly"} />

      {/* The one special-cased visual beat: "Dr. [Name]" gets a centered
            reveal card instead of the usual bottom caption. Everything
            about *when* it appears still comes from the timeline — this is
            purely a different renderer for one specific line. */}
      <AnimatePresence>
        {isNameCard && (
          <motion.div
            key="dr-name-card"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 px-8 text-center"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-display text-xs uppercase tracking-[0.35em] text-cream/60 sm:text-sm">Someday</p>
            <p className="mt-2 font-display text-4xl text-gold drop-shadow-glow sm:text-5xl">Dr. {TEACHER_NAME}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-[26vh] bg-subtitle-scrim" />
      <Dialogue line={dialogueLine} tone={phase === "crownFly" ? "gold" : "soft"} />

      {/* The one deliberately non-linear scene: mounted only while the
            question is live and unanswered. See QuestionCard.tsx. */}
      <AnimatePresence>
        {phase === "questionActive" && !answered && (
          <QuestionCard
            questionText={QUESTION_TEXT}
            onYes={handleYes}
            onAttempt={(n) => {
              track("no_attempt", { attempt: n });
              if (n === 1) trackOnce("no_clicked", "no_clicked");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "ending" && (
          <motion.div
            key="ending"
            className="pointer-events-none absolute inset-x-0 top-[30%] z-40 px-8 text-center"
            initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 2, delay: 1.2, ease: "easeOut" }}
          >
            <h1 className="font-display text-3xl leading-tight text-gold drop-shadow-glow sm:text-4xl">
              Happy Teacher&apos;s Day, Mam! ❤️
            </h1>
            <motion.p
              className="mt-3 font-display text-lg text-cream/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.4, duration: 1.6 }}
            >
              With lots of respect and gratitude.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- HIDDEN TIMELINE NAV ZONES ---- (unchanged from before) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          nudge(-1);
        }}
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-30"
        style={{ width: NAV_ZONE_WIDTH }}
      />
      <div
        onClick={(e) => {
          e.stopPropagation();
          nudge(1);
        }}
        aria-hidden="true"
        className="absolute inset-y-0 right-0 z-30"
        style={{ width: NAV_ZONE_WIDTH }}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleSound();
        }}
        aria-label={muted ? "Turn music on" : "Turn music off"}
        className="absolute right-4 top-4 z-50 rounded-full border border-cream/20 bg-cream/10 p-3 text-cream backdrop-blur-sm transition-colors hover:bg-cream/20"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <AnimatePresence>
        {phase === "ending" && (
          <motion.button
            key="replay"
            onClick={(e) => {
              e.stopPropagation();
              replay();
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 3, duration: 1 }}
            className="absolute bottom-6 right-5 z-50 flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-2 font-display text-sm text-gold backdrop-blur-sm transition-colors hover:bg-gold/25"
          >
            <RotateCcw size={16} /> Watch again
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}