const { chromium } = require(
  process.env.AKIBUSINESS_PLAYWRIGHT_PATH || "playwright",
);
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
let server, browser;
const html = `<!doctype html><html data-theme="dark"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/rotas.css"><style>body{margin:0;padding:12px}.panel{width:100%;box-sizing:border-box}#app{width:100%}</style><div id="app"></div><script src="/assets/rotas-core.js"></script><script src="/assets/rotas.js"></script><script>
window.scope={workspace:'one',user:'owner',locale:new URLSearchParams(location.search).get('locale')||'en'};
window.state={manage:true,data:{settings:{title:'Bar rota',timezone:'Europe/Madrid',timeFormat:'24'},staff:[],shifts:[],absences:[],templates:[]},published:null,revision:0,members:[{profileId:'staff-user',name:'Gmail staff'}]};window.calls=[];window.downloads=[];window.errors=[];
window.rpc=async(name,args)=>{calls.push({name,args});if(name==='crm_rota_save'){if(args.p_revision!==state.revision)return{error:{message:'Rota changed',code:'40001'}};AkiRotasCore.validate(args.p_data);if(args.p_publish&&AkiRotasCore.conflicts(args.p_data).length)return{error:{message:'Resolve conflicts'}};state.data=structuredClone(args.p_data);state.revision++;if(args.p_publish){state.published=structuredClone(state.data);state.publishedAt='2026-10-24T12:00Z';}}return{data:structuredClone(state)}};
window.repaint=()=>{const saved=controller?.capture();document.querySelector('#app').innerHTML=controller.render();controller.restore(saved);};let controller=window.controller=AkiRotas.create({scope:()=>scope,client:()=>({rpc}),refresh:()=>repaint(),download:(...args)=>downloads.push(args)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-rota-action]');if(b)controller.action(b.dataset.rotaAction,b.dataset.id).catch(e=>errors.push(e.message))});document.addEventListener('submit',e=>{if(e.target.matches('[data-rota-form]')){e.preventDefault();controller.submit(e.target).catch(e=>errors.push(e.message))}});document.addEventListener('change',e=>{try{controller.change(e.target)}catch(e){errors.push(e.message)}});document.addEventListener('input',e=>{if(e.target.closest('[data-rota-form]'))controller.markDirty()});controller.load();
</script></html>`;
(async () => {
  server = http
    .createServer((req, res) => {
      const url = new URL(req.url, "http://local");
      if (url.pathname === "/") {
        res.setHeader("content-type", "text/html");
        return res.end(html);
      }
      const file = path.resolve(root, "." + url.pathname);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end();
      }
      try {
        const value = fs.readFileSync(file);
        res.setHeader(
          "content-type",
          file.endsWith(".js")
            ? "text/javascript"
            : file.endsWith(".css")
              ? "text/css"
              : "text/html",
        );
        res.end(value);
      } catch {
        res.writeHead(404);
        res.end();
      }
    })
    .listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
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
      { width: 1440, height: 900 },
    ])
      for (const theme of ["dark", "light"]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("dialog", (d) => d.accept());
        await page.goto(
          "http://127.0.0.1:" + server.address().port + "/?locale=" + locale,
        );
        await page
          .locator('[data-rota-form="linked"]')
          .waitFor({ state: "attached" });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        await page
          .locator(".rota-block")
          .filter({ has: page.locator('[data-rota-form="linked"]') })
          .locator("summary")
          .click();
        await page.locator('[data-rota-form="linked"] button').click();
        await page.waitForFunction(() => state.data.staff.length === 1);
        const staff = page.locator('[data-rota-form="staff"]');
        await staff.locator('[name="name"]').fill("Manual Alex");
        await staff.locator('[name="department"]').fill("Bar");
        await staff.locator("button").click();
        await page.waitForFunction(() => state.data.staff.length === 2);
        const shift = page.locator('[data-rota-form="shift"]');
        await shift.locator("xpath=..").locator("summary").click();
        await shift.locator('[name="date"]').fill("2026-10-24");
        await shift.locator('[name="start"]').fill("22:00");
        await shift.locator('[name="endDate"]').fill("2026-10-25");
        await shift.locator('[name="end"]').fill("06:00");
        await shift.locator('[name="breakMinutes"]').fill("30");
        await shift.locator('[name="through"]').fill("2026-10-25");
        await shift.locator('[name="role"]').fill("Bar");
        await shift.locator('[name="notes"]').fill("Keys");
        await shift.locator('button[type="submit"],button:not([type])').click();
        await page.waitForFunction(() => state.data.shifts.length === 2);
        await page.locator('[data-rota-filter="from"]').fill("2026-10-24");
        await page.locator('[data-rota-filter="through"]').fill("2026-10-30");
        await page.locator('[data-rota-action="publish"]').click();
        await page.waitForFunction(() => state.published?.shifts.length === 2);
        await page.locator('[data-rota-action="edit"]').first().click();
        await shift.locator('[name="notes"]').fill("Unsaved notes");
        await page.evaluate(() => repaint());
        assert.equal(
          await shift.locator('[name="notes"]').inputValue(),
          "Unsaved notes",
        );
        await shift.locator("button:not([type])").click();
        await page.waitForFunction(
          () => state.data.shifts[0].notes === "Unsaved notes",
        );
        assert.equal(
          await page.evaluate(() => state.published.shifts[0].notes),
          "Keys",
        );
        await page.locator('[data-rota-filter="view"]').selectOption("grid");
        assert.equal(await page.locator(".rota-grid").count(), 1);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.locator('[data-rota-filter="view"]').selectOption("list");
        await page.locator('[data-rota-action="csv"]').click();
        await page.locator('[data-rota-action="ics"]').click();
        assert.equal(await page.evaluate(() => downloads.length), 2);
        assert.equal(await page.evaluate(() => errors.length), 0);
        assert.deepEqual(errors, []);
        await page.keyboard.press("Tab");
        if (viewport.width === 390 && theme === "dark") {
          const dir = process.env.AKIBUSINESS_BROWSER_ARTIFACTS || "/tmp";
          fs.mkdirSync(dir, { recursive: true });
          await page.screenshot({
            path: path.join(dir, "rotas-" + locale + ".png"),
            fullPage: true,
          });
        }
        checks++;
        await page.close();
      }
  console.log(
    "PASS Rotas: " +
      checks +
      " language/viewport/theme combinations; Teams + manual staff, overnight recurrence, publishing, edit isolation, form preservation, grid, exports, no page overflow",
  );
  await browser.close();
  server.close();
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  server?.close();
  process.exit(1);
});
