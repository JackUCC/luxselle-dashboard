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
  await request.post('/api/products', {
    data: {
      brand: 'Chanel',
      model: 'Classic Flap',
      title: 'Chanel Classic Flap Bag',
      sku: 'TEST-SKU-001',
      costPriceEur: 1200,
      sellPriceEur: 1850,
      quantity: 1,
      status: 'in_stock',
    },
  })

  await page.goto('/inventory')
  await expect(page.locator('table')).toBeVisible()

  // Table should show non-zero purchase and selling prices (not €0)
  await expect(page.getByText('€1,200').first()).toBeVisible()
  await expect(page.getByText('€1,850').first()).toBeVisible()
  // Product row should not show "Missing info" when prices are set
  await expect(page.getByText('Chanel — Classic Flap').first()).toBeVisible()
})
