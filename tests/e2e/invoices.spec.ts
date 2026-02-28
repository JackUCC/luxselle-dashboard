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

test('Invoices page loads and shows list or empty state', async ({ page }) => {
  await page.goto('/invoices')

  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })
  // Either empty state or list is visible
  const emptyOrList = page.getByText('No invoices yet').or(page.getByText('All invoices'))
  await expect(emptyOrList).toBeVisible({ timeout: 5000 })
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

test('mark sold flow creates invoice and keeps product sold', async ({ page, request }) => {
  const created = await request.post('/api/products', {
    data: {
      brand: 'Celine',
      model: 'Triomphe',
      title: 'Triomphe Shoulder Bag',
      sku: 'E2E-SKU-1',
      costPriceEur: 1200,
      sellPriceEur: 2500,
      status: 'in_stock',
      quantity: 1,
    },
  })
  expect(created.ok()).toBeTruthy()

  await page.goto('/inventory')
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible({ timeout: 15000 })

  await page.getByText('Celine — Triomphe Shoulder Bag').first().click()
  await page.getByRole('button', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Record Sale' }).click()

  await expect(page.getByRole('heading', { name: 'Record Sale + Create Invoice' })).toBeVisible()
  await page.getByPlaceholder('e.g. John Smith').fill('QA Buyer')
  await page.getByRole('button', { name: 'Record Sale + Invoice' }).click()

  await expect(page.getByRole('heading', { name: 'Record Sale + Create Invoice' })).toHaveCount(0)

  await page.goto('/invoices')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('QA Buyer')).toBeVisible({ timeout: 10000 })

  await page.goto('/inventory')
  await expect(page.getByText('Celine — Triomphe Shoulder Bag')).toBeVisible()
  await expect(page.getByText('Sold')).toBeVisible()
})
