/* O Segredo do Farol · jogo didático — dados do jogo.
   Textos "fonte" = história original (autor: Gustavo), transcritos tal como estão nas imagens.
   Textos "editorial" = perguntas, falas e pistas acrescentadas pelo CPIMW.
   Versículos só do acervo (NVT): python ferramentas/biblia.py "<ref>" --versao NVT */
window.FAROL_DADOS = {
  titulo: "O Segredo do Farol",
  autor: "Gustavo",

  paginas: {
    capa: { img: "imagens/capa.jpg", titulo: "O Segredo do Farol", texto: "Autor: Gustavo" },
    p1: { img: "imagens/p1.jpg", titulo: "Um Dia de Aventura",
      texto: "Era um dia lindo e ensolarado. Gustavo estava com seus pais, Alexandre e Cristiane, quando seu primo Theo chegou para brincar. De repente, os dois olharam para o mar e começaram a gritar: ‘A gente quer ir pro farol! A gente quer ir pro farol!’" },
    p2: { img: "imagens/p2.jpg", titulo: "A Caminho do Farol",
      texto: "Alexandre e Cristiane sorriram e responderam: ‘Está bem! Nós vamos ao farol.’ Mas logo explicaram: ‘Antes, precisamos descobrir a senha.’ Gustavo e Theo arregalaram os olhos e perguntaram: ‘Tem senha no farol?’" },
    p3: { img: "imagens/p3.jpg", titulo: "A Senha Está na Bíblia",
      texto: "Então Alexandre mostrou o livro que levavam com eles. Não era um livro qualquer: era a Bíblia. Cristiane explicou: ‘A senha está escondida nas páginas deste Livro.’ Gustavo e Theo abriram a Bíblia com cuidado e começaram a procurar as pistas." },
    p4: { img: "imagens/p4.jpg", titulo: "A Aventura Começou",
      texto: "Sentados perto do mar, Gustavo e Theo abriram a Bíblia e começaram a busca. A aventura estava só começando. Agora eles precisavam encontrar, na Palavra de Deus, a pista para descobrir o segredo do farol." },
    p5: { img: "imagens/p5.jpg", titulo: "A Primeira Pista",
      texto: "Gustavo e seu amigo Téo abriram o livro com cuidado. Eles procuraram entre os desenhos e as palavras, até que Gustavo apontou animado: ‘Achei! Achei uma pista!’ Na página estava escrito: ‘Procurem aquilo que mostra o caminho quando está escuro.’" },
    p6: { img: "imagens/p6.jpg", titulo: "A Luz para o Caminho",
      texto: "Ao virar mais uma página, eles viram o desenho de um caminho escuro, iluminado por uma pequena lâmpada. Ao lado estava escrito: ‘Lâmpada para os meus pés é tua palavra e luz para o meu caminho.’ Então Alexandre e Cristiane explicaram que a verdadeira luz para o caminho vem da Palavra de Deus." },
    p7: { img: "imagens/p7.jpg", titulo: "O Livro",
      texto: "Gustavo e Téo olharam novamente para a capa e perceberam algo muito especial: aquele não era apenas um livro de pistas. Era a Bíblia! Alexandre explicou: Um farol ilumina o mar para que ninguém se perca. A Palavra de Deus ilumina a nossa vida para sabermos por onde andar.”" },
    p8: { img: "imagens/p8.jpg", titulo: "A Verdadeira Luz",
      texto: "Quando chegaram ao farol, Gustavo e Téo já sabiam a resposta. Juntos, disseram: ‘A Palavra de Deus!’ Lá no alto, Alexandre abriu a Bíblia e leu Salmo 119:105. Naquele dia, todos entenderam o segredo do farol: o farol ilumina o mar, mas a Palavra de Deus ilumina a vida." }
  },

  /* Versículos (acervo, NVT) */
  versiculos: {
    "Ef 6.15": { ref: "Efésios 6:15", texto: "Como calçados, usem a paz das boas-novas, para que estejam inteiramente preparados." },
    "Ef 6.16": { ref: "Efésios 6:16", texto: "Em todas as situações, levantem o escudo da fé, para deter as flechas de fogo do maligno." },
    "Ef 6.17": { ref: "Efésios 6:17", texto: "Usem a salvação como capacete e empunhem a espada do Espírito, que é a palavra de Deus." },
    "Ef 6.14": { ref: "Efésios 6:14", texto: "Assim, mantenham sua posição, colocando o cinto da verdade e a couraça da justiça." },
    "Sl 119.105": { ref: "Salmo 119:105", texto: "Tua palavra é lâmpada para meus pés e luz para meu caminho." },
    "Jo 8.12": { ref: "João 8:12", texto: "Jesus voltou a falar ao povo e disse: “Eu sou a luz do mundo. Se vocês me seguirem, não andarão no escuro, pois terão a luz da vida”." },
    "Js 1.9": { ref: "Josué 1:9", texto: "Esta é minha ordem: Seja forte e corajoso! Não tenha medo nem desanime, pois o SENHOR, seu Deus, estará com você por onde você andar”." }
  },

  /* Forças novas (editorial), ganhas no fim de cada fase */
  forcas: {
    botas:    { nome: "Botas da Paz", fala: "Ganhaste as Botas da Paz! Agora corres mais depressa.", vers: "Ef 6.15", icone: "botas" },
    escudo:   { nome: "Escudo da Fé", fala: "Ganhaste o Escudo da Fé! As nuvens cinzentas já não te empurram.", vers: "Ef 6.16", icone: "escudo" },
    espada:   { nome: "Espada da Palavra", fala: "Ganhaste a Espada do Espírito, que é a Palavra de Deus! Carrega no botão da espada para cortar silvas e transformar nuvens cinzentas em flores.", vers: "Ef 6.17", icone: "espada" },
    lanterna: { nome: "Lanterna", fala: "Ganhaste a lanterna! Ela mostra o caminho quando está escuro.", vers: "Sl 119.105", icone: "lanterna" },
    luz:      { nome: "Espada de Luz", fala: "A tua espada agora brilha mais e chega mais longe!", vers: "Sl 119.105", icone: "luz" },
    capacete: { nome: "Capacete da Salvação", fala: "Ganhaste o Capacete da Salvação! Estás quase no farol.", vers: "Ef 6.17", icone: "capacete" },
    cinto:    { nome: "Cinto da Verdade", fala: "Ganhaste o Cinto da Verdade! Agora tens a armadura toda. És o Gustavo Aventureiro!", vers: "Ef 6.14", icone: "cinto" }
  },

  /* Fases: paragem no mapa → páginas da história → missão → força nova.
     pontos = máximo da missão (soma total exatamente 1000). */
  fases: [
    { id: "f1", nome: "Um Dia de Aventura", paginas: ["p1"], forca: "botas", pontos: 100, unidades: ["p1"],
      missao: { tipo: "escolha", fala: "Qual é a placa que leva ao farol? Procura o desenho do farol.",
        opcoes: [ { icone: "placa-praia", rotulo: "Praia" }, { icone: "placa-farol", rotulo: "Farol", certa: true }, { icone: "placa-parque", rotulo: "Parque" } ] } },
    { id: "f2", nome: "A Caminho do Farol", paginas: ["p2"], forca: "escudo", pontos: 100, unidades: ["p2"],
      missao: { tipo: "escolha", fala: "O que é preciso descobrir para ir ao farol?",
        opcoes: [ { icone: "chapeu", rotulo: "Um chapéu" }, { icone: "chave", rotulo: "A senha", certa: true }, { icone: "bola", rotulo: "Uma bola" } ] } },
    { id: "f3", nome: "A Senha Está na Bíblia", paginas: ["p3", "p4"], forca: "espada", pontos: 100, unidades: ["p3", "p4"],
      missao: { tipo: "escolha", fala: "Onde está escondida a senha? Toca no livro certo!",
        opcoes: [ { icone: "sanduiche", rotulo: "Lanche" }, { icone: "binoculos", rotulo: "Binóculos" }, { icone: "biblia", rotulo: "Bíblia", certa: true }, { icone: "bola", rotulo: "Bola" } ] } },
    { id: "f4", nome: "A Primeira Pista", paginas: ["p5"], forca: "lanterna", pontos: 100, unidades: ["p5"],
      missao: { tipo: "escolha", fala: "O que mostra o caminho quando está escuro?",
        opcoes: [ { icone: "almofada", rotulo: "Almofada" }, { icone: "lanterna", rotulo: "Lâmpada", certa: true }, { icone: "bola", rotulo: "Bola" } ] } },
    { id: "f5", nome: "A Luz para o Caminho", paginas: ["p6"], forca: "luz", pontos: 100, unidades: ["p6"],
      missao: { tipo: "lampadas", fala: "O caminho está escuro! Acende as cinco lâmpadas.", n: 5 } },
    { id: "f6", nome: "O Livro", paginas: ["p7"], forca: "capacete", pontos: 100, unidades: ["p1", "p3", "p6", "p7"],
      missao: { tipo: "ordenar", fala: "Põe a história por ordem. O que aconteceu primeiro?",
        cenas: [ { img: "imagens/p1.jpg", rotulo: "Vamos ao farol!" }, { img: "imagens/p3.jpg", rotulo: "A senha está na Bíblia" }, { img: "imagens/p6.jpg", rotulo: "A luz para o caminho" } ] } },
    { id: "f7", nome: "A Placa do Versículo", paginas: [], forca: "cinto", pontos: 200, unidades: ["p6", "p8"],
      missao: { tipo: "versiculo", vers: "Sl 119.105", fala: "Vamos completar o versículo! Escolhe o desenho certo.",
        partes: [ "Tua palavra é ", { palavra: "lâmpada", icone: "lanterna" }, " para meus ", { palavra: "pés", icone: "pes" }, " e ", { palavra: "luz", icone: "sol" }, " para meu ", { palavra: "caminho", icone: "caminho" }, "." ] } },
    { id: "f8", nome: "A Verdadeira Luz", paginas: ["p8"], forca: null, pontos: 200, unidades: ["p8"], perguntaAntes: true,
      missao: { tipo: "escolha", fala: "Chegaste ao farol! Qual é a luz que mostra o caminho da nossa vida?",
        opcoes: [ { icone: "sol", rotulo: "O sol" }, { icone: "biblia", rotulo: "A Palavra de Deus", certa: true }, { icone: "lanterna", rotulo: "A lanterna" } ] } }
  ],

  /* Apelidos predefinidos para o ranking local (sem nomes reais) */
  apelidos: [
    { id: "gaivota", rotulo: "Gaivota Veloz" }, { id: "caranguejo", rotulo: "Caranguejo Valente" },
    { id: "estrela", rotulo: "Estrela-do-mar" }, { id: "golfinho", rotulo: "Golfinho Alegre" },
    { id: "barco", rotulo: "Barquinho Corajoso" }, { id: "farol", rotulo: "Farolzinho" }
  ]
};
