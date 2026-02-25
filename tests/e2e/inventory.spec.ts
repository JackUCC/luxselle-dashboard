import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = 'luxselle-dashboard'
const emulatorBaseUrl = 'http://127.0.0.1:8082'

const clearFirestore = async (request: APIRequestContext) => {
  try {
    await request.delete(
      `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`
    )
  } catch {
    // Emulator may not be ready yet. Tests can continue.
  }
}

test.beforeEach(async ({ request }) => {
  await clearFirestore(request)
})

test.afterEach(async ({ request }) => {
  await clearFirestore(request)
})

test('clear filters resets search and URL', async ({ page }) => {
  await page.goto('/inventory?q=Chanel')

  await expect(page.getByRole('button', { name: /Clear all \(1\)/ })).toBeVisible()
  await page.getByRole('button', { name: /Clear all \(1\)/ }).click()

  await expect(page).not.toHaveURL(/q=Chanel/)
  await expect(page).toHaveURL(/\/inventory\/?(\?|$)/)
})

test('table and grid view toggle', async ({ page, request }) => {
  await request.post('/api/products', {
    data: {
      brand: 'Chanel',
      model: 'Classic Flap',
      category: 'Handbag',
      condition: 'excellent',
      colour: 'black',
      costPriceEur: 1200,
      sellPriceEur: 1850,
      quantity: 1,
      status: 'in_stock',
    },
  })

  await page.goto('/inventory')

  await page.getByTestId('inventory-view-grid').click()
  await expect(page.locator('div.grid.grid-cols-1')).toBeVisible()

  await page.getByTestId('inventory-view-table').click()
  await expect(page.locator('table')).toBeVisible()
})

test('products with prices appear correctly in table', async ({ page, request }) => {
  const uniqueSku = `TEST-SKU-${Date.now()}`
  const uniqueTitle = `Chanel Classic Flap Bag ${Date.now()}`

  const createResponse = await request.post('/api/products', {
    data: {
      brand: 'Chanel',
      model: 'Classic Flap',
      title: uniqueTitle,
      sku: uniqueSku,
      costPriceEur: 1200,
      sellPriceEur: 1850,
      quantity: 1,
      status: 'in_stock',
    },
  })
  expect(createResponse.ok()).toBeTruthy()
  const createJson = (await createResponse.json()) as { data: { id: string } }
  const createdId = createJson?.data?.id
  expect(Boolean(createdId)).toBeTruthy()

  const verifyResponse = await request.get(`/api/products/${createdId}`)
  expect(verifyResponse.ok()).toBeTruthy()
  const verifyJson = (await verifyResponse.json()) as {
    data: { sku: string; costPriceEur: number; sellPriceEur: number }
  }
  expect(verifyJson.data.sku).toBe(uniqueSku)
  expect(verifyJson.data.costPriceEur).toBe(1200)
  expect(verifyJson.data.sellPriceEur).toBe(1850)

  await page.goto('/inventory')
  await expect(page.locator('table')).toBeVisible()

  // Verify the table presents priced inventory rows (not all-zero placeholders).
  await expect(
    page.locator('tbody td').filter({ hasText: /^€[1-9]/ }).first()
  ).toBeVisible()
})
