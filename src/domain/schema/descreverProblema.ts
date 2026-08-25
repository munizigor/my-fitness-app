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

/** Onde no plano, em termos que o profissional reconhece ao bater o olho. */
function localizar(caminho: Caminho, doc: unknown): string {
  const em = (...partes: Caminho) => navegar(doc, partes)

  if (caminho[0] === 'aluno') return 'Dados do aluno'
  if (caminho[0] === 'profissional') return 'Dados do profissional'

  if (caminho[1] === 'treino') {
    if (caminho[2] === 'exercicios' && typeof caminho[3] === 'number') {
      const nome = texto(em('plano', 'treino', 'exercicios', caminho[3], 'nome'))
      return `Lista de exercícios · ${nome ?? `exercício ${caminho[3] + 1}`}`
    }

    if (caminho[2] === 'sessoes' && typeof caminho[3] === 'number') {
      const sessao = `${texto(em('plano', 'treino', 'sessoes', caminho[3], 'rotulo')) ?? `Treino ${caminho[3] + 1}`}`
      if (caminho[4] === 'itens' && typeof caminho[5] === 'number') {
        const item = em('plano', 'treino', 'sessoes', caminho[3], 'itens', caminho[5])
        return `${sessao} · ${descreverItemDeTreino(item, caminho[5], doc)}`
      }
      return sessao
    }

    if (caminho[2] === 'agendaSemanal' && typeof caminho[3] === 'string') {
      return `Agenda da semana · ${DIAS[caminho[3]] ?? caminho[3]}`
    }

    return 'Plano de treino'
  }

  if (caminho[1] === 'nutricao') {
    if (caminho[2] === 'refeicoes' && typeof caminho[3] === 'number') {
      const numero = em('plano', 'nutricao', 'refeicoes', caminho[3], 'numero')
      const nome = texto(em('plano', 'nutricao', 'refeicoes', caminho[3], 'nome'))
      const refeicao = nome ?? `Refeição ${typeof numero === 'number' ? numero : caminho[3] + 1}`
      if (caminho[4] === 'itens' && typeof caminho[5] === 'number') {
        const alvo = `${refeicao} · item ${caminho[5] + 1}`
        return caminho[6] === 'opcoes' && typeof caminho[7] === 'number'
          ? `${alvo} · opção ${caminho[7] + 1}`
          : alvo
      }
      return refeicao
    }
    return 'Plano alimentar'
  }

  if (caminho[1] === 'suplementacao') {
    if (caminho[2] === 'formulas' && typeof caminho[3] === 'number') {
      const formula =
        texto(em('plano', 'suplementacao', 'formulas', caminho[3], 'nome')) ??
        `fórmula ${caminho[3] + 1}`
      if (caminho[4] === 'itens' && typeof caminho[5] === 'number') {
        const item =
          texto(
            em('plano', 'suplementacao', 'formulas', caminho[3], 'itens', caminho[5], 'nome')
          ) ?? `item ${caminho[5] + 1}`
        return `Suplementos · ${formula} · ${item}`
      }
      return `Suplementos · ${formula}`
    }
    return 'Suplementos'
  }

  return 'Arquivo'
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
