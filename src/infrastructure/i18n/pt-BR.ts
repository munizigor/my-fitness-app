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
    importar: 'Importar plano',
  },
  rodape: {
    seusDados: 'Seus dados ficam no seu aparelho e são seus.',
  },
} as const

export type Dicionario = typeof ptBR
