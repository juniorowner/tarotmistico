export interface TarotCard {
  id: number;
  name: string;
  nameEn: string;
  meaning: string;
  reversed: string;
  description: string;
  emoji: string;
}

export const majorArcana: TarotCard[] = [
  { id: 0, name: "O Louco", nameEn: "The Fool", meaning: "Novos começos, aventura, potencial ilimitado", reversed: "Imprudência, risco desnecessário, falta de direção", description: "O Louco representa o início de uma jornada, a coragem de dar o primeiro passo rumo ao desconhecido.", emoji: "🃏" },
  { id: 1, name: "O Mago", nameEn: "The Magician", meaning: "Manifestação, poder pessoal, habilidade", reversed: "Manipulação, talentos não utilizados, engano", description: "O Mago canaliza a energia do universo para transformar sonhos em realidade.", emoji: "🎩" },
  { id: 2, name: "A Sacerdotisa", nameEn: "The High Priestess", meaning: "Intuição, mistério, sabedoria interior", reversed: "Segredos, desconexão da intuição, informação oculta", description: "A Sacerdotisa guarda os mistérios do subconsciente e da sabedoria antiga.", emoji: "🌙" },
  { id: 3, name: "A Imperatriz", nameEn: "The Empress", meaning: "Fertilidade, abundância, natureza, nutrição", reversed: "Dependência, bloqueio criativo, negligência", description: "A Imperatriz é a mãe da criação, abundância e beleza terrena.", emoji: "👑" },
  { id: 4, name: "O Imperador", nameEn: "The Emperor", meaning: "Autoridade, estrutura, liderança, estabilidade", reversed: "Tirania, rigidez, falta de disciplina", description: "O Imperador representa ordem, poder e a construção de estruturas sólidas.", emoji: "🏛️" },
  { id: 5, name: "O Hierofante", nameEn: "The Hierophant", meaning: "Tradição, espiritualidade, orientação, conformidade", reversed: "Rebeldia, subversão, novas abordagens", description: "O Hierofante conecta o divino ao terreno através da sabedoria tradicional.", emoji: "📿" },
  { id: 6, name: "Os Amantes", nameEn: "The Lovers", meaning: "Amor, harmonia, escolhas, relacionamentos", reversed: "Desequilíbrio, desarmonia, valores conflitantes", description: "Os Amantes representam a união sagrada e as escolhas que definem nosso caminho.", emoji: "💕" },
  { id: 7, name: "A Carruagem", nameEn: "The Chariot", meaning: "Determinação, vitória, controle, ambição", reversed: "Falta de direção, agressão, derrota", description: "A Carruagem avança com determinação inabalável rumo à conquista.", emoji: "⚔️" },
  { id: 8, name: "A Força", nameEn: "Strength", meaning: "Coragem, paciência, compaixão, força interior", reversed: "Insegurança, fraqueza, dúvida", description: "A Força verdadeira vem da gentileza, paciência e domínio das emoções.", emoji: "🦁" },
  { id: 9, name: "O Eremita", nameEn: "The Hermit", meaning: "Introspecção, busca interior, solidão, sabedoria", reversed: "Isolamento, solidão excessiva, rejeição", description: "O Eremita ilumina o caminho interior com a lanterna da sabedoria.", emoji: "🏔️" },
  { id: 10, name: "A Roda da Fortuna", nameEn: "Wheel of Fortune", meaning: "Destino, ciclos, mudança, sorte", reversed: "Azar, resistência à mudança, ciclos negativos", description: "A Roda gira eternamente, lembrando-nos que tudo é cíclico e transitório.", emoji: "☸️" },
  { id: 11, name: "A Justiça", nameEn: "Justice", meaning: "Equilíbrio, verdade, causa e efeito, lei", reversed: "Injustiça, desonestidade, falta de responsabilidade", description: "A Justiça pesa cada ação e garante que a verdade prevaleça.", emoji: "⚖️" },
  { id: 12, name: "O Enforcado", nameEn: "The Hanged Man", meaning: "Sacrifício, nova perspectiva, pausa, rendição", reversed: "Estagnação, resistência, indecisão", description: "O Enforcado encontra iluminação ao ver o mundo de uma perspectiva diferente.", emoji: "🔮" },
  { id: 13, name: "A Morte", nameEn: "Death", meaning: "Transformação, fim de ciclo, renovação", reversed: "Resistência à mudança, estagnação, medo", description: "A Morte não é o fim, mas a transformação necessária para o renascimento.", emoji: "🦋" },
  { id: 14, name: "A Temperança", nameEn: "Temperance", meaning: "Equilíbrio, moderação, paciência, harmonia", reversed: "Excesso, falta de equilíbrio, impaciência", description: "A Temperança mistura os elementos opostos em perfeita harmonia.", emoji: "✨" },
  { id: 15, name: "O Diabo", nameEn: "The Devil", meaning: "Tentação, apego, materialismo, sombra", reversed: "Libertação, rompimento de cadeias, recuperação", description: "O Diabo revela as correntes invisíveis que nos prendem às ilusões.", emoji: "⛓️" },
  { id: 16, name: "A Torre", nameEn: "The Tower", meaning: "Destruição, revelação, mudança abrupta, despertar", reversed: "Evitar desastre, medo da mudança, adiamento", description: "A Torre desmorona para revelar a verdade escondida sob falsas fundações.", emoji: "⚡" },
  { id: 17, name: "A Estrela", nameEn: "The Star", meaning: "Esperança, inspiração, renovação, serenidade", reversed: "Desesperança, descrença, desconexão", description: "A Estrela brilha como farol de esperança após a tempestade.", emoji: "⭐" },
  { id: 18, name: "A Lua", nameEn: "The Moon", meaning: "Ilusão, intuição, medo, subconsciente", reversed: "Confusão, mal-entendidos, medo do desconhecido", description: "A Lua ilumina os mistérios do subconsciente e os caminhos ocultos.", emoji: "🌕" },
  { id: 19, name: "O Sol", nameEn: "The Sun", meaning: "Alegria, sucesso, vitalidade, positividade", reversed: "Negatividade, depressão, falta de clareza", description: "O Sol brilha com alegria radiante, trazendo clareza e celebração.", emoji: "☀️" },
  { id: 20, name: "O Julgamento", nameEn: "Judgement", meaning: "Renascimento, chamado interior, absolvição", reversed: "Autocrítica, dúvida, recusa ao chamado", description: "O Julgamento chama as almas para despertar e abraçar seu verdadeiro propósito.", emoji: "🎺" },
  { id: 21, name: "O Mundo", nameEn: "The World", meaning: "Completude, realização, integração, celebração", reversed: "Incompletude, atalhos, falta de encerramento", description: "O Mundo celebra a conclusão de um grande ciclo e a integração total.", emoji: "🌍" },
];
