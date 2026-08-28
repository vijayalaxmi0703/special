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
    "I came because someone was too shy to say all this properly herself.",
    "I just wanted to tell you something...",
    "I've always admired you more than I probably ever managed to say.",
    "Not just because you're my teacher...",
    "But because of the way you care about the people around you.",
    "You're incredibly dedicated to what you do.",
    "And somehow...",
    "you made a very quiet student feel comfortable talking.",
    "So today...",
    "I just wanted to say thank you.",
    "Thank you for being such a wonderful teacher, Mam. ❤️",
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
    yesAffirm: ["Yes… it's true. ✨", "You are appreciated more than you know. 🌷"],
    teacherImpact: [
      "The little things you do may mean more to your students than you'll ever know.",
      "Your words, your patience, and the encouragement you give can stay with someone for a long time.",
    ],
    pgCongrats: [
      "And Mam… there's something else I want to congratulate you for.",
      "Congratulations on your postgraduate journey. 🎓",
      "Managing college, your studies, and everything you handle at home while continuing your PG is truly inspiring.",
      "Seeing you manage so much and still keep moving forward inspires me to work harder and do better too. ✨",
    ],
    restMessage: [
      "It must get exhausting sometimes…",
      "So please remember to take some time for yourself too. 🌿",
      "You deserve to rest, breathe, and enjoy the little moments along the way.",
    ],
    drMoment: [
      "And someday…",
      NAME_CARD,
      "I can't wait to see 'Dr.' before your name. 🌸",
      "Until then, I'll be quietly cheering for you. 🤍",
    ],
    preCrown: ["And for everything you do…", "I think you deserve this. 👑"],
    crownFly: ["Because every wonderful teacher deserves a crown."],
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

  export default function App() {
    const [elapsed, setElapsed] = useState(0);
    const [muted, setMuted] = useState(true);
    const [runId, setRunId] = useState(0);
    const [fit, setFit] = useState(() => computeFit());

    /* The ONE piece of state that lives outside the timeline: whether the
      question has been answered yet — a small interaction flag, not a
      second clock. Everything it touches is a read-only gate on the
      single `elapsed` value; it never stores a phase or a line index of
      its own. */
    const [answered, setAnswered] = useState(false);

    const audioRef = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
    const lastTapRef = useRef<{ side: "left" | "right" | null; time: number }>({ side: null, time: 0 });
    const firedRef = useRef<Set<Phase>>(new Set());

    useEffect(() => {
      const measure = () => setFit(computeFit());
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
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

    /* crown_started / hug_started / experience_completed each fire once,
      the first time their phase is reached — guarded so re-visiting a
      phase via the hidden nav doesn't spam duplicate events. */
    useEffect(() => {
      const fireOnce = (evt: Parameters<typeof track>[0]) => {
        if (!firedRef.current.has(phase)) {
          firedRef.current.add(phase);
          track(evt);
        }
      };
      if (phase === "noticeCrown") fireOnce("crown_started");
      if (phase === "hug") fireOnce("hug_started");
      if (phase === "ending") fireOnce("experience_completed");
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

    /* Tap-to-advance in the CENTER of the screen — jumps `elapsed` to the
      start of the next line (using that line's own end time, not a flat
      constant), which naturally rolls into the next phase once the
      current one's lines run out. Clamped to the same gate the clock
      itself respects, so tapping can't skip past an unanswered question
      either. */
    const skip = () => {
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
      firedRef.current = new Set();
      setRunId((r) => r + 1);
      track("page_opened");
    };

    /* ---- HIDDEN TIMELINE NAVIGATION ---- (unchanged mechanism from
      before — clamp is `gateMs`, so forward-nav can't skip past an
      unanswered question any more than autoplay can.) */
    const nudge = (direction: -1 | 1) => {
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
      if (!audioRef.current) {
        const Ctx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        gain.connect(ctx.destination);
        [130.81, 164.81, 196.0, 246.94].forEach((f, i) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = f;
          const g = ctx.createGain();
          g.gain.value = 0.05 - i * 0.008;
          osc.connect(g);
          g.connect(gain);
          osc.start();
        });
        audioRef.current = { ctx, gain };
      }
      const { ctx, gain } = audioRef.current;
      void ctx.resume();
      const next = !muted;
      gain.gain.linearRampToValueAtTime(next ? 0.0001 : 0.16, ctx.currentTime + 0.8);
      setMuted(next);
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
              className="pointer-events-none absolute bottom-[20vh] right-[14vw] z-20 w-[22vw] max-w-[130px] drop-shadow-glow"
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
              onAttempt={(n) => track("no_attempt", { attempt: n })}
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
                Happy Teacher&apos;s Day, Mam! 🌷
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