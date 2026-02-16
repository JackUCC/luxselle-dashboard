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

test('mobile nav drawer opens and routes correctly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByTestId('mobile-nav-toggle').click()
  await expect(page.getByTestId('mobile-nav-drawer')).toBeVisible()

  await page.getByTestId('mobile-nav-drawer').getByRole('link', { name: 'Inventory' }).click()
  await expect(page).toHaveURL('/inventory')
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
})

test('desktop top nav is visible below 2xl and side rail is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await expect(page.getByTestId('wide-screen-side-rail')).toBeHidden()
  await expect(page.locator('header').getByRole('link', { name: 'Inventory' })).toBeVisible()

  await page.locator('header').getByRole('link', { name: 'Inventory' }).click()
  await expect(page).toHaveURL('/inventory')
})

test('ultra-wide side rail is visible and routes correctly', async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 1000 })
  await page.goto('/')

  const sideRail = page.getByTestId('wide-screen-side-rail')
  await expect(sideRail).toBeVisible()

  await sideRail.getByRole('link', { name: 'Buy Box' }).click()
  await expect(page).toHaveURL('/buy-box')
  await expect(page.getByRole('heading', { name: 'Item Evaluator' })).toBeVisible()
})

test('deep-state breadcrumb is hidden on base route and shown on deep state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('deep-state-breadcrumb')).toHaveCount(0)

  await page.goto('/inventory?lowStock=1')
  await expect(page.getByTestId('deep-state-breadcrumb')).toBeVisible()
  await expect(page.getByTestId('deep-state-breadcrumb')).toContainText('Inventory')
  await expect(page.getByTestId('deep-state-breadcrumb')).toContainText('Low Stock')
})

test('dashboard skeleton appears during delayed load and then resolves', async ({ page }) => {
  await page.route('**/api/dashboard/kpis', async (route) => {
    await page.waitForTimeout(450)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalInventoryValue: 120000,
          pendingBuyListValue: 20000,
          activeSourcingPipeline: 15000,
          lowStockAlerts: 2,
        },
      }),
    })
  })

  await page.route('**/api/dashboard/profit-summary', async (route) => {
    await page.waitForTimeout(450)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalCost: 65000,
          totalRevenue: 98000,
          totalProfit: 33000,
          marginPct: 33.6,
          itemsSold: 12,
          avgMarginPct: 27.5,
        },
      }),
    })
  })

  await page.route('**/api/dashboard/activity?limit=5', async (route) => {
    await page.waitForTimeout(450)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  await page.route('**/api/dashboard/status', async (route) => {
    await page.waitForTimeout(450)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          aiProvider: 'mock',
          firebaseMode: 'emulator',
          lastSupplierImport: null,
        },
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByTestId('dashboard-skeleton')).toBeVisible()
  await expect(page.getByTestId('dashboard-skeleton')).toBeHidden()
  await expect(page.getByText('Total Inventory Value')).toBeVisible()
})

test('insights drawer syncs with URL and closes cleanly', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('dashboard-insights-button').click()
  await expect(page.getByTestId('dashboard-insights-drawer')).toBeVisible()
  await expect(page).toHaveURL(/\?insight=overview/)

  await page.getByRole('button', { name: 'Close insights' }).click()
  await expect(page.getByTestId('dashboard-insights-drawer')).toHaveCount(0)
  await expect(page).not.toHaveURL(/insight=/)
})

test('low stock card keeps inventory flow intact', async ({ page }) => {
  await page.goto('/')

  await page.getByText('Low Stock Alerts').click()
  await expect(page).toHaveURL('/inventory?lowStock=1')
  await expect(page.getByText(/Showing low stock items/)).toBeVisible()
})

test('command bar search navigates to inventory with query', async ({ page }) => {
  await page.goto('/')

  const input = page.getByPlaceholder('Ask Luxselle or search inventory...')
  await input.fill('Chanel')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page).toHaveURL(/\/inventory\?.*q=Chanel/)
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
})

test('VAT calculator shows result after calculate', async ({ page }) => {
  await page.route('**/api/vat/calculate*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        netEur: 81.3,
        vatEur: 18.7,
        grossEur: 100,
        ratePct: 23,
      }),
    })
  )

  await page.goto('/')

  await page.getByLabel('Amount in EUR').fill('100')
  await page.getByRole('button', { name: 'Calculate' }).click()

  await expect(page.getByText('Net (EUR)')).toBeVisible()
  await expect(page.getByText('VAT (23%)')).toBeVisible()
  await expect(page.getByText('Gross (EUR)')).toBeVisible()
})
