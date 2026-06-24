/**
 * Headless browser smoke test driving the real UI against the emulator.
 * Requires: dev server on :3000 (emulator env) + emulators running + seed run.
 */
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
let pass = 0, fail = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); pass++; };
const bad = (m) => { console.log(`  ✗ ${m}`); fail++; };

const stamp = Date.now();
const uniq = `e2e.${stamp}@example.com`;
const uniqPhone = '+1555' + String(stamp).slice(-7); // unique per run

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // ── Public enrollment form ──────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#fullName');
  (await page.$('h1'))
    && ok('enroll page rendered');

  await page.type('#fullName', 'E2E Tester');
  await page.type('#email', uniq);
  await page.type('#phone', uniqPhone);
  await page.type('#dob', '1992-04-05');
  await page.select('#gender', 'female');
  await page.select('#program', 'data-science');

  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => document.body.innerText.includes('Enrollment Submitted'),
    { timeout: 20000 },
  );
  const refText = await page.evaluate(() => document.body.innerText);
  const m = refText.match(/ENR-\d{4}-\d{5}/);
  if (m) ok(`submission succeeded with reference ${m[0]}`);
  else bad('no enrollment reference shown on success page');

  // ── Duplicate prevention (FR-1.4) ───────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#fullName');
  await page.type('#fullName', 'Dup Tester');
  await page.type('#email', uniq);            // same email as above
  await page.type('#phone', '+15550009999');
  await page.type('#dob', '1990-01-01');
  await page.select('#gender', 'male');
  await page.select('#program', 'web-development');
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => document.body.innerText.toLowerCase().includes('already exists'),
    { timeout: 20000 },
  ).then(() => ok('duplicate email blocked')).catch(() => bad('duplicate email NOT blocked'));

  // ── Admin login + dashboard + table ─────────────────────────────────────
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email');
  await page.type('#email', 'admin@enroll.test');
  await page.type('#password', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => document.body.innerText.includes('Total Enrollments'),
    { timeout: 20000 },
  );
  // The Total card's value is the first .text-3xl element.
  const totalStr = await page.$eval('.text-3xl', (el) => el.textContent?.trim() ?? '');
  if (Number(totalStr) > 0) ok(`dashboard shows ${totalStr} total enrollments`);
  else bad(`dashboard total not shown / zero (got "${totalStr}")`);

  // Enrollments table
  await page.goto(`${BASE}/admin/enrollments`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table tbody tr');
  const rowCount = await page.$$eval('table tbody tr', (rows) =>
    rows.filter((r) => r.querySelectorAll('td').length > 1).length);
  if (rowCount > 0) ok(`enrollments table rendered ${rowCount} rows`);
  else bad('enrollments table empty');

  // Search filter
  await page.type('input[type="search"]', 'E2E Tester');
  await page.waitForFunction(
    () => document.body.innerText.includes('E2E Tester'),
    { timeout: 20000 },
  ).then(() => ok('search found the new enrollment')).catch(() => bad('search failed'));

  if (errors.length) bad(`console/page errors: ${errors.join('; ')}`);
  else ok('no uncaught page errors');

  console.log(`\nResult: ${pass} passed, ${fail} failed`);
} finally {
  await browser.close();
}
process.exit(fail ? 1 : 0);
