"use strict";
const { chromium } = require(
  process.env.AKIBUSINESS_PLAYWRIGHT_PATH ||
    require("node:path").resolve(
      __dirname,
      "../../akipasa/node_modules/@playwright/test",
    ),
);
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  output = path.join(root, "test-results/native-account");
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  let file = new URL(req.url, "http://fixture").pathname;
  if (file === "/account" || file === "/membership") file += ".html";
  const target = path.resolve(root, "." + file);
  if (!target.startsWith(root + path.sep)) {
    res.writeHead(404).end();
    return;
  }
  try {
    res.setHeader(
      "content-type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".svg") ? "image/svg+xml" : "text/html",
    );
    res.end(fs.readFileSync(target));
  } catch {
    res.writeHead(404).end();
  }
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser,
    cases = 0;
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.AKIBUSINESS_CHROMIUM_PATH || undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    for (const locale of ["en", "es"])
      for (const theme of ["light", "dark"])
        for (const viewport of [
          { width: 360, height: 800 },
          { width: 768, height: 1024 },
          { width: 1440, height: 900 },
        ]) {
          const context = await browser.newContext({
              viewport,
              colorScheme: theme,
              serviceWorkers: "block",
            }),
            page = await context.newPage(),
            errors = [],
            external = [];
          page.on("pageerror", (e) => errors.push(e.message));
          await context.addInitScript(() => {
            window.__mutations = [];
            window.supabase = {
              createClient: () => ({
                auth: {
                  getUser: async () => ({
                    data: {
                      user: {
                        id: "fixture-owner",
                        email: "fixture@example.test",
                      },
                    },
                  }),
                  getSession: async () => ({
                    data: { session: { access_token: "fixture-token" } },
                  }),
                  signOut: async () => ({}),
                  updateUser: async () => ({}),
                  resetPasswordForEmail: async () => ({}),
                },
                from: () => {
                  let update;
                  const q = {
                    select: () => q,
                    eq: (_key, id) => {
                      if (id !== "fixture-owner") throw Error("Wrong identity");
                      return q;
                    },
                    update: (value) => {
                      update = value;
                      return q;
                    },
                    maybeSingle: async () => {
                      if (update) {
                        window.__mutations.push(update);
                        return { data: { id: "fixture-owner" } };
                      }
                      return {
                        data: {
                          display_name: "Shared member",
                          username: "shared_member",
                          bio: "Fixture",
                          phone: "123",
                          locality: "Fuengirola",
                          province: "Málaga",
                          preferred_locale: document.documentElement.lang,
                          profile_visibility: "private",
                          contact_visibility: "members",
                          terms_version: "2026-07-23",
                        },
                      };
                    },
                  };
                  return q;
                },
                rpc: async (name) =>
                  name === "list_managed_operating_locations"
                    ? {
                        data: [
                          {
                            id: "private-fixture",
                            name: "Private workplace",
                            role: "owner",
                          },
                        ],
                      }
                    : { data: { can_operate: true, tool_keys: ["pos"] } },
              }),
            };
          });
          await context.route("**/*", (route) => {
            const url = new URL(route.request().url());
            if (url.origin === base) {
              if (url.pathname === "/config.js")
                return route.fulfill({
                  contentType: "text/javascript",
                  body: 'window.AKIHQ_CONFIG={SUPABASE_URL:"https://fixture.invalid",SUPABASE_ANON_KEY:"fixture-public"};',
                });
              if (url.pathname === "/assets/supabase.js")
                return route.fulfill({
                  contentType: "text/javascript",
                  body: "",
                });
              return route.continue();
            }
            if (url.href === "https://akipasa.com/api/account/portal")
              return route.fulfill({
                contentType: "application/json",
                headers: {
                  "Access-Control-Allow-Origin": base,
                  "Access-Control-Allow-Headers": "authorization,content-type",
                  "Access-Control-Allow-Methods": "POST, OPTIONS",
                },
                body: JSON.stringify({ subscriptions: [], hasCustomer: false }),
              });
            external.push(url.href);
            return route.abort();
          });
          await page.goto(`${base}/membership?locale=${locale}`);
          const choose = page.locator("[data-tier-cta=standard]");
          await choose.click();
          await page.waitForURL("**/account?**");
          await page
            .getByRole("heading", {
              name:
                locale === "es"
                  ? "Tu cuenta AkiBusiness"
                  : "Your AkiBusiness account",
              exact: true,
            })
            .waitFor();
          assert.equal(new URL(page.url()).origin, base);
          assert.equal(
            new URL(page.url()).searchParams.get("tier"),
            "standard",
          );
          assert.equal(new URL(page.url()).searchParams.get("locale"), locale);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
          const dashboard = page.getByRole("link", {
            name: locale === "es" ? "Abrir mi panel" : "Open my dashboard",
            exact: true,
          });
          assert.equal(
            new URL(await dashboard.getAttribute("href"), base).origin,
            base,
          );
          assert.equal(
            new URL(
              await dashboard.getAttribute("href"),
              base,
            ).searchParams.get("workspace"),
            "private-fixture",
          );
          await page.locator('[data-account-nav="profile"]').click();
          await page
            .getByLabel(locale === "es" ? "Nombre" : "Display name", {
              exact: true,
            })
            .fill("Updated fixture");
          await page
            .getByRole("button", {
              name:
                locale === "es"
                  ? "Guardar perfil compartido"
                  : "Save shared profile",
              exact: true,
            })
            .click();
          await page.waitForFunction(() => window.__mutations.length === 1);
          assert.equal(
            await page.evaluate(() => window.__mutations[0].display_name),
            "Updated fixture",
          );
          await page.locator('[data-account-nav="workspace"]').click();
          assert.ok(
            await page
              .getByText(
                locale === "es"
                  ? "Crear ubicación operativa privada"
                  : "Create a private operating location",
                { exact: true },
              )
              .isVisible(),
          );
          await page.locator('[data-account-nav="workspace"]').focus();
          await page.keyboard.press("ArrowRight");
          assert.equal(await page.locator('[data-account-nav="membership"]').getAttribute("aria-selected"), "true");
          await page.locator('[data-account-nav="profile"]').click();
          const draft = page.getByLabel(locale === "es" ? "Nombre" : "Display name", {exact: true});
          await draft.fill("Unsaved draft");
          await page.locator("#theme").click();
          assert.equal(await draft.inputValue(), "Unsaved draft");
          await page.locator("#language").click();
          assert.equal(await page.locator('[name="displayName"]').inputValue(), "Unsaved draft");
          await page.locator("#language").click();
          await page.locator("#theme").click();
          for (const section of ["workspace", "membership", "profile", "security"]) {
            await page.locator(`[data-account-nav="${section}"]`).click();
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          }
          await page.locator('[data-account-nav="workspace"]').click();
          assert.equal(await page.locator("#brand img").evaluate(img => img.complete && img.naturalWidth > 0), true);
          await page.screenshot({
            path: path.join(output, `${locale}-${theme}-${viewport.width}.png`),
            fullPage: true,
          });
          assert.deepEqual(errors, []);
          assert.deepEqual(external, []);
          await context.close();
          cases++;
        }
    fs.writeFileSync(
      path.join(output, "receipt.json"),
      JSON.stringify(
        {
          cases,
          status: "passed",
          scope:
            "Membership CTA → native account → authorized local dashboard target; disposable profile/location/billing fixtures",
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ cases, status: "passed" }));
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
