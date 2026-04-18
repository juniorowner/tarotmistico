import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DealtTarotCard } from "@/data/tarotCards";
import TarotCardComponent from "@/components/TarotCard";
import { CTA_DISCOVER_MY_ANSWER } from "@/lib/ctaCopy";

type Props = {
  card: DealtTarotCard;
  onSeeMeaning: () => void;
};

export function ConversionCardPreview({ card, onSeeMeaning }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/96 backdrop-blur-md px-4 py-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md flex flex-col items-center gap-8 sm:gap-10"
      >
        <p className="font-display text-xs tracking-[0.35em] uppercase text-primary/80">Sua carta</p>

        {/* scale aumenta o desenho mas não o espaço no layout — margem extra evita sobrepor o título */}
        <div className="flex w-full flex-col items-center pb-8 sm:pb-10">
          <div className="origin-center scale-105 md:scale-110">
            <TarotCardComponent
              card={card}
              isReversed={card.isReversed}
              label=""
              isRevealed={revealed}
              onReveal={() => setRevealed(true)}
              delay={0}
              hideFaceTitle
            />
          </div>
        </div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-2xl md:text-4xl text-gold-gradient text-center leading-tight px-2 mt-1 relative z-10"
        >
          {card.name.toUpperCase()}
        </motion.h2>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: revealed ? 1 : 0.4, y: 0 }}
          transition={{ delay: 0.5 }}
          disabled={!revealed}
          onClick={onSeeMeaning}
          className="w-full max-w-sm font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          {CTA_DISCOVER_MY_ANSWER}
        </motion.button>
      </motion.div>
    </div>
  );
}
