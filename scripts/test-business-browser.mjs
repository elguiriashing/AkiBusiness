import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.BUSINESS_TEST_URL || "http://127.0.0.1:3013";
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
await mkdir("test-results/business", { recursive: true });
let cases = 0;
try {
  for (const locale of ["en", "es"])
    for (const width of [390, 1440])
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
        });
        const page = await context.newPage();
        const response = await page.goto(`${base}/${locale}/business`, {
          waitUntil: "networkidle",
        });
        assert.equal(response.status(), 200);
        assert.match(page.url(), new RegExp(`/${locale}/auth\\?next=`));
        assert.equal(await page.title(), "AkiBusiness");
        assert.equal(await page.locator("html").getAttribute("lang"), locale);
        assert.equal(
          await page.locator("body").getAttribute("data-product"),
          "akibusiness",
        );
        assert.equal(await page.locator('input[name="email"]').count(), 1);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        );
        const recovery = await page.goto(
          `${base}/${locale}/auth?mode=recover&next=/${locale}/business/venue/123`,
          { waitUntil: "networkidle" },
        );
        assert.equal(recovery.status(), 200);
        assert.equal(
          await page.locator('input[name="next"]').inputValue(),
          `/${locale}/business/venue/123`,
        );
        const manifest = await context.request.get(
          `${base}/manifest.webmanifest`,
        );
        assert.equal((await manifest.json()).name, "AkiBusiness");
        const health = await context.request.get(`${base}/api/health`);
        assert.equal((await health.json()).product, "akibusiness");
        const blocked = await context.request.post(
          `${base}/api/stripe/webhook`,
          { data: {} },
        );
        assert.equal(blocked.status(), 404);
        await page.screenshot({
          path: `test-results/business/${locale}-${width}-${theme}.png`,
          fullPage: true,
        });
        await context.close();
        cases++;
      }
  console.log(
    `PASS ${cases} local anonymous EN/ES mobile/desktop light/dark cases. Authenticated/provider acceptance remains pending.`,
  );
} finally {
  await browser.close();
}
