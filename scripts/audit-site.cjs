const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const START_URL = process.env.AUDIT_URL || 'https://www.sntdefense.com/kor';
const MAX_PAGES = Number(process.env.MAX_PAGES || 250);
const OUTPUT_DIR = path.resolve('audit-results');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');
const DOCS_DIR = path.resolve('docs');
const DATA_DIR = path.resolve('data');

function normalizedUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
    return url.href;
  } catch {
    return null;
  }
}

function safeFileName(url, suffix = '.png') {
  const parsed = new URL(url);
  const stem = `${parsed.hostname}${parsed.pathname === '/' ? '-home' : parsed.pathname}`
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 130);
  return `${stem}-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 8)}${suffix}`;
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

async function main() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  await fs.mkdir(DOCS_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  const root = new URL(START_URL);
  const allowedHost = root.hostname;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    userAgent: 'SNT-Site-Audit/1.0 (+Playwright)'
  });

  const queue = [normalizedUrl(START_URL, START_URL)];
  const queued = new Set(queue);
  const pages = [];
  const discoveredLinks = [];
  const imageUsages = [];
  const responseStatus = new Map();
  const seenFinalUrls = new Set();
  const redirects = [];
  const scrapedPages = [];

  while (queue.length && pages.length < MAX_PAGES) {
    const url = queue.shift();
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => failedRequests.push({
      url: request.url(),
      method: request.method(),
      error: request.failure()?.errorText || 'Request failed'
    }));
    page.on('response', response => {
      const responseUrl = normalizedUrl(response.url(), response.url());
      if (responseUrl && !responseStatus.has(responseUrl)) {
        responseStatus.set(responseUrl, {
          url: responseUrl,
          status: response.status(),
          statusText: response.statusText(),
          resourceType: response.request().resourceType()
        });
      }
    });

    let navigationStatus = null;
    let navigationError = null;
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      navigationStatus = response?.status() ?? null;
      await page.waitForTimeout(2000);
    } catch (error) {
      navigationError = error.message;
    }

    const finalUrl = normalizedUrl(page.url(), page.url()) || url;
    if (finalUrl !== url) redirects.push({ source: url, destination: finalUrl, status: navigationStatus });
    if (seenFinalUrls.has(finalUrl)) {
      await page.close();
      continue;
    }
    seenFinalUrls.add(finalUrl);
    let data = {
      title: '', description: '', htmlLang: '', headings: [], links: [], images: [],
      text: '', canonical: '', robots: '', emptyButtons: []
    };

    if (page.url().startsWith('http')) {
      data = await page.evaluate(() => {
        const clean = value => (value || '').replace(/\s+/g, ' ').trim();
        const visibleText = clean(document.body?.innerText || '');
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          htmlLang: document.documentElement.lang || '',
          canonical: document.querySelector('link[rel="canonical"]')?.href || '',
          robots: document.querySelector('meta[name="robots"]')?.content || '',
          headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(el => ({
            level: Number(el.tagName.slice(1)), text: clean(el.textContent)
          })),
          links: [...document.querySelectorAll('a')].map(el => ({
            text: clean(el.textContent), href: el.getAttribute('href') || '', resolvedHref: el.href || '',
            target: el.getAttribute('target') || '', rel: el.getAttribute('rel') || ''
          })),
          images: [...document.querySelectorAll('img')].map(el => ({
            src: el.currentSrc || el.src || '', alt: el.getAttribute('alt'), width: el.naturalWidth,
            height: el.naturalHeight, loading: el.getAttribute('loading') || ''
          })),
          emptyButtons: [...document.querySelectorAll('button')]
            .filter(el => !clean(el.textContent) && !el.getAttribute('aria-label') && !el.getAttribute('title'))
            .length,
          text: visibleText
        };
      });

      try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, safeFileName(finalUrl)), fullPage: true });
      } catch {}
    }

    const pageRecord = {
      url, finalUrl, navigationStatus, navigationError,
      title: data.title, description: data.description, htmlLang: data.htmlLang,
      canonical: data.canonical, robots: data.robots, headings: data.headings,
      textLength: data.text.length,
      textHash: crypto.createHash('sha256').update(data.text).digest('hex'),
      textPreview: data.text.slice(0, 800), emptyButtons: data.emptyButtons,
      consoleErrors: [...new Set(consoleErrors)], pageErrors: [...new Set(pageErrors)],
      failedRequests, linkCount: data.links.length, imageCount: data.images.length
    };
    pages.push(pageRecord);
    scrapedPages.push({
      url: finalUrl, title: data.title, description: data.description, htmlLang: data.htmlLang,
      canonical: data.canonical, headings: data.headings, text: data.text,
      links: data.links, images: data.images
    });

    for (const link of data.links) {
      const resolved = normalizedUrl(link.resolvedHref || link.href, finalUrl);
      discoveredLinks.push({ source: finalUrl, ...link, resolved });
      if (resolved && new URL(resolved).hostname === allowedHost && !queued.has(resolved)) {
        queued.add(resolved);
        queue.push(resolved);
      }
    }
    for (const image of data.images) imageUsages.push({ page: finalUrl, ...image });
    await page.close();
  }

  // Check links not already observed during navigation/resource loading.
  const uniqueTargets = [...new Set(discoveredLinks.map(link => link.resolved).filter(Boolean))];
  const checkedTargets = [];
  for (const target of uniqueTargets) {
    if (responseStatus.has(target)) {
      checkedTargets.push(responseStatus.get(target));
      continue;
    }
    try {
      let response = await context.request.head(target, { timeout: 20000, failOnStatusCode: false });
      if ([403, 405].includes(response.status())) {
        response = await context.request.get(target, { timeout: 20000, failOnStatusCode: false });
      }
      checkedTargets.push({ url: target, status: response.status(), statusText: response.statusText(), resourceType: 'link' });
    } catch (error) {
      checkedTargets.push({ url: target, status: null, statusText: error.message, resourceType: 'link' });
    }
  }

  const badTargetMap = new Map(checkedTargets.filter(item => item.status === null || item.status >= 400).map(item => [item.url, item]));
  const brokenLinks = discoveredLinks
    .filter(link => link.resolved && badTargetMap.has(link.resolved))
    .map(link => ({ ...link, ...badTargetMap.get(link.resolved) }));
  const emptyLinks = discoveredLinks.filter(link => !link.href || link.href === '#' || /^javascript:/i.test(link.href));

  const repeatedImages = [...groupBy(imageUsages.filter(image => image.src), image => image.src).entries()]
    .map(([src, usages]) => ({
      src, count: usages.length, pages: [...new Set(usages.map(item => item.page))], usages,
      likelyUiAsset: /(arrow|icon|logo|check|sitemap|scroll|next|previous|title)/i.test(src) || /\.svg(?:\?|$)/i.test(src)
    }))
    .filter(group => group.count > 1)
    .sort((a, b) => b.count - a.count);

  const duplicatePages = [...groupBy(pages.filter(page => page.textLength > 100), page => page.textHash).values()]
    .filter(group => group.length > 1)
    .map(group => group.map(page => page.finalUrl));

  const hrefGroups = [...groupBy(discoveredLinks.filter(link => link.resolved), link => `${link.source}|${link.resolved}`).entries()]
    .map(([, links]) => ({
      source: links[0].source, target: links[0].resolved,
      labels: [...new Set(links.map(link => link.text).filter(Boolean))]
    }))
    .filter(group => group.labels.length >= 3)
    .sort((a, b) => b.labels.length - a.labels.length);

  const missingAlt = imageUsages.filter(image => image.alt === null || image.alt.trim() === '');
  const zeroSizeImages = imageUsages.filter(image => !image.width || !image.height);
  const titleGroups = [...groupBy(pages.filter(page => page.title), page => page.title).entries()]
    .map(([title, matches]) => ({ title, pages: matches.map(page => page.finalUrl) }))
    .filter(group => group.pages.length > 1);
  const missingDescriptions = pages.filter(page => !page.description).map(page => page.finalUrl);
  const missingCanonicals = pages.filter(page => !page.canonical).map(page => page.finalUrl);
  const h1Issues = pages.map(page => ({
    page: page.finalUrl,
    h1s: page.headings.filter(heading => heading.level === 1).map(heading => heading.text)
  })).filter(item => item.h1s.length !== 1);
  const languageMismatches = scrapedPages.map(page => {
    const letters = (page.text.match(/[A-Za-z가-힣]/g) || []).length;
    const korean = (page.text.match(/[가-힣]/g) || []).length;
    return { page: page.url, htmlLang: page.htmlLang, koreanLetterRatio: letters ? korean / letters : 0 };
  }).filter(item => /^(ko|kor)/i.test(item.htmlLang) && item.koreanLetterRatio < 0.1);
  const brandingMismatches = scrapedPages.filter(page => /SNT\s+Motiv/i.test(page.text)).map(page => page.url);

  const report = {
    generatedAt: new Date().toISOString(), startUrl: START_URL, allowedHost, maxPages: MAX_PAGES,
    summary: {
      pagesCrawled: pages.length, linksFound: discoveredLinks.length, uniqueTargetsChecked: checkedTargets.length,
      brokenLinkOccurrences: brokenLinks.length, emptyOrPlaceholderLinks: emptyLinks.length,
      repeatedImageSources: repeatedImages.length, missingAltOccurrences: missingAlt.length,
      zeroSizeImageOccurrences: zeroSizeImages.length, duplicatePageGroups: duplicatePages.length,
      multiLabelSameTargetGroups: hrefGroups.length,
      missingMetaDescriptions: missingDescriptions.length, missingCanonicals: missingCanonicals.length,
      h1StructureIssues: h1Issues.length, languageMismatchPages: languageMismatches.length,
      sntMotivBrandingPages: brandingMismatches.length,
      consoleErrorCount: pages.reduce((sum, page) => sum + page.consoleErrors.length + page.pageErrors.length, 0),
      failedRequestCount: pages.reduce((sum, page) => sum + page.failedRequests.length, 0)
    },
    pages, redirects, brokenLinks, emptyLinks, repeatedImages, duplicatePages, multiLabelSameTarget: hrefGroups,
    missingAlt, zeroSizeImages, duplicateTitles: titleGroups, missingDescriptions, missingCanonicals,
    h1Issues, languageMismatches, brandingMismatches, checkedTargets
  };

  await fs.writeFile(path.join(OUTPUT_DIR, 'audit.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, 'scraped-content.json'), JSON.stringify(scrapedPages, null, 2));
  await fs.writeFile(path.join(DATA_DIR, 'scraped-content.json'), JSON.stringify(scrapedPages, null, 2));

  const lines = [
    '# SNT Defense Website Audit', '',
    `Generated: ${report.generatedAt}`, `Start URL: ${START_URL}`, '',
    '## Summary', '',
    ...Object.entries(report.summary).map(([key, value]) => `- ${key}: ${value}`), '',
    '## Redirects', '',
    ...(redirects.length ? redirects.map(item => `- **${item.status ?? 'unknown'}** ${item.source} → ${item.destination}`) : ['- None detected']), '',
    '## Broken links', '',
    ...(brokenLinks.length ? brokenLinks.map(item => `- **${item.status ?? 'ERROR'}** ${item.source} → ${item.resolved} (${item.text || 'no link text'})`) : ['- None detected']), '',
    '## Empty or placeholder links', '',
    ...(emptyLinks.length ? emptyLinks.map(item => `- ${item.source}: \`${item.href || '(empty)'}\` (${item.text || 'no link text'})`) : ['- None detected']), '',
    '## Many labels pointing to the same target', '',
    ...(hrefGroups.length ? hrefGroups.map(item => `- ${item.source} → ${item.target}: ${item.labels.join(' | ')}`) : ['- None detected']), '',
    '## Repeated images', '',
    ...(repeatedImages.length ? repeatedImages.map(item => `- ${item.likelyUiAsset ? '[shared UI asset]' : '[review content reuse]'} Used ${item.count} times across ${item.pages.length} page(s): ${item.src}`) : ['- None detected']), '',
    '## Duplicate page content', '',
    ...(duplicatePages.length ? duplicatePages.map(group => `- ${group.join(' | ')}`) : ['- None detected']), '',
    '## Missing image alt text', '',
    ...(missingAlt.length ? missingAlt.map(item => `- ${item.page}: ${item.src}`) : ['- None detected']), '',
    '## Images that did not render with intrinsic dimensions', '',
    ...(zeroSizeImages.length ? zeroSizeImages.map(item => `- ${item.page}: ${item.src}`) : ['- None detected']), '',
    '## Metadata and page structure', '',
    ...missingDescriptions.map(page => `- Missing meta description: ${page}`),
    ...missingCanonicals.map(page => `- Missing canonical URL: ${page}`),
    ...h1Issues.map(item => `- Expected one H1 but found ${item.h1s.length}: ${item.page} (${item.h1s.join(' | ') || 'none'})`), '',
    '## Language and branding', '',
    ...languageMismatches.map(item => `- Korean-language document contains only ${(item.koreanLetterRatio * 100).toFixed(1)}% Korean letters: ${item.page}`),
    ...brandingMismatches.map(page => `- SNT Defense page contains SNT Motiv branding/content: ${page}`), '',
    '## Console and page errors', '',
    ...pages.flatMap(page => [...page.consoleErrors, ...page.pageErrors].map(error => `- ${page.finalUrl}: ${error}`)), '',
    '## Failed network requests', '',
    ...pages.flatMap(page => page.failedRequests.map(item => `- ${page.finalUrl}: ${item.method} ${item.url} — ${item.error}`)), ''
  ];
  await fs.writeFile(path.join(OUTPUT_DIR, 'REPORT.md'), lines.join('\n'));
  await fs.writeFile(path.join(DOCS_DIR, 'site-audit.md'), lines.join('\n'));
  await browser.close();
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Reports written to ${OUTPUT_DIR}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
