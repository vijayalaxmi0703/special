import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * QuestionCard — the one deliberately non-linear beat in the whole film:
 * "I believe you are one of the best lecturers a student could ask for.
 * Do you agree?" with a playfully evasive NO button.
 *
 * ROUND 4:
 *
 * 1) NO's final (3rd) escape is now a distinct, sequenced beat instead
 *    of happening at the same instant as the fade-out. Previously
 *    `noVisible = attempts < MAX_NO_ATTEMPTS` flipped to false the same
 *    render the 3rd attempt's state committed, so the final hop and the
 *    opacity fade animated simultaneously — the move was barely
 *    legible before the button vanished. Attempt/interaction gating
 *    (`noInteractive`) and actual unmounting (`noHidden`) are now two
 *    separate pieces of state: on the 3rd attempt, NO immediately stops
 *    accepting further attempts AND jumps to a bigger "final escape"
 *    offset (FINAL_ESCAPE_MULTIPLIER × a normal hop) — but stays
 *    mounted and visible for FINAL_ESCAPE_DELAY_MS so that big final
 *    move is actually seen — THEN it's removed (fading/scaling out via
 *    its own `exit`).
 *
 * 2) YES now animates into the horizontal center once NO is gone,
 *    instead of staying pinned on the right. This falls directly out of
 *    the true-flex-row layout from the previous round: NO is wrapped in
 *    <AnimatePresence mode="popLayout">, and YES is now a
 *    `motion.button` with the `layout` prop. `popLayout` removes an
 *    exiting item from the flex flow immediately (while it's still
 *    animating its own exit), which lets YES's `layout` animation pick
 *    up the resulting flex reflow — from "second of two centered items"
 *    to "sole centered item" — and glide there smoothly via Framer's
 *    FLIP animation, rather than snapping or leaving a gap.
 *
 * Everything else — the reaction text, the dark-purple glass card
 * styling, NO's normal (1st/2nd attempt) hop mechanism and its
 * ~80px NO_DODGE_DISTANCE, the analytics calls (`onAttempt`, `onYes`),
 * and the question text — is unchanged from before.
 */

const REACTIONS = [
    "Wait— you actually clicked No?.Hmm… I knew you might say that.But unfortunately, I don't think I'm going to accept that answer.🤭",
    "I'll pretend I didn't see that.,reconsider mam",
    "Due to this bunny respectfully disagreeing, the No button has been politely dismissed.😄",
    "Well… I suppose there's only one option left now, Mam.😁hehe"
];
const MAX_NO_ATTEMPTS = REACTIONS.length;
const REACTION_HOLD_MS = 5200;

/** How much bigger the 3rd/final escape is than a normal hop, and how
    long NO stays visible after that final hop before it's removed —
    long enough that the bigger move actually reads before NO fades. */
const FINAL_ESCAPE_MULTIPLIER = 1.6;
const FINAL_ESCAPE_DELAY_MS = 420;

/** Tune these if the card still overlaps the bunny's face, or the hands
    end up hidden behind it, once you see it rendered.
    Both constants are exported. VideoScene.tsx imports CARD_BOTTOM_VH so
    the memory frame is bottom-anchored at this exact same distance from
    the bottom of the screen, giving it the same relative position to the
    bunny that QuestionCard already has — see App.tsx's "VIDEO SCENE —
    POSITIONING" comment for the full reasoning. It now ALSO imports
    CARD_MAX_HEIGHT_VH, so the frame is capped at the exact same height
    envelope as this card, not just bottom-anchored the same way — the
    bunny's "lean" arm pose was tuned to grip THIS card's actual size, so
    reusing both numbers (not just the bottom offset) is what makes that
    same, unmodified pose actually reach a wider/taller video frame too.
    See VideoScene.tsx's top-of-file note for the full reasoning. */
export const CARD_MAX_HEIGHT_VH = 34;
export const CARD_BOTTOM_VH = 3;

/* Translucent dark-purple "glass" card with soft pink/gold glow, so it
   reads as part of the same night-sky/magical environment as the rest
   of the experience, while staying readable and not fully see-through. */
const COLOR = {
    outerFrom: "rgba(58, 28, 92, 0.92)", // deep purple glass, top
    outerTo: "rgba(30, 14, 54, 0.92)", // deep purple glass, bottom
    outerBorder: "rgba(247, 209, 158, 0.35)", // soft gold hairline
    innerBorder: "rgba(232, 178, 255, 0.22)", // faint pink-lilac dashed line
    glow: "rgba(232, 168, 255, 0.28)", // pink-gold ambient glow
    text: "#fdf1e2", // warm cream, readable on dark glass
    no: "#e8776c", // coral — unchanged
    noText: "#ffffff",
    yes: "#e0b45c", // soft gold, matches the magical palette
    yesText: "#33204f",
};

/* Shared button sizing so NO and YES always carry identical visual
   weight — same height, padding, corner radius, font size. Because both
   buttons are ordinary flex children of the same row with
   items-center, their vertical centers are guaranteed equal by layout,
   not by hand-matched positioning values. */
const BUTTON_CLASS =
    "rounded-full px-7 py-2.5 font-display text-sm font-semibold shadow-md sm:px-8 sm:text-base";

/** The single, explicit "how far NO jumps" value (px) for a normal
    (1st/2nd attempt) hop. Every entry in DODGE_OFFSETS has a magnitude
    close to this; the 3rd/final attempt multiplies it by
    FINAL_ESCAPE_MULTIPLIER. */
const NO_DODGE_DISTANCE = 80;

type Offset = { x: number; y: number };

/** Hand-picked hop offsets (relative to NO's own resting flex slot), all
    at ~NO_DODGE_DISTANCE px. Biased toward negative x / moderate y so
    NO always stays well clear of YES (which sits a fixed ~140px+ to its
    right in the flex row while both are present) and inside the card. */
const DODGE_OFFSETS: Offset[] = [
    { x: -75, y: -30 },
    { x: -40, y: -68 },
    { x: -78, y: 28 },
    { x: -25, y: 66 },
    { x: -80, y: 0 },
    { x: -55, y: -45 },
    { x: -60, y: 40 },
    { x: -30, y: -62 },
];
const REST_OFFSET: Offset = { x: 0, y: 0 };

/** Smooth, quick, slightly bouncy "hop" — matches the 200–350ms /
    natural-easing / playful requirement instead of an open-ended spring. */
const hopTransition = {
    x: { duration: 0.26, ease: [0.34, 1.56, 0.64, 1] as const },
    y: { duration: 0.26, ease: [0.34, 1.56, 0.64, 1] as const },
    default: { duration: 0.2, ease: "easeOut" as const },
};

const pickDodgeIndex = (excludeIndex: number): number => {
    if (DODGE_OFFSETS.length <= 1) return 0;
    let idx = excludeIndex;
    while (idx === excludeIndex) {
        idx = Math.floor(Math.random() * DODGE_OFFSETS.length);
    }
    return idx;
};

export default function QuestionCard({
    questionText,
    onYes,
    onAttempt,
}: {
    questionText: string;
    onYes: () => void;
    onAttempt: (attempts: number) => void;
}) {
    const [attempts, setAttempts] = useState(0);
    const [noOffset, setNoOffset] = useState<Offset>(REST_OFFSET);
    const [noHidden, setNoHidden] = useState(false);
    const [reaction, setReaction] = useState<string | null>(null);
    const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastDodgeIndex = useRef<number>(-1);

    useEffect(
        () => () => {
            if (reactionTimer.current) clearTimeout(reactionTimer.current);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        },
        [],
    );

    /** Stops accepting further attempts as soon as the 3rd/final one
        starts — separate from `noHidden`, which controls whether NO is
        still mounted at all. This gap between the two is exactly the
        window where the final, bigger escape plays out before NO is
        removed. */
    const noInteractive = attempts < MAX_NO_ATTEMPTS;

    const handleNoAttempt = () => {
        if (!noInteractive) return;
        const next = attempts + 1;
        setAttempts(next);
        onAttempt(next);

        const isFinal = next === MAX_NO_ATTEMPTS;
        const nextIndex = pickDodgeIndex(lastDodgeIndex.current);
        lastDodgeIndex.current = nextIndex;
        const base = DODGE_OFFSETS[nextIndex]!;
        setNoOffset(isFinal ? { x: base.x * FINAL_ESCAPE_MULTIPLIER, y: base.y * FINAL_ESCAPE_MULTIPLIER } : base);

        const msg = REACTIONS[Math.min(next, REACTIONS.length) - 1] ?? null;
        setReaction(msg);
        if (reactionTimer.current) clearTimeout(reactionTimer.current);
        reactionTimer.current = setTimeout(() => setReaction(null), REACTION_HOLD_MS);

        if (isFinal) {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setNoHidden(true), FINAL_ESCAPE_DELAY_MS);
        }
    };

    return (
        <motion.div
            className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center px-5"
            style={{ paddingBottom: `${CARD_BOTTOM_VH}vh` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
        >
            {/* Outer glass frame: translucent dark-purple gradient, soft gold
                hairline border, subtle pink/gold ambient glow — reads as a
                floating magical dialogue card rather than a UI rectangle
                dropped on top of the scene. */}
            <div
                className="pointer-events-auto relative w-[92vw] max-w-sm rounded-[26px] p-[1.5px] shadow-2xl backdrop-blur-md"
                style={{
                    maxHeight: `${CARD_MAX_HEIGHT_VH}vh`,
                    background: `linear-gradient(160deg, ${COLOR.outerFrom}, ${COLOR.outerTo})`,
                    border: `1px solid ${COLOR.outerBorder}`,
                    boxShadow: `0 0 28px ${COLOR.glow}, 0 8px 30px rgba(0,0,0,0.45)`,
                }}
            >
                {/* small, understated sparkle accents — kept subtle so the
                    card still reads as part of the night scene */}
                <span aria-hidden className="pointer-events-none absolute -top-2 left-5 text-sm opacity-80 sm:text-base">
                    ✨
                </span>
                <span aria-hidden className="pointer-events-none absolute -top-2 right-5 text-sm opacity-80 sm:text-base">
                    🌙
                </span>

                {/* Inner panel, faint dashed lilac border, same dark-glass
                    family as the outer frame but very slightly lighter so the
                    text area reads as a distinct surface. */}
                <div
                    className="flex h-full flex-col justify-center gap-3 rounded-[24px] border border-dashed px-4 py-4 text-center backdrop-blur-md sm:gap-4 sm:px-6 sm:py-5"
                    style={{
                        backgroundColor: "rgba(20, 10, 40, 0.55)",
                        borderColor: COLOR.innerBorder,
                    }}
                >
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={reaction ?? "question"}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.35 }}
                            className="font-display text-sm font-medium leading-snug sm:text-base"
                            style={{ color: COLOR.text }}
                        >
                            {reaction ?? questionText}
                        </motion.p>
                    </AnimatePresence>

                    {/* Button row: a plain flex row. NO and YES are ordinary
                        flex children with identical box styling and
                        items-center cross-axis alignment, so their vertical
                        centers are equal by construction. NO's hop is a
                        transform (x/y) layered on top of its normal flex
                        slot. `popLayout` lets YES's `layout` animation react
                        the instant NO is removed from flow, sliding YES into
                        the now-sole-centered position instead of snapping or
                        leaving a gap on the right. */}
                    <div className="flex h-28 w-full flex-row items-center justify-center gap-6 sm:h-32">
                        <AnimatePresence mode="popLayout">
                            {!noHidden && (
                                <motion.button
                                    key="no-button"
                                    onPointerEnter={handleNoAttempt}
                                    onPointerDown={handleNoAttempt}
                                    onTouchStart={handleNoAttempt}
                                    onClick={(e) => e.preventDefault()}
                                    initial={false}
                                    animate={{ opacity: 1, scale: 1, x: noOffset.x, y: noOffset.y }}
                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                                    transition={hopTransition}
                                    style={{
                                        backgroundColor: COLOR.no,
                                        color: COLOR.noText,
                                        pointerEvents: noInteractive ? "auto" : "none",
                                    }}
                                    className={BUTTON_CLASS}
                                >
                                    NO
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <motion.button
                            layout
                            onClick={onYes}
                            transition={{ layout: { type: "spring", stiffness: 260, damping: 28 } }}
                            style={{
                                backgroundColor: COLOR.yes,
                                color: COLOR.yesText,
                            }}
                            className={`${BUTTON_CLASS} transition-transform active:scale-95`}
                        >
                            YES
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}