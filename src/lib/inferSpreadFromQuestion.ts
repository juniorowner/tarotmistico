/** Sugere tiragem com base no texto da pergunta (PT-BR). */
export type QuickSpreadChoice = "love" | "yes-no" | "past-present-future";

export function inferSpreadFromQuestion(raw: string): QuickSpreadChoice {
  const q = raw.trim().toLowerCase();
  if (!q) return "past-present-future";

  if (
    /\b(amor|amar|namor|namorad|crush|casamento|relacion|paixão|paixao|sentiment|beij|ciumes|ciúmes|traição|traiç|ex\b|esposo|esposa|marido|mulher|ele\b|ela\b|gost[ao]|voltar|reconcilia)\b/.test(
      q
    )
  ) {
    return "love";
  }

  if (
    /\b(sim|não|nao)\b/.test(q) ||
    /\b(devo|deveria|será|sera|vai dar|funciona|certeza|convenho|aceito|escolho)\b/i.test(q)
  ) {
    return "yes-no";
  }

  return "past-present-future";
}
