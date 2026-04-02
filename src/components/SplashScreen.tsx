import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("hold"), 600);
    const exitTimer = setTimeout(() => setPhase("exit"), 2400);
    const doneTimer = setTimeout(() => onComplete(), 3200);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? null : null}
      <motion.div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "exit" ? 0 : 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {/* Ambient particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 1.5,
              delay: 0.3 + Math.random() * 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Radial glow */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 2.5, 2], opacity: [0, 0.6, 0.3] }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        {/* Star symbol */}
        <motion.div
          className="relative z-10 text-primary/60 text-2xl mb-6"
          initial={{ opacity: 0, rotateZ: -90 }}
          animate={{ opacity: 1, rotateZ: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        >
          ✦ ✧ ✦
        </motion.div>

        {/* Title */}
        <motion.h1
          className="relative z-10 font-display text-5xl md:text-7xl text-gold-gradient mb-3"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          Tarot Místico
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="relative z-10 font-display text-xs tracking-[0.4em] uppercase text-primary/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          Desvende seu destino
        </motion.p>

        {/* Version badge */}
        <motion.div
          className="relative z-10 mt-8 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
        >
          <span className="font-display text-[10px] tracking-[0.3em] uppercase text-primary/60">
            v1.0
          </span>
        </motion.div>

        {/* Bottom decorative line */}
        <motion.div
          className="absolute bottom-16 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary/30" />
          <span className="text-primary/30 text-xs">✧</span>
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-primary/30" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
