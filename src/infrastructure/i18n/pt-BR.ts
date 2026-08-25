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
  hoje: {
    diaDaSemana: {
      seg: 'Segunda-feira',
      ter: 'Terça-feira',
      qua: 'Quarta-feira',
      qui: 'Quinta-feira',
      sex: 'Sexta-feira',
      sab: 'Sábado',
      dom: 'Domingo',
    },
    descansoTitulo: 'Hoje é dia de descanso',
    descansoDescricao: 'Sem treino nem aeróbico. As refeições continuam.',
    agua: 'Água',
    aguaContador: '{{consumido}} de {{alvo}} L',
    aguaAdicionar: 'Registrar mais um copo de água',
    refeicao: 'Refeição {{numero}}',
    refeicaoItens_one: '{{count}} item',
    refeicaoItens_other: '{{count}} itens',
    suplementosAposRefeicao: 'Suplementos · depois da refeição {{numero}}',
    suplementosAntesDoTreino: 'Suplementos · antes do treino',
    suplementosLivre: 'Suplementos · quando for mais prático',
    treinoExercicios_one: '{{count}} exercício',
    treinoExercicios_other: '{{count}} exercícios',
    treinoDescanso: 'descanso de {{min}} a {{max}} s entre séries',
    aerobico: 'Aeróbico',
    aerobicoDuracao: '{{minutos}} min',
    serieRepeticoes: '{{series}} × {{min}}–{{max}}',
    serieRepeticoesFixas: '{{series}} × {{repeticoes}}',
    serieTempo: "{{series}} × {{segundos}}''",
    cargaAlvo: '{{carga}} kg',
  },
  emConstrucao: {
    titulo: 'Ainda não construído',
    descricao: 'Esta tela chega num próximo ciclo.',
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
