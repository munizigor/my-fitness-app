import { ArquivoInvalidoError } from '../domain/errors/ArquivoInvalidoError'
import type { VaultStorage } from '../domain/ports/VaultStorage'
import { SCHEMA_VERSION_ATUAL, lerArquivoDePlano } from '../domain/schema/arquivoDePlano'
import type { ArquivoDePlano } from '../domain/schema/arquivoDePlano'
import { CAMINHOS } from '../domain/vault/caminhos'

/** Fonte do instante atual, injetada para o teste não depender do relógio. */
export type Agora = () => string

/**
 * O aluno carrega o arquivo que o profissional enviou.
 *
 * Duas garantias sustentam este caso de uso:
 *
 * 1. **Validar antes de escrever.** Nenhum byte vai ao vault antes do arquivo
 *    inteiro passar. Um arquivo ruim não deixa o aluno pela metade — ele fica
 *    exatamente como estava, com o plano anterior intacto.
 * 2. **Importar plano não é apagar o aluno.** Só o plano e o manifest são
 *    tocados. Medidas e registros diários sobrevivem à troca de profissional,
 *    e o perfil já existente não é sobrescrito.
 */
export class ImportarPlano {
  constructor(
    private readonly vault: VaultStorage,
    private readonly agora: Agora = () => new Date().toISOString()
  ) {}

  async executar(conteudo: string): Promise<ArquivoDePlano> {
    const arquivo = lerArquivoDePlano(this.desserializar(conteudo))

    const instante = this.agora()
    const manifestAnterior = await this.vault.ler(CAMINHOS.manifest)

    await this.vault.escrever(CAMINHOS.planoAtual, formatar(arquivo))
    await this.vault.escrever(
      CAMINHOS.manifest,
      formatar({
        schemaVersion: SCHEMA_VERSION_ATUAL,
        criadoEm: manifestAnterior
          ? ((JSON.parse(manifestAnterior) as { criadoEm?: string }).criadoEm ?? instante)
          : instante,
        atualizadoEm: instante,
      })
    )

    // O perfil pertence ao aluno, não ao plano: se já existe, o arquivo do
    // profissional não o sobrescreve — o aluno pode ter corrigido a própria
    // idade, e o arquivo pode ter sido emitido meses antes.
    if ((await this.vault.ler(CAMINHOS.perfil)) === null) {
      await this.vault.escrever(CAMINHOS.perfil, formatar(arquivo.aluno))
    }

    return arquivo
  }

  private desserializar(conteudo: string): unknown {
    try {
      return JSON.parse(conteudo)
    } catch {
      // SyntaxError cru não diz nada ao aluno. Aqui vira erro de domínio, com
      // o mesmo formato de qualquer outro problema do arquivo.
      throw new ArquivoInvalidoError([{ campo: '', mensagem: 'o arquivo não é um JSON válido' }])
    }
  }
}

/** JSON indentado, sempre: o arquivo é feito para ser lido por gente (ADR 0003). */
function formatar(valor: unknown): string {
  return JSON.stringify(valor, null, 2)
}
