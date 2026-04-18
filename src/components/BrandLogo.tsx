import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo.svg";

type BrandLogoProps = {
  className?: string;
  /** Altura visual da logo na barra (tailwind h-*). */
  logoClassName?: string;
};

/** Logo da marca — ficheiro em `src/assets/logo.svg` (substitua pelo seu PNG/SVG). */
export function BrandLogo({ className, logoClassName }: BrandLogoProps) {
  return (
    <Link
      to="/"
      className={cn("shrink-0 inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md", className)}
    >
      <img
        src={logoSrc}
        alt="Tarot Místico"
        className={cn("h-9 w-auto max-h-10 max-w-[min(220px,50vw)] object-contain object-left", logoClassName)}
        decoding="async"
      />
    </Link>
  );
}
