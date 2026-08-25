import { useTranslation } from 'react-i18next'
import type { Recorde } from '../../domain/progresso/recorde'

/**
 * O marco que acabou de acontecer, anunciado onde o aluno já está.
 *
 * Princípio 3 da interface — **o app age; o usuário não precisa lembrar**. A
 * evidência de progresso não espera o aluno abrir a aba Evolução: ela aparece
 * em Hoje, no dia em que a marca caiu. Quem largou o treino por não sentir
 * evolução não vai procurar a prova; a prova tem que chegar.
 *
 * `role="status"` faz o leitor de tela anunciar a mesma coisa, sem roubar o
 * foco de quem está no meio de outra coisa.
 */
export function RecordesDoDia({ recordes }: { recordes: readonly Recorde[] }) {
  const { t } = useTranslation()

  if (recordes.length === 0) return null

  return (
    <section className="recorde" role="status">
      <h2 className="recorde__titulo">{t('hoje.recordeTitulo')}</h2>
      <ul className="recorde__lista">
        {recordes.map((recorde) => (
          <li key={recorde.exercicioId} className="recorde__item">
            {t('hoje.recorde', {
              exercicio: recorde.nome,
              carga: recorde.cargaKg.toLocaleString('pt-BR'),
              anterior: recorde.anteriorKg.toLocaleString('pt-BR'),
            })}
          </li>
        ))}
      </ul>
    </section>
  )
}
