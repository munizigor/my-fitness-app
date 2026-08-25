import type { RegistroDiario } from '../registro/registroDiario'
import type { ItemDeTreino } from '../schema/arquivoDePlano'

/**
 * A carga que o campo já vem preenchido.
 *
 * Princípio 2 da interface: **o padrão já é a resposta certa**. Na academia, com
 * uma mão livre e 60 segundos de descanso, o aluno precisa confirmar — não
 * digitar. Digitar quatro números por exercício, oito exercícios por treino, é o
 * atrito que faz o registro ser abandonado na segunda semana.
 *
 * A cascata, nesta ordem:
 *
 * 1. **A última carga que ele de fato levantou.** É o dado mais verdadeiro que
 *    existe sobre ele.
 * 2. **A carga que o profissional prescreveu.** Vale para a primeira vez.
 * 3. **Nada.** Campo vazio é melhor que número inventado: carga errada machuca.
 *
 * O histórico vence a prescrição de propósito. Se o aluno já está levantando
 * mais do que foi prescrito há dois meses, o número honesto é o dele.
 *
 * A busca casa pelo **item prescrito**, não pelo exercício: Prancha Lateral
 * aparece duas vezes na mesma sessão, um lado em cada, e as cargas não podem se
 * contaminar.
 */
export function sugerirCarga(
  historico: readonly RegistroDiario[],
  item: ItemDeTreino
): number | undefined {
  const maisRecentes = [...historico].sort((a, b) => b.data.localeCompare(a.data))

  for (const registro of maisRecentes) {
    // Dentro do dia, a última série vale: é onde o aluno parou.
    for (let i = registro.series.length - 1; i >= 0; i--) {
      const serie = registro.series[i]!
      if (serie.itemDeTreinoId === item.id && serie.cargaKg !== undefined) {
        return serie.cargaKg
      }
    }
  }

  return item.cargaAlvoKg
}
