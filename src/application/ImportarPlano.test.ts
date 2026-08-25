import { beforeEach, describe, expect, it } from 'vitest'
import { ArquivoInvalidoError } from '../domain/errors/ArquivoInvalidoError'
import { InMemoryVaultStorage } from '../infrastructure/armazenamento/InMemoryVaultStorage'
import planoValido from '../test/fixtures/plano-valido.json'
import { lerArquivoDePlano } from '../domain/schema/arquivoDePlano'
import { CAMINHOS } from '../domain/vault/caminhos'
import { CarregarAluno } from './CarregarAluno'
import { ImportarPlano } from './ImportarPlano'
import { RegistrarMedida } from './RegistrarMedida'
import { SalvarPerfil } from './SalvarPerfil'

function texto(objeto: unknown): string {
  return JSON.stringify(objeto)
}

describe('ImportarPlano', () => {
  let vault: InMemoryVaultStorage
  let importar: ImportarPlano

  beforeEach(() => {
    vault = new InMemoryVaultStorage()
    importar = new ImportarPlano(vault, () => '2026-08-25T10:00:00.000Z')
  })

  describe('arquivo válido', () => {
    it('persiste o plano', async () => {
      await importar.executar(texto(planoValido))
      const gravado = await vault.ler(CAMINHOS.planoAtual)
      expect(gravado).not.toBeNull()
      expect(JSON.parse(gravado!)).toMatchObject({ profissional: { nome: 'Ana Ribeiro' } })
    })

    it('grava o manifest com a versão do schema', async () => {
      await importar.executar(texto(planoValido))
      const manifest = JSON.parse((await vault.ler(CAMINHOS.manifest))!)
      expect(manifest).toMatchObject({ schemaVersion: 2, criadoEm: '2026-08-25T10:00:00.000Z' })
    })

    it('cria o perfil do aluno a partir do arquivo', async () => {
      await importar.executar(texto(planoValido))
      const perfil = JSON.parse((await vault.ler(CAMINHOS.perfil))!)
      expect(perfil).toMatchObject({ nome: 'Aluno Exemplo', idade: 30, alturaMetros: 1.75 })
    })

    it('grava JSON indentado — o arquivo é feito para ser lido por gente', async () => {
      await importar.executar(texto(planoValido))
      expect(await vault.ler(CAMINHOS.planoAtual)).toContain('\n  ')
    })

    it('devolve o plano lido, para a UI não precisar reler o vault', async () => {
      const resultado = await importar.executar(texto(planoValido))
      expect(resultado.plano.treino.sessoes).toHaveLength(2)
    })

    it('grava algo que o próprio schema consegue reler', async () => {
      // Gravar qualquer coisa diferente do documento recebido arrisca tornar o
      // vault ilegível para o próprio schema — e o plano sumiria no primeiro
      // recarregamento da página, que foi exatamente o bug que originou este teste.
      await importar.executar(texto(planoValido))
      const gravado = JSON.parse((await vault.ler(CAMINHOS.planoAtual))!)
      expect(() => lerArquivoDePlano(gravado)).not.toThrow()
    })

    it('grava o documento do profissional, não a nossa interpretação dele', async () => {
      await importar.executar(texto(planoValido))
      const gravado = JSON.parse((await vault.ler(CAMINHOS.planoAtual))!)
      expect(gravado).toEqual(planoValido)
    })

    it('usa o relógio real quando nenhum é injetado', async () => {
      // Os outros testes injetam um relógio fixo; sem este, o caminho que roda
      // em produção nunca seria executado.
      const semRelogio = new ImportarPlano(vault)
      await semRelogio.executar(texto(planoValido))
      const manifest = JSON.parse((await vault.ler(CAMINHOS.manifest))!) as {
        atualizadoEm: string
      }
      expect(manifest.atualizadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
    })
  })

  describe('arquivo inválido', () => {
    it('rejeita JSON malformado com erro de domínio, não com SyntaxError cru', async () => {
      await expect(importar.executar('{ isso não é json')).rejects.toBeInstanceOf(
        ArquivoInvalidoError
      )
    })

    it('rejeita arquivo que não passa no schema', async () => {
      const ruim = structuredClone(planoValido) as Record<string, unknown>
      ruim.formato = 'outra-coisa'
      await expect(importar.executar(texto(ruim))).rejects.toBeInstanceOf(ArquivoInvalidoError)
    })

    it('não escreve nada quando o arquivo é inválido', async () => {
      await expect(importar.executar('{ isso não é json')).rejects.toThrow()
      expect(await vault.listar('')).toEqual([])
    })
  })

  describe('não corrompe o vault existente', () => {
    it('preserva o plano anterior quando a importação falha', async () => {
      await importar.executar(texto(planoValido))
      const antes = await vault.ler(CAMINHOS.planoAtual)

      const ruim = structuredClone(planoValido) as Record<string, unknown>
      // @ts-expect-error navegação em JSON solto, só no teste
      delete ruim.plano.treino.sessoes[0].itens[0].series
      await expect(importar.executar(texto(ruim))).rejects.toBeInstanceOf(ArquivoInvalidoError)

      expect(await vault.ler(CAMINHOS.planoAtual)).toBe(antes)
    })

    it('preserva o histórico de medidas ao trocar de plano — data ownership', async () => {
      await importar.executar(texto(planoValido))
      // O aluno se mediu duas vezes ao longo do plano; depois trocou de
      // profissional. Passa pelos casos de uso de verdade, e não por JSON
      // escrito à mão, para que o teste continue valendo se o formato da
      // aferição mudar.
      const registrarMedida = new RegistrarMedida(vault)
      await registrarMedida.executar('2026-06-10', { pesoKg: 85 })
      await registrarMedida.executar('2026-08-10', {
        pesoKg: 82.4,
        circunferenciasCm: { cintura: 84 },
      })

      const novoPlano = structuredClone(planoValido) as Record<string, unknown>
      // @ts-expect-error navegação em JSON solto, só no teste
      novoPlano.profissional.nome = 'Outro Profissional'
      await importar.executar(texto(novoPlano))

      // Trocar de nutricionista não pode apagar o corpo do aluno.
      const { medidas } = await new CarregarAluno(vault).executar()
      expect(medidas.map((m) => m.data)).toEqual(['2026-08-10', '2026-06-10'])
      expect(medidas[0]?.circunferenciasCm).toEqual({ cintura: 84 })
    })

    it('preserva os registros diários ao trocar de plano', async () => {
      await importar.executar(texto(planoValido))
      await vault.escrever(CAMINHOS.registro('2026-08-11'), '{"series":[]}')

      await importar.executar(texto(planoValido))

      expect(await vault.ler(CAMINHOS.registro('2026-08-11'))).toBe('{"series":[]}')
    })

    it('não sobrescreve o perfil já existente com os dados do novo arquivo', async () => {
      await importar.executar(texto(planoValido))
      // O aluno corrigiu a própria idade dentro do app — o arquivo do
      // profissional pode ter sido emitido meses antes.
      await new SalvarPerfil(vault).executar({
        nome: 'Aluno Exemplo',
        idade: 31,
        alturaMetros: 1.75,
      })

      await importar.executar(texto(planoValido))

      expect((await new CarregarAluno(vault).executar()).perfil?.idade).toBe(31)
    })
  })
})
