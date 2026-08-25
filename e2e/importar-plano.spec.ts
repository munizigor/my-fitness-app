import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const FIXTURE = fileURLToPath(new URL('./fixtures/plano-valido.fitvault.json', import.meta.url))

/**
 * O caminho real do aluno: recebe o arquivo, carrega, e o plano continua lá
 * depois. É aqui que `OpfsVaultStorage` é exercitado — OPFS não existe em
 * jsdom, então nenhum teste unitário cobre esta classe.
 */
test.describe('importar o plano do profissional', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    // Cada teste começa com um vault limpo: OPFS sobrevive entre navegações.
    await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      for await (const [nome] of raiz.entries()) {
        await raiz.removeEntry(nome, { recursive: true })
      }
    })
    await page.reload()
  })

  test('carrega o arquivo e mostra de quem veio a prescrição', async ({ page }) => {
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await page.getByLabel('Importar arquivo do profissional').setInputFiles(FIXTURE)

    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()
    await expect(page.getByText(/2 treinos · descanso de 60 a 70 s/)).toBeVisible()
  })

  test('o plano sobrevive a recarregar a página — está em OPFS, não na memória', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await page.getByLabel('Importar arquivo do profissional').setInputFiles(FIXTURE)
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()

    await page.reload()
    await page.getByRole('link', { name: 'Plano', exact: true }).click()

    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()
  })

  test('grava o vault como JSON legível em qualquer editor — data ownership', async ({ page }) => {
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await page.getByLabel('Importar arquivo do profissional').setInputFiles(FIXTURE)
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()

    const conteudo = await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      const vault = await raiz.getDirectoryHandle('vault')
      const planos = await vault.getDirectoryHandle('planos')
      const arquivo = await planos.getFileHandle('atual.json')
      return (await arquivo.getFile()).text()
    })

    // Se isto não for legível por gente, o posicionamento de data ownership
    // falhou — e falharia em silêncio, que é pior.
    expect(conteudo).toContain('\n  ')
    expect(JSON.parse(conteudo)).toMatchObject({ profissional: { nome: 'Ana Ribeiro' } })
  })

  test('sem plano, as outras telas convidam a importar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Nenhum plano ainda' })).toBeVisible()
    await page.getByRole('link', { name: 'Ir para o Plano' }).click()
    await expect(page).toHaveURL(/#\/plano$/)
  })

  test('arquivo inválido aponta o campo e não corrompe o vault', async ({ page }) => {
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await page.getByLabel('Importar arquivo do profissional').setInputFiles(FIXTURE)
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()

    const corrompido = JSON.parse(readFileSync(FIXTURE, 'utf8')) as {
      plano: { treino: { sessoes: { exercicios: { prescricao: string }[] }[] } }
    }
    corrompido.plano.treino.sessoes[0]!.exercicios[0]!.prescricao = 'abc'

    await page.getByLabel('Importar arquivo do profissional').setInputFiles({
      name: 'corrompido.fitvault.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(corrompido)),
    })

    const alerta = page.getByRole('alert')
    await expect(alerta).toContainText('Não consegui ler este arquivo')
    await expect(alerta).toContainText('plano.treino.sessoes.0.exercicios.0.prescricao')

    // O plano bom continua no lugar, inclusive depois de recarregar.
    await page.reload()
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()
  })

  test('importa offline — a academia tem sinal ruim', async ({ page, context }) => {
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await context.setOffline(true)

    await page.getByLabel('Importar arquivo do profissional').setInputFiles(FIXTURE)

    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()
  })
})
