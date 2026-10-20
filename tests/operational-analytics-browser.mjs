import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root=path.resolve(import.meta.dirname,"..");
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(!file.startsWith(root+path.sep))throw Error();const data=await fs.readFile(file);res.setHeader("Content-Type",({".html":"text/html",".js":"text/javascript",".css":"text/css"})[path.extname(file)]||"application/octet-stream");res.end(data);}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const output=path.join(root,"artifacts/operational-analytics");await fs.mkdir(output,{recursive:true});
const evidence=[];
let browser;
try{
browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
for(const [width,height] of [[390,844],[820,1180],[1180,820],[1280,800]])for(const language of ["en","es"])for(const theme of ["dark","light"]){
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on("pageerror",error=>errors.push(String(error)));
await page.goto(`http://127.0.0.1:${server.address().port}/tests/fixtures/operational-analytics.html?lang=${language}&theme=${theme}`);
await page.locator(".oa-tabs").waitFor();assert.equal(await page.locator(".oa-workspace").count(),1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
for(const item of await page.locator(".oa-controls button,.oa-tabs button,.oa-controls select,.oa-controls input").all()){const box=await item.boundingBox();assert(box&&box.height>=43.5,JSON.stringify(box));}
await page.locator('[data-tab="inventory"]').click();assert((await page.locator(".oa-detail").innerText()).includes("—"));
await page.locator('[data-tab="employees"]').click();assert((await page.locator(".oa-detail").innerText()).includes("Synthetic team member"));
await page.locator('[data-change="operational-analytics-days"]').selectOption("7");await page.waitForFunction(()=>qa.calls.some(call=>call.args.p_days===7));
await page.locator('[data-action="operational-analytics-export"]').click();await page.waitForFunction(()=>qa.downloads.length===1);
const payload=JSON.parse(await page.evaluate(()=>qa.downloads[0].content));assert.equal(payload.export,true);assert.equal(payload.inventory.snapshots.closing.currencies[0].known_value_cents,"80000.125000");
await page.locator('[data-tab="sales"]').focus();await page.keyboard.press("Tab");assert(await page.evaluate(()=>document.activeElement!==document.body));
await page.locator('[data-tab="sales"]').click();const filename=`${language}-${theme}-${width}x${height}.png`;await page.screenshot({path:path.join(output,filename),fullPage:true});
await page.evaluate(()=>qa.deny=true);await page.locator('[data-action="refresh-analytics"]').click();await page.getByRole("status").waitFor();assert.equal(await page.locator(".oa-scroll").count(),0);assert.deepEqual(errors,[]);
evidence.push({locale:language,theme,width,height,screenshot:filename,status:"passed",scope:"synthetic real-component acceptance"});await page.close();
}
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(output,"evidence.json"),JSON.stringify(evidence,null,2));}
console.log(`${evidence.length} operational report browser combinations passed`);
