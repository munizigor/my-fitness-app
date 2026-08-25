import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalvarArquivo } from './SalvarArquivo'

const ARQUIVO = { nome: 'vault-2026-08-25.fitvault.json', conteudo: '{ "formato": "x" }' }

/**
 * O `window` deste teste, com os dois recursos que a classe procura no
 * navegador — declarados aqui para o teste falar de `unknown`, e não de `any`.
 */
type JanelaDeTeste = {
  showSaveFilePicker?: unknown
  URL: { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void }
}

function janela(): JanelaDeTeste {
  return window as unknown as JanelaDeTeste
}

/** O escritor que a File System Access API entrega quando o aluno escolhe onde salvar. */
function pickerQueAceita() {
  const escrito: string[] = []
  const fechar = vi.fn()
  const picker = vi.fn(() =>
    Promise.resolve({
      createWritable: () =>
        Promise.resolve({
          write: (texto: string) => {
            escrito.push(texto)
            return Promise.resolve()
          },
          close: () => {
            fechar()
            return Promise.resolve()
          },
        }),
    })
  )
  return { picker, escrito, fechar }
}

function espiarDownload() {
  const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const criar = vi.fn(() => 'blob:vault')
  const revogar = vi.fn()
  janela().URL.createObjectURL = criar
  janela().URL.revokeObjectURL = revogar
  return { clique, criar, revogar }
}

afterEach(() => {
  delete janela().showSaveFilePicker
  vi.restoreAllMocks()
})

describe('SalvarArquivo', () => {
  it('escreve na pasta que o aluno escolheu, quando o navegador oferece', async () => {
    const { picker, escrito, fechar } = pickerQueAceita()
    janela().showSaveFilePicker = picker

    expect(await new SalvarArquivo().salvar(ARQUIVO)).toBe('salvo')
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: ARQUIVO.nome }))
    expect(escrito).toEqual([ARQUIVO.conteudo])
    // Sem fechar, o navegador pode não materializar a escrita — e o aluno
    // ficaria com um arquivo vazio achando que tem backup.
    expect(fechar).toHaveBeenCalled()
  })

  it('desistir de salvar não é erro, e não vira download pelas costas', async () => {
    const { clique } = espiarDownload()
    janela().showSaveFilePicker = vi.fn(() =>
      Promise.reject(new DOMException('cancelado', 'AbortError'))
    )

    expect(await new SalvarArquivo().salvar(ARQUIVO)).toBe('cancelado')
    expect(clique).not.toHaveBeenCalled()
  })

  it('sem File System Access, baixa o arquivo com o nome sugerido', async () => {
    const { clique, criar, revogar } = espiarDownload()

    expect(await new SalvarArquivo().salvar(ARQUIVO)).toBe('salvo')
    expect(clique).toHaveBeenCalled()
    expect(criar).toHaveBeenCalled()
    // A URL do blob é solta depois: um vault inteiro em memória não fica preso.
    expect(revogar).toHaveBeenCalledWith('blob:vault')
  })

  it('se o picker falha por outro motivo, o download salva o dia', async () => {
    const { clique } = espiarDownload()
    janela().showSaveFilePicker = vi.fn(() =>
      Promise.reject(new DOMException('sem permissão', 'SecurityError'))
    )

    expect(await new SalvarArquivo().salvar(ARQUIVO)).toBe('salvo')
    expect(clique).toHaveBeenCalled()
  })
})
