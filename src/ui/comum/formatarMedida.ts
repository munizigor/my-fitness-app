import type { TFunction } from 'i18next'

/**
 * Uma quantidade com sua unidade, como uma pessoa lê.
 *
 * O schema identifica a unidade por um código estável (`capsula`,
 * `colher-de-sopa`) porque o app precisa comparar e agregar. Mas o código não é
 * o rótulo: mandá-lo cru para a tela produz "4 capsula", que nenhum aluno
 * escreveria.
 *
 * O plural sai do i18next, e não de uma regra escrita à mão, porque acrescentar
 * um idioma depois não pode exigir reescrever esta função.
 */
export function formatarMedida(quantidade: number, unidade: string, t: TFunction): string {
  const numero = quantidade.toLocaleString('pt-BR')
  return t(`unidades.${unidade}`, {
    count: quantidade,
    quantidade: numero,
    // Unidade desconhecida cai no código em vez de sumir: é sinal de que o
    // vocabulário do schema cresceu e o dicionário ficou para trás.
    defaultValue: `${numero} ${unidade}`,
  })
}
