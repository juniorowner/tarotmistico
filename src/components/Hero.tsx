import { useState } from "react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { CTA_DISCOVER_MY_ANSWER } from "@/lib/ctaCopy";

type HeroProps = {
  onDiscover: (question: string) => void;
  /** Atalho discreto para quem quer Cruz Celta / catálogo sem passar pelo funil. */
  onOpenFullCatalog?: () => void;
};

const Hero = ({ onDiscover, onOpenFullCatalog }: HeroProps) => {
  const [question, setQuestion] = useState("");
  const { user, friendlyName } = useAuth();

  const submit = () => {
    onDiscover(question.trim());
  };

  return (
    <section className="relative min-h-[78vh] flex items-center justify-center overflow-hidden pt-[max(5.25rem,calc(env(safe-area-inset-top)+4rem))]">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="mb-4 flex justify-center px-1">
            <BrandLogo variant="hero" />
          </h1>
          {user && friendlyName ? (
            <p className="font-body text-sm md:text-base text-primary/90 max-w-xl mx-auto leading-relaxed mb-2">
              Olá, {friendlyName}
            </p>
          ) : null}
          <p className="font-body text-lg md:text-xl text-foreground/85 max-w-xl mx-auto leading-relaxed mb-8">
            Descubra agora com uma leitura de tarot gratuita
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="mt-2 w-full max-w-md mx-auto space-y-4 px-2"
        >
          <label htmlFor="hero-question" className="sr-only">
            Digite sua pergunta
          </label>
          <input
            id="hero-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="O que você quer descobrir?"
            className="w-full px-4 py-3 rounded-lg bg-background/90 border border-border text-foreground placeholder:text-muted-foreground font-body text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={submit}
            className="w-full font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all"
          >
            {CTA_DISCOVER_MY_ANSWER}
          </button>

          <div className="pt-4 flex flex-wrap justify-center items-center gap-x-3 sm:gap-x-4 gap-y-2 text-sm text-muted-foreground font-body px-1 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden>🔮</span>
              +10.000 leituras realizadas
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden>⚡</span>
              Resultado em segundos
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden>💬</span>
              100% privado
            </span>
          </div>

          {onOpenFullCatalog && (
            <p className="pt-5 text-center">
              <button
                type="button"
                onClick={onOpenFullCatalog}
                className="text-xs text-muted-foreground/85 hover:text-primary font-body underline-offset-4 hover:underline transition-colors"
              >
                Catálogo completo — Cruz Celta e outras
              </button>
            </p>
          )}
        </motion.div>

        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/30 text-xs pointer-events-none"
            style={{
              top: `${20 + ((i * 17) % 55)}%`,
              left: `${10 + ((i * 23) % 75)}%`,
            }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.3 }}
          >
            ✦
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Hero;
