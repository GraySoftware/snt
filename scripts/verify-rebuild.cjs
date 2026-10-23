const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const routes = [
  ['/', 'Global Defense Company'],
  ['/firearms#k13', 'Special Operations Rifle'],
  ['/about#history', 'About Us'],
  ['/support#quality', 'Support'],
  ['/certificate/iso-14001', 'ISO 14001 Certificate Archive'],
  ['/contact', 'Contact Us'],
  ['/not-a-real-page', 'Page not found']
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const failures = [];
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));

  for (const [route, expectedHeading] of routes) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    const heading = (await page.locator('h1').first().textContent())?.trim();
    if (heading !== expectedHeading) failures.push(`${route}: expected H1 “${expectedHeading}”, received “${heading}”`);
    const brokenImages = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src));
    if (brokenImages.length) failures.push(`${route}: broken images: ${brokenImages.join(', ')}`);
    const remoteVisuals = await page.evaluate(() => {
      const urls = [...document.images].map(image => image.currentSrc || image.src);
      for (const element of document.querySelectorAll('*')) {
        const background = getComputedStyle(element).backgroundImage;
        if (background && background !== 'none') urls.push(...[...background.matchAll(/url\(["']?(https?:\/\/[^"')]+)/g)].map(match => match[1]));
      }
      return [...new Set(urls.filter(url => /^https?:\/\//.test(url) && new URL(url).origin !== location.origin))];
    });
    if (remoteVisuals.length) failures.push(`${route}: externally hosted visual assets: ${remoteVisuals.join(', ')}`);
    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations.filter(item => ['critical', 'serious'].includes(item.impact));
    if (severe.length) failures.push(`${route}: accessibility: ${severe.map(item => `${item.id} [${item.nodes.flatMap(node => node.target).join(', ')}]`).join('; ')}`);
  }

  await page.goto(`${base}/firearms#k13`, { waitUntil: 'networkidle' });
  for (const model of ['k13', 'k2', 'k2c', 'k14', 'stsm21']) {
    await page.locator(`[data-firearm="${model}"]`).click();
    if (!page.url().endsWith(`#${model}`)) failures.push(`Firearms tab ${model}: URL hash did not update`);
    if (await page.locator(`[data-firearm="${model}"][aria-selected="true"]`).count() !== 1) failures.push(`Firearms tab ${model}: selected state missing`);
  }

  for (const route of ['/about', '/support']) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    const missing = await page.locator('.category-bar a').evaluateAll(links => links.filter(link => !document.querySelector(link.hash)).map(link => link.hash));
    if (missing.length) failures.push(`${route}: missing sections: ${missing.join(', ')}`);
  }

  await browser.close();
  if (consoleErrors.length) failures.push(`Console errors: ${[...new Set(consoleErrors)].join(' | ')}`);
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`Verified ${routes.length} routes, five firearm tabs, section targets, locally hosted visual assets, images, and serious/critical accessibility checks.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
