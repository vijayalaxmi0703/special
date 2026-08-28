import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

/* ------------------------------------------------------------------ *
 * Scenery: background, subtitles and the crown burst live together    *
 * so the film only needs App + Bunny + Scenery.                       *
 * ------------------------------------------------------------------ */

function useSeeded(count: number, seed = 1) {
  return useMemo(() => {
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, () => ({
      x: rnd() * 100,
      y: rnd() * 100,
      size: 1 + rnd() * 2.4,
      delay: rnd() * 4,
      dur: 2.4 + rnd() * 3.6,
    }));
  }, [count, seed]);
}

export function Background({ showMoon = false, warm = false }: { showMoon?: boolean; warm?: boolean }) {
  const stars = useSeeded(70, 7);
  const motes = useSeeded(18, 31);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-night-gradient" />

      {stars.map((s, i) => (
        <motion.span
          key={`star-${i}`}
          className="absolute rounded-full bg-star"
          style={{ left: `${s.x}%`, top: `${s.y * 0.75}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.8, 1.25, 0.8] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {motes.map((m, i) => (
        <motion.span
          key={`mote-${i}`}
          className="absolute rounded-full bg-glow blur-[2px]"
          style={{ left: `${m.x}%`, bottom: "-5%", width: m.size * 3, height: m.size * 3 }}
          animate={{ y: ["0vh", "-105vh"], opacity: [0, 0.75, 0] }}
          transition={{ duration: 14 + m.dur * 2, delay: m.delay * 2, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <motion.div
        className="absolute left-1/2 top-[58%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-stage-glow blur-3xl"
        animate={{ opacity: [0.45, 0.7, 0.45], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0 bg-warm-wash"
        animate={{ opacity: warm ? 1 : 0 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute left-1/2 top-[14%] h-[22vmin] w-[22vmin] -translate-x-1/2 rounded-full bg-moon shadow-moon"
        initial={false}
        animate={showMoon ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: -40 }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 bg-vignette" />
    </div>
  );
}

export function Dialogue({
  line,
  position = "bottom",
  tone = "soft",
}: {
  line: string | null;
  position?: "bottom" | "top";
  tone?: "soft" | "gold";
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-50 flex justify-center px-6 ${
        position === "bottom" ? "bottom-[6vh]" : "top-[12vh]"
      }`}
    >
      <AnimatePresence mode="wait">
        {line ? (
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={`max-w-[34rem] text-balance text-center font-display text-[1.35rem] leading-snug tracking-wide drop-shadow-glow sm:text-2xl ${
              tone === "gold" ? "text-gold" : "text-cream"
            }`}
          >
            {line}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function CrownGlow({ active }: { active: boolean }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        return { x: Math.cos(angle) * 120, y: Math.sin(angle) * 120, d: i * 0.05 };
      }),
    [],
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-[13%] z-30 -translate-x-1/2">
      <motion.div
        className="h-[36vmin] w-[36vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-burst blur-2xl"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.95, 0.5, 0.8], scale: [0.4, 1.15, 0.95, 1.05] }}
        transition={{ duration: 2.4, ease: "easeOut" }}
      />
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-gold shadow-spark"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0.4, 1.3, 0.2] }}
          transition={{ duration: 1.8, delay: 0.25 + s.d, repeat: Infinity, repeatDelay: 1.1, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
