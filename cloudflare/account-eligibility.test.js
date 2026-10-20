import {test} from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { requireGatewayAccountEligibility } from "./account-eligibility.js";
const require=createRequire(import.meta.url);
const browser=require("../assets/account-eligibility.js");
const env={AKISUITE_ONBOARDING_SCHEMA_READY:"true",SUPABASE_URL:"https://example.supabase.co",SUPABASE_PUBLISHABLE_KEY:"publishable-test"};
const request=(path="/api/social/overview",token="caller-test-token")=>new Request(`https://gateway.test${path}`,{headers:token?{authorization:`Bearer ${token}`}:{}});
test("disabled rollout preserves old accounts without provider calls",async()=>{
 assert.equal(await requireGatewayAccountEligibility(request(),{},()=>{throw new Error("must not call");}),null);
 assert.equal(await browser.allowed(null,false),true);
});
test("uses only the caller token and denies restricted accounts before integrations",async()=>{
 let seen;
 const response=await requireGatewayAccountEligibility(request(),env,async(url,options)=>{seen={url,options};return Response.json(false);});
 assert.equal(response.status,403);assert.deepEqual(await response.json(),{ok:false,error:"account_completion_required"});
 assert.equal(seen.options.headers.authorization,"Bearer caller-test-token");assert.equal(seen.options.body,"{}");assert.match(seen.url,/rpc\/account_features_allowed$/);
});
test("allows complete/exempt authoritative account access",async()=>{
 assert.equal(await requireGatewayAccountEligibility(request(),env,async()=>Response.json(true)),null);
 assert.equal(await browser.allowed({rpc:async()=>({data:true,error:null})},true),true);
});
test("fails closed for invalid, missing or unavailable eligibility",async()=>{
 for(const response of [Response.json({allowed:true}),new Response(null,{status:500})]) assert.equal((await requireGatewayAccountEligibility(request(),env,async()=>response)).status,503);
 assert.equal((await requireGatewayAccountEligibility(request(),env,async()=>{throw new Error("offline");})).status,503);
 assert.equal((await requireGatewayAccountEligibility(request(),env,async()=>new Response(null,{status:401}))).status,401);
 await assert.rejects(browser.allowed({rpc:async()=>({data:null,error:{message:"down"}})},true),/unavailable/);
});
test("preserves privacy/support/health and lets endpoint authentication reject missing tokens",async()=>{
 for(const path of ["/api/privacy/subject-export","/api/support/requests","/api/webhooks/provider","/api/health"]) assert.equal(await requireGatewayAccountEligibility(request(path),env,()=>{throw new Error("must not call");}),null);
 assert.equal(await requireGatewayAccountEligibility(request("/api/social/overview",""),env,()=>{throw new Error("must not call");}),null);
});
test("browser cannot release a restricted account or construct arbitrary external returns",async()=>{
 assert.equal(await browser.allowed({rpc:async()=>({data:false,error:null})},true),false);
 assert.equal(browser.completionUrl("es"),"https://akipasa.com/es/onboarding");
 assert.equal(browser.completionUrl("https://evil.test"),"https://akipasa.com/en/onboarding");
});

test("actual static bootstrap withholds workspace data and preserves restricted sign-out",async()=>{
 const {readFileSync}=await import("node:fs");const {JSDOM}=await import("jsdom");const vm=await import("node:vm");
 const source=readFileSync(new URL("../assets/app-v32.js",import.meta.url),"utf8");
 const start=source.indexOf("  async function bootWithSession(session) {");const end=source.indexOf("  async function finishBoot(client) {",start);
 const dom=new JSDOM('<div id="app"></div><div id="portal"></div>',{url:"https://akibusiness.com/?lang=es"});
 let profileReads=0,signout=null,rendered=false;
 const client={rpc:async()=>({data:false,error:null}),from:()=>{profileReads++;throw new Error("must not read profile");},auth:{signOut:async value=>{signout=value;}}};
 const context=vm.createContext({window:{AKIHQ_CONFIG:{ONBOARDING_SCHEMA_READY:true},AkiAccountEligibility:browser},document:dom.window.document,appRoot:dom.window.document.getElementById("app"),portal:dom.window.document.getElementById("portal"),state:{settings:{locale:"es"}},initialSearchParams:new URLSearchParams("lang=es"),getSupabaseClient:()=>client,renderLoginScreen:()=>{rendered=true;},console});
 vm.runInContext(source.slice(start,end)+";globalThis.bootWithSession=bootWithSession;",context);
 await context.bootWithSession({user:{id:"fixture"}});
 assert.equal(profileReads,0);assert.match(dom.window.document.querySelector("h1").textContent,/Completa tu cuenta/);
 assert.equal(dom.window.document.querySelector("a").href,"https://akipasa.com/es/onboarding");
 dom.window.document.getElementById("eligibilitySignOut").click();await new Promise(r=>setImmediate(r));
 assert.equal(signout?.scope,"local");assert.equal(rendered,true);
});

test("operating completion retains only the fixed workspace task and language",()=>{
 const completion=new URL(browser.completionUrl("es","?workspace=target&token=secret&next=https://evil.test&locale=en"));
 const next=new URL(completion.searchParams.get("next"),"https://akipasa.com");
 assert.equal(next.pathname,"/es/account-resume");
 assert.equal(next.searchParams.get("product"),"business");
 assert.equal(next.searchParams.get("path"),"/?workspace=target");
 assert.equal(completion.toString().includes("secret"),false);
 for(const bad of ["?workspace=one&workspace=two","?workspace=https://evil.test","?workspace=%0d%0a"]) {
   const url=new URL(browser.completionUrl("en",bad));
   assert.equal(new URL(url.searchParams.get("next"),"https://akipasa.com").searchParams.get("path"),"/");
 }
});
