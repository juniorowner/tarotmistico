import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { majorArcana, TarotCard } from "@/data/tarotCards";
import TarotCardComponent from "./TarotCard";

const getRandomCards = (count: number): TarotCard[] => {
  const shuffled = [...majorArcana].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const TarotSpread = () => {
  const [cards, setCards] = useState<TarotCard[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);

  const startReading = useCallback(() => {
    const selected = getRandomCards(3);
    setCards(selected);
    setRevealed([false, false, false]);
    setHasStarted(true);
    setSelectedCard(null);
  }, []);

  const revealCard = (index: number) => {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setSelectedCard(cards[index]);
  };

  const labels = ["Passado", "Presente", "Futuro"];
  const allRevealed = revealed.every(Boolean);

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display text-3xl md:text-4xl text-gold-gradient mb-4"
        >
          Sua Leitura
        </motion.h2>
        <p className="text-muted-foreground font-body text-lg mb-10 max-w-md mx-auto">
          Concentre-se em sua pergunta, respire fundo e clique para revelar as cartas.
        </p>

        {!hasStarted ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startReading}
            className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold transition-all hover:brightness-110"
          >
            ✦ Iniciar Leitura ✦
          </motion.button>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-12">
              {cards.map((card, i) => (
                <TarotCardComponent
                  key={card.id}
                  card={card}
                  label={labels[i]}
                  isRevealed={revealed[i]}
                  onReveal={() => revealCard(i)}
                  delay={i * 0.2}
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
                    <p><span className="text-primary font-semibold">Significado:</span> <span className="text-foreground/70">{selectedCard.meaning}</span></p>
                    <p><span className="text-destructive font-semibold">Invertida:</span> <span className="text-foreground/70">{selectedCard.reversed}</span></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {allRevealed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startReading}
                className="font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-all"
              >
                Nova Leitura
              </motion.button>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default TarotSpread;
