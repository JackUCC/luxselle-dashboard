import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

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

const hasPageLevelOverflow = async (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)

const expectNoPageLevelOverflow = async (page: Page) => {
  const hasOverflow = await hasPageLevelOverflow(page)
  expect(hasOverflow).toBeFalsy()
}

test.beforeEach(async ({ request }) => {
  await clearFirestore(request)
})

test.afterEach(async ({ request }) => {
  await clearFirestore(request)
})

test('shell uses drawer below xl and dock at desktop widths', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/')

  await expect(page.getByTestId('mobile-nav-toggle')).toBeVisible()
  await expect(page.getByTestId('dock-bar')).toBeHidden()
  await expectNoPageLevelOverflow(page)

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/')

  await expect(page.getByTestId('dock-bar')).toBeVisible()
  await expect(page.getByTestId('mobile-nav-toggle')).toBeHidden()
  await expectNoPageLevelOverflow(page)
})

test('sidecar quarter-screen widths keep navigation, mode persistence, and containment', async ({ page }) => {
  const sidecarWidths = [340, 420, 480, 640]

  for (const width of sidecarWidths) {
    await test.step(`sidecar flow at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/evaluate?mode=sidecar')

      await expect(page.getByRole('heading', { name: 'Sidecar' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Exit' })).toBeVisible()
      await expectNoPageLevelOverflow(page)

      await page.getByRole('button', { name: 'Open navigation menu' }).click()
      await page.getByRole('link', { name: 'Inventory' }).click()
      await expect(page).toHaveURL(/\/inventory\?.*mode=sidecar/)
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible()
      await expectNoPageLevelOverflow(page)

      await page.getByRole('button', { name: 'Open navigation menu' }).click()
      await page.getByRole('link', { name: 'Invoices' }).click()
      await expect(page).toHaveURL(/\/invoices\?.*mode=sidecar/)
      await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible()
      await expect(page.getByTestId('invoice-create-cta')).toBeVisible()
      await expectNoPageLevelOverflow(page)
    })
  }
})

test('inventory table overflow is contained in sidecar table view', async ({ page, request }) => {
  await request.post('/api/products', {
    data: {
      brand: 'Chanel',
      model: 'Classic Flap',
      title: 'Responsive overflow verification item',
      sku: `RESP-${Date.now()}`,
      costPriceEur: 1200,
      sellPriceEur: 1850,
      quantity: 1,
      status: 'in_stock',
    },
  })

  await page.setViewportSize({ width: 340, height: 900 })
  await page.goto('/inventory?mode=sidecar')
  await page.getByTestId('inventory-view-table').click()
  await expect(page.locator('table')).toBeVisible()

  const containment = await page.locator('table').evaluate((table) => {
    let current: HTMLElement | null = table.parentElement as HTMLElement | null
    let foundOverflowContainer = false

    while (current) {
      const style = window.getComputedStyle(current)
      if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) {
        foundOverflowContainer = true
        break
      }
      current = current.parentElement
    }

    return {
      foundOverflowContainer,
      hasPageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    }
  })

  expect(containment.foundOverflowContainer).toBeTruthy()
  expect(containment.hasPageOverflow).toBeFalsy()
})

