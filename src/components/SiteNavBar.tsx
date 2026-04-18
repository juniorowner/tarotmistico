import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

type SiteNavBarProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Barra fixa no topo com links / menu. Ao rolar a página, ganha fundo opaco para o conteúdo não aparecer por baixo.
 */
export function SiteNavBar({ children, className }: SiteNavBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 pointer-events-none pt-[max(1rem,env(safe-area-inset-top))] px-4 pb-3 transition-[background-color,box-shadow,border-color] duration-200",
        scrolled
          ? "bg-background border-b border-border/80 shadow-md"
          : "bg-transparent border-b border-transparent",
        className
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-6xl mx-auto items-center justify-between gap-3 flex-wrap px-0 min-h-10">
        <BrandLogo />
        <div className="flex items-center justify-end gap-2 flex-wrap flex-1 min-w-0">
          {children}
        </div>
      </div>
    </header>
  );
}
