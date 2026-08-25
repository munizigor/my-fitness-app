import type { $ZodIssue } from 'zod/v4/core'
import type { ProblemaNoArquivo } from '../errors/ArquivoInvalidoError'

/**
 * Traduz um problema de validação para a linguagem de quem vai resolvê-lo.
 *
 * `plano.treino.sessoes.0.itens.2.series` não diz nada a um treinador.
 * "Treino A · Prancha Lateral — Séries: não foi preenchido" diz tudo, e é
 * exatamente o que ele precisa para abrir a planilha e corrigir.
 *
 * O caminho técnico continua existindo, mas fica escondido: serve a quem
 * depura o app, não a quem usa.
 */

// O Zod tipa `path` como PropertyKey[], que inclui symbol. Symbol nunca aparece
// num documento JSON, mas o tipo precisa acomodá-lo para não exigir cast.
type Segmento = string | number | symbol
type Caminho = readonly Segmento[]

const DIAS: Record<string, string> = {
  seg: 'segunda-feira',
  ter: 'terça-feira',
  qua: 'quarta-feira',
  qui: 'quinta-feira',
  sex: 'sexta-feira',
  sab: 'sábado',
  dom: 'domingo',
}

/** Nome de negócio para cada campo, na voz de quem preenche o plano. */
const CAMPOS: Record<string, string> = {
  formato: 'Formato do arquivo',
  schemaVersion: 'Versão do formato',
  emitidoEm: 'Data de emissão',
  nome: 'Nome',
  registro: 'Registro profissional',
  idade: 'Idade',
  alturaMetros: 'Altura',
  rotulo: 'Nome do treino',
  foco: 'Foco do treino',
  series: 'Séries',
  execucao: 'Repetições ou tempo',
  min: 'Repetições (mínimo)',
  max: 'Repetições (máximo)',
  segundos: 'Tempo de cada série',
  cargaAlvoKg: 'Carga alvo',
  observacao: 'Observação',
  exercicioId: 'Exercício',
  exercicios: 'Exercícios',
  gruposMusculares: 'Grupos musculares',
  itens: 'Itens',
  sessoes: 'Treinos',
  minSegundos: 'Descanso mínimo entre séries',
  maxSegundos: 'Descanso máximo entre séries',
  descansoEntreSeries: 'Descanso entre séries',
  sessaoId: 'Treino do dia',
  aerobico: 'Aeróbico',
  modalidade: 'Modalidade do aeróbico',
  duracaoMinutos: 'Duração',
  alimento: 'Alimento',
  quantidade: 'Quantidade',
  unidade: 'Unidade',
  opcoes: 'Opções do item',
  numero: 'Número da refeição',
  refeicoes: 'Refeições',
  proteinaG: 'Proteína',
  carboidratoG: 'Carboidrato',
  gorduraG: 'Gordura',
  macros: 'Macros',
  macrosAlvoDiario: 'Macros-alvo do dia',
  hidratacaoDiariaLitros: 'Água por dia',
  vegetaisSugeridos: 'Vegetais sugeridos',
  dose: 'Dose',
  posologia: 'Como tomar',
  ancora: 'Quando tomar',
  vezesPorDia: 'Vezes por dia',
  duracaoDias: 'Duração em dias',
  refeicao: 'Refeição de referência',
  formulas: 'Fórmulas',
  tipo: 'Tipo',
}

const TIPOS: Record<string, string> = {
  string: 'um texto',
  number: 'um número',
  boolean: 'sim ou não',
  array: 'uma lista',
  object: 'um conjunto de campos',
  null: 'vazio',
}

export function descreverProblema(issue: $ZodIssue, documento: unknown): ProblemaNoArquivo {
  return {
    onde: localizar(issue.path, documento),
    oQue: nomearCampo(issue.path),
    // O valor vem do documento, não de `issue.input`: o Zod nem sempre popula
    // esse campo, e "não foi preenchido" versus "precisa ser um número" é
    // justamente a diferença que o profissional precisa enxergar.
    mensagem: humanizar(issue, navegar(documento, issue.path)),
    caminhoTecnico: issue.path.join('.'),
  }
}

/**
 * As rotas que traduzem um caminho de campo em "onde no plano".
 *
 * Uma tabela, e não uma cadeia de `if` sobre posições fixas do caminho. A
 * diferença aparece quando o formato do arquivo muda: acrescentar uma seção
 * vira uma linha aqui, em vez de um `if` aninhado no meio de outro; e o
 * comportamento "caiu numa seção que não sei detalhar" vira uma entrada
 * explícita ao fim de cada grupo, em vez de um `return` implícito.
 *
 * `:n` casa um índice de lista; `:s`, uma chave de texto. **A ordem importa:**
 * casa a primeira rota cujo padrão é prefixo do caminho, então a mais
 * específica de cada grupo vem antes da mais genérica.
 */
type Curinga = ':n' | ':s'
type Padrao = readonly (string | Curinga)[]
type Capturas = readonly (string | number)[]

interface Rota {
  readonly padrao: Padrao
  readonly rotulo: (capturas: Capturas, doc: unknown) => string
}

const ROTAS: readonly Rota[] = [
  { padrao: ['aluno'], rotulo: () => 'Dados do aluno' },
  { padrao: ['profissional'], rotulo: () => 'Dados do profissional' },

  {
    padrao: ['plano', 'treino', 'exercicios', ':n'],
    rotulo: (c, doc) => {
      const i = indice(c, 0)
      const nome = texto(navegar(doc, ['plano', 'treino', 'exercicios', i, 'nome']))
      return `Lista de exercícios · ${nome ?? `exercício ${i + 1}`}`
    },
  },
  {
    padrao: ['plano', 'treino', 'sessoes', ':n', 'itens', ':n'],
    rotulo: (c, doc) => {
      const [s, j] = [indice(c, 0), indice(c, 1)]
      const item = navegar(doc, ['plano', 'treino', 'sessoes', s, 'itens', j])
      return `${nomeDaSessao(s, doc)} · ${descreverItemDeTreino(item, j, doc)}`
    },
  },
  {
    padrao: ['plano', 'treino', 'sessoes', ':n'],
    rotulo: (c, doc) => nomeDaSessao(indice(c, 0), doc),
  },
  {
    padrao: ['plano', 'treino', 'agendaSemanal', ':s'],
    rotulo: (c) => {
      const dia = chave(c, 0)
      return `Agenda da semana · ${DIAS[dia] ?? dia}`
    },
  },
  { padrao: ['plano', 'treino'], rotulo: () => 'Plano de treino' },

  {
    padrao: ['plano', 'nutricao', 'refeicoes', ':n', 'itens', ':n', 'opcoes', ':n'],
    rotulo: (c, doc) =>
      `${nomeDaRefeicao(indice(c, 0), doc)} · item ${indice(c, 1) + 1} · opção ${indice(c, 2) + 1}`,
  },
  {
    padrao: ['plano', 'nutricao', 'refeicoes', ':n', 'itens', ':n'],
    rotulo: (c, doc) => `${nomeDaRefeicao(indice(c, 0), doc)} · item ${indice(c, 1) + 1}`,
  },
  {
    padrao: ['plano', 'nutricao', 'refeicoes', ':n'],
    rotulo: (c, doc) => nomeDaRefeicao(indice(c, 0), doc),
  },
  { padrao: ['plano', 'nutricao'], rotulo: () => 'Plano alimentar' },

  {
    padrao: ['plano', 'suplementacao', 'formulas', ':n', 'itens', ':n'],
    rotulo: (c, doc) => {
      const [f, i] = [indice(c, 0), indice(c, 1)]
      const nome =
        texto(navegar(doc, ['plano', 'suplementacao', 'formulas', f, 'itens', i, 'nome'])) ??
        `item ${i + 1}`
      return `Suplementos · ${nomeDaFormula(f, doc)} · ${nome}`
    },
  },
  {
    padrao: ['plano', 'suplementacao', 'formulas', ':n'],
    rotulo: (c, doc) => `Suplementos · ${nomeDaFormula(indice(c, 0), doc)}`,
  },
  { padrao: ['plano', 'suplementacao'], rotulo: () => 'Suplementos' },
]

/** Onde no plano, em termos que o profissional reconhece ao bater o olho. */
function localizar(caminho: Caminho, doc: unknown): string {
  for (const rota of ROTAS) {
    const capturas = casar(rota.padrao, caminho)
    if (capturas) return rota.rotulo(capturas, doc)
  }
  return 'Arquivo'
}

/** Casa por prefixo: o padrão precisa cobrir o começo do caminho, não o todo. */
function casar(padrao: Padrao, caminho: Caminho): Capturas | null {
  if (caminho.length < padrao.length) return null

  const capturas: (string | number)[] = []
  for (let i = 0; i < padrao.length; i++) {
    const esperado = padrao[i]
    const parte = caminho[i]

    if (esperado === ':n') {
      if (typeof parte !== 'number') return null
      capturas.push(parte)
    } else if (esperado === ':s') {
      if (typeof parte !== 'string') return null
      capturas.push(parte)
    } else if (parte !== esperado) {
      return null
    }
  }
  return capturas
}

function indice(capturas: Capturas, posicao: number): number {
  const valor = capturas[posicao]
  return typeof valor === 'number' ? valor : 0
}

function chave(capturas: Capturas, posicao: number): string {
  const valor = capturas[posicao]
  return typeof valor === 'string' ? valor : ''
}

function nomeDaSessao(indiceDaSessao: number, doc: unknown): string {
  return (
    texto(navegar(doc, ['plano', 'treino', 'sessoes', indiceDaSessao, 'rotulo'])) ??
    `Treino ${indiceDaSessao + 1}`
  )
}

function nomeDaRefeicao(indiceDaRefeicao: number, doc: unknown): string {
  const nome = texto(navegar(doc, ['plano', 'nutricao', 'refeicoes', indiceDaRefeicao, 'nome']))
  if (nome) return nome

  // Sem nome, o número que o profissional escreveu identifica melhor que a
  // posição no array — e ele pode não bater com ela.
  const numero = navegar(doc, ['plano', 'nutricao', 'refeicoes', indiceDaRefeicao, 'numero'])
  return `Refeição ${typeof numero === 'number' ? numero : indiceDaRefeicao + 1}`
}

function nomeDaFormula(indiceDaFormula: number, doc: unknown): string {
  return (
    texto(navegar(doc, ['plano', 'suplementacao', 'formulas', indiceDaFormula, 'nome'])) ??
    `fórmula ${indiceDaFormula + 1}`
  )
}

/**
 * Um item de treino não tem nome próprio: o nome vem do exercício que ele
 * referencia. A observação entra junto porque é o que distingue duas prescrições
 * do mesmo exercício na mesma sessão — "Prancha Lateral · Lado direito".
 */
function descreverItemDeTreino(item: unknown, indice: number, doc: unknown): string {
  if (typeof item !== 'object' || item === null) return `item ${indice + 1}`
  const { exercicioId, observacao } = item as { exercicioId?: unknown; observacao?: unknown }

  const catalogo = navegar(doc, ['plano', 'treino', 'exercicios'])
  const encontrado = Array.isArray(catalogo)
    ? catalogo.find((e) => (e as { id?: unknown })?.id === exercicioId)
    : undefined
  const nome = texto((encontrado as { nome?: unknown })?.nome) ?? `item ${indice + 1}`

  const detalhe = texto(observacao)
  return detalhe ? `${nome} (${detalhe})` : nome
}

function nomearCampo(caminho: Caminho): string {
  for (let i = caminho.length - 1; i >= 0; i--) {
    const parte = caminho[i]
    if (typeof parte === 'string' && CAMPOS[parte]) return CAMPOS[parte]
  }
  return 'Conteúdo'
}

/** Códigos do Zod viram frases que uma pessoa lê sem traduzir. */
function humanizar(issue: $ZodIssue, valor: unknown): string {
  switch (issue.code) {
    case 'invalid_type':
      return valor === undefined || valor === null
        ? 'não foi preenchido'
        : `precisa ser ${TIPOS[String(issue.expected)] ?? 'de outro tipo'}`

    case 'too_small': {
      const minimo = Number(issue.minimum)
      if (issue.origin === 'array') {
        return minimo === 1
          ? 'precisa ter pelo menos um item'
          : `precisa ter pelo menos ${minimo} itens`
      }
      if (issue.origin === 'string') return 'não pode ficar em branco'
      return minimo === 0 ? 'precisa ser maior que zero' : `precisa ser no mínimo ${minimo}`
    }

    case 'too_big': {
      const maximo = Number(issue.maximum)
      return `precisa ser no máximo ${maximo}`
    }

    case 'invalid_value':
      return 'não é um valor aceito aqui'

    case 'invalid_format':
      return issue.format === 'date'
        ? 'precisa ser uma data no formato AAAA-MM-DD'
        : 'está num formato que não reconheço'

    case 'invalid_union':
      return 'não está em nenhum dos formatos aceitos'

    // As mensagens `custom` são escritas por nós, já em linguagem de gente.
    default:
      return issue.message
  }
}

function navegar(valor: unknown, caminho: Caminho): unknown {
  return caminho.reduce<unknown>((atual, parte) => {
    if (atual === null || atual === undefined) return undefined
    return (atual as Record<Segmento, unknown>)[parte]
  }, valor)
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined
}
