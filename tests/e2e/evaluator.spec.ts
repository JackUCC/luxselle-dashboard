import { test, expect, type APIRequestContext } from '@playwright/test'

const projectId = 'luxselle-dashboard'
const emulatorBaseUrl = 'http://127.0.0.1:8080'

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
  const brand = 'Chanel'
  const model = 'Classic Flap'

  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('/buy-box')
  await page.selectOption('select[name="brand"]', brand)
  await page.fill('input[name="model"]', model)
  await page.fill('input[name="category"]', 'handbag')
  await page.selectOption('select[name="condition"]', 'excellent')
  await page.fill('input[name="colour"]', 'black')

  await page.getByRole('button', { name: 'Analyze Market' }).click()
  await expect(page.getByText('Estimated Retail Price')).toBeVisible()

  await page.getByRole('button', { name: 'Add to Buying List' }).click()
  await expect(page.locator('input[name="model"]')).toHaveValue('')

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

  await page.goto('/buy-box')
  await page.selectOption('select[name="brand"]', 'Chanel')
  await page.fill('input[name="model"]', 'Classic Flap')
  await page.fill('input[name="category"]', 'handbag')
  await page.selectOption('select[name="condition"]', 'excellent')
  await page.fill('input[name="colour"]', 'black')

  await page.getByRole('button', { name: 'Analyze Market' }).click()
  await expect(page.getByText('Pricing service unavailable')).toBeVisible()
})

test('prevents analysis when required fields are missing', async ({ page }) => {
  await page.goto('/buy-box')
  await page.getByRole('button', { name: 'Analyze Market' }).click()

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

test('nav routing works for all main routes', async ({ page }) => {
  // Start at Overview
  await page.goto('/')
  await expect(page.getByText('Good afternoon, Jack')).toBeVisible()

  // Navigate to Inventory
  await page.click('a[href="/inventory"]')
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()

  // Navigate to Buy Box
  await page.click('a[href="/buy-box"]')
  await expect(page.getByRole('heading', { name: 'Item Evaluator' })).toBeVisible()

  // Navigate to Supplier Hub
  await page.click('a[href="/supplier-hub"]')
  await expect(page.getByRole('heading', { name: 'Connected Sources' })).toBeVisible()

  // Navigate to Sourcing
  await page.click('a[href="/sourcing"]')
  await expect(page.getByRole('heading', { name: 'Sourcing' })).toBeVisible()

  // Navigate to Buying List
  await page.click('a[href="/buying-list"]')
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
    page.getByText(/No invoices yet|All invoices|Create invoices from sales/)
  ).toBeVisible()
})
