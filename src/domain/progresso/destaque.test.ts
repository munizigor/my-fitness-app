import { describe, expect, it } from 'vitest'
import { destaqueDeEvolucao } from './destaque'
import type { DeltaCorporal } from './evolucaoCorporal'
import type { ProgressoDeExercicio } from './progressoDeExercicio'
import type { Variacao } from './variacao'

function variacao(de: number, para: number, semanas = 4): Variacao {
  const diferenca = para - de
  return {
    de,
    para,
    diferenca,
    percentual: de === 0 ? null : Math.round((diferenca / de) * 1000) / 10,
    desde: '2026-07-28',
    semanas,
  }
}

function exercicio(nome: string, carga: Variacao | null): ProgressoDeExercicio {
  return { exercicioId: nome, nome, sessoes: [], carga, volume: null }
}

function corpo(metrica: DeltaCorporal['metrica'], de: number, para: number): DeltaCorporal {
  return {
    metrica,
    unidade: metrica === 'peso' ? 'kg' : 'cm',
    variacao: variacao(de, para),
  }
}

describe('destaqueDeEvolucao', () => {
  describe('a frase que vem antes de qualquer gráfico', () => {
    it('elege a maior subida de carga', () => {
      const progresso = [
        exercicio('Supino', variacao(50, 55)),
        exercicio('Remada', variacao(40, 50)),
      ]

      expect(destaqueDeEvolucao(progresso, [])).toEqual({
        tipo: 'carga',
        nome: 'Remada',
        variacao: variacao(40, 50),
      })
    })

    it('compara em percentual, não em quilos', () => {
      // +10 kg no agachamento pesado é menos evolução do que +6 kg na rosca.
      const progresso = [
        exercicio('Agachamento', variacao(150, 160)),
        exercicio('Rosca Direta', variacao(20, 26)),
      ]

      expect(destaqueDeEvolucao(progresso, [])?.tipo).toBe('carga')
      expect(destaqueDeEvolucao(progresso, [])).toMatchObject({ nome: 'Rosca Direta' })
    })

    it('cai para o corpo quando nenhuma carga subiu', () => {
      const progresso = [exercicio('Supino', variacao(60, 55))]
      const corporal = [corpo('cintura', 92, 89)]

      // Quem não vê progresso na barra às vezes o tem na fita métrica.
      expect(destaqueDeEvolucao(progresso, corporal)).toMatchObject({
        tipo: 'corpo',
        metrica: 'cintura',
      })
    })

    it('no corpo, elege a maior mudança em qualquer direção', () => {
      // Sem saber o objetivo do aluno, perder 3 cm de cintura e ganhar 3 cm de
      // braço são igualmente evolução. O plano não diz qual ele quer.
      const corporal = [corpo('peso', 82, 81), corpo('braco', 35, 38)]

      expect(destaqueDeEvolucao([], corporal)).toMatchObject({ metrica: 'braco' })
    })

    it('a carga tem precedência sobre o corpo', () => {
      const progresso = [exercicio('Supino', variacao(50, 52))]
      const corporal = [corpo('cintura', 100, 80)]

      // A carga é o que o aluno acabou de fazer; o corpo é de junho. E é a
      // barra que ele levanta amanhã de novo.
      expect(destaqueDeEvolucao(progresso, corporal)?.tipo).toBe('carga')
    })
  })

  describe('quando ainda não há o que dizer', () => {
    it('sem trajetória nenhuma, não há destaque', () => {
      expect(destaqueDeEvolucao([], [])).toBeNull()
    })

    it('exercício com uma sessão só não vira destaque', () => {
      expect(destaqueDeEvolucao([exercicio('Supino', null)], [])).toBeNull()
    })

    it('carga parada não é subida', () => {
      const progresso = [exercicio('Supino', variacao(60, 60))]
      // Repetir a mesma carga por quatro semanas é informação, mas não é a
      // manchete: dizer "+0%" em letra grande é o oposto de evidência.
      expect(destaqueDeEvolucao(progresso, [])).toBeNull()
    })

    it('corpo parado também não', () => {
      expect(destaqueDeEvolucao([], [corpo('peso', 82, 82)])).toBeNull()
    })

    it('ignora a carga que subiu de zero, sem percentual para comparar', () => {
      // Peso corporal registrado como 0 kg: sem origem não há percentual, e
      // eleger o destaque exige comparar percentuais.
      const progresso = [exercicio('Barra Fixa', variacao(0, 5))]
      const corporal = [corpo('cintura', 92, 89)]

      expect(destaqueDeEvolucao(progresso, corporal)?.tipo).toBe('corpo')
    })
  })
})
