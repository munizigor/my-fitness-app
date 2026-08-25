import { describe, expect, it } from 'vitest'
import { PerfilInvalidoError } from '../errors/PerfilInvalidoError'
import { criarPerfil, lerPerfil } from './perfil'

const VALIDO = { nome: 'Aluno Exemplo', idade: 30, alturaMetros: 1.75 }

describe('lerPerfil', () => {
  it('lê o perfil gravado no vault', () => {
    expect(lerPerfil(VALIDO)).toEqual(VALIDO)
  })

  it('lê o perfil que veio do arquivo do profissional, ignorando o que sobra', () => {
    // `ImportarPlano` semeia o perfil com o bloco `aluno` do plano. O formato
    // no disco é o mesmo desde então — esta story não o alterou.
    expect(lerPerfil({ ...VALIDO, sobra: 'campo de uma versão futura' })).toEqual(VALIDO)
  })

  it('devolve null para o que não reconhece, sem lançar', () => {
    expect(lerPerfil({ nome: 'Sem idade' })).toBeNull()
    expect(lerPerfil(null)).toBeNull()
  })
})

describe('criarPerfil', () => {
  it('monta o perfil que o aluno corrigiu na tela', () => {
    expect(criarPerfil({ nome: '  Aluno Exemplo  ', idade: 31, alturaMetros: 1.75 })).toEqual({
      nome: 'Aluno Exemplo',
      idade: 31,
      alturaMetros: 1.75,
    })
  })

  it('recusa perfil sem nome', () => {
    expect(() => criarPerfil({ nome: '   ', idade: 30, alturaMetros: 1.75 })).toThrow(
      PerfilInvalidoError
    )
  })

  it('recusa idade que não descreve uma pessoa', () => {
    expect(() => criarPerfil({ nome: 'Aluno', idade: 0, alturaMetros: 1.75 })).toThrow(
      PerfilInvalidoError
    )
    expect(() => criarPerfil({ nome: 'Aluno', idade: 30.5, alturaMetros: 1.75 })).toThrow(
      PerfilInvalidoError
    )
  })

  it('recusa altura em centímetros — o campo é em metros', () => {
    // 175 passaria por "número positivo" e viraria um IMC absurdo lá na frente.
    expect(() => criarPerfil({ nome: 'Aluno', idade: 30, alturaMetros: 175 })).toThrow(
      PerfilInvalidoError
    )
  })
})
