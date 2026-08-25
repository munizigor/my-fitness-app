import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

/**
 * O plano sintético que todos os testes usam — **um arquivo só**.
 *
 * Havia uma segunda cópia em `e2e/fixtures/`, byte a byte idêntica e mantida à
 * mão. Duas cópias de um fixture que governa duas centenas de asserções é uma
 * divergência esperando acontecer, e ela apareceria como um teste unitário
 * verde e um E2E vermelho sem explicação óbvia.
 *
 * O upload sempre nomeia o arquivo como `.fitvault.json`, que é a extensão do
 * formato de intercâmbio (ADR 0003). Antes isso só era exercitado por acidente
 * do nome do arquivo em disco; agora é a forma como todo teste importa.
 */
const CAMINHO = fileURLToPath(new URL('../src/test/fixtures/plano-valido.json', import.meta.url))

/** Uma cópia nova a cada chamada: os testes que corrompem o plano mutam à vontade. */
export function planoValido<T = Record<string, unknown>>(): T {
  return JSON.parse(readFileSync(CAMINHO, 'utf8')) as T
}

export async function importarPlano(page: Page, conteudo: unknown = planoValido()): Promise<void> {
  await page.getByLabel('Importar arquivo do profissional').setInputFiles({
    name: 'plano.fitvault.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(conteudo, null, 2)),
  })
}
