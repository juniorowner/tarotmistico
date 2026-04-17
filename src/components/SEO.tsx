import { Helmet } from "react-helmet-async";

type SeoProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const DEFAULT_SITE_NAME = "Tarot Místico";
const DEFAULT_IMAGE = "/placeholder.svg";

function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://example.com";
}

export default function SEO({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  noindex = false,
  jsonLd,
}: SeoProps) {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const imageUrl = image.startsWith("http") ? image : `${siteUrl}${image.startsWith("/") ? image : `/${image}`}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={DEFAULT_SITE_NAME} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      <meta name="citation_title" content={title} />
      <meta name="citation_language" content="pt-BR" />
      <meta name="citation_online_date" content={new Date().toISOString().slice(0, 10)} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
