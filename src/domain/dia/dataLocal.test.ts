import { describe, expect, it } from 'vitest'
import { DataInvalidaError } from '../errors/DataInvalidaError'
import { diaDaSemanaDe, diferencaEmDias, ehDataLocal, hojeLocal } from './dataLocal'

describe('diaDaSemanaDe', () => {
  it.each([
    ['2026-08-24', 'seg'],
    ['2026-08-25', 'ter'],
    ['2026-08-26', 'qua'],
    ['2026-08-27', 'qui'],
    ['2026-08-28', 'sex'],
    ['2026-08-29', 'sab'],
    ['2026-08-30', 'dom'],
  ])('%s é %s', (data, esperado) => {
    expect(diaDaSemanaDe(data)).toBe(esperado)
  })

  it('não escorrega para o dia anterior em fuso a oeste de Greenwich', () => {
    // `new Date('2026-08-25')` é interpretado como meia-noite UTC. Em São Paulo
    // (UTC-3) isso é 21h do dia 24 — e o aluno que abre o app à noite veria o
    // treino de ontem. A data de domínio precisa ser construída com as partes,
    // nunca parseada da string ISO.
    expect(diaDaSemanaDe('2026-08-25')).toBe('ter')
  })

  it('atravessa a virada do ano', () => {
    expect(diaDaSemanaDe('2025-12-31')).toBe('qua')
    expect(diaDaSemanaDe('2026-01-01')).toBe('qui')
  })

  it('entende ano bissexto', () => {
    expect(diaDaSemanaDe('2028-02-29')).toBe('ter')
  })

  it.each([
    ['vazio', ''],
    ['formato brasileiro', '25/08/2026'],
    ['sem zero à esquerda', '2026-8-5'],
    ['mês inexistente', '2026-13-01'],
    ['dia inexistente', '2026-02-30'],
    ['lixo', 'amanhã'],
  ])('recusa data %s', (_caso, data) => {
    expect(() => diaDaSemanaDe(data)).toThrow(DataInvalidaError)
  })
})

describe('hojeLocal', () => {
  it('devolve AAAA-MM-DD', () => {
    expect(hojeLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('usa o fuso do aluno, não UTC', () => {
    // Um instante que, em UTC, já é dia 26, mas que em São Paulo ainda é dia 25.
    const instante = new Date(2026, 7, 25, 23, 30)
    expect(hojeLocal(instante)).toBe('2026-08-25')
  })

  it('acerta a virada da meia-noite local', () => {
    expect(hojeLocal(new Date(2026, 7, 25, 0, 0, 0))).toBe('2026-08-25')
    expect(hojeLocal(new Date(2026, 7, 25, 23, 59, 59))).toBe('2026-08-25')
  })

  it('preenche zero à esquerda em mês e dia', () => {
    expect(hojeLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('diferencaEmDias', () => {
  it('conta os dias entre duas datas', () => {
    expect(diferencaEmDias('2026-08-04', '2026-09-01')).toBe(28)
  })

  it('é zero no mesmo dia', () => {
    expect(diferencaEmDias('2026-08-25', '2026-08-25')).toBe(0)
  })

  it('atravessa mês, ano e fevereiro bissexto', () => {
    expect(diferencaEmDias('2025-12-30', '2026-01-02')).toBe(3)
    expect(diferencaEmDias('2028-02-28', '2028-03-01')).toBe(2)
  })

  it('não perde nem ganha um dia na virada do horário de verão', () => {
    // O motivo de a conta ser feita em UTC: onde há horário de verão, um dos
    // dias do intervalo tem 23 ou 25 horas. Dividir milissegundos por 86.400.000
    // sobre datas locais devolveria 27,96 dias — e "4 semanas" viraria "3".
    expect(diferencaEmDias('2026-10-14', '2026-11-11')).toBe(28)
    expect(diferencaEmDias('2027-02-10', '2027-03-10')).toBe(28)
  })

  it('recusa data que não existe no calendário', () => {
    expect(() => diferencaEmDias('2026-02-30', '2026-03-01')).toThrow(DataInvalidaError)
    expect(() => diferencaEmDias('2026-03-01', 'ontem')).toThrow(DataInvalidaError)
  })
})

describe('ehDataLocal', () => {
  it.each(['2026-08-25', '2000-01-01', '2028-02-29'])('aceita %s', (data) => {
    expect(ehDataLocal(data)).toBe(true)
  })

  it.each(['2026-8-5', '25/08/2026', '2026-02-30', '', 'hoje'])('recusa %s', (data) => {
    expect(ehDataLocal(data)).toBe(false)
  })
})
