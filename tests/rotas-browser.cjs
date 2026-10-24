/* Run the real AkiBusiness app shell with an isolated, in-memory rota RPC. */
const { chromium } = require(
  process.env.AKIBUSINESS_PLAYWRIGHT_PATH || "playwright",
);
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  app = fs.readFileSync(path.join(root, "assets/app-v32.js"), "utf8");
let server, browser, currentPage;
const fixture = `
window.fixture={manage:true,data:{settings:{title:'Luna Social Club',timezone:'Europe/Madrid',timeFormat:'24'},staff:[],shifts:[],absences:[],templates:[]},published:null,revision:0,members:[{profileId:'staff-user',name:'Sofia Martin'}]};window.rotaCalls=[];window.rotaDownloads=[];
window.rotaRPC=async(name,args)=>{rotaCalls.push({name,args});if(name==='crm_rota_save'){if(args.p_revision!==fixture.revision)return{error:{message:'Rota changed',code:'40001'}};AkiRotasCore.validate(args.p_data);if(args.p_publish&&AkiRotasCore.conflicts(args.p_data).length)return{error:{message:'Resolve conflicts'}};fixture.data=structuredClone(args.p_data);fixture.revision++;if(args.p_publish){fixture.published=structuredClone(fixture.data);fixture.publishedAt='2026-10-24T12:00Z';}}return{data:structuredClone(fixture)}};
`;
const seam = `
  authUser={id:'fixture-owner',email:'operator@example.invalid'};authRole='administrator';state=seedState();state.currentUserId=authUser.id;
  state.workspace={...state.workspace,id:'fixture-workspace',name:'Luna Social Club',role:'owner',canAdminister:true,canOperate:true,canExport:true};
  state.employees=[{id:authUser.id,name:'Alex',role:'Owner',department:'Management'}];state.settings.locale=new URLSearchParams(location.search).get('locale')||'en';state.settings.theme=new URLSearchParams(location.search).get('theme')||'dark';ui.route='rotas';
  getSupabaseClient=()=>({rpc:window.rotaRPC});downloadBlob=(...args)=>window.rotaDownloads.push(args);
  window.__rotaUI={paint:render,controller:()=>getRotas()};render();
})();`;
assert.match(app, /  boot\(\);\s*\}\)\(\);\s*$/);
const testApp = app.replace(/  boot\(\);\s*\}\)\(\);\s*$/, seam);
function serve(req, res) {
  const url = new URL(req.url, "http://local");
  let pathname = url.pathname === "/" ? "/login.html" : url.pathname;
  if (pathname === "/assets/app-v32.js") {
    res.setHeader("content-type", "text/javascript");
    return res.end(fixture + testApp);
  }
  if (pathname === "/assets/supabase.js" || pathname === "/config.js") {
    res.setHeader("content-type", "text/javascript");
    return res.end(
      "window.AKIHQ_CONFIG={};window.supabase={createClient:()=>null};",
    );
  }
  const file = path.resolve(root, "." + pathname);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    res.setHeader(
      "content-type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(fs.readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
}
const screenshots =
  process.env.AKIBUSINESS_BROWSER_ARTIFACTS || "/tmp/rota-planner-browser";
fs.mkdirSync(screenshots, { recursive: true });
const close = async (page) => {
  await page.locator('.rp-drawer [data-rota-action="close-panel"]').click();
  await page.locator("dialog[open]").waitFor({ state: "detached" });
};
(async () => {
  server = http.createServer(serve).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  let checks = 0;
  for (const locale of ["en", "es"])
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1536, height: 864 },
    ])
      for (const theme of ["dark", "light"]) {
        const page = (currentPage = await browser.newPage({
          viewport,
          serviceWorkers: "block",
        }));
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("dialog", (d) => d.accept());
        await page.route("**/*", (route) =>
          new URL(route.request().url()).origin === base
            ? route.continue()
            : route.abort(),
        );
        await page.goto(
          base + "/?locale=" + locale + "&theme=" + theme + "#/rotas",
        );
        await page.locator(".rp-empty").waitFor();
        assert.equal(await page.locator(".rp-date-picker[open]").count(), 0);
        assert.equal(await page.locator("dialog[open]").count(), 0);
        assert(
          !(await page
            .locator(".rp")
            .innerText()
            .then((s) => s.includes("Times and totals use"))),
        );
        await page.screenshot({
          path: path.join(
            screenshots,
            `empty-${locale}-${theme}-${viewport.width}.png`,
          ),
        });
        await page.locator('.rp-empty [data-rota-action="open-staff"]').click();
        await page.locator("dialog[open]").waitFor();
        await page.locator('[data-rota-form="linked"] button').click();
        await page.waitForFunction(() => fixture.data.staff.length === 1);
        await page
          .locator('[data-rota-action="staff-tab"][data-id="manual"]')
          .click();
        const staff = page.locator('[data-rota-form="staff"]');
        await staff.locator('[name="name"]').fill("Alex Ashing");
        await staff.locator('[name="department"]').fill("Bar");
        await staff.locator("button").click();
        await page.waitForFunction(() => fixture.data.staff.length === 2);
        await close(page);
        const datePicker = page.locator(".rp-date-picker");
        await datePicker.locator("summary").click();
        await page.locator('[data-rota-filter="from"]').fill("2026-10-19");
        if (await datePicker.evaluate((d) => d.open))
          await datePicker.locator("summary").click();
        // Click an actual empty cell; mobile uses a day header, desktop uses staff/date cells.
        const newShift =
          viewport.width <= 650
            ? page.locator(
                '.rp-mobile [data-rota-action="new-shift"][data-date="2026-10-24"]',
              )
            : page
                .locator(
                  '.rp-table td[data-date="2026-10-24"] [data-rota-action="new-shift"]',
                )
                .first();
        await newShift.click();
        await page.locator("dialog[open]").waitFor();
        const shift = page.locator('[data-rota-form="shift"]');
        assert.equal(
          await shift.locator('[name="date"]').inputValue(),
          "2026-10-24",
        );
        await shift.locator('[name="start"]').fill("22:00");
        await shift
          .locator('[data-rota-action="duration"][data-id="8"]')
          .click();
        assert.equal(await shift.locator('[name="end"]').inputValue(), "06:00");
        assert.equal(
          await shift.locator('[name="endDate"]').inputValue(),
          "2026-10-25",
        );
        await shift.locator('[name="breakMinutes"]').fill("30");
        await shift.locator('[name="role"]').fill("Bar service");
        await shift.locator(".rp-advanced").last().locator("summary").click();
        await shift.locator('[name="through"]').fill("2026-10-25");
        await shift.locator('[type="submit"]').click();
        await page.waitForFunction(() => fixture.data.shifts.length === 2);
        await page.locator("dialog[open]").waitFor({ state: "detached" });
        await page.locator('[data-rota-action="publish"]').click();
        await page.waitForFunction(
          () => fixture.published?.shifts.length === 2,
        );
        const firstShift = page
          .locator(
            viewport.width <= 650
              ? ".rp-mobile .rp-shift"
              : ".rp-table .rp-shift",
          )
          .first();
        await firstShift.click();
        await shift.locator(".rp-advanced").first().locator("summary").click();
        await shift.locator('[name="notes"]').fill("Keep my draft");
        await page.evaluate(() => __rotaUI.paint());
        assert.equal(
          await shift.locator('[name="notes"]').inputValue(),
          "Keep my draft",
        );
        // Native dialog keeps keyboard focus within the side editor.
        await shift.locator('[type="submit"]').focus();
        await page.keyboard.press("Tab");
        assert.equal(
          await page
            .locator("dialog[open]")
            .evaluate((d) => d.contains(document.activeElement)),
          true,
        );
        await shift.locator('[type="submit"]').click();
        await page.waitForFunction(
          () => fixture.data.shifts[0].notes === "Keep my draft",
        );
        assert.equal(
          await page.evaluate(() => fixture.published.shifts[0].notes),
          "",
        );
        if (viewport.width > 650) {
          const card = page.locator(".rp-table .rp-shift").first(),
            target = page
              .locator('.rp-table td[data-date="2026-10-23"]')
              .last();
          await card.dragTo(target);
          await page.waitForFunction(() =>
            fixture.data.shifts.some((s) => s.date === "2026-10-23"),
          );
          await page.locator('[data-rota-action="undo-move"]').click();
          await page.waitForFunction(
            () => !fixture.data.shifts.some((s) => s.date === "2026-10-23"),
          );
        }
        await page
          .locator('[data-rota-action="set-view"][data-id="list"]')
          .click();
        await page.locator(".rp-agenda:not(.rp-mobile)").waitFor();
        await page
          .locator('[data-rota-action="set-view"][data-id="grid"]')
          .click();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        if (viewport.width <= 650) {
          await page.locator(".rp-menu summary").click();
          await page.locator(".rp-mobile-export").click();
        } else
          await page
            .locator('.rp-header [data-rota-action="open-export"]')
            .click();
        await page.locator('[data-rota-action="csv"]').click();
        await page.locator('[data-rota-action="ics"]').click();
        assert.equal(await page.evaluate(() => rotaDownloads.length), 2);
        await close(page);
        await page.evaluate(
          () => (document.querySelector("#page-content").scrollTop = 0),
        );
        await page.screenshot({
          path: path.join(
            screenshots,
            `planner-${locale}-${theme}-${viewport.width}.png`,
          ),
        });
        assert.deepEqual(errors, []);
        checks++;
        await page.close();
      }
  console.log(
    `PASS: ${checks} real-app shell cases; empty state, Teams/manual staff, click-to-create, overnight presets, native dialogs, draft preservation, publish, drag/undo, mobile agenda, exports.`,
  );
  await browser.close();
  server.close();
})().catch(async (e) => {
  console.error(e);
  if (currentPage) {
    await currentPage
      .screenshot({ path: path.join(screenshots, "failure.png") })
      .catch(() => {});
    console.error(
      await currentPage
        .evaluate(() => ({
          text: document.querySelector(".rp")?.innerText.slice(-1500),
          toasts: document.querySelector("#portal")?.innerText,
        }))
        .catch(() => null),
    );
  }
  await browser?.close();
  server?.close();
  process.exit(1);
});
