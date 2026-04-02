import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Hero from "@/components/Hero";
import TarotSpread from "@/components/TarotSpread";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Diary link */}
      <div className="fixed top-4 right-4 z-50">
        <Link
          to="/diario"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 backdrop-blur border border-border hover:border-primary/40 text-primary transition-all font-display text-xs tracking-wider uppercase"
        >
          <BookOpen className="w-4 h-4" />
          Diário
        </Link>
      </div>
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
