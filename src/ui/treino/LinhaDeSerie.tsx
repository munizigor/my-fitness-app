import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SerieRegistrada } from '../../domain/registro/registroDiario'
import type { ItemDeTreino } from '../../domain/schema/arquivoDePlano'

/**
 * Uma série, pronta para ser confirmada.
 *
 * Os campos já vêm preenchidos — carga com a última que o aluno levantou,
 * repetições com o topo da faixa prescrita. Princípio 2: na academia ele
 * **confirma**, não digita. Digitar quatro números por exercício, oito
 * exercícios por treino, é o atrito que faz o registro morrer na segunda semana.
 *
 * O alvo de toque de "Concluir" é grande de propósito: mão suada, movimento sob
 * esforço, uma mão só.
 */
export function LinhaDeSerie({
  indice,
  prescrito,
  registrada,
  cargaSugerida,
  onConcluir,
}: {
  indice: number
  prescrito: ItemDeTreino
  registrada: SerieRegistrada | undefined
  cargaSugerida: number | undefined
  onConcluir: (cargaKg?: number, repeticoes?: number) => void
}) {
  const { t } = useTranslation()
  const porTempo = prescrito.execucao.tipo === 'tempo'

  const [carga, setCarga] = useState(() => textoDe(registrada?.cargaKg ?? cargaSugerida) ?? '')
  const [reps, setReps] = useState(
    () =>
      textoDe(
        registrada?.repeticoes ??
          (prescrito.execucao.tipo === 'repeticoes' ? prescrito.execucao.max : undefined)
      ) ?? ''
  )

  const concluida = registrada !== undefined

  return (
    <li className={`serie ${concluida ? 'serie--concluida' : ''}`}>
      <span className="serie__indice">{t('execucao.serie', { indice })}</span>

      <label className="serie__campo">
        <span className="serie__rotulo">{t('execucao.carga')}</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          value={carga}
          onChange={(e) => setCarga(e.target.value)}
          aria-label={t('execucao.cargaDaSerie', { indice })}
        />
      </label>

      {porTempo ? (
        <span className="serie__tempo">
          {t('execucao.segundos', {
            segundos: prescrito.execucao.tipo === 'tempo' ? prescrito.execucao.segundos : 0,
          })}
        </span>
      ) : (
        <label className="serie__campo">
          <span className="serie__rotulo">{t('execucao.repeticoes')}</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            aria-label={t('execucao.repeticoesDaSerie', { indice })}
          />
        </label>
      )}

      <button
        type="button"
        className="serie__concluir"
        onClick={() => onConcluir(numeroDe(carga), porTempo ? undefined : numeroDe(reps))}
        aria-label={t('execucao.concluirSerie', { indice })}
      >
        {concluida ? t('execucao.concluida') : t('execucao.concluir')}
      </button>
    </li>
  )
}

function textoDe(valor: number | undefined): string | undefined {
  return valor === undefined ? undefined : String(valor)
}

/** Campo em branco vira `undefined`, não zero: não registrar é diferente de zero. */
function numeroDe(texto: string): number | undefined {
  if (texto.trim() === '') return undefined
  const valor = Number(texto)
  return Number.isFinite(valor) ? valor : undefined
}
