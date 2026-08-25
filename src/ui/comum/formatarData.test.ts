import { afterEach, describe, expect, it } from 'vitest'
import { formatarData } from './formatarData'

const fusoOriginal = process.env.TZ

afterEach(() => {
  process.env.TZ = fusoOriginal
})

describe('formatarData', () => {
  it('escreve a data do vault como uma pessoa lê', () => {
    expect(formatarData('2026-06-10')).toBe('10/06/2026')
  })

  it('não recua um dia a oeste de Greenwich', () => {
    // `new Date('2026-06-10')` é meia-noite **UTC**: 21h do dia 9 em São Paulo.
    // Foi por isso que este módulo existe em vez de um `toLocaleDateString`
    // solto no JSX — o bug só apareceria para quem mora a oeste de Greenwich.
    process.env.TZ = 'America/Sao_Paulo'
    expect(formatarData('2026-06-10')).toBe('10/06/2026')
  })

  it('devolve a data crua quando não é AAAA-MM-DD', () => {
    // Não é para acontecer: o domínio valida antes de gravar. Se acontecer, o
    // aluno vê o texto do arquivo em vez de "Invalid Date".
    expect(formatarData('ontem')).toBe('ontem')
  })
})
