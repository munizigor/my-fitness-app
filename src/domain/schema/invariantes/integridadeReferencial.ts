import { DIAS_DA_SEMANA, type ArquivoDePlano } from '../arquivoDePlano'
import type { Invariante } from './tipos'

/**
 * Todo identificador citado no plano existe no próprio arquivo, e nenhum se
 * repete.
 *
 * Um plano que aponta para um treino inexistente passa em toda checagem de
 * formato e mesmo assim quebra na tela do aluno numa terça-feira. Dois
 * exercícios com o mesmo id são piores: nada quebra, e a carga de um vaza para
 * o histórico do outro em silêncio.
 */
export const integridadeReferencial: Invariante = (arquivo: ArquivoDePlano, relatar): void => {
  const { treino: t, nutricao: n, suplementacao: s } = arquivo.plano

  const exercicios = new Set<string>()
  t.exercicios.forEach((e, i) => {
    if (exercicios.has(e.id)) {
      relatar({
        caminho: ['plano', 'treino', 'exercicios', i, 'id'],
        mensagem: 'está repetido: dois exercícios não podem ter o mesmo identificador',
      })
    }
    exercicios.add(e.id)
  })

  const sessoes = new Set<string>()
  t.sessoes.forEach((sessao, i) => {
    if (sessoes.has(sessao.id)) {
      relatar({
        caminho: ['plano', 'treino', 'sessoes', i, 'id'],
        mensagem: 'está repetido: dois treinos não podem ter o mesmo identificador',
      })
    }
    sessoes.add(sessao.id)

    sessao.itens.forEach((item, j) => {
      if (!exercicios.has(item.exercicioId)) {
        relatar({
          caminho: ['plano', 'treino', 'sessoes', i, 'itens', j, 'exercicioId'],
          mensagem: 'aponta para um exercício que não está na lista de exercícios do plano',
        })
      }
    })
  })

  for (const dia of DIAS_DA_SEMANA) {
    const id = t.agendaSemanal[dia].sessaoId
    if (id !== null && !sessoes.has(id)) {
      relatar({
        caminho: ['plano', 'treino', 'agendaSemanal', dia, 'sessaoId'],
        mensagem: 'marca um treino que não existe no plano',
      })
    }
  }

  const refeicoes = new Set(n.refeicoes.map((r) => r.numero))
  s.formulas.forEach((f, fi) => {
    f.itens.forEach((item, ii) => {
      const { ancora: a } = item.posologia
      if (a.tipo === 'apos-refeicao' && !refeicoes.has(a.refeicao)) {
        relatar({
          caminho: ['plano', 'suplementacao', 'formulas', fi, 'itens', ii, 'posologia', 'ancora'],
          mensagem: `manda tomar após a refeição ${a.refeicao}, que o plano alimentar não tem`,
        })
      }
    })
  })
}
