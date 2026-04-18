import { motion } from "framer-motion";
import { TarotCard } from "@/data/tarotCards";
import tarotBack from "@/assets/tarot-back.jpg";

interface TarotCardComponentProps {
  card: TarotCard | null;
  /** Orientação na mesa (frente de cabeça para baixo quando revelada). */
  isReversed?: boolean;
  label: string;
  isRevealed: boolean;
  onReveal: () => void;
  delay: number;
}

const TarotCardComponent = ({
  card,
  isReversed = false,
  label,
  isRevealed,
  onReveal,
  delay,
}: TarotCardComponentProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className="flex flex-col items-center gap-3"
    >
      {label.trim().length > 0 && (
        <span className="text-sm font-display tracking-[0.2em] uppercase text-muted-foreground">{label}</span>
      )}
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
            style={{
              backfaceVisibility: "hidden",
              transform: isRevealed && isReversed ? "rotateY(180deg) rotateZ(180deg)" : "rotateY(180deg)",
            }}
          >
            {card && (
              <>
                <h3 className="mb-1 font-display text-sm font-semibold text-primary md:text-base">{card.name}</h3>
                <p className="mb-2 text-xs italic text-muted-foreground">{card.nameEn}</p>
                {isReversed && (
                  <p className="text-[10px] font-display uppercase tracking-widest text-destructive/90">
                    Invertida
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TarotCardComponent;
