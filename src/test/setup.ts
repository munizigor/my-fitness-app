import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * O jsdom 27 não implementa `Blob.prototype.text()` nem `arrayBuffer()`, que
 * todo navegador moderno tem e que o E2E em Chromium exercita de verdade.
 *
 * A lacuna é do ambiente de teste, não do produto: trocar `file.text()` por
 * `FileReader` no código de produção seria deixar a limitação da ferramenta
 * ditar a implementação. Então o buraco é tapado aqui.
 */
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function text(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve(String(leitor.result))
      leitor.onerror = () => reject(leitor.error ?? new Error('falha ao ler o Blob'))
      leitor.readAsText(this)
    })
  }
}

afterEach(() => {
  cleanup()
})
