import { describe, expect, it } from 'vitest'
import { ArquivoInvalidoError } from '../errors/ArquivoInvalidoError'
import { CAMINHOS } from '../vault/caminhos'
import {
  FORMATO_EXPORT,
  SCHEMA_VERSION_EXPORT,
  ehArquivoDeVault,
  lerArquivoDeVault,
} from './arquivoDeVault'

function envelope(documentos: Record<string, unknown>) {
  return {
    formato: FORMATO_EXPORT,
    schemaVersion: SCHEMA_VERSION_EXPORT,
    exportadoEm: '2026-08-25T10:00:00.000Z',
    documentos,
  }
}

const UM_DOCUMENTO = { [CAMINHOS.perfil]: { nome: 'Aluno', idade: 30, alturaMetros: 1.75 } }

describe('lerArquivoDeVault', () => {
  it('lê o envelope e devolve os documentos pelos caminhos deles', () => {
    const arquivo = lerArquivoDeVault(envelope(UM_DOCUMENTO))

    expect(arquivo.exportadoEm).toBe('2026-08-25T10:00:00.000Z')
    expect(Object.keys(arquivo.documentos)).toEqual([CAMINHOS.perfil])
  })

  it('recusa envelope de outro formato, apontando o campo', () => {
    const alheio = { ...envelope(UM_DOCUMENTO), formato: 'outro-app' }

    expect(() => lerArquivoDeVault(alheio)).toThrow(ArquivoInvalidoError)
    try {
      lerArquivoDeVault(alheio)
    } catch (erro) {
      expect((erro as ArquivoInvalidoError).problemas[0]?.oQue).toBe('Formato do arquivo')
    }
  })

  it('recusa versão que não sabemos ler, em vez de adivinhar', () => {
    // ADR 0003: versão desconhecida falha explicitamente. Um export do futuro
    // pode ter campo que muda significado; abrir pela metade é pior que recusar.
    const doFuturo = { ...envelope(UM_DOCUMENTO), schemaVersion: SCHEMA_VERSION_EXPORT + 1 }

    expect(() => lerArquivoDeVault(doFuturo)).toThrow(ArquivoInvalidoError)
  })

  it('recusa documento em caminho que não pertence ao vault', () => {
    const travessia = envelope({ '../roubado.json': { a: 1 } })

    expect(() => lerArquivoDeVault(travessia)).toThrow(ArquivoInvalidoError)
    try {
      lerArquivoDeVault(travessia)
    } catch (erro) {
      const problema = (erro as ArquivoInvalidoError).problemas[0]
      expect(problema?.onde).toContain('../roubado.json')
      expect(problema?.mensagem).toContain('não é um documento do vault')
    }
  })

  it('recusa envelope sem nenhum documento — não é um vault', () => {
    expect(() => lerArquivoDeVault(envelope({}))).toThrow(ArquivoInvalidoError)
  })

  it('junta todos os problemas de uma vez', () => {
    const ruim = {
      formato: FORMATO_EXPORT,
      schemaVersion: SCHEMA_VERSION_EXPORT,
      documentos: { 'vault/registros/ontem.json': {}, 'vault/outra/coisa.json': {} },
    }

    try {
      lerArquivoDeVault(ruim)
      expect.unreachable('deveria ter recusado')
    } catch (erro) {
      // Dois caminhos inválidos e a data de exportação que falta: três.
      expect((erro as ArquivoInvalidoError).problemas).toHaveLength(3)
    }
  })
})

describe('ehArquivoDeVault', () => {
  it('reconhece o export do próprio app', () => {
    expect(ehArquivoDeVault(envelope(UM_DOCUMENTO))).toBe(true)
  })

  it('não confunde com o arquivo do profissional', () => {
    // É o que faz um input de import só resolver os dois casos: o arquivo diz
    // o que é, e o aluno não precisa saber qual dos dois está na mão.
    expect(ehArquivoDeVault({ formato: 'fitvault-plano', schemaVersion: 2 })).toBe(false)
    expect(ehArquivoDeVault(null)).toBe(false)
    expect(ehArquivoDeVault('texto qualquer')).toBe(false)
  })

  it('reconhece pelo formato, mesmo que o resto esteja corrompido', () => {
    // Reconhecer é uma coisa; validar é outra. Um export corrompido precisa
    // falhar como export — não ser lido como plano e culpar o profissional.
    expect(ehArquivoDeVault({ formato: FORMATO_EXPORT })).toBe(true)
  })
})
