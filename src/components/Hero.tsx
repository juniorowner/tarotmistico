import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
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
            ✧ Desvende seu destino ✧
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-gold-gradient mb-6 leading-tight">
            Tarot Místico
          </h1>
          <p className="font-body text-xl md:text-2xl text-foreground/70 max-w-xl mx-auto leading-relaxed">
            As cartas guardam mensagens ancestrais. Permita que a sabedoria do universo ilumine seu caminho.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-10"
        >
          <a
            href="#leitura"
            className="inline-block font-display tracking-[0.15em] uppercase text-sm px-8 py-4 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all"
          >
            Consultar as Cartas
          </a>
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
