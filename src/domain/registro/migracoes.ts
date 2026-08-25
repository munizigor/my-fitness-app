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
export const SCHEMA_VERSION_REGISTRO = 3

/**
 * Traz um registro gravado por versão anterior para o formato atual.
 *
 * O que não reconhece, devolve intacto — inclusive lixo e versões do futuro.
 * Julgar validade é trabalho do schema; remendar aqui até "parecer legível"
 * seria transformar dado corrompido em dado aceito em silêncio.
 */
export function migrarRegistro(entrada: unknown): unknown {
  if (!ehObjeto(entrada)) return entrada

  if (entrada.schemaVersion === 2) {
    // A v2 só sabia registrar séries. Água e refeições começam zeradas: o dia
    // que já foi treinado continua registrado, e o resto começa do zero.
    return { ...entrada, schemaVersion: SCHEMA_VERSION_REGISTRO, aguaLitros: 0, refeicoes: [] }
  }

  return entrada
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}
