import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { importarPlano } from './fixture'

/**
 * Data ownership como o aluno vive: o vault sai num arquivo e volta noutro
 * aparelho.
 *
 * É o aceite da story 9, e o único teste que consegue prová-lo: OPFS de
 * verdade, download de verdade, e uma instalação limpa que nunca viu este
 * aluno. O que sobrevive à viagem — plano, água registrada, aferição — é a
 * resposta à pergunta "o dado é mesmo meu?".
 *
 * O caminho exercitado é o do download. A File System Access API abre um
 * diálogo do sistema, que nenhum driver de automação responde; aqui ela é
 * removida na inicialização da página, que é exatamente o que o app encontra
 * no Firefox e no iOS.
 */
test.describe('exportar e restaurar o vault', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error a API não está na lib do DOM; removê-la é o objetivo
      delete window.showSaveFilePicker
    })
    await page.goto('./')
    await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      for await (const [nome] of raiz.entries()) {
        await raiz.removeEntry(nome, { recursive: true })
      }
    })
    await page.reload()
  })

  test('o arquivo exportado reimporta em instalação limpa e reproduz o mesmo estado', async ({
    page,
  }) => {
    // --- o aluno usa o app ------------------------------------------------
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await importarPlano(page)
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()

    await page.getByRole('link', { name: 'Hoje', exact: true }).click()
    await page.getByRole('button', { name: 'Registrar mais um copo de água' }).click()
    await expect(page.getByText('0,25 de 4 L')).toBeVisible()

    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await page.getByLabel('Peso (kg)').fill('82.4')
    await page.getByRole('button', { name: 'Registrar aferição' }).click()
    await expect(page.getByRole('list', { name: 'Histórico de aferições' })).toContainText(
      '82,4 kg'
    )

    // --- o aluno leva o vault embora --------------------------------------
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar meus dados' }).click()
    const arquivo = await download

    expect(arquivo.suggestedFilename()).toMatch(/^vault-\d{4}-\d{2}-\d{2}\.fitvault\.json$/)
    await expect(page.getByRole('status')).toContainText('Vault exportado')

    const conteudo = readFileSync((await arquivo.path())!, 'utf8')
    // O critério de aceitação do posicionamento (ADR 0003): abrir num editor
    // qualquer e entender o que está lá.
    expect(conteudo).toContain('"vault/aluno/perfil.json"')
    expect(conteudo).toContain('Ana Ribeiro')
    expect(conteudo).toContain('82.4')

    // --- instalação limpa: outro aparelho, mesmo aluno --------------------
    await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      for await (const [nome] of raiz.entries()) {
        await raiz.removeEntry(nome, { recursive: true })
      }
    })
    await page.reload()
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeHidden()

    await page.getByLabel('Importar arquivo do profissional').setInputFiles({
      name: arquivo.suggestedFilename(),
      mimeType: 'application/json',
      buffer: Buffer.from(conteudo),
    })

    // --- tudo de volta, pelo mesmo lugar de onde saiu ---------------------
    await expect(page.getByRole('status')).toContainText('Backup restaurado')
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()

    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Histórico de aferições' })).toContainText(
      '82,4 kg'
    )

    await page.getByRole('link', { name: 'Hoje', exact: true }).click()
    await expect(page.getByText('0,25 de 4 L')).toBeVisible()
  })

  test('sem plano importado, não há o que exportar', async ({ page }) => {
    await page.getByRole('link', { name: 'Plano', exact: true }).click()

    // O input de arquivo carrega o mesmo rótulo do botão que o aciona, e o
    // Chromium expõe os dois como `button` — daí a busca pelo texto visível.
    await expect(page.getByText('Importar arquivo do profissional')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Exportar meus dados' })).toBeHidden()
  })
})
