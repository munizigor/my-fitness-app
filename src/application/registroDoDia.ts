import type { VaultStorage } from '../domain/ports/VaultStorage'
import {
  lerRegistroDiario,
  registroVazio,
  type RegistroDiario,
} from '../domain/registro/registroDiario'
import { CAMINHOS } from '../domain/vault/caminhos'

/**
 * Ler e gravar o registro de um dia.
 *
 * Três casos de uso escrevem no mesmo arquivo — séries, água e refeições — e
 * todos precisam do mesmo cuidado: carregar o que já existe antes de mexer, ou
 * registrar água apagaria o treino da manhã.
 */
export async function carregarRegistro(vault: VaultStorage, data: string): Promise<RegistroDiario> {
  const bruto = await vault.ler(CAMINHOS.registro(data))
  if (bruto === null) return registroVazio(data)

  try {
    // Registro corrompido não pode impedir o aluno de treinar hoje.
    return lerRegistroDiario(JSON.parse(bruto)) ?? registroVazio(data)
  } catch {
    return registroVazio(data)
  }
}

/** Indentado de propósito: o vault é para ser legível em qualquer editor. */
export async function gravarRegistro(
  vault: VaultStorage,
  registro: RegistroDiario
): Promise<RegistroDiario> {
  await vault.escrever(CAMINHOS.registro(registro.data), JSON.stringify(registro, null, 2))
  return registro
}
