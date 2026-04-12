import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { TarotCard } from "@/data/tarotCards";
import { requestAIInterpretation } from "@/lib/ai";

interface AIInterpretationProps {
  spreadName: string;
  labels: string[];
  cards: TarotCard[];
}

const AIInterpretation = ({ spreadName, labels, cards }: AIInterpretationProps) => {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");

  const handleInterpret = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await requestAIInterpretation({
        spreadName,
        labels,
        cards,
        question: question.trim() || undefined,
      });
      setInterpretation(result.interpretation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar interpretação");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-8"
    >
      {!interpretation && !isLoading && (
        <div className="space-y-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Faça uma pergunta para a IA (opcional)..."
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground font-body text-lg focus:outline-none focus:border-primary/60 transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleInterpret}
            className="w-full font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-secondary text-secondary-foreground border border-primary/30 hover:border-primary/60 hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 glow-gold"
          >
            <Sparkles className="w-4 h-4" />
            Interpretar com IA
          </motion.button>
        </div>
      )}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-8"
        >
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="font-display text-sm tracking-[0.2em] uppercase text-primary/70">
            Consultando os astros...
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-body text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {interpretation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-primary/20 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg text-primary tracking-wider">
                Interpretação Mística
              </h3>
            </div>
            <div className="font-body text-foreground/85 text-lg leading-relaxed whitespace-pre-line">
              {interpretation}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setInterpretation(null);
                setError(null);
              }}
              className="mt-4 font-display tracking-[0.15em] uppercase text-xs px-6 py-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
            >
              Nova Interpretação
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIInterpretation;
