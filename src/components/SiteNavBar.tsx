import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      <div
        className={cn(
          "pointer-events-auto ml-auto flex max-w-full min-w-0 flex-nowrap items-center justify-end gap-1 sm:gap-2",
          "overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {children}
      </div>
    </header>
  );
}
