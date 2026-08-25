import { describe, expect, it } from 'vitest'
import { CAMINHOS, ehCaminhoDoVault } from './caminhos'

/**
 * O que pode entrar no vault.
 *
 * A pergunta parece burocrática até o vault virar formato de intercâmbio: um
 * arquivo exportado é um documento que veio de fora, e restaurá-lo é escrever
 * caminhos que alguém pode ter editado num editor de texto. Sem esta regra,
 * `../` no nome de um documento sairia da pasta do aluno.
 */
describe('ehCaminhoDoVault', () => {
  it('aceita os documentos únicos do vault', () => {
    expect(ehCaminhoDoVault(CAMINHOS.manifest)).toBe(true)
    expect(ehCaminhoDoVault(CAMINHOS.perfil)).toBe(true)
    expect(ehCaminhoDoVault(CAMINHOS.planoAtual)).toBe(true)
  })

  it('aceita medida e registro datados, que é como o caminho vira índice', () => {
    expect(ehCaminhoDoVault(CAMINHOS.medida('2026-08-25'))).toBe(true)
    expect(ehCaminhoDoVault(CAMINHOS.registro('2026-08-25'))).toBe(true)
  })

  it('recusa medida e registro que não sejam um dia', () => {
    // O caminho é o índice: nome livre aqui quebraria listar por prefixo e
    // ordenar por data, que é o que sustenta histórico sem banco.
    expect(ehCaminhoDoVault('vault/registros/ontem.json')).toBe(false)
    expect(ehCaminhoDoVault('vault/aluno/medidas/2026-08.json')).toBe(false)
    expect(ehCaminhoDoVault('vault/registros/2026-08-25/serie.json')).toBe(false)
  })

  it('recusa qualquer caminho que saia do vault', () => {
    expect(ehCaminhoDoVault('../segredo.json')).toBe(false)
    expect(ehCaminhoDoVault('vault/../../etc/passwd')).toBe(false)
    expect(ehCaminhoDoVault('vault/planos/../../fora.json')).toBe(false)
    expect(ehCaminhoDoVault('/vault/manifest.json')).toBe(false)
  })

  it('recusa o que não é documento nosso', () => {
    expect(ehCaminhoDoVault('vault/aluno/perfil.txt')).toBe(false)
    expect(ehCaminhoDoVault('vault/qualquer/coisa.json')).toBe(false)
    expect(ehCaminhoDoVault('')).toBe(false)
  })

  it('aceita outros planos além do atual', () => {
    // ADR 0003 prevê `vault/planos/<id>.json`. Hoje só existe `atual`, mas
    // recusar os outros faria o exportador de amanhã deixar plano para trás.
    expect(ehCaminhoDoVault('vault/planos/2026-06-ana-ribeiro.json')).toBe(true)
  })
})
