import { expect, test, type Page } from '@playwright/test'
import { SCHEMA_VERSION_MEDIDA } from '../src/domain/aluno/medida'
import { SCHEMA_VERSION_REGISTRO } from '../src/domain/registro/migracoes'
import { importarPlano } from './fixture'

/**
 * Evolução, no navegador de verdade.
 *
 * A story ataca a causa-raiz do produto, e a prova dela não cabe num unitário:
 * exige um **passado no disco**. Aqui o histórico é escrito no OPFS como o app
 * o escreveria, o aluno treina de verdade por cima dele, e a evidência aparece
 * nas duas telas — a manchete na Evolução e o recorde em Hoje.
 */

/**
 * Uma sessão de semanas atrás, gravada no vault como o app a gravaria.
 *
 * A versão do schema vem do domínio, e não de um número copiado para cá: um
 * registro com versão errada é descartado na leitura, e o teste falharia
 * dizendo "não há evolução" quando o que houve foi um fixture desatualizado.
 */
async function semearSessao(
  page: Page,
  diasAtras: number,
  itemDeTreinoId: string,
  cargaKg: number
) {
  await page.evaluate(
    async ({ diasAtras, itemDeTreinoId, cargaKg, schemaVersion }) => {
      const dia = new Date()
      dia.setDate(dia.getDate() - diasAtras)
      const data = [
        dia.getFullYear(),
        `${dia.getMonth() + 1}`.padStart(2, '0'),
        `${dia.getDate()}`.padStart(2, '0'),
      ].join('-')

      const raiz = await navigator.storage.getDirectory()
      const vault = await raiz.getDirectoryHandle('vault', { create: true })
      const registros = await vault.getDirectoryHandle('registros', { create: true })
      const arquivo = await registros.getFileHandle(`${data}.json`, { create: true })

      const fluxo = await arquivo.createWritable()
      await fluxo.write(
        JSON.stringify({
          schemaVersion,
          data,
          aguaLitros: 0,
          refeicoes: [],
          series: [
            {
              itemDeTreinoId,
              indice: 1,
              cargaKg,
              repeticoes: 10,
              concluidaEm: `${data}T10:00:00.000Z`,
            },
          ],
        })
      )
      await fluxo.close()
    },
    { diasAtras, itemDeTreinoId, cargaKg, schemaVersion: SCHEMA_VERSION_REGISTRO }
  )
}

/** O item que a agenda do plano marca para hoje — `null` em dia de descanso. */
async function primeiroItemDeHoje(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const raiz = await navigator.storage.getDirectory()
    const vault = await raiz.getDirectoryHandle('vault')
    const planos = await vault.getDirectoryHandle('planos')
    const bruto = await (await (await planos.getFileHandle('atual.json')).getFile()).text()
    const { treino } = JSON.parse(bruto).plano

    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    const sessaoId = treino.agendaSemanal[dias[new Date().getDay()]].sessaoId
    if (!sessaoId) return null

    const sessao = treino.sessoes.find((s: { id: string }) => s.id === sessaoId)
    return sessao.itens[0].id as string
  })
}

test.describe('Evolução', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(async () => {
      const raiz = await navigator.storage.getDirectory()
      for await (const [nome] of raiz.entries()) {
        await raiz.removeEntry(nome, { recursive: true })
      }
    })
    await page.reload()
    await page.getByRole('link', { name: 'Plano', exact: true }).click()
    await importarPlano(page)
    await expect(page.getByText('Prescrito por Ana Ribeiro')).toBeVisible()
  })

  test('sem histórico, diz o que falta em vez de mostrar gráfico vazio', async ({ page }) => {
    await page.getByRole('link', { name: 'Evolução', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Ainda não dá para dizer' })).toBeVisible()
  })

  test('o aluno treina hoje e vê o recorde em Hoje e a frase na Evolução', async ({ page }) => {
    const item = await primeiroItemDeHoje(page)
    test.skip(item === null, 'hoje é dia de descanso no plano do fixture')

    // Quatro semanas atrás ele levantou 30 kg neste mesmo exercício.
    await semearSessao(page, 28, item!, 30)
    await page.reload()

    await page.getByRole('link', { name: 'Hoje', exact: true }).click()
    await page.getByRole('link', { name: 'Começar treino' }).click()
    await page.getByLabel('Carga da série 1, em quilos').fill('36')
    await page.getByRole('button', { name: 'Concluir série 1' }).click()
    await expect(page.getByRole('button', { name: 'Concluir série 1' })).toHaveText('Feita')

    // A prova vai até ele: em Hoje, sem visitar aba nenhuma.
    await page.getByRole('button', { name: 'Voltar para Hoje' }).click()
    const recorde = page.getByRole('status')
    await expect(recorde).toContainText('Recorde pessoal')
    await expect(recorde).toContainText('36 kg')

    await page.getByRole('link', { name: 'Evolução', exact: true }).click()
    // Primeiro a frase — 30 → 36 kg é +20% em 4 semanas.
    await expect(page.getByRole('status')).toContainText('Você levantou 20% mais')
    await expect(page.getByRole('status')).toContainText('em 4 semanas')
  })

  test('a evidência sobrevive a recarregar: está no disco, não na tela', async ({ page }) => {
    const item = await primeiroItemDeHoje(page)
    test.skip(item === null, 'hoje é dia de descanso no plano do fixture')

    await semearSessao(page, 28, item!, 30)
    await semearSessao(page, 14, item!, 33)
    await page.reload()

    await page.getByRole('link', { name: 'Evolução', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Você levantou 10% mais')

    await page.reload()
    await expect(page.getByRole('status')).toContainText('Você levantou 10% mais')
    await expect(page.getByText('30 → 33 kg')).toBeVisible()
  })

  test('duas aferições viram delta do corpo, mesmo em dia de descanso', async ({ page }) => {
    await page.getByRole('link', { name: 'Perfil', exact: true }).click()
    await page.getByLabel('Peso (kg)').fill('82')
    await page.getByRole('button', { name: 'Fita métrica' }).click()
    await page.getByLabel('Cintura (cm)').fill('88')
    await page.getByRole('button', { name: 'Registrar aferição' }).click()
    await expect(page.getByRole('list', { name: 'Histórico de aferições' })).toContainText('82 kg')

    // Uma aferição de junho, para haver com o que comparar.
    await page.evaluate(async (schemaVersion) => {
      const raiz = await navigator.storage.getDirectory()
      const vault = await raiz.getDirectoryHandle('vault', { create: true })
      const aluno = await vault.getDirectoryHandle('aluno', { create: true })
      const medidas = await aluno.getDirectoryHandle('medidas', { create: true })
      const arquivo = await medidas.getFileHandle('2026-06-10.json', { create: true })
      const fluxo = await arquivo.createWritable()
      await fluxo.write(
        JSON.stringify({
          schemaVersion,
          data: '2026-06-10',
          pesoKg: 85,
          circunferenciasCm: { cintura: 92 },
        })
      )
      await fluxo.close()
    }, SCHEMA_VERSION_MEDIDA)
    await page.reload()

    await page.getByRole('link', { name: 'Evolução', exact: true }).click()
    const corpo = page.getByRole('list', { name: 'Seu corpo' })
    await expect(corpo).toContainText('85 → 82 kg')
    await expect(corpo).toContainText('92 → 88 cm')
  })
})
