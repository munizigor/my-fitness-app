import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ultimaMedida } from '../../domain/aluno/historicoDeMedidas'
import { hojeLocal } from '../../domain/dia/dataLocal'
import { EstadoSemPlano } from '../comum/EstadoSemPlano'
import { useAluno } from '../estado/alunoStore'
import { HistoricoDeMedidas } from './HistoricoDeMedidas'
import { Identificacao } from './Identificacao'
import { NovaAfericao } from './NovaAfericao'

/**
 * Perfil: quem é o aluno e como o corpo dele mudou.
 *
 * Não é destino diário — é consulta e marco periódico (docs/interface.md §4).
 * A separação que a tela torna visível: **isto é do aluno, não do plano**.
 * Trocar de profissional troca a prescrição e não encosta em nada daqui.
 *
 * Não depende do plano estar carregado: lê `vault/aluno/`, que sobrevive à
 * troca. O convite a importar só aparece quando não existe nada do aluno ainda,
 * porque é o import que semeia o perfil.
 */
export function TelaPerfil({ hoje = hojeLocal() }: { hoje?: string }) {
  const { t } = useTranslation()
  const { perfil, medidas, carregando, carregar, registrarMedida, salvarPerfil } = useAluno()

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Derivados, nunca persistidos (ADR 0006).
  const ultima = useMemo(() => ultimaMedida(medidas), [medidas])
  const jaMedidoHoje = medidas.some((m) => m.data === hoje)

  if (carregando) return null
  if (!perfil) return <EstadoSemPlano />

  return (
    <section className="perfil">
      <Identificacao perfil={perfil} onSalvar={salvarPerfil} />

      <NovaAfericao
        // Remontar quando a última aferição muda é o que faz o padrão do
        // formulário ser sempre a medida mais recente, sem efeito que
        // sobrescreva o que o aluno está digitando.
        key={ultima?.data ?? 'sem-afericao'}
        ultima={ultima}
        jaMedidoHoje={jaMedidoHoje}
        onRegistrar={(valores) => registrarMedida(hoje, valores)}
      />

      <HistoricoDeMedidas medidas={medidas} />

      <p className="perfil__nota">{t('perfil.seusDados')}</p>
    </section>
  )
}
