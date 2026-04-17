import type { DealtTarotCard, TarotCard } from "@/data/tarotCards";

/**
 * Embaralhamento inspirado em mesa real: vários riffles com corte irregular
 * e pequenas “rajadas” da mesma mão, seguidos de cortes — evita o viés de
 * `array.sort(() => Math.random() - 0.5)` e aproxima gestos humanos.
 */

export function randomUnit(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! / 0x100000000;
  }
  return Math.random();
}

function randomIntBelow(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(randomUnit() * maxExclusive);
}

/** Uma passagem de riffle: meio aproximado + intercalação com rajadas curtas. */
export function riffleShuffleOnce<T>(deck: T[]): T[] {
  const n = deck.length;
  if (n <= 1) return [...deck];

  const half = n / 2;
  const jitter = Math.round((randomUnit() + randomUnit() - 1) * n * 0.12);
  let cut = Math.round(half + jitter);
  cut = Math.max(1, Math.min(n - 1, cut));

  const left = deck.slice(0, cut);
  const right = deck.slice(cut);
  const out: T[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    const remL = left.length - i;
    const remR = right.length - j;
    const pLeft = remL / (remL + remR);
    const burst = remL > 1 && remR > 1 && randomUnit() < 0.14 ? 2 : 1;
    const fromLeft = randomUnit() < pLeft;

    if (fromLeft) {
      const take = Math.min(burst, remL);
      for (let k = 0; k < take; k++) out.push(left[i++]!);
    } else {
      const take = Math.min(burst, remR);
      for (let k = 0; k < take; k++) out.push(right[j++]!);
    }
  }
  while (i < left.length) out.push(left[i++]!);
  while (j < right.length) out.push(right[j++]!);
  return out;
}

/** Corte de mesa: rotação aleatória do maço. */
export function tableCut<T>(deck: T[]): T[] {
  const n = deck.length;
  if (n <= 1) return [...deck];
  const k = randomIntBelow(n);
  if (k === 0) return [...deck];
  return [...deck.slice(k), ...deck.slice(0, k)];
}

export function shuffleDeckHumanLike<T>(deck: T[]): T[] {
  let d = [...deck];
  const riffles = 7 + randomIntBelow(3);
  for (let r = 0; r < riffles; r++) {
    d = riffleShuffleOnce(d);
  }
  const cuts = 2 + randomIntBelow(2);
  for (let c = 0; c < cuts; c++) {
    d = tableCut(d);
  }
  return d;
}

/** Baralho completo embaralhado; devolve as primeiras `count` cartas (sem repetição). */
export function drawUniqueFromDeck<T>(deck: readonly T[], count: number): T[] {
  return shuffleDeckHumanLike([...deck]).slice(0, count);
}

/** Sorteia cartas únicas e define orientação (direita / invertida), ~50% cada. */
export function drawReadingCards(deck: readonly TarotCard[], count: number): DealtTarotCard[] {
  return drawUniqueFromDeck(deck, count).map((card) => ({
    ...card,
    isReversed: randomUnit() < 0.5,
  }));
}
