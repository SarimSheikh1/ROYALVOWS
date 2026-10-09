import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.AUDIT_ORIGIN || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP localhost 127.0.0.1'] });
const results = []; const issues = []; const links = new Set();
const page = await browser.newPage();
let current = '';
page.on('pageerror', error => issues.push({ page: current, kind: 'javascript', message: error.message }));
page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/api/auth/me')) issues.push({ page: current, kind: 'http', status: response.status(), url: response.url() }); });
async function inspect(label, images = false) {
  current = label;
  await page.waitForTimeout(500);
  if (images) {
    for (const img of await page.locator('main img').all()) {
      if (await img.isVisible()) await img.scrollIntoViewIfNeeded().catch(() => {});
    }
    await page.waitForTimeout(700);
    const broken = await page.locator('main img').evaluateAll(imgs => imgs.filter(x => x.complete && x.naturalWidth === 0).map(x => x.getAttribute('src')));
    broken.forEach(src => issues.push({ page: label, kind: 'broken-image', src }));
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (overflow) issues.push({ page: label, kind: 'horizontal-overflow', width: await page.evaluate(() => document.documentElement.scrollWidth) });
  const alerts = await page.locator('[role=alert], .error').allTextContents();
  alerts.filter(x => x.trim()).forEach(message => issues.push({ page: label, kind: 'visible-error', message }));
  for (const href of await page.locator('a[href]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))) if (href?.startsWith('/') && !href.startsWith('/api/')) links.add(href.split('?')[0]);
  results.push({ page: label, title: await page.title(), overflow, heading: await page.locator('h1').first().textContent().catch(() => '') });
  console.log('CHECK ' + label);
}
try {
  await mkdir('qa', { recursive: true });
  const venuesResponse = await page.request.get(origin + '/api/venues');
  if (!venuesResponse.ok()) throw new Error('Venue API unavailable');
  const venues = (await venuesResponse.json()).data;

  const routes = ['/', '/story', '/palaces', '/collections', '/services', '/catering', '/gallery', '/planning', '/contact', '/privacy', '/terms', '/login', ...venues.map(v => '/palaces/' + v._id)];
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      current = route + '@' + width;
      await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
      await inspect(current, true);
    }
  }
  if (process.env.AUDIT_EMAIL && process.env.AUDIT_PASSWORD) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    current = 'admin-login';
    await page.goto(origin + '/login');
    await page.getByLabel('Email', { exact: true }).fill(process.env.AUDIT_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(process.env.AUDIT_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/portal');
    await page.locator('.sidebar nav button').first().waitFor();
    const tabs = await page.locator('.sidebar button').allTextContents();
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const raw of tabs) {
        const tab = raw.trim(); if (!tab || tab === 'Sign out') continue;
        current = 'admin:' + tab + '@' + width;
        await page.locator('.sidebar').getByRole('button', { name: tab, exact: true }).click();
        await inspect(current);
      }
      await page.screenshot({ path: `qa/audit-admin-${width}.png`, fullPage: true });
    }
  }
  for (const href of links) {
    if (!/^\/(api|media)\//.test(href) && !['/portal', '/reset', '/verify'].includes(href) && !routes.includes(href)) {
      current = 'link:' + href;
      await page.goto(origin + href);
      if (await page.getByRole('heading', { name: 'Page not found.' }).count()) issues.push({ page: current, kind: 'broken-link' });
    }
  }
} finally {
  await writeFile('qa/site-audit.json', JSON.stringify({ time: new Date().toISOString(), results, issues, internalLinks: [...links] }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks: results.length, issues }, null, 2));
if (issues.length) process.exitCode = 1;