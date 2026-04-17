import { motion } from "framer-motion";
import { spreadTypes, SpreadType } from "@/data/spreadTypes";

interface SpreadSelectorProps {
  onSelect: (spread: SpreadType) => void;
  selected: SpreadType | null;
}

const SpreadSelector = ({ onSelect, selected }: SpreadSelectorProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
      {spreadTypes.map((spread, i) => (
        <motion.button
          key={spread.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => onSelect(spread)}
          className={`relative p-5 rounded-xl border text-left transition-all ${
            selected?.id === spread.id
              ? "border-primary bg-primary/10 glow-gold"
              : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
          }`}
        >
          <h3 className="font-display text-sm text-primary mb-1">{spread.name}</h3>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            {spread.description}
          </p>
          <span className="mt-2 inline-block text-xs font-display tracking-wider text-primary/60">
            {spread.cardCount} {spread.cardCount === 1 ? "carta" : "cartas"}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default SpreadSelector;
