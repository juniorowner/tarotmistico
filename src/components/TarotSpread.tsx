import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { majorArcana, TarotCard } from "@/data/tarotCards";
import { SpreadType } from "@/data/spreadTypes";
import { saveDiaryEntry } from "@/lib/diary";
import { BookOpen, Save } from "lucide-react";
import TarotCardComponent from "./TarotCard";
import SpreadSelector from "./SpreadSelector";
import { toast } from "sonner";

const getRandomCards = (count: number): TarotCard[] => {
  const shuffled = [...majorArcana].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const TarotSpread = () => {
  const [selectedSpread, setSelectedSpread] = useState<SpreadType | null>(null);
  const [cards, setCards] = useState<TarotCard[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);

  const startReading = useCallback(() => {
    if (!selectedSpread) return;
    const selected = getRandomCards(selectedSpread.cardCount);
    setCards(selected);
    setRevealed(new Array(selectedSpread.cardCount).fill(false));
    setHasStarted(true);
    setSelectedCard(null);
  }, [selectedSpread]);

  const revealCard = (index: number) => {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setSelectedCard(cards[index]);
  };

  const resetAll = () => {
    setSelectedSpread(null);
    setCards([]);
    setRevealed([]);
    setHasStarted(false);
    setSelectedCard(null);
  };

  const navigate = useNavigate();
  const allRevealed = revealed.length > 0 && revealed.every(Boolean);

  const saveReading = () => {
    if (!selectedSpread) return;
    saveDiaryEntry({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      spreadName: selectedSpread.name,
      spreadEmoji: selectedSpread.emoji,
      labels: selectedSpread.labels,
      cards,
      note: "",
    });
    toast.success("Leitura salva no diário! ✨");
  };

  const getGridClass = () => {
    if (!selectedSpread) return "";
    switch (selectedSpread.id) {
      case "yes-no":
        return "flex justify-center";
      case "past-present-future":
        return "flex flex-wrap justify-center gap-6 md:gap-10";
      case "love":
        return "flex flex-wrap justify-center gap-4 md:gap-8";
      case "celtic-cross":
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 justify-items-center";
      default:
        return "flex flex-wrap justify-center gap-6 md:gap-10";
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display text-3xl md:text-4xl text-gold-gradient mb-4"
        >
          Sua Leitura
        </motion.h2>
        <p className="text-muted-foreground font-body text-lg mb-10 max-w-md mx-auto">
          Escolha o tipo de leitura, concentre-se em sua pergunta e revele as cartas.
        </p>

        {!hasStarted ? (
          <>
            <SpreadSelector onSelect={setSelectedSpread} selected={selectedSpread} />
            <AnimatePresence>
              {selectedSpread && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startReading}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold transition-all hover:brightness-110"
                >
                  ✦ Iniciar {selectedSpread.name} ✦
                </motion.button>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            {selectedSpread && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-display text-sm tracking-[0.2em] uppercase text-primary/70 mb-8"
              >
                {selectedSpread.emoji} {selectedSpread.name}
              </motion.p>
            )}

            <div className={`${getGridClass()} mb-12`}>
              {cards.map((card, i) => (
                <TarotCardComponent
                  key={card.id}
                  card={card}
                  label={selectedSpread?.labels[i] || ""}
                  isRevealed={revealed[i]}
                  onReveal={() => revealCard(i)}
                  delay={i * 0.15}
                />
              ))}
            </div>

            <AnimatePresence>
              {selectedCard && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-lg mx-auto bg-card border border-border rounded-xl p-6 mb-8"
                >
                  <h3 className="font-display text-xl text-primary mb-2">
                    {selectedCard.emoji} {selectedCard.name}
                  </h3>
                  <p className="text-foreground/80 font-body text-lg leading-relaxed mb-3">
                    {selectedCard.description}
                  </p>
                  <div className="flex flex-col gap-2 text-sm">
                    <p>
                      <span className="text-primary font-semibold">Significado:</span>{" "}
                      <span className="text-foreground/70">{selectedCard.meaning}</span>
                    </p>
                    <p>
                      <span className="text-destructive font-semibold">Invertida:</span>{" "}
                      <span className="text-foreground/70">{selectedCard.reversed}</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {allRevealed && (
              <div className="flex flex-wrap justify-center gap-4">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveReading}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar no Diário
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startReading}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-all"
                >
                  Repetir Leitura
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetAll}
                  className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                >
                  Escolher Outra Leitura
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default TarotSpread;
