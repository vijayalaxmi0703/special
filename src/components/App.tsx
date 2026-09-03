import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import Bunny, { HEAD_GEOMETRY, STAGE_H, STAGE_W, type BunnyPose, type IntroPhase, type LookTarget } from "./Bunny";
import { Background, CrownGlow, Dialogue } from "./Scenery";
import QuestionCard from "./QuestionCard";
import VideoScene, { type VideoSceneHandle } from "./VideoScene";
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
  "hope you're doing well.",
  "I just wanted to say a few things to you ..",
  "So please bear with me for just a few minutes😅.",
  "mam i could have just wished u today through a message but..",
  "I have spent days coding this for u cuz ...",
  "I just wanted u to feel special today and hopefully make u smile a little🤗",

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
* Everything on screen is a pure function of one number, `elapsed`.
* Autoplay increments it every frame; the hidden nav adds/subtracts
* from it; the question gate simply caps how far forward it's allowed
* to go until answered.
*
* Each phase's line array (TEXT_LINES) is run through
* buildPhaseLines(), which gives every individual line its own duration
* via readDuration() — longer sentences hold longer, short ones don't
* linger — and a phase's total duration in FLOW_DURATIONS is just the
* sum of its lines' durations.
*
* VIDEO SCENE: the crown → video → Final Affirmation block adds two
* phases. "videoTransition" ("Wait…" / "Before we continue…") is an
* ordinary caption-driven phase, exactly like preCrown or preHug —
* nothing new about how it's timed. "video" is different: like
* "questionActive", its real on-screen duration isn't a fixed number at
* all, it's governed by an external event (the memory.mp4 `ended`
* event, plus VideoScene's own hold/fade), so it uses the exact same
* "gate" technique the question already uses — see `videoReleased` /
* gateMs below.
* ================================================================== */

/** How long a single caption holds, purely as a function of its own
    character count — longer sentences get more time, short ones don't
    linger. Clamped to a floor (so a two-word line doesn't vanish
    instantly) and a ceiling (so nothing holds indefinitely). */
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
    buildPhaseLines()/readDuration(), how long that phase lasts.
    `questionActive` and `video` are deliberately NOT in this map —
    neither is a caption at all, they're gates (see `answered` and
    `videoReleased` below). */
const TEXT_LINES: Partial<Record<string, string[]>> = {
  talk: DIALOGUE_LINES,
  questionSetup: ["Mam, I have a very important question…"],
  yesAffirm: ["Yes… it's true. ✨", "You really are someone very special, Mam💗"],
  teacherImpact: [
    "In my eyes ur the sweetest, kindest and most amazing person💕🥰",
    "You are valued, appreciated, and remembered more than you know..",
  ],
  pgCongrats: [
    "And Mam… there's something else I want to congratulate you for.",
    "Congratulations on your PhD journey MAM. 🎓",
    'Balancing your studies, college, and everything you manage at home is no small achievement.✨',
    "Sometimes I wonder how you manage to carry so much and still keep moving forward with the same dedication. Honestly, seeing you do that inspires me more than you know.",
    "I hope you’re always proud of how much you’re accomplishing, even on the days when it feels difficult."
  ],
  restMessage: [
    "Mamm It must get exhausting sometimes isnt it…",
    "So please remember to take some time for yourself too. ",
  ],
  drMoment: [
    "And someday…",
    NAME_CARD,
    "I can't wait to see 'Dr.' before your name.🤗",
    "Until then, I'll be quietly cheering for you. 🤍",
  ],
  preCrown: ["And for everything you are… and everything you do", "you deserve this mam. 👑"],
  crownFly: ["There… Now that looks perfect.Exactly where it belongs.😊"],
  /** VIDEO SCENE transition: the bunny "suddenly remembers something"
      and delivers these two lines before hopping aside for the memory.
      Ordinary reading-time-based caption phase — same mechanism as
      preCrown/preHug, nothing new. */
  videoTransition: ["Wait mam..", "Before we continue, there's something I wanted you to see. 👀"],
  finalAffirmation: [
    "I wanted to show u that for a reason mam, Behind this little video is someone who has been quietly watching you all along…",
    "Admiring you, learning from you, and holding onto little words and gestures you may not even remember… but someone quietly carried with them.",
    "And without even realizing it herself, she had slowly found warmth,comfort and inspiration in you✨",
    "Not just from the lessons you taught… but from the person you are.😊",
  ],
  preHug: ["And this one is just for you. 🤍"],
  hug: HUG_LINES,
};

/** A floor on a phase's TOTAL duration, applied by stretching its last
    line's hold time if the natural reading-time sum falls short. Only
    crownFly needs this: its one caption is short, but the phase's
    duration also has to cover the existing crown-fly visual (the
    flying crown image's 1.8s transition plus its glow/sparkle). */
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
    timeline. Reused as-is for the "video" phase's nominal slot, which
    is governed the same way by the `videoReleased` gate. */
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
  // --- VIDEO SCENE: inserted after the crown, before Final Affirmation ---
  { phase: "videoTransition", ms: PHASE_LINES.videoTransition!.total },
  { phase: "video", ms: QUESTION_GATE_MS }, // nominal slot; real duration governed by `videoReleased` gate
  // --- end VIDEO SCENE insertion ---
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
/** VIDEO SCENE: the second gated segment, same pattern as
    QUESTION_SEGMENT above. */
const VIDEO_SEGMENT = TIMELINE.find((s) => s.phase === "video")!;

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

/** A pure function of `elapsed`. The per-line lookup uses each phase's
    own (possibly non-uniform) line durations via PHASE_LINES instead of
    dividing by a flat constant. */
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
* HIDDEN NAV TUNING
* ================================================================== */
const NAV_JUMP_MS = 5000;
const NAV_DOUBLE_TAP_JUMP_MS = 10000;
const DOUBLE_TAP_WINDOW_MS = 450;
const NAV_ZONE_WIDTH = "32%";

/* ================================================================== *
 * VIDEO SCENE — FRAME + BUNNY "HOLDING THE FRAME" TUNING
 *
 * These constants control two things together, from one shared source
 * of truth (VIDEO_FRAME_TOP_VH), so the video frame (rendered in
 * VideoScene.tsx, sized via the frameMaxHVh/frameBottomVh props passed
 * to it below) and the bunny's paw line (this stage, right below) are
 * guaranteed to actually meet on screen instead of being two
 * independently-guessed vh numbers in two different files.
 *
 * ROUND 3 — FIXED THE ACTUAL POSE, KEPT THE FRAME LARGE:
 * the brief for this round is explicit that the frame must stay large
 * (top edge high up the screen, like the original pre-fix version) —
 * so the frame-size numbers below are UNCHANGED from last round.
 * What was actually wrong was the POSE used while the (separately
 * scaled/clipped/repositioned) bunny copy sits at that top edge:
 * "holdMemory" copied the crown-grip's rotation numbers (56/-56,
 * scale 1.4 — tuned for gripping one small, centered, round object)
 * onto a much wider rectangular target, which is what produced the
 * reported "arms stretched sideways, floating beside the frame" bug.
 * Bunny.tsx now has a purpose-built "holdFrame" pose instead (see its
 * VIDEO SCENE NOTE) — a more moderate raise that keeps the two paws
 * spread toward the left/right corners of the visible clip rather than
 * crossed over the centerline. The clip/scale/position numbers below
 * (which only control WHERE that pose is anchored on screen, not its
 * arm rotation) are otherwise untouched from last round.
 *
 * BUG FIX (kept from earlier rounds): the bunny's own canvas
 * (STAGE_H=700) has the head/ears near the TOP and the body/legs near
 * the BOTTOM (shoulders pivot at canvas y=408). The clip window shows
 * a CLIP_H-tall slice starting at canvas y=0 (LIFT=0) — i.e. ears +
 * head + the raised, paw-holding arms — and clips away everything
 * below that, so the torso/legs can never appear in front of the
 * frame.
 * ================================================================== */
const VIDEO_FRAME_BOTTOM_VH = 3; // the frame's own margin from the screen's bottom edge
const VIDEO_FRAME_TOP_VH = 78; // where the frame's top edge sits, measured from the screen bottom — single source of truth for both the frame's size (VideoScene.tsx) and the bunny's paw line below. Kept large per this round's explicit "do NOT shrink the video" instruction.
const VIDEO_FRAME_MAX_H_VH = VIDEO_FRAME_TOP_VH - VIDEO_FRAME_BOTTOM_VH; // derived: the frame's own max-height, so its top edge lands exactly at VIDEO_FRAME_TOP_VH

const VIDEO_BUNNY_CLIP_H = 430; // canvas px: ears + head + shoulders + raised paws only — cuts off right at/just past the shoulder line, before the torso/legs. Nudged up slightly (410 -> 430) from last round to comfortably keep holdFrame's more-spread paw endpoints inside the visible slice.
const VIDEO_BUNNY_LIFT = 0; // show the natural top slice (y 0..CLIP_H) — no downward shift
const VIDEO_BUNNY_SCALE = 0.4; // bunny is NOT enlarged to compensate for the bigger frame, per this round's explicit instruction

/** BUNNY-BEHIND-FRAME FIX (this round): earlier rounds deliberately put
    the bunny's z-index ABOVE the frame (z-45 vs the frame's z-40) and
    let its clipped slice dip 7vh past the frame's top edge, so the
    paws would visibly overlap ON TOP of the frame. The explicit ask
    this round is the opposite: the bunny must sit BEHIND the frame —
    only the head/ears/raised paws should be visible ABOVE the frame's
    top edge, with nothing overlapping (and therefore nothing hidden by
    or drawn over) the frame itself. So:
      - VIDEO_BUNNY_Z is now BELOW VideoScene's frame stack (z-40),
        not above it.
      - VIDEO_PAW_OVERLAP_VH is 0 — the visible bunny slice now ends
        exactly AT the frame's top edge instead of dipping into it, so
        the paws rest right on that line and stay fully visible (a
        negative/dipping value would now be hidden behind the frame
        instead of drawn over it, per the new stacking order). */
const VIDEO_BUNNY_Z = 35;
const VIDEO_PAW_OVERLAP_VH = 0;
const VIDEO_BUNNY_BOTTOM_VH = VIDEO_FRAME_TOP_VH - VIDEO_PAW_OVERLAP_VH; // derived: bottom of the visible bunny slice (≈ the paw line) meets the frame's top edge

/* ================================================================== *
 * MUSIC SYSTEM (background.mp4 / hug.mp4)
 *
 * ⚠️ VERIFIED AGAINST THE REAL PROJECT: /music/background.mp4 and
 * /music/hug.mp4 do not currently exist in public/music/ — that folder
 * doesn't exist yet. This whole system is written correctly and will
 * work the moment those two audio files are added there; until then,
 * every play() call below will simply fail (caught, logged in dev,
 * silent in prod) and no music will be heard. See the deliverable
 * summary for exactly what to add.
 *
 * Two real <audio> elements are created exactly ONCE in a mount-only
 * effect and stored in refs (bgAudioRef / hugAudioRef). Nothing here
 * ever creates a second instance of either.
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
 * FIX 8 — STICKY HUG LOCK: hugLockedRef latches to true the FIRST time
 *         phase === "hug" is seen, and never reverts (except replay()).
 * FIX 9 — .load() called on both tracks immediately after creation.
 * FIX 10 — FINAL-SCREEN FADE-OUT once phase reaches "ending".
 *
 * VIDEO SCENE: while phase === "video", background/hug music must be
 * COMPLETELY SILENT — not merely ducked — because the memory video
 * plays with its own original audio. The orchestration effect below
 * special-cases phase === "video": fade the currently-active track down
 * to 0 and then actually .pause() it (never a new Audio(), never
 * resetting currentTime). The moment the video's real `ended` event
 * fires (VideoScene's onEnded prop, NOT a timer and NOT the later
 * onComplete/phase change), this same effect re-runs, finds the track
 * paused, and resumes THIS SAME element from wherever it left off —
 * with wasVideoSilencedRef giving that one specific resume a smooth
 * fade-in instead of snapping straight to the target volume.
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
    starts the audio session. */
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
async function activateTrackWithRetry(
  audio: HTMLAudioElement,
  targetVolume: number,
  attempts = 4,
  delayMs = 350,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    audio.muted = false;
    audio.volume = targetVolume;

    try {
      await audio.play();
      return;
    } catch {
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
}
/** FIX 6/7 — plays a track at volume 0 and immediately pauses it,
    purely to grant it its own per-element gesture-activation credit
    ahead of time (mobile WebKit requires this per element, not once
    per page). isStillInactive() is re-checked right before
    pause()/volume-reset — if the track has since legitimately become
    the real active track, priming backs off instead of killing genuine
    playback. */
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
    question has been answered yet. */
  const [answered, setAnswered] = useState(false);

  /** VIDEO SCENE gate: same idea as `answered` above. Lifted by
      VideoScene's onComplete callback once the memory has actually
      played out (or gracefully skipped on error). */
  const [videoReleased, setVideoReleased] = useState(false);

  /** VIDEO SCENE audio: set the instant the video's native `ended`
      event fires — deliberately BEFORE the visual hold/fade beat that
      follows it. Background music resumes on THIS signal, not on the
      later phase change, so "video ends -> bg resumes" happens exactly
      when the memory's own audio actually stops, per spec, rather than
      ~2.4s later once the hold+fade have also finished playing out.
      (Reset-on-entering-"video" effect lives further down, alongside
      the other phase-derived effects — `phase` itself isn't declared
      yet at this point in the component.) */
  const [videoAudioDone, setVideoAudioDone] = useState(false);

  /** VIDEO SCENE: while the memory plays, have the bunny occasionally
      glance toward it and back to the viewer instead of staring at one
      spot the whole time. */
  const [videoGlance, setVideoGlance] = useState<LookTarget>("right");
  useEffect(() => {
    const id = setInterval(() => {
      setVideoGlance((g) => (g === "right" ? "viewer" : "right"));
    }, 3600);
    return () => clearInterval(id);
  }, []);

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

  /* MUSIC SYSTEM: the two persistent tracks + their fade tokens. */
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const hugAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgFadeToken = useRef(0);
  const hugFadeToken = useRef(0);
  /** FIX 1: whether the very first ever activation (of either track)
      has happened yet — only that one moment skips the fade-up. */
  const initialStartDoneRef = useRef(false);
  /** FIX 5: always mirrors the orchestration effect's current
      `activeTarget`, so tryPlayActive() can pass the right volume into
      activateTrack() even though those call sites don't otherwise have
      access to `talking`/`phase`. */
  const activeTargetRef = useRef(MUSIC_VOLUME_FULL);
  /** FIX 8: once the hug scene is ever reached, this latches to true
      and never resets (except replay()). */
  const hugLockedRef = useRef(false);
  /** VIDEO SCENE: true only while `phase === "video"`, kept in sync by
      a tiny dedicated effect below. */
  const videoActiveRef = useRef(false);
  /** VIDEO SCENE: imperative handle onto the (now permanently mounted)
      VideoScene component — used to (a) silently prime the <video>
      element's gesture-based audio permission on every existing
      gesture, exactly like the bg/hug <audio> priming below, (b) let
      the existing tap-to-advance/"skip" handler pause/resume the
      actual video when tapping the middle of the screen, and (c) reset
      the memory to its start on replay(). */
  const videoSceneRef = useRef<VideoSceneHandle>(null);
  /** VIDEO SCENE: set the instant background/hug music gets silenced
      for the memory video, and cleared the instant it resumes. */
  const wasVideoSilencedRef = useRef(false);

  /* Always-current mirrors of `muted` / "is the hug scene active", read
     by the gesture-linked play attempts (FIX 3) so they never act on a
     stale value captured at mount time. */
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
      now" attempt. Safe to call as often as needed. Called both from a
      passive page-wide listener (below) and synchronously from the
      app's existing click handlers (skip / nudge / mic button).

      VIDEO SCENE: bails out immediately if the memory video is
      currently on screen — a gesture during the video must never
      resume background/hug music. */
  const tryPlayActive = () => {
    // VIDEO SCENE: silently prime the memory <video> element's audio
    // permission on every gesture that already reaches this function
    // (clicks, taps, keydowns — see the passive listener below) so
    // that by the time `phase === "video"` actually arrives, the
    // browser has already granted this exact element gesture-based
    // playback history and unmuted playback works with no extra
    // button. Safe to call every time — it's a no-op once primed.
    videoSceneRef.current?.prime();
    if (mutedRef.current) return;
    if (videoActiveRef.current) return;
    const active = isHugSceneRef.current ? hugAudioRef.current : bgAudioRef.current;
    const inactive = isHugSceneRef.current ? bgAudioRef.current : hugAudioRef.current;
    if (active && active.paused) {
      void activateTrack(active, activeTargetRef.current);
    }
    if (inactive && inactive.paused) {
      const primedTrack = inactive;
      void primeTrack(primedTrack, () => {
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

  /* How far forward `elapsed` is currently allowed to go. */
  const gateMs = !answered
    ? Math.max(QUESTION_SEGMENT.start, QUESTION_SEGMENT.end - 1)
    : !videoReleased
      ? Math.max(VIDEO_SEGMENT.start, VIDEO_SEGMENT.end - 1)
      : TOTAL_MS;
  const gateRef = useRef(gateMs);
  useEffect(() => {
    gateRef.current = gateMs;
  }, [gateMs]);

  /* The ONE clock. */
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

  /* VIDEO SCENE: keep videoActiveRef in sync with the resolved phase,
     and reset videoAudioDone the moment "video" is (re-)entered — e.g.
     via the hidden nav — so a stale `true` from a previous pass can't
     skip the silence branch on next entry. */
  useEffect(() => {
    videoActiveRef.current = phase === "video";
    if (phase === "video") setVideoAudioDone(false);
  }, [phase]);

  /* page_opened fires once, on mount. */
  useEffect(() => {
    track("page_opened");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Every scene-progress event fires once, the first time its phase is
    reached — guarded by trackOnce() so re-visiting a phase via the
    hidden nav never spams duplicate rows. */
  useEffect(() => {
    if (phase === "introGreeting") trackOnce("hi_shown", "hi_shown");
    if (phase === "questionActive") trackOnce("question_shown", "question_shown");
    if (phase === "drMoment") trackOnce("dr_scene", "dr_scene");
    if (phase === "noticeCrown") trackOnce("crown_scene", "crown_scene");
    if (phase === "video") trackOnce("video_scene", "video_scene");
    if (phase === "hug") trackOnce("hug_scene", "hug_scene");
    if (phase === "ending") trackOnce("completed", "completed");
  }, [phase]);

  const isIntro = (INTRO_PHASES as readonly string[]).includes(phase);

  /** VIDEO SCENE: bunny slides slightly aside once the memory itself is
      on screen. */
  const isVideoScene = phase === "video";

  const pose: BunnyPose = useMemo(() => {
    switch (phase) {
      case "introHidden":
      case "introPeek":
      case "introWave":
      case "introGreeting":
        return "idle";
      case "introEnter":
        return "walkIn";
      case "talk":
        return "talk";
      case "questionSetup":
        return "talk";
      case "questionActive":
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
      case "videoTransition":
        return "talk";
      case "video":
        // ROUND 3: was "holdMemory" (removed from Bunny.tsx — see its
        // VIDEO SCENE NOTE). Now uses the purpose-built "holdFrame"
        // pose, tuned for the wide/tall video frame rather than the
        // crown's small-object grip.
        return "holdFrame";
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
    "videoTransition",
    "finalAffirmation",
    "preHug",
    "hug",
  ].includes(phase);
  const holdingCrown = phase === "grabCrown" || phase === "backToViewer" || phase === "raiseCrown";
  const groundCrown = phase === "noticeCrown" || phase === "walkToCrown";
  const smiling = ["introWave", "introGreeting", "wave", "release", "yesAffirm", "drMoment", "finalAffirmation"].includes(
    phase,
  );

  /* MUSIC SYSTEM: the one orchestration effect. */
  useEffect(() => {
    const bg = bgAudioRef.current;
    const hug = hugAudioRef.current;
    if (!bg || !hug) return;

    if (phase === "hug") {
      hugLockedRef.current = true;
    }
    const hugActive = hugLockedRef.current;
    isHugSceneRef.current = hugActive;

    const active = hugActive ? hug : bg;
    const inactive = hugActive ? bg : hug;
    const activeToken = hugActive ? hugFadeToken : bgFadeToken;
    const inactiveToken = hugActive ? bgFadeToken : hugFadeToken;

    if (muted) {
      fadeAudioVolume(bg, bgFadeToken, 0, MUSIC_MUTE_FADE_MS);
      fadeAudioVolume(hug, hugFadeToken, 0, MUSIC_MUTE_FADE_MS);
      const pauseTimer = window.setTimeout(() => {
        bg.pause();
        hug.pause();
      }, MUSIC_MUTE_FADE_MS);
      return () => window.clearTimeout(pauseTimer);
    }

    // VIDEO SCENE: complete silence — not a duck — while the memory's
    // own audio plays. Fade both tracks to 0 and pause them, same
    // mechanism as the `muted` branch above, so nothing is ever
    // audible at the same time as the video. Gated on !videoAudioDone
    // so this stops applying the instant the video's `ended` event
    // fires (see VideoScene's onEnded prop below) — not later, once
    // the visual hold/fade has also finished — matching the exact
    // "video ends -> bg resumes" sequencing from the brief.
    if (phase === "video" && !videoAudioDone) {
      activeTargetRef.current = 0;
      wasVideoSilencedRef.current = true;
      fadeAudioVolume(active, activeToken, 0, MUSIC_MUTE_FADE_MS);
      fadeAudioVolume(inactive, inactiveToken, 0, MUSIC_MUTE_FADE_MS);
      const pauseTimer = window.setTimeout(() => {
        active.pause();
        inactive.pause();
      }, MUSIC_MUTE_FADE_MS);
      return () => window.clearTimeout(pauseTimer);
    }

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
      initialStartDoneRef.current = true;
      if (wasVideoSilencedRef.current) {
        // VIDEO SCENE: this is specifically the resume right after the
        // memory video — fade smoothly back up instead of the usual
        // instant volume-then-play, per the brief. Still the exact same
        // <audio> element, still resuming from wherever it was paused.
        wasVideoSilencedRef.current = false;
        void activateTrack(active, 0).then(() => {
          fadeAudioVolume(active, activeToken, activeTarget, MUSIC_FADE_MS);
        });
      } else {
        void activateTrackWithRetry(active, activeTarget);
      }
    } else if (!initialStartDoneRef.current) {
      initialStartDoneRef.current = true;
      active.volume = activeTarget;
    } else {
      fadeAudioVolume(active, activeToken, activeTarget, MUSIC_FADE_MS);
    }
    fadeAudioVolume(inactive, inactiveToken, 0, MUSIC_FADE_MS);

    const pauseTimer = window.setTimeout(() => {
      if (inactive.volume <= 0.001) inactive.pause();
    }, MUSIC_FADE_MS + 50);
    return () => window.clearTimeout(pauseTimer);
  }, [muted, phase, talking, videoAudioDone]);

  /** FIX 10 — FINAL-SCREEN FADE-OUT. */
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

  /* Tap-to-advance in the CENTER of the screen. */
  const skip = () => {
    tryPlayActive();
    // VIDEO SCENE: clicking the middle/main content area while the
    // memory is on screen pauses/resumes the actual <video> element
    // instead of advancing the timeline (there's nothing to "skip" to
    // anyway — this phase is gated on the video itself, see
    // `videoReleased`/VIDEO_SEGMENT). Left/right nav zones and other
    // buttons render above this at their own z-index with their own
    // onClick + stopPropagation, so they're unaffected.
    if (phase === "video") {
      videoSceneRef.current?.togglePauseResume();
      return;
    }
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
    setVideoReleased(false);
    setVideoAudioDone(false);
    lastTapRef.current = { side: null, time: 0 };
    trackedRef.current = new Set();
    initialStartDoneRef.current = false;
    hugLockedRef.current = false; // FIX 8: un-latch for the new run
    wasVideoSilencedRef.current = false; // VIDEO SCENE: reset for the new run
    videoSceneRef.current?.reset(); // VIDEO SCENE: rewind the memory itself for the new run
    setRunId((r) => r + 1);
    track("page_opened");
  };

  const nudge = (direction: -1 | 1) => {
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
        ? answered
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
          className="absolute left-1/2"
          style={{
            width: STAGE_W,
            // VIDEO SCENE: the wrapper's own height is the visible
            // CLIP_H slice itself (not the full STAGE_H) — that way
            // there's no leftover empty box-space below the slice
            // silently pushing the whole thing (and the head) higher
            // up the screen than intended. This is the ONLY Bunny
            // instance rendered in the video scene — the body isn't a
            // second layer sitting "behind" the frame, it's simply
            // never drawn: `overflow: hidden` on the inner wrapper
            // below clips the bunny's own canvas to just the top
            // CLIP_H slice (ears + head + raised paws), so nothing
            // below the shoulder line exists in the DOM at all while
            // this scene is active.
            height: isVideoScene ? VIDEO_BUNNY_CLIP_H : STAGE_H,
            marginLeft: -STAGE_W / 2,
            // VIDEO SCENE: pinned to a taller "bottom" (the tuned paw
            // line) instead of the screen's actual bottom edge.
            bottom: isVideoScene ? `${VIDEO_BUNNY_BOTTOM_VH}vh` : 0,
            transform: `scale(${isVideoScene ? fit * VIDEO_BUNNY_SCALE : fit})`,
            transformOrigin: "50% 100%",
            // VIDEO SCENE: this single clipped/repositioned copy of the
            // bunny must draw BEHIND the video frame (VideoScene is
            // z-40) — only its head/ears/raised paws poke up above the
            // frame's top edge (see VIDEO_PAW_OVERLAP_VH, now 0), so
            // nothing needs to render in front of the frame itself.
            zIndex: isVideoScene ? VIDEO_BUNNY_Z : 20,
            pointerEvents: isVideoScene ? "none" : undefined,
            transition:
              "bottom 1.1s cubic-bezier(0.22,1,0.36,1), height 1.1s cubic-bezier(0.22,1,0.36,1), transform 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            className="w-full"
            style={
              isVideoScene
                ? { height: "100%", overflow: "hidden" }
                : { height: "100%" }
            }
          >
            <motion.div
              animate={isVideoScene ? { x: 0, y: -VIDEO_BUNNY_LIFT } : { x: 0, y: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Bunny
                pose={pose}
                look={isVideoScene ? videoGlance : look}
                talking={talking}
                walking={walking}
                smiling={smiling}
                holdingCrown={holdingCrown}
                walkInFrom={walkInFrom}
              />
            </motion.div>
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

      {/* VIDEO SCENE: now ALWAYS mounted (not conditionally added/
          removed via AnimatePresence) — see VideoScene.tsx's top-of-
          file note for why this is the actual fix for the video's
          audio being silent. Visibility/interactivity are entirely
          driven by the `active` prop; there is no visible or
          interactive trace of this component while `active` is
          false. */}
      <VideoScene
        ref={videoSceneRef}
        active={phase === "video"}
        frameMaxHVh={VIDEO_FRAME_MAX_H_VH}
        frameBottomVh={VIDEO_FRAME_BOTTOM_VH}
        onEnded={() => setVideoAudioDone(true)}
        onComplete={() => setVideoReleased(true)}
      />

      <AnimatePresence>
        {isNameCard && (
          <motion.div
            key="dr-name-card"
            className="pointer-events-none absolute inset-x-0 top-[18%] z-40 -translate-y-1/2 px-8 text-center"
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