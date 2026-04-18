import { useState } from "react";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import { PENDING_GUEST_QUESTION_KEY } from "@/lib/guestOnce";

const Hero = () => {
  const [question, setQuestion] = useState("");

  const goToReading = () => {
    const q = question.trim();
    if (q && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(PENDING_GUEST_QUESTION_KEY, q);
      } catch {
        /* ignore quota */
      }
    }
    const el = document.getElementById("leitura");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.location.hash = "leitura";
  };

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <p className="font-display text-sm tracking-[0.4em] uppercase text-primary/80 mb-4">
            Amor · decisões · caminhos
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-gold-gradient mb-4 leading-tight">
            O que as cartas dizem sobre você?
          </h1>
          <p className="font-body text-lg md:text-xl text-foreground/80 max-w-xl mx-auto leading-relaxed mb-2">
            Faça uma pergunta de verdade — ou deixe em branco para uma leitura geral. Veja as cartas na hora; a
            interpretação com IA tem uma experiência grátis por aparelho.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 w-full max-w-md mx-auto space-y-3 px-2"
        >
          <label htmlFor="hero-question" className="sr-only">
            Sua pergunta para o tarot
          </label>
          <input
            id="hero-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToReading()}
            placeholder="Ex.: Essa pessoa pensa em mim? Vale insistir?"
            className="w-full px-4 py-3 rounded-lg bg-background/90 border border-border text-foreground placeholder:text-muted-foreground font-body text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={goToReading}
            className="w-full font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all"
          >
            Descobrir agora
          </button>
          <p className="text-[11px] text-muted-foreground font-body text-center leading-snug">
            Entretenimento e reflexão — não substitui acompanhamento profissional.
          </p>
        </motion.div>

        {/* Decorative stars */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/30 text-xs"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          >
            ✦
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Hero;
