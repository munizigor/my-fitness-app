import { describe, expect, it } from 'vitest'
import planoValido from '../../../test/fixtures/plano-valido.json'
import { lerArquivoDePlano, type ArquivoDePlano } from '../arquivoDePlano'
import { integridadeReferencial } from './integridadeReferencial'
import type { ProblemaDeInvariante } from './tipos'

/**
 * O teste assere sobre `{caminho, mensagem}` — a regra — e não sobre o objeto
 * de erro do Zod. É o que a assinatura desacoplada compra, e o padrão que as
 * invariantes seguintes vão seguir.
 */
function conferir(mudar: (arquivo: ArquivoDePlano) => void): ProblemaDeInvariante[] {
  const arquivo = lerArquivoDePlano(structuredClone(planoValido))
  mudar(arquivo)

  const problemas: ProblemaDeInvariante[] = []
  integridadeReferencial(arquivo, (p) => problemas.push(p))
  return problemas
}

describe('integridadeReferencial', () => {
  it('não reclama de um plano coerente', () => {
    expect(conferir(() => {})).toEqual([])
  })

  it('acusa exercício com id repetido', () => {
    // Nada quebra na tela, e é justamente esse o perigo: a carga de um vaza
    // para o histórico do outro em silêncio.
    const problemas = conferir((a) => {
      a.plano.treino.exercicios[1]!.id = a.plano.treino.exercicios[0]!.id
    })

    expect(problemas).toContainEqual({
      caminho: ['plano', 'treino', 'exercicios', 1, 'id'],
      mensagem: 'está repetido: dois exercícios não podem ter o mesmo identificador',
    })

    // E o id que o exercício 1 tinha some do catálogo, então quem o
    // referenciava fica órfão. As duas coisas são o mesmo engano, e o
    // profissional precisa ver as duas para entender o estrago.
    expect(problemas.some((p) => p.caminho.includes('exercicioId'))).toBe(true)
  })

  it('acusa item que aponta para exercício fora do catálogo', () => {
    const problemas = conferir((a) => {
      a.plano.treino.sessoes[0]!.itens[0]!.exercicioId = 'nao-existe'
    })

    expect(problemas[0]?.caminho).toEqual([
      'plano',
      'treino',
      'sessoes',
      0,
      'itens',
      0,
      'exercicioId',
    ])
  })

  it('acusa agenda que marca um treino inexistente', () => {
    // Passa em toda checagem de formato e quebra na tela do aluno numa terça.
    const problemas = conferir((a) => {
      a.plano.treino.agendaSemanal.ter.sessaoId = 'Z'
    })

    expect(problemas[0]).toEqual({
      caminho: ['plano', 'treino', 'agendaSemanal', 'ter', 'sessaoId'],
      mensagem: 'marca um treino que não existe no plano',
    })
  })

  it('acusa suplemento ancorado numa refeição que o plano alimentar não tem', () => {
    const problemas = conferir((a) => {
      a.plano.suplementacao.formulas[0]!.itens[0]!.posologia.ancora = {
        tipo: 'apos-refeicao',
        refeicao: 9,
      }
    })

    // A mensagem nomeia o número, porque é o que o profissional procura.
    expect(problemas[0]?.mensagem).toBe(
      'manda tomar após a refeição 9, que o plano alimentar não tem'
    )
  })

  it('relata todos os problemas de uma vez, não só o primeiro', () => {
    // O profissional corrige o arquivo uma vez, não uma vez por erro.
    const problemas = conferir((a) => {
      a.plano.treino.sessoes[0]!.itens[0]!.exercicioId = 'nao-existe'
      a.plano.treino.agendaSemanal.ter.sessaoId = 'Z'
    })

    expect(problemas).toHaveLength(2)
  })
})
