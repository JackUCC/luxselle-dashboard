import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = 'luxselle-dashboard'
const emulatorBaseUrl = 'http://127.0.0.1:8080'

const clearFirestore = async (request: APIRequestContext) => {
  await request.delete(
    `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`
  )
}

test.beforeEach(async ({ request }) => {
  await clearFirestore(request)
})

test.afterEach(async ({ request }) => {
  await clearFirestore(request)
})

test('evaluator flow adds item and receives into inventory', async ({ page }) => {
  const brand = 'Chanel'
  const model = 'Classic Flap'

  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/evaluator')
  await page.fill('input[name="brand"]', brand)
  await page.fill('input[name="model"]', model)
  await page.fill('input[name="category"]', 'handbag')
  await page.selectOption('select[name="condition"]', 'excellent')
  await page.fill('input[name="colour"]', 'black')

  await page.getByRole('button', { name: 'Analyse' }).click()
  await expect(page.getByText('Estimated Retail Price')).toBeVisible()

  await page.getByRole('button', { name: 'Add to Buying List' }).click()
  await expect(page.locator('input[name="brand"]')).toHaveValue('')

  await page.goto('/buying-list')
  const row = page.locator('tr', { hasText: `${brand} ${model}` }).last()
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Receive' }).click()
  await expect(row.getByText('received')).toBeVisible()

  await page.goto('/inventory')
  await expect(page.getByText(`${brand} ${model}`)).toBeVisible()
})

test('shows error when pricing analysis fails', async ({ page }) => {
  await page.route('**/api/pricing/analyse', (route) =>
    route.fulfill({ status: 500, body: 'Pricing service unavailable' })
  )

  await page.goto('/evaluator')
  await page.fill('input[name="brand"]', 'Chanel')
  await page.fill('input[name="model"]', 'Classic Flap')
  await page.fill('input[name="category"]', 'handbag')
  await page.selectOption('select[name="condition"]', 'excellent')

  await page.getByRole('button', { name: 'Analyse' }).click()
  await expect(page.getByText('Pricing service unavailable')).toBeVisible()
})

test('prevents analysis when required fields are missing', async ({ page }) => {
  await page.goto('/evaluator')
  await page.getByRole('button', { name: 'Analyse' }).click()

  const isValid = await page.evaluate(() => {
    const form = document.querySelector('form')
    return form?.checkValidity()
  })

  expect(isValid).toBe(false)
})

test('receiving an already received item fails gracefully', async ({ request }) => {
  const createResponse = await request.post('/api/buying-list', {
    data: {
      sourceType: 'manual',
      brand: 'Louis Vuitton',
      model: 'Neverfull',
      category: 'handbag',
      condition: 'excellent',
      colour: '',
      targetBuyPriceEur: 7500,
      status: 'pending',
      notes: 'Playwright test',
    },
  })

  expect(createResponse.ok()).toBeTruthy()
  const created = await createResponse.json()
  const itemId = created.data.id

  const firstReceive = await request.post(`/api/buying-list/${itemId}/receive`)
  expect(firstReceive.ok()).toBeTruthy()

  const secondReceive = await request.post(`/api/buying-list/${itemId}/receive`)
  expect(secondReceive.status()).toBe(400)
  expect(await secondReceive.text()).toContain('already received')
})
