import { describe, expect, it } from 'vitest'
import planoValido from '../../test/fixtures/plano-valido.json'
import { lerArquivoDePlano } from '../schema/arquivoDePlano'
import { montarDia } from './montarDia'

const PLANO = lerArquivoDePlano(planoValido).plano

// Do fixture: seg=Treino A, ter=Treino B, qui=descanso total,
// sáb=só aeróbico, dom=descanso total.
const SEGUNDA = '2026-08-24'
const QUINTA = '2026-08-27'
const SABADO = '2026-08-29'

function tipos(data: string) {
  return montarDia(PLANO, data).itens.map((i) => i.tipo)
}

/**
 * `find` devolve a união inteira; estes ajudantes estreitam pelo discriminante
 * e falham com mensagem útil quando o item não existe — melhor que um `!` que
 * estoura com "cannot read property of undefined".
 */
function acharTreino(data: string, prefs?: Parameters<typeof montarDia>[2]) {
  const item = montarDia(PLANO, data, prefs).itens.find((i) => i.tipo === 'treino')
  if (item?.tipo !== 'treino') throw new Error(`sem treino em ${data}`)
  return item
}

function acharRefeicao(data: string, numero: number) {
  const item = montarDia(PLANO, data).itens.find(
    (i) => i.tipo === 'refeicao' && i.refeicao.numero === numero
  )
  if (item?.tipo !== 'refeicao') throw new Error(`sem refeição ${numero} em ${data}`)
  return item
}

function nomes(suplementos: readonly { suplemento: { nome: string } }[]) {
  return suplementos.map((s) => s.suplemento.nome)
}

describe('montarDia', () => {
  describe('a linha do tempo é o dia, não o plano inteiro', () => {
    it('traz o treino que a agenda marca para aquele dia da semana', () => {
      expect(acharTreino(SEGUNDA).sessao.rotulo).toBe('Treino A')
    })

    it('traz o treino de terça, que é outro — o aluno nunca escolhe qual', () => {
      expect(acharTreino('2026-08-25').sessao.rotulo).toBe('Treino B')
    })

    it('resolve o nome do exercício, para a tela não ter que procurar', () => {
      const treino = acharTreino(SEGUNDA)
      expect(treino.exercicios[0]!.exercicio.nome).toBe('Puxada Frontal Pronada')
      expect(treino.exercicios[0]!.prescrito.series).toBe(4)
    })

    it('leva o descanso entre séries junto do treino — é ele que arma o cronômetro', () => {
      expect(acharTreino(SEGUNDA).descansoEntreSeries).toEqual({ minSegundos: 60, maxSegundos: 70 })
    })

    it('traz todas as refeições do plano, em ordem', () => {
      const refeicoes = montarDia(PLANO, SEGUNDA).itens.filter((i) => i.tipo === 'refeicao')
      expect(refeicoes.map((r) => (r.tipo === 'refeicao' ? r.refeicao.numero : 0))).toEqual([
        1, 2, 3,
      ])
    })
  })

  /**
   * O dia tem **poucos blocos grandes**, não muitos cartões pequenos. Suplemento
   * não é compromisso próprio: é parte de tomar café da manhã, ou parte de ir
   * treinar. Separá-lo em cartão irmão obriga o aluno a entender que dois itens
   * consecutivos da lista são, na verdade, o mesmo momento.
   */
  describe('suplementos moram dentro do momento a que pertencem', () => {
    it('põe o suplemento dentro da refeição, não como item ao lado dela', () => {
      expect(nomes(acharRefeicao(SEGUNDA, 1).suplementos)).toContain('Magnésio dimalato')
      expect(tipos(SEGUNDA)).not.toContain('suplementos')
    })

    it('agrupa na mesma refeição todos os do mesmo momento', () => {
      // Magnésio e Ômega 3, ambos após a refeição 1: um bloco, não dois cartões.
      expect(nomes(acharRefeicao(SEGUNDA, 1).suplementos).slice(0, 2)).toEqual([
        'Magnésio dimalato',
        'Ômega 3',
      ])
    })

    it('não põe na refeição o que pertence a outra', () => {
      expect(nomes(acharRefeicao(SEGUNDA, 2).suplementos)).not.toContain('Magnésio dimalato')
    })

    it('põe o pré-treino dentro do bloco de treino', () => {
      expect(nomes(acharTreino(SEGUNDA).suplementos)).toEqual(['Pré-treino'])
    })

    it('não mostra o pré-treino em dia sem treino', () => {
      const { itens } = montarDia(PLANO, QUINTA)
      const todos = itens.flatMap((i) => (i.tipo === 'aerobico' ? [] : nomes(i.suplementos)))
      expect(todos).not.toContain('Pré-treino')
    })

    it('ancora o suplemento livre na primeira refeição, com a observação do profissional', () => {
      const livre = acharRefeicao(SEGUNDA, 1).suplementos.find(
        (s) => s.suplemento.posologia.ancora.tipo === 'livre'
      )
      expect(livre?.suplemento.nome).toBe('Creatina')
      expect(livre?.suplemento.posologia.observacao).toContain('mais prática')
    })

    it('guarda de qual fórmula o suplemento veio, sem organizar o dia por fórmula', () => {
      expect(acharRefeicao(SEGUNDA, 1).suplementos[0]!.formula).toBe('Bem-estar geral')
    })
  })

  /**
   * Aeróbico é parte de ir à academia, não uma segunda ida. Quem faz esteira
   * depois do treino não sai e volta — o bloco é um só.
   */
  describe('aeróbico', () => {
    it('vem dentro do bloco de treino nos dias que têm os dois', () => {
      expect(acharTreino(SEGUNDA).aerobico?.duracaoMinutos).toBe(20)
      expect(tipos(SEGUNDA)).not.toContain('aerobico')
    })

    it('aparece sozinho nos dias em que só ele existe — senão sumiria do dia', () => {
      const { itens } = montarDia(PLANO, SABADO)
      expect(itens.some((i) => i.tipo === 'treino')).toBe(false)
      const aerobico = itens.find((i) => i.tipo === 'aerobico')
      expect(aerobico?.tipo === 'aerobico' && aerobico.aerobico.duracaoMinutos).toBe(20)
    })
  })

  describe('dia de descanso tem estado próprio', () => {
    it('marca como descanso o dia sem treino e sem aeróbico', () => {
      expect(montarDia(PLANO, QUINTA).descanso).toBe(true)
    })

    it('não marca descanso quando existe só o aeróbico', () => {
      expect(montarDia(PLANO, SABADO).descanso).toBe(false)
    })

    it('mantém as refeições no dia de descanso — comer não descansa', () => {
      expect(tipos(QUINTA).filter((t) => t === 'refeicao')).toHaveLength(3)
    })
  })

  describe('o que a tela precisa sem ir buscar', () => {
    it('leva hidratação e macros-alvo do dia', () => {
      const dia = montarDia(PLANO, SEGUNDA)
      expect(dia.hidratacaoDiariaLitros).toBe(4)
      expect(dia.macrosAlvoDiario.proteinaG).toBe(170)
    })

    it('leva a data e o dia da semana', () => {
      const dia = montarDia(PLANO, SEGUNDA)
      expect(dia.data).toBe(SEGUNDA)
      expect(dia.diaDaSemana).toBe('seg')
    })

    it('dá identificador estável a cada item, para a tela não usar índice', () => {
      const ids = montarDia(PLANO, SEGUNDA).itens.map((i) => i.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(montarDia(PLANO, SEGUNDA).itens.map((i) => i.id)).toEqual(ids)
    })

    it('o dia inteiro cabe em poucos blocos', () => {
      // 3 refeições + 1 treino. Antes eram 7 cartões para o mesmo dia.
      expect(montarDia(PLANO, SEGUNDA).itens).toHaveLength(4)
    })
  })

  describe('onde o treino cai no dia é preferência, não dado do plano', () => {
    it('por padrão, depois da primeira refeição', () => {
      const { itens } = montarDia(PLANO, SEGUNDA)
      const indiceRefeicao1 = itens.findIndex((i) => i.tipo === 'refeicao')
      const indiceTreino = itens.findIndex((i) => i.tipo === 'treino')
      expect(indiceTreino).toBeGreaterThan(indiceRefeicao1)
      expect(
        itens.findIndex((i) => i.tipo === 'refeicao' && i.refeicao.numero === 2)
      ).toBeGreaterThan(indiceTreino)
    })

    it('quem treina à noite move o treino para depois da última refeição', () => {
      // O plano do profissional diz em que dia o aluno treina, nunca a que
      // horas. A posição é do aluno, e por isso é parâmetro — não é inferida.
      const { itens } = montarDia(PLANO, SEGUNDA, { treinoDepoisDaRefeicao: 3 })
      const indiceTreino = itens.findIndex((i) => i.tipo === 'treino')
      const indiceRefeicao3 = itens.findIndex(
        (i) => i.tipo === 'refeicao' && i.refeicao.numero === 3
      )
      expect(indiceTreino).toBeGreaterThan(indiceRefeicao3)
    })

    it('preferência apontando para refeição inexistente joga o treino para o fim', () => {
      const { itens } = montarDia(PLANO, SEGUNDA, { treinoDepoisDaRefeicao: 99 })
      expect(itens[itens.length - 1]!.tipo).toBe('treino')
    })

    it('o aeróbico avulso também obedece à preferência', () => {
      const { itens } = montarDia(PLANO, SABADO, { treinoDepoisDaRefeicao: 3 })
      const indiceAerobico = itens.findIndex((i) => i.tipo === 'aerobico')
      const indiceRefeicao3 = itens.findIndex(
        (i) => i.tipo === 'refeicao' && i.refeicao.numero === 3
      )
      expect(indiceAerobico).toBeGreaterThan(indiceRefeicao3)
    })
  })

  it('recusa data inválida em vez de montar um dia errado', () => {
    expect(() => montarDia(PLANO, '25/08/2026')).toThrow()
  })
})
