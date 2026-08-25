import type {
  ArquivoParaSalvar,
  FileTransfer,
  ResultadoDeSalvar,
} from '../../domain/ports/FileTransfer'

/**
 * Entrega o arquivo ao aluno, do melhor jeito que o navegador dele permitir.
 *
 * Dois caminhos, na ordem que o ADR 0003 decidiu:
 *
 * 1. **File System Access** (Chrome, Edge): o aluno escolhe a pasta e o arquivo
 *    fica onde ele mandou — no Drive, no pendrive, na pasta que ele já usa.
 *    É o que faz "seus dados são seus" ser verdade e não slogan.
 * 2. **Download**, em todo o resto (Firefox, Safari, iOS). Vai para a pasta de
 *    downloads, e é o suficiente: o arquivo existe fora do app.
 *
 * O caminho 1 não tem como ser exercitado por automação — nenhum driver
 * responde ao diálogo do sistema —, então ele é o mais curto possível e o
 * E2E do round-trip roda pelo caminho 2.
 */

/**
 * A File System Access API ainda não está na lib do DOM do TypeScript. O tipo
 * mínimo que usamos fica aqui, estrutural, em vez de um `any` no meio do
 * método.
 */
type Escritor = { write: (dados: string) => Promise<void>; close: () => Promise<void> }
type Destino = { createWritable: () => Promise<Escritor> }
type AbrirDialogo = (opcoes: {
  suggestedName: string
  types: readonly { description: string; accept: Record<string, readonly string[]> }[]
}) => Promise<Destino>

const TIPO_FITVAULT = {
  description: 'Vault do app de treino e dieta',
  accept: { 'application/json': ['.fitvault.json', '.json'] },
} as const

export class SalvarArquivo implements FileTransfer {
  async salvar(arquivo: ArquivoParaSalvar): Promise<ResultadoDeSalvar> {
    const dialogo = (window as unknown as { showSaveFilePicker?: AbrirDialogo }).showSaveFilePicker

    if (typeof dialogo === 'function') {
      try {
        return await escreverEmPasta(dialogo, arquivo)
      } catch (erro) {
        if (ehDesistencia(erro)) return 'cancelado'
        // Qualquer outra falha do diálogo (permissão, contexto sem gesto do
        // usuário) não pode custar o backup: cai para o download.
      }
    }

    baixar(arquivo)
    return 'salvo'
  }
}

async function escreverEmPasta(
  dialogo: AbrirDialogo,
  { nome, conteudo }: ArquivoParaSalvar
): Promise<ResultadoDeSalvar> {
  const destino = await dialogo({ suggestedName: nome, types: [TIPO_FITVAULT] })
  const fluxo = await destino.createWritable()
  try {
    await fluxo.write(conteudo)
  } finally {
    // Mesmo cuidado do `OpfsVaultStorage`: sem fechar, o navegador pode não
    // materializar a escrita, e o aluno fica com um backup vazio.
    await fluxo.close()
  }
  return 'salvo'
}

function baixar({ nome, conteudo }: ArquivoParaSalvar): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  // Um vault inteiro pode ser grande: soltar o blob evita segurá-lo em memória
  // até a aba morrer.
  URL.revokeObjectURL(url)
}

/** Fechar o diálogo é decisão do aluno, e o navegador a reporta como `AbortError`. */
function ehDesistencia(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === 'AbortError'
}
