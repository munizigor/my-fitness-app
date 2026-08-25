import { describe, expect, it } from 'vitest'
import planoValido from '../../test/fixtures/plano-valido.json'
import { lerArquivoDePlano } from '../schema/arquivoDePlano'
import { prescricaoCompleta } from './prescricaoCompleta'

const ARQUIVO = lerArquivoDePlano(planoValido)

/** Um plano com o mesmo formato do fixture, mudando só o que o teste examina. */
function planoCom(ajustar: (bruto: typeof planoValido) => void) {
  const copia = structuredClone(planoValido)
  ajustar(copia)
  return lerArquivoDePlano(copia)
}

describe('prescricaoCompleta', () => {
  describe('agenda semanal', () => {
    it('tem os sete dias em ordem, com o treino resolvido pelo id', () => {
      const { agenda } = prescricaoCompleta(ARQUIVO)

      expect(agenda.map((d) => d.dia)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'])
      // A agenda guarda `sessaoId: 'A'`; quem consulta o plano quer o rótulo.
      expect(agenda[0]!.sessao?.rotulo).toBe('Treino A')
      expect(agenda[1]!.sessao?.rotulo).toBe('Treino B')
    })

    it('separa o descanso de verdade do dia que só tem aeróbico', () => {
      const { agenda } = prescricaoCompleta(ARQUIVO)
      const porDia = new Map(agenda.map((d) => [d.dia, d]))

      // Quinta não tem nada: é descanso, e a tela precisa dizer isso em vez de
      // mostrar uma linha vazia.
      expect(porDia.get('qui')).toMatchObject({ sessao: null, aerobico: null, descanso: true })
      // Sábado tem aeróbico sem musculação. Chamar isso de descanso mandaria o
      // aluno para casa num dia em que o profissional marcou trabalho.
      expect(porDia.get('sab')?.descanso).toBe(false)
      expect(porDia.get('sab')?.aerobico).toEqual({
        modalidade: 'HIIT na esteira',
        duracaoMinutos: 20,
      })
    })
  })

  describe('treinos', () => {
    it('mostra cada treino uma vez, com os dias em que ele cai', () => {
      const { treinos } = prescricaoCompleta(ARQUIVO)

      // O Treino A é prescrito duas vezes na semana. Repetir a lista inteira de
      // exercícios embaixo de segunda e de quarta seria a planilha de novo; o
      // que o aluno precisa saber é que o mesmo treino cai nos dois dias.
      expect(treinos.map((t) => [t.sessao.rotulo, t.dias])).toEqual([
        ['Treino A', ['seg', 'qua']],
        ['Treino B', ['ter', 'sex']],
      ])
    })

    it('resolve os exercícios do id para o nome, na ordem prescrita', () => {
      const treinoA = prescricaoCompleta(ARQUIVO).treinos[0]!

      expect(treinoA.exercicios.map((e) => e.exercicio.nome)).toEqual([
        'Puxada Frontal Pronada',
        'Remada Cavalinho com Triângulo',
        // A Prancha Lateral aparece duas vezes, uma por lado. Agrupar por
        // exercício aqui apagaria metade da prescrição: o que se repete é o
        // exercício, e o que distingue os dois usos é a observação.
        'Prancha Lateral',
        'Prancha Lateral',
      ])
      expect(treinoA.exercicios.slice(2).map((e) => e.prescrito.observacao)).toEqual([
        'Lado direito',
        'Lado esquerdo',
      ])
      // O item prescrito viaja junto: séries, execução e a observação do
      // profissional são o conteúdo da consulta.
      expect(treinoA.exercicios[0]!.prescrito.series).toBe(4)
    })

    it('mantém na lista o treino que a agenda não marca em dia nenhum', () => {
      // Um treino prescrito e não agendado é comum em plano com semana A/B: o
      // profissional deixa o treino C escrito para quando o aluno puder ir três
      // vezes. Sumir com ele seria esconder prescrição do aluno.
      const arquivo = planoCom((p) => {
        p.plano.treino.agendaSemanal.ter.sessaoId = 'A'
        p.plano.treino.agendaSemanal.sex.sessaoId = 'A'
      })

      const treinoB = prescricaoCompleta(arquivo).treinos.find((t) => t.sessao.id === 'B')
      expect(treinoB?.dias).toEqual([])
    })
  })

  describe('dieta', () => {
    it('ordena as refeições pelo número, não pela ordem do arquivo', () => {
      // O arquivo é gerado por gente e por editor; a ordem do array não é
      // contrato. O que o aluno lê como "o dia" é a ordem dos números.
      const arquivo = planoCom((p) => p.plano.nutricao.refeicoes.reverse())

      expect(prescricaoCompleta(arquivo).refeicoes.map((r) => r.numero)).toEqual([1, 2, 3])
    })

    it('leva os alvos do dia, que é contra o que a prescrição foi montada', () => {
      const { macrosAlvoDiario, hidratacaoDiariaLitros, vegetaisSugeridos } =
        prescricaoCompleta(ARQUIVO)

      expect(macrosAlvoDiario.proteinaG).toBeGreaterThan(0)
      expect(hidratacaoDiariaLitros).toBe(4)
      expect(vegetaisSugeridos).toContain('Brócolis')
    })
  })

  describe('suplementação', () => {
    it('preserva o agrupamento por fórmula que o profissional prescreveu', () => {
      // O agrupamento é o raciocínio clínico dele. Uma lista achatada de quatro
      // suplementos perderia o motivo de cada um estar ali.
      expect(prescricaoCompleta(ARQUIVO).formulas.map((f) => [f.nome, f.itens.length])).toEqual([
        ['Bem-estar geral', 2],
        ['Treino', 2],
      ])
    })

    it('resolve a âncora da posologia na refeição, não no número dela', () => {
      const bemEstar = prescricaoCompleta(ARQUIVO).formulas[0]!
      const magnesio = bemEstar.itens[0]!

      expect(magnesio.suplemento.nome).toBe('Magnésio dimalato')
      // "Após a refeição 1" é o arquivo falando; "após o Café da manhã" é o
      // aluno lendo. A tela não deveria ter que ir buscar a refeição pelo
      // número para dizer isso.
      expect(magnesio.momento).toEqual({
        tipo: 'apos-refeicao',
        refeicao: expect.objectContaining({ numero: 1, nome: 'Café da manhã' }),
      })
    })

    it('mantém os outros momentos como são, sem refeição para resolver', () => {
      const treino = prescricaoCompleta(ARQUIVO).formulas[1]!

      expect(treino.itens.map((i) => i.momento.tipo)).toEqual(['livre', 'antes-do-treino'])
    })
  })

  it('leva o descanso entre séries, que vale para todo o plano', () => {
    expect(prescricaoCompleta(ARQUIVO).descansoEntreSeries).toEqual({
      minSegundos: 60,
      maxSegundos: 70,
    })
  })
})
