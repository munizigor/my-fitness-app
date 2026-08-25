import { z } from 'zod'
import { PerfilInvalidoError } from '../errors/PerfilInvalidoError'

/**
 * Quem é o aluno: identificação, idade e altura.
 *
 * Mora em `vault/aluno/perfil.json`, fora do plano, porque **sobrevive à troca
 * de profissional**. `ImportarPlano` semeia o arquivo com o bloco `aluno` do
 * plano na primeira importação e nunca mais o sobrescreve.
 *
 * O formato no disco é o mesmo desde a story 2 — esta story não o alterou, e
 * por isso não há migração a escrever. O que mudou é quem escreve: até agora só
 * o import, agora também o aluno.
 *
 * Altura fica aqui, e não na aferição, porque adulto não muda de altura entre
 * duas medições. Peso muda, e por isso é ponto datado (ver `medida.ts`).
 */

/**
 * Limites de sanidade, não de julgamento: existem para pegar o dedo errado no
 * teclado (1,75 digitado como 175), não para dizer a ninguém que corpo é
 * possível.
 */
const ALTURA_MINIMA_METROS = 0.5
const ALTURA_MAXIMA_METROS = 2.5
const IDADE_MAXIMA = 120

const perfil = z.object({
  nome: z.string().trim().min(1),
  idade: z.number().int().positive().max(IDADE_MAXIMA),
  alturaMetros: z.number().min(ALTURA_MINIMA_METROS).max(ALTURA_MAXIMA_METROS),
})

export type Perfil = z.infer<typeof perfil>

/**
 * Lê o perfil do vault. Devolve `null` para o que não reconhece — **nunca
 * lança**: é dado do aluno, e a mesma escolha do registro diário vale aqui.
 */
export function lerPerfil(entrada: unknown): Perfil | null {
  const resultado = perfil.safeParse(entrada)
  return resultado.success ? resultado.data : null
}

/** Monta o perfil que o aluno corrigiu na tela, ou recusa com erro tipado. */
export function criarPerfil(valores: unknown): Perfil {
  const resultado = perfil.safeParse(valores)
  if (!resultado.success) {
    throw new PerfilInvalidoError(resultado.error.issues[0]?.message ?? 'perfil inválido')
  }
  return resultado.data
}
