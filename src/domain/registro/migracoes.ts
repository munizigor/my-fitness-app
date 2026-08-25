/**
 * As migrações do registro do aluno.
 *
 * O registro tem **versão própria**, separada da do plano. As duas coisas
 * mudam por motivos diferentes: o formato do plano muda quando o profissional
 * ganha um campo novo para prescrever; o do registro, quando o aluno ganha algo
 * novo para registrar. Compartilhar um número obrigaria todo profissional a
 * reemitir o arquivo porque o app aprendeu a contar copos de água.
 *
 * A numeração continua de onde a compartilhada parou (2 → 3) em vez de
 * recomeçar do 1: assim nenhum número guardado em disco tem dois significados.
 */
export const SCHEMA_VERSION_REGISTRO = 4

/**
 * Traz um registro gravado por versão anterior para o formato atual.
 *
 * As migrações são **encadeadas**, não excludentes: um registro da v2 precisa
 * atravessar as duas para chegar aqui. Um `return` por versão faria o registro
 * mais antigo parar na primeira e ser rejeitado pelo schema depois.
 *
 * O que não reconhece, devolve intacto — inclusive lixo e versões do futuro.
 * Julgar validade é trabalho do schema; remendar aqui até "parecer legível"
 * seria transformar dado corrompido em dado aceito em silêncio.
 */
export function migrarRegistro(entrada: unknown): unknown {
  if (!ehObjeto(entrada)) return entrada

  let atual = entrada
  if (atual.schemaVersion === 2) atual = paraV3(atual)
  if (atual.schemaVersion === 3) atual = paraV4(atual)
  return atual
}

/**
 * A v2 só sabia registrar séries. Água e refeições começam zeradas: o dia que
 * já foi treinado continua registrado, e o resto começa do zero.
 */
function paraV3(registro: Record<string, unknown>): Record<string, unknown> {
  return { ...registro, schemaVersion: 3, aguaLitros: 0, refeicoes: [] }
}

/**
 * A v3 referenciava a refeição pelo número de ordem; a v4 usa o identificador
 * dela no plano.
 *
 * Guarda o número antigo em `refeicaoNumeroLegado` em vez de descartá-lo. O
 * número sozinho não reencontra a refeição num plano que mudou de formato, mas
 * é o que permite reconectar o caso comum — mesmo profissional, mesmas
 * refeições, arquivo reemitido — na leitura, sem apagar nada aqui.
 */
function paraV4(registro: Record<string, unknown>): Record<string, unknown> {
  const refeicoes = Array.isArray(registro.refeicoes) ? registro.refeicoes : []

  return {
    ...registro,
    schemaVersion: SCHEMA_VERSION_REGISTRO,
    refeicoes: refeicoes.map((refeicao) => {
      if (!ehObjeto(refeicao) || typeof refeicao.numero !== 'number') return refeicao
      const { numero, ...resto } = refeicao
      return { ...resto, refeicaoId: String(numero), refeicaoNumeroLegado: numero }
    }),
  }
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}
