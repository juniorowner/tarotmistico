import Hero from "@/components/Hero";
import TarotSpread from "@/components/TarotSpread";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <div id="leitura">
        <TarotSpread />
      </div>
      <footer className="py-8 text-center border-t border-border/50">
        <p className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground">
          ✧ Tarot Místico ✧
        </p>
        <p className="text-xs text-muted-foreground/50 mt-2 font-body">
          As cartas são guias, não destinos. Use com sabedoria.
        </p>
      </footer>
    </div>
  );
};

export default Index;
