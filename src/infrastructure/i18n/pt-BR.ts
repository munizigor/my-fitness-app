/**
 * Dicionário único do app. Nenhuma string de UI mora em JSX (CLAUDE.md).
 * Só pt-BR existe hoje; acrescentar um idioma é acrescentar um arquivo irmão.
 */
export const ptBR = {
  app: {
    nome: 'Treino e Dieta',
  },
  navegacao: {
    hoje: 'Hoje',
    evolucao: 'Evolução',
    perfil: 'Perfil',
    plano: 'Plano',
  },
  vazio: {
    semPlanoTitulo: 'Nenhum plano ainda',
    semPlanoDescricao: 'Importe o arquivo que seu nutricionista ou treinador enviou para começar.',
    irParaImportar: 'Ir para o Plano',
  },
  /**
   * Unidades como o aluno lê, não como o schema as identifica. "4 capsula" é
   * o identificador vazando para a tela; o que ele precisa ver é "4 cápsulas".
   */
  unidades: {
    g: '{{quantidade}} g',
    mg: '{{quantidade}} mg',
    ml: '{{quantidade}} ml',
    unidade_one: '{{quantidade}} unidade',
    unidade_other: '{{quantidade}} unidades',
    fatia_one: '{{quantidade}} fatia',
    fatia_other: '{{quantidade}} fatias',
    'colher-de-sopa_one': '{{quantidade}} colher de sopa',
    'colher-de-sopa_other': '{{quantidade}} colheres de sopa',
    'colher-de-cha_one': '{{quantidade}} colher de chá',
    'colher-de-cha_other': '{{quantidade}} colheres de chá',
    xicara_one: '{{quantidade}} xícara',
    xicara_other: '{{quantidade}} xícaras',
    concha_one: '{{quantidade}} concha',
    concha_other: '{{quantidade}} conchas',
    capsula_one: '{{quantidade}} cápsula',
    capsula_other: '{{quantidade}} cápsulas',
    comprimido_one: '{{quantidade}} comprimido',
    comprimido_other: '{{quantidade}} comprimidos',
    scoop_one: '{{quantidade}} scoop',
    scoop_other: '{{quantidade}} scoops',
    sache_one: '{{quantidade}} sachê',
    sache_other: '{{quantidade}} sachês',
    gota_one: '{{quantidade}} gota',
    gota_other: '{{quantidade}} gotas',
  },
  /**
   * Os dias da semana têm um dono só, fora de qualquer tela.
   *
   * Moravam dentro de `hoje`, e a consulta ao plano precisa dos mesmos nomes —
   * copiá-los para lá deixaria duas listas de sete palavras para manter em
   * sincronia, que é como um dia vira "Sábado" numa tela e "sábado" na outra.
   */
  diaDaSemana: {
    seg: 'Segunda-feira',
    ter: 'Terça-feira',
    qua: 'Quarta-feira',
    qui: 'Quinta-feira',
    sex: 'Sexta-feira',
    sab: 'Sábado',
    dom: 'Domingo',
  },
  hoje: {
    descansoTitulo: 'Hoje é dia de descanso',
    descansoDescricao: 'Sem treino nem aeróbico. As refeições continuam.',
    agua: 'Água',
    aguaContador: '{{consumido}} de {{alvo}} L',
    aguaAdicionar: 'Registrar mais um copo de água',
    aguaRemover: 'Tirar um copo de água',
    refeicao: 'Refeição {{numero}}',
    refeicaoItens_one: '{{count}} item',
    refeicaoItens_other: '{{count}} itens',
    suplementos: 'Suplementos',
    antesDeTreinar: 'Antes de treinar',
    treinoExercicios_one: '{{count}} exercício',
    treinoExercicios_other: '{{count}} exercícios',
    treinoDescanso: 'descanso de {{min}} a {{max}} s entre séries',
    aerobico: 'Aeróbico',
    aerobicoDuracao: '{{minutos}} min',
    comecarTreino: 'Começar treino',
    recordeTitulo: 'Recorde pessoal',
    recorde: '{{exercicio}}: {{carga}} kg. Sua melhor marca era {{anterior}} kg.',
    serieRepeticoes: '{{series}} × {{min}}–{{max}}',
    serieRepeticoesFixas: '{{series}} × {{repeticoes}}',
    serieTempo: "{{series}} × {{segundos}}''",
    cargaAlvo: '{{carga}} kg',
  },
  refeicao: {
    sair: 'Voltar para Hoje',
    verRefeicao: 'Ver refeição',
    ou: 'ou',
    macrosDoItem:
      '{{proteina}} g de proteína · {{carboidrato}} g de carboidrato · {{gordura}} g de gordura',
    totalDoDia: 'Total do dia',
    proteina: 'Proteína',
    carboidrato: 'Carboidrato',
    gordura: 'Gordura',
    consumidoDeAlvo: '{{consumido}} de {{alvo}} g',
    itensComidos: '{{comidos}} de {{total}} escolhidos',
  },
  execucao: {
    sair: 'Voltar para Hoje',
    voltarParaHoje: 'Voltar para Hoje',
    semTreinoTitulo: 'Hoje não tem treino',
    semTreinoDescricao: 'A agenda do seu plano não marca musculação para hoje.',
    serie: 'Série {{indice}}',
    carga: 'Carga (kg)',
    repeticoes: 'Reps',
    segundos: "{{segundos}}''",
    cargaDaSerie: 'Carga da série {{indice}}, em quilos',
    repeticoesDaSerie: 'Repetições da série {{indice}}',
    concluir: 'Concluir',
    concluida: 'Feita',
    concluirSerie: 'Concluir série {{indice}}',
    anterior: 'Anterior',
    proximo: 'Próximo',
    concluirTreino: 'Terminar treino',
    descansoFaltam: 'Faltam {{segundos}} s de descanso',
    descansoPronto: 'Pode voltar — até {{max}} s',
    descansoPassou: 'Passou do descanso prescrito',
    dispensarDescanso: 'Dispensar',
    carregando: 'Carregando seu histórico…',
  },
  /**
   * Os rótulos do corpo, de uma vez só: o Perfil pede a medida e a Evolução
   * mostra o delta dela. Duas listas dariam "Abdômen" numa tela e "Abdome" na
   * outra no dia em que alguém corrigisse uma delas.
   */
  corpo: {
    peso: 'Peso',
    gordura: 'Gordura',
    torax: 'Tórax',
    cintura: 'Cintura',
    abdomen: 'Abdômen',
    quadril: 'Quadril',
    braco: 'Braço',
    coxa: 'Coxa',
    panturrilha: 'Panturrilha',
  },
  perfil: {
    titulo: 'Perfil',
    identificacao: '{{nome}} · {{idade}} anos · {{altura}} m',
    corrigir: 'Corrigir meus dados',
    nome: 'Nome',
    idade: 'Idade (anos)',
    altura: 'Altura (m)',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    naoDeuParaSalvar: 'Confira os campos: algo aí não descreve uma pessoa.',
    afericao: 'Como você está hoje',
    peso: 'Peso (kg)',
    gordura: 'Gordura (%)',
    fita: 'Fita métrica',
    circunferencia: '{{parte}} (cm)',
    registrar: 'Registrar aferição',
    atualizar: 'Atualizar aferição de hoje',
    historico: 'Histórico de aferições',
    semAfericoes: 'Sua primeira aferição vira o ponto de partida da sua evolução.',
    pesoValor: '{{valor}} kg',
    gorduraValor: '{{valor}}% de gordura',
    circunferenciaValor: '{{parte}} {{valor}} cm',
    seusDados: 'Seu histórico é seu e fica no seu aparelho — trocar de plano não apaga nada.',
  },
  /**
   * A tela responde a uma pergunta: **eu evoluí?** Por isso o dicionário aqui
   * é feito de frases inteiras, e não de rótulos soltos para o aluno montar de
   * cabeça — a evidência vem em frase, o gráfico vem depois.
   */
  evolucao: {
    titulo: 'Sua evolução',
    destaqueCarga: 'Você levantou {{percentual}}% mais na {{exercicio}} {{intervalo}}.',
    destaqueCorpoPerdeu: 'Você perdeu {{valor}} de {{metrica}} {{intervalo}}.',
    destaqueCorpoGanhou: 'Você ganhou {{valor}} de {{metrica}} {{intervalo}}.',
    intervalo_one: 'em 1 semana',
    intervalo_other: 'em {{count}} semanas',
    /** Duas sessões na mesma semana: "em 0 semanas" seria absurdo. */
    intervaloMesmaSemana: 'esta semana',
    treinoTitulo: 'Exercício por exercício',
    corpoTitulo: 'Seu corpo',
    carga: 'Carga',
    volume: 'Volume',
    dePara: '{{de}} → {{para}}',
    sessoes_one: '{{count}} sessão',
    sessoes_other: '{{count}} sessões',
    pontoDePartida: 'Seu ponto de partida',
    subiu: '+{{valor}}%',
    /** O sinal de menos já vem no número formatado em pt-BR. */
    caiu: '{{valor}}%',
    vazioTitulo: 'Ainda não dá para dizer',
    vazioDescricao:
      'Registre o mesmo exercício em dois treinos — ou duas aferições no Perfil — e a comparação aparece aqui.',
    valorKg: '{{valor}} kg',
    valorCm: '{{valor}} cm',
    valorPercentual: '{{valor}}%',
    metrica: {
      peso: 'peso',
      gordura: 'gordura corporal',
      torax: 'tórax',
      cintura: 'cintura',
      abdomen: 'abdômen',
      quadril: 'quadril',
      braco: 'braço',
      coxa: 'coxa',
      panturrilha: 'panturrilha',
    },
  },
  plano: {
    titulo: 'Seu plano',
    importar: 'Importar arquivo do profissional',
    trocar: 'Importar outro arquivo',
    importando: 'Lendo o arquivo…',
    prescritoPor: 'Prescrito por {{nome}}',
    emitidoEm: 'Emitido em {{data}}',
    resumoTreino:
      '{{sessoes}} treinos · {{exercicios}} exercícios · descanso de {{min}} a {{max}} s',
    resumoNutricao: '{{refeicoes}} refeições por dia · {{litros}} L de água',
    resumoSuplementos: '{{suplementos}} suplementos em {{formulas}} fórmulas',
    seusDadosFicam: 'Seus dados ficam no seu aparelho. Você pode exportá-los quando quiser.',
  },
  erroImport: {
    titulo: 'Não consegui ler este arquivo',
    tranquilizacao:
      'Nada mudou no seu aparelho — o que você já tinha continua aqui. Envie os pontos abaixo para quem montou o plano e peça um arquivo corrigido.',
    copiar: 'Copiar para enviar ao profissional',
    copiado: 'Copiado',
    detalhesTecnicos: 'Detalhes técnicos',
  },
  rodape: {
    seusDados: 'Seus dados ficam no seu aparelho e são seus.',
  },
} as const

export type Dicionario = typeof ptBR
