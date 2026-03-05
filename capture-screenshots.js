const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const outDir = '/Users/jackkelleher/.gemini/antigravity/brain/f0f42fc1-f26a-462d-abe1-9b0d76c31ea6/screenshots';
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}
const BASE_URL = 'https://luxselle-dashboard-kk5nc6zne-jack-kellehers-projects.vercel.app';

async function takeScreenshots() {
    console.log('Starting Playwright...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    console.log('Navigating to dashboard...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '1-dashboard.png'), fullPage: true });

    console.log('Navigating to Market Research...');
    await page.goto(`${BASE_URL}/market-research`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '5-market-research.png'), fullPage: true });

    console.log('Navigating to Evaluate / Price Check...');
    await page.goto(`${BASE_URL}/evaluate`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '6-evaluate.png'), fullPage: true });

    try {
        const snTab = page.locator('button[role="tab"]:has-text("Serial"), button[role="tab"]:has-text("SN")').first();
        if (await snTab.isVisible()) {
            await snTab.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(outDir, '4-serial-check.png'), fullPage: true });
        } else {
            console.log('Serial check tab not found, copying evaluate page');
            fs.copyFileSync(path.join(outDir, '6-evaluate.png'), path.join(outDir, '4-serial-check.png'));
        }
    } catch (e) {
        console.log('Serial check tab click failed');
    }

    console.log('Navigating to Inventory...');
    await page.goto(`${BASE_URL}/inventory`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '7-inventory.png'), fullPage: true });

    console.log('Navigating to Sidecar Quick tab...');
    await page.goto(`${BASE_URL}/?mode=sidecar`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.setViewportSize({ width: 400, height: 800 });
    await page.screenshot({ path: path.join(outDir, '2-sidecar-quick.png'), fullPage: true });

    console.log('Navigating to Sidecar Tools tab...');
    try {
        const toolsTab = page.locator('button[role="tab"]:has-text("Tools")').first();
        if (await toolsTab.isVisible()) {
            await toolsTab.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(outDir, '3-sidecar-tools.png'), fullPage: true });
        } else {
            console.log('Tools tab not found in sidecar');
            fs.copyFileSync(path.join(outDir, '2-sidecar-quick.png'), path.join(outDir, '3-sidecar-tools.png'));
        }
    } catch (e) {
        console.log('Tools tab click failed in sidecar');
    }

    await browser.close();
    console.log('Screenshots complete');
}

takeScreenshots().catch(console.error);
