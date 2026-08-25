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
