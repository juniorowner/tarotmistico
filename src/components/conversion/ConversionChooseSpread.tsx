import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { QuickSpreadChoice } from "@/lib/inferSpreadFromQuestion";
import { inferSpreadFromQuestion } from "@/lib/inferSpreadFromQuestion";
import { trackEvent } from "@/lib/analytics";

const OPTIONS: Array<{
  id: QuickSpreadChoice;
  emoji: string;
  title: string;
  hint: string;
}> = [
  { id: "love", emoji: "❤️", title: "Amor", hint: "Relacionamentos e sentimentos" },
  { id: "yes-no", emoji: "🔮", title: "Sim ou Não", hint: "Uma resposta direta" },
  { id: "past-present-future", emoji: "✨", title: "Geral", hint: "Passado, presente e futuro" },
];

type Props = {
  question: string;
  onBack: () => void;
  onContinue: (choice: QuickSpreadChoice) => void;
};

export function ConversionChooseSpread({ question, onBack, onContinue }: Props) {
  const [selected, setSelected] = useState<QuickSpreadChoice>("past-present-future");

  useEffect(() => {
    const guess = inferSpreadFromQuestion(question);
    setSelected(guess);
    trackEvent("conversion_spread_auto_suggested", { spread_id: guess, has_question: question.trim().length > 0 });
  }, [question]);

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/95 pointer-events-none" />
      <div className="relative z-10 w-full max-w-lg mx-auto text-center space-y-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-body transition-colors -mt-4 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div>
          <p className="font-display text-xs tracking-[0.35em] uppercase text-primary/80 mb-3">Passo 2 de 4</p>
          <h2 className="font-display text-2xl md:text-3xl text-gold-gradient mb-2">Escolha o foco</h2>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Três opções — você pode mudar se preferir outra energia para a leitura.
          </p>
        </div>

        <div className="grid gap-3">
          {OPTIONS.map((opt, i) => {
            const active = selected === opt.id;
            return (
              <motion.button
                key={opt.id}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => {
                  setSelected(opt.id);
                  trackEvent("conversion_spread_selected", { spread_id: opt.id });
                }}
                className={`w-full text-left rounded-xl border px-4 py-4 transition-all flex items-center gap-4 ${
                  active
                    ? "border-primary bg-primary/15 glow-gold shadow-lg shadow-primary/10"
                    : "border-border bg-card/80 hover:border-primary/35"
                }`}
              >
                <span className="text-2xl shrink-0" aria-hidden>
                  {opt.emoji}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-display text-base text-primary">{opt.title}</span>
                  <span className="text-xs text-muted-foreground font-body">{opt.hint}</span>
                </span>
              </motion.button>
            );
          })}
        </div>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => onContinue(selected)}
          className="w-full font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all"
        >
          Continuar
        </motion.button>
      </div>
    </section>
  );
}
