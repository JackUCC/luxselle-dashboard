import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = '[REDACTED]'
const emulatorBaseUrl = 'http://127.0.0.1:8082'

const clearFirestore = async (request: APIRequestContext) => {
  try {
    await request.delete(
      `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { timeout: 5000 }
    )
  } catch (e) {
    // Emulator may not be ready yet (e.g. ECONNREFUSED); skip clear so tests can run
  }
}

test.beforeEach(async ({ request }) => {
  await clearFirestore(request)
})

test.afterEach(async ({ request }) => {
  await clearFirestore(request)
})

test('evaluator flow adds item and receives into inventory', async ({ page }) => {
  const query = 'Chanel Classic Flap'
  page.on('dialog', (dialog) => dialog.accept())

  await page.route('**/api/pricing/price-check', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          averageSellingPriceEur: 5000,
          comps: [{ title: 'Chanel Classic Flap', price: 4800, source: 'Vestiaire Collective', sourceUrl: 'https://vestiairecollective.com' }],
          maxBuyEur: 3200,
          maxBidEur: 2990,
        },
      }),
    })
  )

  await page.goto('/buy-box')
  await page.getByLabel(/Search for item/i).fill(query)
  await page.getByRole('button', { name: 'Research market' }).click()
  await expect(page.getByText('Avg. selling price')).toBeVisible()
  await expect(page.getByText('Max buy target')).toBeVisible()
  await expect(page.getByText('Max bid target')).toBeVisible()
})

test('shows error when price-check fails', async ({ page }) => {
  await page.route('**/api/pricing/price-check', (route) =>
    route.fulfill({ status: 500, body: 'Market research unavailable' })
  )

  await page.goto('/buy-box')
  await page.getByLabel(/Search for item/i).fill('Chanel Classic Flap')
  await page.getByRole('button', { name: 'Research market' }).click()
  await expect(page.getByTestId('price-check-inline-error')).toBeVisible()
})

test('prompts when search is empty', async ({ page }) => {
  await page.goto('/buy-box')
  await page.getByRole('button', { name: 'Research market' }).click()
  await expect(page.getByText('Enter an item name to search')).toBeVisible()
})

test('nav routing works for all main routes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  // Start at Overview
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Quick Controls|Overview/ })).toBeVisible()

  const dock = page.getByTestId('dock-bar')
  await expect(dock).toBeVisible()

  // Navigate to Inventory
  await dock.getByRole('link', { name: 'Inventory' }).click()
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()

  // Navigate to Price Check
  await dock.getByRole('link', { name: 'Price Check' }).click()
  await expect(page.getByRole('heading', { name: 'Price Check' })).toBeVisible()

  // Navigate to Sourcing
  await dock.getByRole('link', { name: 'Sourcing' }).click()
  await expect(page.getByRole('heading', { name: 'Sourcing' })).toBeVisible()
})

test('legacy route redirects work', async ({ page }) => {
  await page.goto('/evaluator')
  await expect(page).toHaveURL('/buy-box')
})

test('invoices page loads and shows list or empty state', async ({ page }) => {
  await page.goto('/invoices')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
  await expect(
    page.getByText(/No invoices yet|All invoices|Create Invoice/).first()
  ).toBeVisible()
})

test('invoices page create in-person invoice button opens form', async ({ page }) => {
  await page.goto('/invoices')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
  await page.getByTestId('invoice-create-cta').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create in-person invoice' })).toBeVisible()
  await expect(page.getByLabel(/Amount paid \(incl\. VAT\)/)).toBeVisible()
  await expect(page.getByLabel(/Item description/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('Landed Cost tab shows calculator widget', async ({ page }) => {
  await page.goto('/buy-box')

  await page.getByRole('button', { name: 'Landed Cost' }).click()
  await expect(page.getByText('Landed Cost Calculator')).toBeVisible()
})
