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

test('mobile nav drawer opens and routes correctly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByTestId('mobile-nav-toggle').click()
  await expect(page.getByTestId('mobile-nav-drawer')).toBeVisible()

  await page.getByTestId('mobile-nav-drawer').getByRole('link', { name: 'Inventory' }).click()
  await expect(page).toHaveURL('/inventory')
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
})

test('navigation drawer is used below xl and dock is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/')

  await expect(page.getByTestId('dock-bar')).toBeHidden()
  await expect(page.getByTestId('mobile-nav-toggle')).toBeVisible()
  await page.getByTestId('mobile-nav-toggle').click()
  await expect(page.getByTestId('mobile-nav-drawer')).toBeVisible()

  await page.getByTestId('mobile-nav-drawer').getByRole('link', { name: 'Inventory' }).click()
  await expect(page).toHaveURL('/inventory')
})

test('dock bar is visible and routes correctly on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 1000 })
  await page.goto('/')

  const dock = page.getByTestId('dock-bar')
  await expect(dock).toBeVisible()

  await dock.getByRole('link', { name: 'Price Check' }).click()
  await expect(page).toHaveURL('/buy-box')
  await expect(page.getByRole('heading', { name: 'Price Check' })).toBeVisible()
})

test('breadcrumb is hidden on base route and visible on deep state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('deep-state-breadcrumb')).toHaveCount(0)

  await page.goto('/inventory?status=in-stock')
  await expect(page.getByTestId('deep-state-breadcrumb')).toBeVisible()
  await expect(page.getByTestId('deep-state-breadcrumb')).toContainText('Inventory')
})

test('dashboard skeleton appears during delayed load and then resolves', async ({ page }) => {
  let resolveKpis: () => void
  const kpisPromise = new Promise<void>((resolve) => { resolveKpis = resolve })

  await page.route('**/api/dashboard/kpis', async (route) => {
    await kpisPromise
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalInventoryValue: 120000,
          totalInventoryPotentialValue: 165000,
          activeSourcingPipeline: 15000,
        },
      }),
    })
  })

  await page.goto('/')

  // Verify skeleton is visible while requests are pending
  await expect(page.getByTestId('dashboard-skeleton')).toBeVisible()

  // Resolve requests
  resolveKpis!()

  // Verify skeleton disappears and content loads
  await expect(page.getByTestId('dashboard-skeleton')).toBeHidden()
  await expect(page.getByText('Inventory Cost')).toBeVisible()
})

test('inventory missing-info filter works via URL', async ({ page }) => {
  await page.goto('/inventory?missingInfo=1')
  await expect(page).toHaveURL('/inventory?missingInfo=1')
  await expect(page.getByText(/Showing products with missing information/)).toBeVisible()
})
