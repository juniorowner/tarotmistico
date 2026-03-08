import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { majorArcana, TarotCard } from "@/data/tarotCards";
import tarotBack from "@/assets/tarot-back.jpg";

interface TarotCardComponentProps {
  card: TarotCard | null;
  label: string;
  isRevealed: boolean;
  onReveal: () => void;
  delay: number;
}

const TarotCardComponent = ({ card, label, isRevealed, onReveal, delay }: TarotCardComponentProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className="flex flex-col items-center gap-3"
    >
      <span className="text-sm font-display tracking-[0.2em] uppercase text-muted-foreground">{label}</span>
      <div
        className="relative w-44 h-72 md:w-52 md:h-80 cursor-pointer perspective-1000"
        onClick={onReveal}
        style={{ perspective: "1000px" }}
      >
        <motion.div
          className="w-full h-full relative"
          initial={false}
          animate={{ rotateY: isRevealed ? 180 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Back */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden border-2 border-gold/30 glow-gold"
            style={{ backfaceVisibility: "hidden" }}
          >
            <img src={tarotBack} alt="Carta de Tarot" className="w-full h-full object-cover" />
            <div className="absolute inset-0 shimmer rounded-lg" />
          </div>

          {/* Front */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden border-2 border-gold/50 bg-card flex flex-col items-center justify-center p-4 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {card && (
              <>
                <span className="text-4xl mb-2">{card.emoji}</span>
                <h3 className="font-display text-sm md:text-base text-primary font-semibold mb-1">{card.name}</h3>
                <p className="text-xs text-muted-foreground italic mb-2">{card.nameEn}</p>
                <div className="w-8 h-px bg-primary/40 mb-2" />
                <p className="text-xs leading-relaxed text-foreground/80">{card.meaning}</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TarotCardComponent;
