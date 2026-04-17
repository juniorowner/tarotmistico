/**
 * Filtro de segurança para texto livre do utilizador (ex.: pergunta à IA).
 * Não usar sobre textos fixos das cartas (ex.: nomes como "A Morte" no baralho).
 */

const UNSAFE_USER_MESSAGE =
  "Não podemos processar este pedido. Não fornecemos previsões categóricas sobre saúde/gravidez/morte (ex.: diagnósticos, certeza de gravidez, data de morte), nem conteúdo sobre autoferimento, violência ou atividades ilegais/perigosas. Procure orientação profissional adequada (médica, psicológica, jurídica etc.; no Brasil, CVV 188 para apoio emocional).";

/** Normaliza para comparação: minúsculas, sem acentos, pontuação fraca → espaço. */
export function normalizeForSafetyScan(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[_*.,;:!?'"()[\]{}|/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Padrões sobre texto já normalizado (acentos removidos).
 * Evita bloquear só a palavra "morte" (ex.: Arcano da Morte); foca em intenção de dano e instruções perigosas.
 */
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
  // Previsões categóricas sensíveis (saúde, gravidez, morte).
  /\b(estou|to)\s+gravida\b/,
  /\bestou\s+gr[aá]vida\b/,
  /\beu\s+estou\s+gravida\b/,
  /\bestou\s+doente\b/,
  /\bestou\s+com\s+cancer\b/,
  /\btenho\s+cancer\b/,
  /\bvou\s+morrer\b/,
  /\bquando\s+vou\s+morrer\b/,
  /\bem\s+quantos?\s+(dias|meses|anos)\s+vou\s+morrer\b/,
  /\bvou\s+ter\s+cancer\b/,
  /\btenho\s+(uma\s+)?doenca\b/,
  /\bestou\s+com\s+(alguma\s+)?doenca\b/,
  /\bdiagnostico\b/,
  /\bdiagnosticar\b/,
  /\bdiagnostique\b/,
  /\bdiagnosticar\s+minha\s+saude\b/,
  /\bprever\s+(se\s+)?(estou|to)\s+gravida\b/,
  /\bvou\s+engravidar\b/,
  /\bestou\s+gravida\s+sim\s+ou\s+nao\b/,
  /\bela\s+esta\s+gravida\b/,
  /\beu\s+vou\s+morrer\b/,
  /\bminha\s+morte\b/,
  /\bdata\s+da\s+minha\s+morte\b/,
];

export function userQuestionFailsSafetyPolicy(text: string): boolean {
  const t = normalizeForSafetyScan(text);
  if (t.length < 3) return false;
  return BLOCK_PATTERNS.some((re) => re.test(t));
}

export function unsafeUserContentMessage(): string {
  return UNSAFE_USER_MESSAGE;
}
