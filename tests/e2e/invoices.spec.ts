import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = '[REDACTED]'
const emulatorBaseUrl = 'http://127.0.0.1:8082'

const clearFirestore = async (request: APIRequestContext) => {
  try {
    await request.delete(
      `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { timeout: 5000 }
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

test('Invoices page loads', async ({ page }) => {
  await page.goto('/invoices')

  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('invoice-create-cta')).toBeVisible()
})

test('Create in-person invoice opens modal and can be closed', async ({ page }) => {
  await page.goto('/invoices')

  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })

  // Click create CTA (header button or empty state)
  const createCta = page.getByRole('button', { name: /Create invoice/i }).first()
  await createCta.click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create in-person invoice' })).toBeVisible()

  // Close via X or Cancel
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('sidecar mode keeps compact invoice create flow and mode param', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 })
  await page.goto('/invoices?mode=sidecar')

  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })
  await expect(page).toHaveURL(/\/invoices\?.*mode=sidecar/)
  await expect(page.getByTestId('invoice-create-cta')).toBeVisible()

  await page.getByTestId('invoice-create-cta').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/invoices\?.*mode=sidecar/)
})

test('mark sold flow creates invoice and keeps product sold', async ({ page, request }) => {
  const suffix = Date.now()
  const uniqueSku = `E2E-SKU-${suffix}`
  const uniqueTitle = `Triomphe Shoulder Bag ${suffix}`
  const uniqueBuyer = `QA Buyer ${suffix}`
  const created = await request.post('/api/products', {
    data: {
      brand: 'Celine',
      model: 'Triomphe',
      title: uniqueTitle,
      sku: uniqueSku,
      costPriceEur: 1200,
      sellPriceEur: 2500,
      status: 'in_stock',
      quantity: 1,
    },
  })
  expect(created.ok()).toBeTruthy()

  await page.goto('/inventory')
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible({ timeout: 15000 })

  await page.getByTestId('inventory-view-table').click()
  await page.getByPlaceholder('Search by brand, model, SKU...').fill(uniqueSku)
  await page.getByText(uniqueSku).first().click()
  await page.getByRole('button', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Record Sale' }).click()

  await expect(page.getByRole('heading', { name: 'Record Sale + Create Invoice' })).toBeVisible()
  await page.getByPlaceholder('e.g. John Smith').fill(uniqueBuyer)
  await page.getByRole('button', { name: 'Record Sale + Invoice' }).click()

  await expect(page.getByRole('heading', { name: 'Record Sale + Create Invoice' })).toHaveCount(0)

  await page.goto('/invoices')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(uniqueBuyer)).toBeVisible({ timeout: 10000 })

  await page.goto('/inventory')
  await page.getByTestId('inventory-view-table').click()
  await page.getByPlaceholder('Search by brand, model, SKU...').fill(uniqueSku)
  await expect(page.getByText(uniqueSku)).toBeVisible()
  await expect(page.getByRole('table').getByText('Sold')).toBeVisible()
})
