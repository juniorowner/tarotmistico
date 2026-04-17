export interface TarotCard {
  id: number;
  name: string;
  nameEn: string;
  meaning: string;
  reversed: string;
  description: string;
  emoji: string;
  arcana: "major" | "minor";
  suit?: "cups" | "swords" | "pentacles" | "wands";
}

export const majorArcana: TarotCard[] = [
  { id: 0, name: "O Louco", nameEn: "The Fool", meaning: "Novos começos, aventura, potencial ilimitado", reversed: "Imprudência, risco desnecessário, falta de direção", description: "O Louco representa o início de uma jornada, a coragem de dar o primeiro passo rumo ao desconhecido.", emoji: "", arcana: "major" },
  { id: 1, name: "O Mago", nameEn: "The Magician", meaning: "Manifestação, poder pessoal, habilidade", reversed: "Manipulação, talentos não utilizados, engano", description: "O Mago canaliza a energia do universo para transformar sonhos em realidade.", emoji: "", arcana: "major" },
  { id: 2, name: "A Sacerdotisa", nameEn: "The High Priestess", meaning: "Intuição, mistério, sabedoria interior", reversed: "Segredos, desconexão da intuição, informação oculta", description: "A Sacerdotisa guarda os mistérios do subconsciente e da sabedoria antiga.", emoji: "", arcana: "major" },
  { id: 3, name: "A Imperatriz", nameEn: "The Empress", meaning: "Fertilidade, abundância, natureza, nutrição", reversed: "Dependência, bloqueio criativo, negligência", description: "A Imperatriz é a mãe da criação, abundância e beleza terrena.", emoji: "", arcana: "major" },
  { id: 4, name: "O Imperador", nameEn: "The Emperor", meaning: "Autoridade, estrutura, liderança, estabilidade", reversed: "Tirania, rigidez, falta de disciplina", description: "O Imperador representa ordem, poder e a construção de estruturas sólidas.", emoji: "", arcana: "major" },
  { id: 5, name: "O Hierofante", nameEn: "The Hierophant", meaning: "Tradição, espiritualidade, orientação, conformidade", reversed: "Rebeldia, subversão, novas abordagens", description: "O Hierofante conecta o divino ao terreno através da sabedoria tradicional.", emoji: "", arcana: "major" },
  { id: 6, name: "Os Amantes", nameEn: "The Lovers", meaning: "Amor, harmonia, escolhas, relacionamentos", reversed: "Desequilíbrio, desarmonia, valores conflitantes", description: "Os Amantes representam a união sagrada e as escolhas que definem nosso caminho.", emoji: "", arcana: "major" },
  { id: 7, name: "A Carruagem", nameEn: "The Chariot", meaning: "Determinação, vitória, controle, ambição", reversed: "Falta de direção, agressão, derrota", description: "A Carruagem avança com determinação inabalável rumo à conquista.", emoji: "", arcana: "major" },
  { id: 8, name: "A Força", nameEn: "Strength", meaning: "Coragem, paciência, compaixão, força interior", reversed: "Insegurança, fraqueza, dúvida", description: "A Força verdadeira vem da gentileza, paciência e domínio das emoções.", emoji: "", arcana: "major" },
  { id: 9, name: "O Eremita", nameEn: "The Hermit", meaning: "Introspecção, busca interior, solidão, sabedoria", reversed: "Isolamento, solidão excessiva, rejeição", description: "O Eremita ilumina o caminho interior com a lanterna da sabedoria.", emoji: "", arcana: "major" },
  { id: 10, name: "A Roda da Fortuna", nameEn: "Wheel of Fortune", meaning: "Destino, ciclos, mudança, sorte", reversed: "Azar, resistência à mudança, ciclos negativos", description: "A Roda gira eternamente, lembrando-nos que tudo é cíclico e transitório.", emoji: "", arcana: "major" },
  { id: 11, name: "A Justiça", nameEn: "Justice", meaning: "Equilíbrio, verdade, causa e efeito, lei", reversed: "Injustiça, desonestidade, falta de responsabilidade", description: "A Justiça pesa cada ação e garante que a verdade prevaleça.", emoji: "", arcana: "major" },
  { id: 12, name: "O Enforcado", nameEn: "The Hanged Man", meaning: "Sacrifício, nova perspectiva, pausa, rendição", reversed: "Estagnação, resistência, indecisão", description: "O Enforcado encontra iluminação ao ver o mundo de uma perspectiva diferente.", emoji: "", arcana: "major" },
  { id: 13, name: "A Morte", nameEn: "Death", meaning: "Transformação, fim de ciclo, renovação", reversed: "Resistência à mudança, estagnação, medo", description: "A Morte não é o fim, mas a transformação necessária para o renascimento.", emoji: "", arcana: "major" },
  { id: 14, name: "A Temperança", nameEn: "Temperance", meaning: "Equilíbrio, moderação, paciência, harmonia", reversed: "Excesso, falta de equilíbrio, impaciência", description: "A Temperança mistura os elementos opostos em perfeita harmonia.", emoji: "", arcana: "major" },
  { id: 15, name: "O Diabo", nameEn: "The Devil", meaning: "Tentação, apego, materialismo, sombra", reversed: "Libertação, rompimento de cadeias, recuperação", description: "O Diabo revela as correntes invisíveis que nos prendem às ilusões.", emoji: "", arcana: "major" },
  { id: 16, name: "A Torre", nameEn: "The Tower", meaning: "Destruição, revelação, mudança abrupta, despertar", reversed: "Evitar desastre, medo da mudança, adiamento", description: "A Torre desmorona para revelar a verdade escondida sob falsas fundações.", emoji: "", arcana: "major" },
  { id: 17, name: "A Estrela", nameEn: "The Star", meaning: "Esperança, inspiração, renovação, serenidade", reversed: "Desesperança, descrença, desconexão", description: "A Estrela brilha como farol de esperança após a tempestade.", emoji: "", arcana: "major" },
  { id: 18, name: "A Lua", nameEn: "The Moon", meaning: "Ilusão, intuição, medo, subconsciente", reversed: "Confusão, mal-entendidos, medo do desconhecido", description: "A Lua ilumina os mistérios do subconsciente e os caminhos ocultos.", emoji: "", arcana: "major" },
  { id: 19, name: "O Sol", nameEn: "The Sun", meaning: "Alegria, sucesso, vitalidade, positividade", reversed: "Negatividade, depressão, falta de clareza", description: "O Sol brilha com alegria radiante, trazendo clareza e celebração.", emoji: "", arcana: "major" },
  { id: 20, name: "O Julgamento", nameEn: "Judgement", meaning: "Renascimento, chamado interior, absolvição", reversed: "Autocrítica, dúvida, recusa ao chamado", description: "O Julgamento chama as almas para despertar e abraçar seu verdadeiro propósito.", emoji: "", arcana: "major" },
  { id: 21, name: "O Mundo", nameEn: "The World", meaning: "Completude, realização, integração, celebração", reversed: "Incompletude, atalhos, falta de encerramento", description: "O Mundo celebra a conclusão de um grande ciclo e a integração total.", emoji: "", arcana: "major" },
];

// ─── Arcanos Menores ────────────────────────────────────────

export const minorArcanaCups: TarotCard[] = [
  { id: 22, name: "Ás de Copas", nameEn: "Ace of Cups", meaning: "Novo amor, compaixão, criatividade, intuição", reversed: "Bloqueio emocional, vazio, amor reprimido", description: "O Ás de Copas transborda com a promessa de um novo início emocional.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 23, name: "Dois de Copas", nameEn: "Two of Cups", meaning: "Parceria, união, atração mútua, harmonia", reversed: "Desequilíbrio, separação, desconfiança", description: "Dois almas se encontram em harmonia e respeito mútuo.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 24, name: "Três de Copas", nameEn: "Three of Cups", meaning: "Celebração, amizade, comunidade, alegria", reversed: "Excesso, fofoca, isolamento social", description: "Três taças se erguem em celebração da amizade e da comunidade.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 25, name: "Quatro de Copas", nameEn: "Four of Cups", meaning: "Apatia, contemplação, insatisfação, introspecção", reversed: "Motivação renovada, aceitação, nova perspectiva", description: "A contemplação profunda pode revelar oportunidades ignoradas.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 26, name: "Cinco de Copas", nameEn: "Five of Cups", meaning: "Perda, luto, arrependimento, decepção", reversed: "Aceitação, seguir em frente, perdão", description: "O lamento pelas taças derramadas obscurece as que ainda estão de pé.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 27, name: "Seis de Copas", nameEn: "Six of Cups", meaning: "Nostalgia, memórias, inocência, generosidade", reversed: "Preso ao passado, idealização, imaturidade", description: "As doces memórias do passado trazem conforto e ternura.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 28, name: "Sete de Copas", nameEn: "Seven of Cups", meaning: "Ilusão, fantasia, escolhas, imaginação", reversed: "Clareza, foco, determinação, realismo", description: "Sete visões tentadoras aparecem nas nuvens — nem todas são reais.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 29, name: "Oito de Copas", nameEn: "Eight of Cups", meaning: "Abandono, busca interior, desapego, jornada", reversed: "Medo de mudar, estagnação, apego", description: "É preciso coragem para deixar para trás o que já não nutre a alma.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 30, name: "Nove de Copas", nameEn: "Nine of Cups", meaning: "Satisfação, realização de desejos, gratidão", reversed: "Ganância, insatisfação, materialismo", description: "O Nove de Copas brilha com a alegria de um desejo realizado.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 31, name: "Dez de Copas", nameEn: "Ten of Cups", meaning: "Harmonia familiar, felicidade, realização emocional", reversed: "Conflito familiar, valores desalinhados, lar em desarranjo", description: "O arco-íris brilha sobre uma família em plena harmonia e amor.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 32, name: "Pajem de Copas", nameEn: "Page of Cups", meaning: "Mensagem emocional, criatividade, sensibilidade", reversed: "Imaturidade emocional, insegurança, bloqueio criativo", description: "O jovem mensageiro traz um convite para explorar o mundo dos sentimentos.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 33, name: "Cavaleiro de Copas", nameEn: "Knight of Cups", meaning: "Romance, charme, idealismo, proposta", reversed: "Decepção, ciúme, irrealismo", description: "O cavaleiro romântico cavalga em busca do amor verdadeiro.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 34, name: "Rainha de Copas", nameEn: "Queen of Cups", meaning: "Compaixão, calma, intuição, cuidado", reversed: "Codependência, insegurança, desconexão emocional", description: "A Rainha de Copas é a guardiã compassiva das águas emocionais.", emoji: "", arcana: "minor", suit: "cups" },
  { id: 35, name: "Rei de Copas", nameEn: "King of Cups", meaning: "Equilíbrio emocional, diplomacia, generosidade", reversed: "Manipulação emocional, frieza, volatilidade", description: "O Rei de Copas governa com sabedoria emocional e compaixão.", emoji: "", arcana: "minor", suit: "cups" },
];

export const minorArcanaSwords: TarotCard[] = [
  { id: 36, name: "Ás de Espadas", nameEn: "Ace of Swords", meaning: "Clareza mental, verdade, avanço, novo pensamento", reversed: "Confusão, brutalidade, injustiça", description: "A espada corta as ilusões e revela a verdade cristalina.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 37, name: "Dois de Espadas", nameEn: "Two of Swords", meaning: "Indecisão, impasse, bloqueio, escolha difícil", reversed: "Sobrecarga de informação, paralisia, decisão forçada", description: "De olhos vendados, a alma pesa duas opções igualmente difíceis.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 38, name: "Três de Espadas", nameEn: "Three of Swords", meaning: "Dor, tristeza, traição, coração partido", reversed: "Recuperação, perdão, superação da dor", description: "Três espadas atravessam o coração, trazendo uma dor necessária.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 39, name: "Quatro de Espadas", nameEn: "Four of Swords", meaning: "Descanso, recuperação, meditação, pausa", reversed: "Inquietação, esgotamento, recusa em descansar", description: "O guerreiro descansa para recuperar forças antes da próxima batalha.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 40, name: "Cinco de Espadas", nameEn: "Five of Swords", meaning: "Conflito, derrota, tensão, vitória vazia", reversed: "Reconciliação, arrependimento, fim de conflito", description: "Uma vitória conquistada à custa dos outros não traz verdadeira glória.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 41, name: "Seis de Espadas", nameEn: "Six of Swords", meaning: "Transição, mudança, deixar para trás, viagem", reversed: "Resistência à mudança, bagagem emocional, estagnação", description: "O barco navega para águas mais calmas, deixando a tormenta para trás.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 42, name: "Sete de Espadas", nameEn: "Seven of Swords", meaning: "Estratégia, engano, furtividade, astúcia", reversed: "Confissão, consciência pesada, ser pego", description: "A astúcia pode ser uma ferramenta ou uma armadilha.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 43, name: "Oito de Espadas", nameEn: "Eight of Swords", meaning: "Prisão mental, restrição, impotência, medo", reversed: "Libertação, nova perspectiva, autoempoderamento", description: "As correntes que nos prendem são frequentemente criadas pela mente.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 44, name: "Nove de Espadas", nameEn: "Nine of Swords", meaning: "Ansiedade, pesadelos, preocupação, culpa", reversed: "Esperança, superação, buscar ajuda", description: "As noites em claro são povoadas por medos que parecem maiores do que são.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 45, name: "Dez de Espadas", nameEn: "Ten of Swords", meaning: "Fim doloroso, traição, colapso, fundo do poço", reversed: "Recuperação, recomeço, resiliência", description: "O pior já passou. Do fundo do poço, só se pode subir.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 46, name: "Pajem de Espadas", nameEn: "Page of Swords", meaning: "Curiosidade, vigilância, comunicação, mente ágil", reversed: "Fofoca, cinismo, espionagem, impulsividade", description: "O jovem observador está sempre alerta, de olhos e ouvidos atentos.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 47, name: "Cavaleiro de Espadas", nameEn: "Knight of Swords", meaning: "Ação rápida, ambição, determinação, assertividade", reversed: "Imprudência, agressividade, pressa desnecessária", description: "O cavaleiro avança sem hesitação, cortando todos os obstáculos.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 48, name: "Rainha de Espadas", nameEn: "Queen of Swords", meaning: "Independência, percepção, clareza, honestidade", reversed: "Frieza, amargura, crueldade verbal", description: "A Rainha de Espadas corta com a verdade e governa com a razão.", emoji: "", arcana: "minor", suit: "swords" },
  { id: 49, name: "Rei de Espadas", nameEn: "King of Swords", meaning: "Autoridade intelectual, verdade, ética, lógica", reversed: "Tirania, abuso de poder, manipulação intelectual", description: "O Rei de Espadas governa com intelecto afiado e julgamento justo.", emoji: "", arcana: "minor", suit: "swords" },
];

export const minorArcanaPentacles: TarotCard[] = [
  { id: 50, name: "Ás de Ouros", nameEn: "Ace of Pentacles", meaning: "Nova oportunidade financeira, prosperidade, abundância", reversed: "Oportunidade perdida, má gestão, ganância", description: "Uma moeda dourada brilha nas mãos do destino, prometendo prosperidade.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 51, name: "Dois de Ouros", nameEn: "Two of Pentacles", meaning: "Equilíbrio, adaptação, gestão, flexibilidade", reversed: "Desequilíbrio, sobrecarga, desorganização", description: "Malabarismo habilidoso entre as demandas da vida material.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 52, name: "Três de Ouros", nameEn: "Three of Pentacles", meaning: "Trabalho em equipe, habilidade, colaboração, maestria", reversed: "Falta de cooperação, mediocridade, conflito de trabalho", description: "A maestria floresce quando talentos diferentes se unem.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 53, name: "Quatro de Ouros", nameEn: "Four of Pentacles", meaning: "Segurança, controle, estabilidade, possessividade", reversed: "Generosidade, soltar o controle, insegurança financeira", description: "A busca por segurança pode se tornar uma prisão dourada.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 54, name: "Cinco de Ouros", nameEn: "Five of Pentacles", meaning: "Dificuldade financeira, isolamento, preocupação, perda", reversed: "Recuperação, ajuda chegando, fim da escassez", description: "Na noite fria, a luz da esperança brilha para quem busca ajuda.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 55, name: "Seis de Ouros", nameEn: "Six of Pentacles", meaning: "Generosidade, caridade, equilíbrio, compartilhar", reversed: "Dívidas, egoísmo, caridade interesseira", description: "A verdadeira riqueza está no equilíbrio entre dar e receber.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 56, name: "Sete de Ouros", nameEn: "Seven of Pentacles", meaning: "Paciência, investimento, avaliação, crescimento lento", reversed: "Impaciência, maus investimentos, falta de visão", description: "O agricultor contempla a colheita que ainda está por vir.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 57, name: "Oito de Ouros", nameEn: "Eight of Pentacles", meaning: "Dedicação, aprendizado, maestria, diligência", reversed: "Perfeccionismo, trabalho repetitivo, falta de motivação", description: "Com dedicação e prática, cada obra se torna uma obra-prima.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 58, name: "Nove de Ouros", nameEn: "Nine of Pentacles", meaning: "Luxo, autossuficiência, conquista, elegância", reversed: "Excesso, dependência, insegurança financeira", description: "O jardim da prosperidade floresce para quem cultivou com paciência.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 59, name: "Dez de Ouros", nameEn: "Ten of Pentacles", meaning: "Riqueza, herança, legado, família, estabilidade", reversed: "Conflito familiar, perda de herança, instabilidade", description: "A riqueza verdadeira é o legado que atravessa gerações.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 60, name: "Pajem de Ouros", nameEn: "Page of Pentacles", meaning: "Ambição, estudo, planejamento, oportunidade", reversed: "Preguiça, falta de foco, oportunidade desperdiçada", description: "O jovem estudioso planta as sementes do sucesso futuro.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 61, name: "Cavaleiro de Ouros", nameEn: "Knight of Pentacles", meaning: "Eficiência, rotina, confiabilidade, persistência", reversed: "Tédio, estagnação, perfeccionismo, preguiça", description: "O cavaleiro avança lento mas seguro, sem desviar do caminho.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 62, name: "Rainha de Ouros", nameEn: "Queen of Pentacles", meaning: "Praticidade, conforto, segurança, nutrição", reversed: "Desorganização, negligência, dependência financeira", description: "A Rainha de Ouros cria um lar abundante com sabedoria prática.", emoji: "", arcana: "minor", suit: "pentacles" },
  { id: 63, name: "Rei de Ouros", nameEn: "King of Pentacles", meaning: "Riqueza, empreendedorismo, segurança, disciplina", reversed: "Ganância, materialismo, corrupção", description: "O Rei de Ouros construiu seu império com disciplina e visão.", emoji: "", arcana: "minor", suit: "pentacles" },
];

export const minorArcanaWands: TarotCard[] = [
  { id: 64, name: "Ás de Paus", nameEn: "Ace of Wands", meaning: "Inspiração, novo projeto, potencial, criação", reversed: "Atrasos, falta de motivação, bloqueio criativo", description: "A chama da inspiração arde, pronta para dar vida a algo grandioso.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 65, name: "Dois de Paus", nameEn: "Two of Wands", meaning: "Planejamento, decisão, visão de futuro, domínio", reversed: "Medo do desconhecido, falta de planejamento, indecisão", description: "Com o mundo nas mãos, é hora de escolher o próximo destino.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 66, name: "Três de Paus", nameEn: "Three of Wands", meaning: "Expansão, progresso, visão ampla, exploração", reversed: "Obstáculos, atrasos, falta de previsão", description: "Os navios partem rumo ao horizonte, levando sonhos para terras distantes.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 67, name: "Quatro de Paus", nameEn: "Four of Wands", meaning: "Celebração, harmonia, lar, marcos alcançados", reversed: "Conflito, transição, insegurança no lar", description: "As quatro tochas iluminam uma celebração de conquistas e união.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 68, name: "Cinco de Paus", nameEn: "Five of Wands", meaning: "Competição, conflito, desafio, tensão criativa", reversed: "Evitar conflito, harmonia, compromisso", description: "Cinco forças colidem, gerando caos mas também inovação.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 69, name: "Seis de Paus", nameEn: "Six of Wands", meaning: "Vitória, reconhecimento, sucesso público, triunfo", reversed: "Fracasso, falta de reconhecimento, ego inflado", description: "O herói retorna vitorioso, aclamado por todos ao seu redor.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 70, name: "Sete de Paus", nameEn: "Seven of Wands", meaning: "Defesa, perseverança, coragem, posição firme", reversed: "Desistência, sobrecarga, sentir-se atacado", description: "Mesmo em desvantagem, a determinação mantém a posição firme.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 71, name: "Oito de Paus", nameEn: "Eight of Wands", meaning: "Velocidade, progresso rápido, comunicação, ação", reversed: "Atrasos, frustração, falta de direção", description: "Oito flechas cortam o céu — mudanças rápidas estão a caminho.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 72, name: "Nove de Paus", nameEn: "Nine of Wands", meaning: "Resiliência, persistência, coragem, última barreira", reversed: "Exaustão, paranoia, desistir perto do fim", description: "O guerreiro ferido se mantém de pé, pronto para o último desafio.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 73, name: "Dez de Paus", nameEn: "Ten of Wands", meaning: "Sobrecarga, responsabilidade, fardo, esforço excessivo", reversed: "Delegar, aliviar o peso, reavaliar prioridades", description: "O peso do mundo nas costas — é hora de pedir ajuda.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 74, name: "Pajem de Paus", nameEn: "Page of Wands", meaning: "Entusiasmo, exploração, descoberta, mensagem", reversed: "Imaturidade, pressa, ideias sem ação", description: "O jovem aventureiro irradia entusiasmo por uma nova jornada.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 75, name: "Cavaleiro de Paus", nameEn: "Knight of Wands", meaning: "Energia, paixão, aventura, impulsividade", reversed: "Frustração, falta de direção, agressividade", description: "O cavaleiro de fogo cavalga com paixão destemida rumo à aventura.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 76, name: "Rainha de Paus", nameEn: "Queen of Wands", meaning: "Confiança, determinação, alegria, vitalidade", reversed: "Egoísmo, ciúme, insegurança, agressividade", description: "A Rainha de Paus brilha com carisma e determinação inabalável.", emoji: "", arcana: "minor", suit: "wands" },
  { id: 77, name: "Rei de Paus", nameEn: "King of Wands", meaning: "Liderança visionária, carisma, empreendedorismo", reversed: "Impulsividade, tirania, expectativas irreais", description: "O Rei de Paus lidera com visão, coragem e energia contagiante.", emoji: "", arcana: "minor", suit: "wands" },
];

// Baralho completo — 78 cartas
export const allCards: TarotCard[] = [
  ...majorArcana,
  ...minorArcanaCups,
  ...minorArcanaSwords,
  ...minorArcanaPentacles,
  ...minorArcanaWands,
];

/** Carta na mesa após o sorteio (orientação física). O texto de arcano invertido continua em `reversed`. */
export type DealtTarotCard = TarotCard & { isReversed: boolean };

/** Entradas antigas do diário podem não ter `isReversed`; trate como direita. */
export type DiaryTarotCard = TarotCard & { isReversed?: boolean };
