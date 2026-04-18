import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo.png";

type BrandLogoProps = {
  className?: string;
  /** Altura visual da logo na barra (tailwind h-*). */
  logoClassName?: string;
  /** `hero` — destaque central na landing; `nav` — barra superior. */
  variant?: "nav" | "hero";
};

/** Logo da marca — ficheiro em `src/assets/logo.png`. */
export function BrandLogo({ className, logoClassName, variant = "nav" }: BrandLogoProps) {
  const isHero = variant === "hero";
  return (
    <Link
      to="/"
      className={cn(
        "shrink-0 inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md",
        isHero && "justify-center max-w-full",
        className
      )}
    >
      <img
        src={logoSrc}
        alt="Tarot Místico"
        className={cn(
          isHero
            ? "h-auto max-h-[min(42vh,14rem)] sm:max-h-[min(38vh,16rem)] w-auto max-w-[min(92vw,32rem)] object-contain object-center"
            : "h-9 w-auto max-h-10 max-w-[min(220px,50vw)] object-contain object-left",
          logoClassName
        )}
        decoding="async"
      />
    </Link>
  );
}
