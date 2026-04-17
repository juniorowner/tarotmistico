export interface SpreadType {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  labels: string[];
}

export const spreadTypes: SpreadType[] = [
  {
    id: "past-present-future",
    name: "Passado, Presente e Futuro",
    description: "Uma leitura clássica de 3 cartas para entender sua jornada no tempo.",
    cardCount: 3,
    labels: ["Passado", "Presente", "Futuro"],
  },
  {
    id: "yes-no",
    name: "Sim ou Não",
    description: "Uma carta para responder sua pergunta de forma direta.",
    cardCount: 1,
    labels: ["Resposta"],
  },
  {
    id: "love",
    name: "Leitura do Amor",
    description: "5 cartas revelam os aspectos do seu relacionamento e destino amoroso.",
    cardCount: 5,
    labels: ["Você", "O Outro", "A Conexão", "O Desafio", "O Futuro"],
  },
  {
    id: "celtic-cross",
    name: "Cruz Celta",
    description: "A leitura mais completa com 10 cartas para uma visão profunda da sua situação.",
    cardCount: 10,
    labels: [
      "Situação Atual",
      "Desafio",
      "Base",
      "Passado Recente",
      "Coroa",
      "Futuro Próximo",
      "Você",
      "Ambiente",
      "Esperanças",
      "Resultado Final",
    ],
  },
];
