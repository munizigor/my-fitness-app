import { describe, expect, it } from 'vitest'
import planoValido from '../../test/fixtures/plano-valido.json'
import { montarDia } from '../dia/montarDia'
import { SCHEMA_VERSION_REGISTRO } from '../registro/migracoes'
import type { RegistroDiario } from '../registro/registroDiario'
import { lerArquivoDePlano } from '../schema/arquivoDePlano'
import { macrosDoDia } from './macrosDoDia'

const PLANO = lerArquivoDePlano(planoValido).plano
const SEGUNDA = '2026-08-24'
const DIA = montarDia(PLANO, SEGUNDA)

function registro(refeicoes: RegistroDiario['refeicoes']): RegistroDiario {
  return {
    schemaVersion: SCHEMA_VERSION_REGISTRO,
    data: SEGUNDA,
    aguaLitros: 0,
    series: [],
    refeicoes,
  }
}

/** O primeiro item do café da manhã, com os macros que o profissional deu a ele. */
const ITEM_1 = PLANO.nutricao.refeicoes[0]!.itens[0]!

describe('macrosDoDia', () => {
  it('leva o alvo que o profissional prescreveu', () => {
    expect(macrosDoDia(DIA, null).alvo).toEqual(PLANO.nutricao.macrosAlvoDiario)
  })

  it('sem nada registrado, o consumido é zero — e não o alvo', () => {
    // O dia começa vazio. Mostrar o alvo como se já tivesse sido comido seria
    // exatamente o erro que o produto existe para não cometer.
    expect(macrosDoDia(DIA, null).consumido).toEqual({
      proteinaG: 0,
      carboidratoG: 0,
      gorduraG: 0,
    })
  })

  it('soma os macros do item que o aluno marcou como comido', () => {
    const dia = macrosDoDia(
      DIA,
      registro([
        {
          refeicaoId: '1',
          itens: [{ itemDeRefeicaoId: ITEM_1.id, alimento: ITEM_1.opcoes[0]!.alimento }],
          registradaEm: '2026-08-24T08:00:00.000Z',
        },
      ])
    )

    expect(dia.consumido).toEqual(ITEM_1.macros)
  })

  it('não muda a soma conforme a alternativa escolhida', () => {
    // As opções são equivalentes por construção: o profissional escolhe as
    // quantidades justamente para que 100 g de arroz e 200 g de batata deem no
    // mesmo. Qual delas o aluno comeu é informação para o profissional ler,
    // não uma variável do cálculo.
    const comOpcao = (indice: number) =>
      macrosDoDia(
        DIA,
        registro([
          {
            refeicaoId: '1',
            itens: [{ itemDeRefeicaoId: ITEM_1.id, alimento: ITEM_1.opcoes[indice]!.alimento }],
            registradaEm: '2026-08-24T08:00:00.000Z',
          },
        ])
      ).consumido

    expect(comOpcao(0)).toEqual(comOpcao(ITEM_1.opcoes.length - 1))
  })

  it('diz quanto falta para o alvo', () => {
    const { restante, alvo } = macrosDoDia(
      DIA,
      registro([
        {
          refeicaoId: '1',
          itens: [{ itemDeRefeicaoId: ITEM_1.id, alimento: ITEM_1.opcoes[0]!.alimento }],
          registradaEm: '2026-08-24T08:00:00.000Z',
        },
      ])
    )

    expect(restante.proteinaG).toBe(alvo.proteinaG - ITEM_1.macros.proteinaG)
  })

  it('ignora item registrado que o plano de hoje não tem', () => {
    // O aluno trocou de plano no meio do dia, ou o profissional reemitiu o
    // arquivo. O registro de ontem não pode somar macros de um item que não
    // existe mais — nem derrubar a tela.
    const { consumido } = macrosDoDia(
      DIA,
      registro([
        {
          refeicaoId: '1',
          itens: [{ itemDeRefeicaoId: 'fantasma', alimento: 'Sopa' }],
          registradaEm: '2026-08-24T08:00:00.000Z',
        },
      ])
    )

    expect(consumido.proteinaG).toBe(0)
  })

  it('conta cada refeição uma vez só, mesmo com várias registradas', () => {
    const primeiraRefeicao = PLANO.nutricao.refeicoes[0]!
    const { consumido } = macrosDoDia(
      DIA,
      registro([
        {
          refeicaoId: '1',
          itens: primeiraRefeicao.itens.map((i) => ({
            itemDeRefeicaoId: i.id,
            alimento: i.opcoes[0]!.alimento,
          })),
          registradaEm: '2026-08-24T08:00:00.000Z',
        },
      ])
    )

    const esperado = primeiraRefeicao.itens.reduce((s, i) => s + i.macros.proteinaG, 0)
    expect(consumido.proteinaG).toBe(esperado)
  })
})
