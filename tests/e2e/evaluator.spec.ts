import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = 'luxselle-dashboard'
const emulatorBaseUrl = 'http://127.0.0.1:8082'

const clearFirestore = async (request: APIRequestContext) => {
  try {
    await request.delete(
      `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`
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
  await page.getByPlaceholder(/e.g. Chanel Classic Flap/).fill(query)
  await page.getByRole('button', { name: 'Research market' }).click()
  await expect(page.getByText('Avg. selling price')).toBeVisible()

  await page.getByRole('button', { name: 'Add to buying list' }).click()
  await expect(page.getByPlaceholder(/e.g. Chanel Classic Flap/)).toHaveValue('')

  await page.goto('/buying-list')
  const row = page.locator('tr', { hasText: query }).last()
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Receive' }).click()
  await expect(row.getByText('received')).toBeVisible()

  await page.goto('/inventory')
  await expect(page.getByText(query)).toBeVisible()
})

test('shows error when price-check fails', async ({ page }) => {
  await page.route('**/api/pricing/price-check', (route) =>
    route.fulfill({ status: 500, body: 'Market research unavailable' })
  )

  await page.goto('/buy-box')
  await page.getByPlaceholder(/e.g. Chanel Classic Flap/).fill('Chanel Classic Flap')
  await page.getByRole('button', { name: 'Research market' }).click()
  await expect(page.getByText(/Research failed|Market research unavailable/)).toBeVisible()
})

test('prompts when search is empty', async ({ page }) => {
  await page.goto('/buy-box')
  await page.getByRole('button', { name: 'Research market' }).click()
  await expect(page.getByText('Enter an item name to search')).toBeVisible()
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

test('nav routing works for all main routes', async ({ page }) => {
  const clickVisibleNav = async (path: string) => {
    await page.locator(`a[href="${path}"]:visible`).first().click()
  }

  // Start at Overview
  await page.goto('/')
  await expect(page.getByText('Good afternoon, Jack')).toBeVisible()

  // Navigate to Inventory
  await clickVisibleNav('/inventory')
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()

  // Navigate to Buy Box
  await clickVisibleNav('/buy-box')
  await expect(page.getByRole('heading', { name: 'Price Check' })).toBeVisible()

  // Navigate to Supplier Hub
  await clickVisibleNav('/supplier-hub')
  await expect(page.getByRole('heading', { name: 'Connected Sources' })).toBeVisible()

  // Navigate to Sourcing
  await clickVisibleNav('/sourcing')
  await expect(page.getByRole('heading', { name: 'Sourcing' })).toBeVisible()

  // Navigate to Buying List
  await clickVisibleNav('/buying-list')
  await expect(page.getByRole('heading', { name: 'Buying List' })).toBeVisible()
})

test('legacy route redirects work', async ({ page }) => {
  // /evaluator should redirect to /buy-box
  await page.goto('/evaluator')
  await expect(page).toHaveURL('/buy-box')

  // /suppliers should redirect to /supplier-hub
  await page.goto('/suppliers')
  await expect(page).toHaveURL('/supplier-hub')
})

test('buying list bulk order view renders correctly', async ({ page, request }) => {
  // Create a test item first
  await request.post('/api/buying-list', {
    data: {
      sourceType: 'manual',
      brand: 'Chanel',
      model: 'Classic Flap',
      category: 'handbag',
      condition: 'excellent',
      colour: 'black',
      targetBuyPriceEur: 5000,
      status: 'pending',
      notes: 'Playwright bulk test',
    },
  })

  await page.goto('/buying-list')

  // Should see list view by default
  await expect(page.getByText('Chanel Classic Flap')).toBeVisible()

  // Switch to bulk order view
  await page.click('button:has-text("Bulk Order")')

  // Should see bulk view elements
  await expect(page.getByText('Message Preview')).toBeVisible()
  await expect(page.getByText('Copy Bulk Message')).toBeVisible()
})

test('invoices page loads and shows list or empty state', async ({ page }) => {
  await page.goto('/invoices')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
  await expect(
    page.getByText(/No invoices yet|All invoices|Create an in-person invoice/).first()
  ).toBeVisible()
})

test('invoices page create in-person invoice button opens form', async ({ page }) => {
  await page.goto('/invoices')
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
  await page.getByRole('button', { name: 'Create in-person invoice' }).click()
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
