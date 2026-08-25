import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION_MEDIDA, type Medida, type ValoresAferidos } from '../aluno/medida'
import { evolucaoCorporal } from './evolucaoCorporal'

function afericao(data: string, valores: ValoresAferidos): Medida {
  return { schemaVersion: SCHEMA_VERSION_MEDIDA, data, ...valores }
}

describe('evolucaoCorporal', () => {
  describe('o delta entre a primeira e a última aferição', () => {
    it('mostra o peso que mudou, com o intervalo junto', () => {
      const medidas = [
        afericao('2026-06-10', { pesoKg: 85 }),
        afericao('2026-08-05', { pesoKg: 81.6 }),
      ]

      expect(evolucaoCorporal(medidas)).toEqual([
        {
          metrica: 'peso',
          unidade: 'kg',
          variacao: {
            de: 85,
            para: 81.6,
            diferenca: -3.4,
            percentual: -4,
            desde: '2026-06-10',
            semanas: 8,
          },
        },
      ])
    })

    it('não depende de o histórico chegar ordenado', () => {
      const medidas = [
        afericao('2026-08-05', { pesoKg: 81 }),
        afericao('2026-06-10', { pesoKg: 85 }),
      ]
      // O store entrega mais recente primeiro; o vault, por nome de arquivo.
      expect(evolucaoCorporal(medidas)[0]?.variacao.de).toBe(85)
    })

    it('cada circunferência é uma série própria', () => {
      const medidas = [
        afericao('2026-06-10', { circunferenciasCm: { cintura: 92, braco: 35 } }),
        afericao('2026-08-05', { circunferenciasCm: { cintura: 89, braco: 36 } }),
      ]

      expect(evolucaoCorporal(medidas).map((d) => [d.metrica, d.variacao.diferenca])).toEqual([
        ['cintura', -3],
        ['braco', 1],
      ])
    })

    it('acompanha o percentual de gordura', () => {
      const medidas = [
        afericao('2026-06-10', { percentualGordura: 22 }),
        afericao('2026-08-05', { percentualGordura: 19 }),
      ]

      expect(evolucaoCorporal(medidas)[0]).toMatchObject({ metrica: 'gordura', unidade: '%' })
    })
  })

  describe('o que ainda não é evolução', () => {
    it('com uma aferição só, não há delta', () => {
      expect(evolucaoCorporal([afericao('2026-06-10', { pesoKg: 85 })])).toEqual([])
    })

    it('sem nenhuma aferição, também não', () => {
      expect(evolucaoCorporal([])).toEqual([])
    })

    it('ignora a medida que só foi aferida uma vez', () => {
      const medidas = [
        afericao('2026-06-10', { pesoKg: 85, circunferenciasCm: { cintura: 92 } }),
        afericao('2026-08-05', { pesoKg: 81 }),
      ]
      // Quem mediu a cintura uma vez não tem trajetória de cintura — e um
      // delta de zero ali seria invenção.
      expect(evolucaoCorporal(medidas).map((d) => d.metrica)).toEqual(['peso'])
    })

    it('não conta como mudança o número que ficou igual', () => {
      const medidas = [
        afericao('2026-06-10', { pesoKg: 82 }),
        afericao('2026-08-05', { pesoKg: 82 }),
      ]
      // Manter o peso é um fato sobre o corpo; a variação existe e é zero.
      expect(evolucaoCorporal(medidas)[0]?.variacao).toMatchObject({ diferenca: 0, percentual: 0 })
    })
  })

  describe('a ordem em que a tela lê', () => {
    it('peso, gordura e depois as circunferências de cima para baixo', () => {
      const cheia = {
        pesoKg: 82,
        percentualGordura: 20,
        circunferenciasCm: { coxa: 58, torax: 100, cintura: 90 },
      }
      const medidas = [afericao('2026-06-10', cheia), afericao('2026-08-05', cheia)]

      // A mesma ordem do formulário do Perfil: o aluno não reaprende a lista.
      expect(evolucaoCorporal(medidas).map((d) => d.metrica)).toEqual([
        'peso',
        'gordura',
        'torax',
        'cintura',
        'coxa',
      ])
    })
  })
})
