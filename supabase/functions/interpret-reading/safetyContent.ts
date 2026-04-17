/**
 * Igual a `src/lib/safetyContent.ts` — manter em sincronia ao alterar regras.
 * Filtro só para texto livre do utilizador (pergunta), não para dados das cartas.
 */

const UNSAFE_USER_MESSAGE =
  "Não podemos processar pedidos sobre morte violenta, autoferimento, ferir outras pessoas ou atividades ilegais/perigosas. Se estiver em crise, procure ajuda profissional ou uma linha de apoio (no Brasil: CVV 188, 24 h).";

export function normalizeForSafetyScan(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[_*.,;:!?'"()[\]{}|/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCK_PATTERNS: RegExp[] = [
  /\bsuicid/,
  /\bsuicides?\b/,
  /\bkill\s+(myself|yourself|himself|herself|themself|ourselves)\b/,
  /\b(quero|vou|preciso|devo)\s+morrer\b/,
  /\bnao\s+quero\s+(mais\s+)?viver\b/,
  /\bme\s+matar\b/,
  /\bmatar\s*me\b/,
  /\btirar\s+a\s+minha\s+vida\b/,
  /\bacabar\s+com\s+a\s+minha\s+vida\b/,
  /\benforc/,
  /\bcortar\s+(os\s+)?pulsos?\b/,
  /\bcortar\s+a(s)?\s+veias\b/,
  /\bcortar\s+a\s+garganta\b/,
  /\bme\s+machucar\s+(de\s+)?verdade\b/,
  /\bcomo\s+matar\b/,
  /\bcomo\s+assassin/,
  /\bcomo\s+envenen/,
  /\b(plano|ideia|maneira)\s+para\s+matar\b/,
  /\bmatar\s+(alguem|alguém|pessoas|gente|todos|todas)\b/,
  /\bmatar\s+(meu|minha|meus|minhas)\s+\w{2,}/,
  /\bmatar\s+(ele|ela|eles|elas)\b/,
  /\bmatar\s+(o|a)\s+(pai|mae|mãe|filho|filha|marido|mulher|esposo|esposa|namorado|namorada)\b/,
  /\bassassinat/,
  /\benvenenar\s+(alguem|alguém|o|a|meu|minha)\b/,
  /\bsequestrar\s+e\s+matar\b/,
  /\btorturar\s+(ate|até)\s+matar\b/,
  /\bfabric(ar|o)\s+(uma\s+)?bomba\b/,
  /\bbomba\s+caseira\b/,
  /\bexplosivo\s+caseiro\b/,
  /\bcomo\s+fazer\s+(um\s+)?(veneno|explosivo)\s+para\s+matar\b/,
  /\bestupro\b/,
  /\babuso\s+sexual\s+de\s+menor\b/,
  /\bpedofil/,
];

export function userQuestionFailsSafetyPolicy(text: string): boolean {
  const t = normalizeForSafetyScan(text);
  if (t.length < 3) return false;
  return BLOCK_PATTERNS.some((re) => re.test(t));
}

export function unsafeUserContentMessage(): string {
  return UNSAFE_USER_MESSAGE;
}
