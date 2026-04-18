import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { icon: "🔮", text: "Conectando com sua energia…" },
  { icon: "🃏", text: "Embaralhando as cartas…" },
  { icon: "✨", text: "Revelando seu destino…" },
];

type Props = {
  onDone: () => void;
  /** Duração total antes de chamar onDone (ms). */
  totalMs?: number;
};

export function ConversionLoading({ onDone, totalMs = 2600 }: Props) {
  const [ix, setIx] = useState(0);

  useEffect(() => {
    const per = Math.max(600, Math.floor(totalMs / STEPS.length));
    const timers: number[] = [];
    for (let s = 0; s < STEPS.length; s += 1) {
      timers.push(window.setTimeout(() => setIx(s), s * per));
    }
    const done = window.setTimeout(() => onDone(), totalMs);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(done);
    };
  }, [onDone, totalMs]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={ix}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="text-center max-w-sm"
        >
          <p className="text-4xl mb-4" aria-hidden>
            {STEPS[ix]?.icon}
          </p>
          <p className="font-display text-lg md:text-xl text-primary tracking-wide">{STEPS[ix]?.text}</p>
        </motion.div>
      </AnimatePresence>
      <div className="mt-10 h-1 w-48 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: totalMs / 1000, ease: "linear" }}
        />
      </div>
    </div>
  );
}
