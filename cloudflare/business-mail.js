import { z } from "zod";
import { boundedText, privacyRpc, marketingPayload } from "./privacy.js";

// Each location owns a separate, strongly consistent mailbox object. Provider
// secrets and refresh tokens never enter browser storage or workspace snapshots.
const providers = {
  gmail: { prefix: "BUSINESS_GOOGLE", auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send" },
  outlook: { prefix: "BUSINESS_MICROSOFT", auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", token: "https://login.microsoftonline.com/common/oauth2/v2.0/token", scope: "offline_access User.Read Mail.Read Mail.Send" }
};
const providerName = z.enum(["gmail", "outlook"]);
const replySchema = z.object({ id: z.string().min(1).max(1000), text: z.string().trim().min(1).max(20000), requestId: z.string().uuid() }).strict();
const fail = (status, message) => Object.assign(new Error(message), { status });
const json = (data, status = 200) => Response.json(data, { status, headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
const b64 = bytes => btoa(String.fromCharCode(...bytes));
const un64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const url64 = bytes => b64(bytes).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const utf8 = value => new TextEncoder().encode(value);
async function seal(env, value) {
  const raw = un64(env.BUSINESS_MAIL_KEY || "");
  if (raw.length !== 32) throw fail(503, "Mailbox encryption is not configured.");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64(iv), data: b64(new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, utf8(JSON.stringify(value))))) };
}
async function unseal(env, value) {
  const key = await crypto.subtle.importKey("raw", un64(env.BUSINESS_MAIL_KEY), "AES-GCM", false, ["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: un64(value.iv) }, key, un64(value.data))));
}
async function remote(url, options = {}) {
  let response;
  try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000), redirect: "error" }); }
  catch { throw fail(503, "The email provider did not respond. Check its Sent folder before retrying a send."); }
  if (!response.ok) { await response.body?.cancel(); throw fail(response.status === 401 ? 401 : 502, response.status === 401 ? "Reconnect your email account." : "The email provider rejected the request. Check the connection and try again."); }
  const text = await boundedText(response, 1500000);
  return text ? JSON.parse(text) : {};
}
export async function mailAccess(request, env) {
  const workspace = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).parse(request.headers.get("x-workspace-id"));
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw fail(401, "Sign in again.");
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!base.startsWith("https://") || !env.SUPABASE_PUBLISHABLE_KEY) throw fail(503, "Workspace authentication is unavailable.");
  const headers = { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" };
  const user = await remote(`${base}/auth/v1/user`, { headers });
  if (!z.string().uuid().safeParse(user.id).success) throw fail(401, "Invalid session.");
  const access = await remote(`${base}/rest/v1/rpc/crm_workspace_access`, { method: "POST", headers, body: JSON.stringify({ p_workspace: workspace }) });
  if (!access?.tool_keys?.some(tool=>["inbox","marketing"].includes(tool))) throw fail(403, "Inbox or Marketing access is required in this workspace.");
  return { workspace, actor: user.id, manage: access.can_administer === true, write: access.can_operate === true, inbox:access.tool_keys.includes("inbox"), marketing: access.tool_keys.includes("marketing") };
}
export async function handleBusinessMail(request, env) {
  try {
    const url = new URL(request.url), action = url.pathname.split("/").pop();
    if (action === "callback") {
      // The browser completes the exchange with its own authenticated session.
      // No account can be linked by an unauthenticated callback alone.
      const dest = new URL("https://akibusiness.com/login");
      for (const key of ["code", "state", "error"]) {
        const value = url.searchParams.get(key); if (value && value.length <= 4000) dest.searchParams.set(`mail_${key}`, value);
      }
      dest.hash = "/inbox";
      return new Response(null, { status: 303, headers: { location: dest.href, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
    }
    const auth = await mailAccess(request, env);
    if (!env.BUSINESS_MAIL) {
      if(action === "status") return json({ ok: true, configured: false, connected: false, providers: [], canManage:auth.manage });
      throw fail(503,"Business email is not configured.");
    }
    const methods = { status: "GET", messages: "GET", message: "GET", start: "POST", complete: "POST", disconnect: "POST", reply: "POST", campaign: "POST" };
    if (methods[action] !== request.method) throw fail(405, "Unsupported mailbox action.");
    if (["messages","message","reply"].includes(action) && !auth.inbox) throw fail(403,"Inbox access is required to read or reply to mail.");
    if (["start", "complete", "disconnect"].includes(action) && !auth.manage) throw fail(403, "A workspace administrator must manage email connections.");
    if (action === "reply" && !auth.write) throw fail(403, "Your role cannot send email.");
    if (action === "campaign" && (!auth.manage || !auth.write || !auth.marketing)) throw fail(403,"Marketing and administrator access are required.");
    const data = request.method === "GET" ? Object.fromEntries(url.searchParams) : JSON.parse(await boundedText(request, 50000));
    const stub = env.BUSINESS_MAIL.get(env.BUSINESS_MAIL.idFromName(auth.workspace));
    return await stub.fetch(new Request("https://mail.internal/", { method: "POST", body: JSON.stringify({ action, data, auth, origin: url.origin }) }));
  } catch (error) { return json({ ok: false, message: error.status ? error.message : "The mailbox request could not be completed." }, error.status || (error instanceof z.ZodError ? 400 : 503)); }
}

export class BusinessMailbox {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.queue = Promise.resolve(); }
  async fetch(request) {
    // Serialize this object's provider work without the 30-second
    // blockConcurrencyWhile limit. Durable send markers survive object resets.
    const result = this.queue.then(async () => {
      try { return json(await this.handle(await request.json())); }
      catch (error) { return json({ ok: false, message: error.status ? error.message : "Email operation failed. Your draft has been kept." }, error.status || (error instanceof z.ZodError ? 400 : 503)); }
    });
    this.queue = result.then(() => {}, () => {});
    return result;
  }
  async handle({ action, data, auth, origin }) {
    const store = this.ctx.storage, env = this.env;
    const available = Object.entries(providers).filter(([,p]) => env[`${p.prefix}_CLIENT_ID`] && env[`${p.prefix}_CLIENT_SECRET`] && env.BUSINESS_MAIL_KEY).map(([id]) => id);
    if (action === "status") {
      const record = await store.get("account");
      const account = record ? await unseal(env, record) : null;
      return { ok: true, configured: !!available.length, providers: available, connected: !!account, provider: account?.provider, email: account?.email, canManage: auth.manage, canSend: auth.write, marketing: env.BUSINESS_MARKETING_ENABLED === "true" && auth.marketing && auth.manage };
    }
    if (action === "start") {
      const provider = providerName.parse(data.provider), p = providers[provider];
      if (!available.includes(provider)) throw fail(503, "This provider needs its OAuth application configured by AkiBusiness.");
      const state = crypto.randomUUID(), verifier = url64(crypto.getRandomValues(new Uint8Array(32)));
      const redirect = `${origin}/api/business-mail/callback`;
      await store.put("oauth", { state, provider, actor: auth.actor, verifier, redirect, expires: Date.now() + 600000 });
      const params = new URLSearchParams({ client_id: env[`${p.prefix}_CLIENT_ID`], redirect_uri: redirect, response_type: "code", scope: p.scope, state, code_challenge: url64(new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(verifier)))), code_challenge_method: "S256", prompt: "consent" });
      if (provider === "gmail") params.set("access_type", "offline");
      return { ok: true, url: `${p.auth}?${params}`, state };
    }
    if (action === "complete") {
      const pending = await store.get("oauth");
      if (!pending || pending.state !== data.state || pending.actor !== auth.actor || pending.expires < Date.now()) throw fail(409, "This connection request expired or belongs to another account. Start again.");
      await store.delete("oauth");
      const p = providers[pending.provider];
      const tokens = await remote(p.token, { method: "POST", body: new URLSearchParams({ client_id: env[`${p.prefix}_CLIENT_ID`], client_secret: env[`${p.prefix}_CLIENT_SECRET`], grant_type: "authorization_code", code: z.string().min(1).max(4000).parse(data.code), redirect_uri: pending.redirect, code_verifier: pending.verifier }) });
      if (!tokens.refresh_token || !tokens.access_token) throw fail(409, "Offline mailbox access was not granted. Reconnect and approve the requested access.");
      const account = { provider: pending.provider, access: tokens.access_token, refresh: tokens.refresh_token, expires: Date.now() + Number(tokens.expires_in || 3600) * 1000 };
      const profile = await this.api(account, pending.provider === "gmail" ? "/profile" : "?$select=mail,userPrincipalName");
      account.email = z.string().email().parse(profile.emailAddress || profile.mail || profile.userPrincipalName);
      await store.put("account", await seal(env, account));
      return { ok: true, connected: true, email: account.email };
    }
    if (action === "disconnect") { await store.delete(["account", "oauth"]); return { ok: true }; }
    const encrypted = await store.get("account");
    if (!encrypted) throw fail(409, "Connect your business email first.");
    const account = await unseal(env, encrypted);
    if (account.expires < Date.now() + 60000) {
      const p = providers[account.provider];
      const token = await remote(p.token, { method: "POST", body: new URLSearchParams({ client_id: env[`${p.prefix}_CLIENT_ID`], client_secret: env[`${p.prefix}_CLIENT_SECRET`], grant_type: "refresh_token", refresh_token: account.refresh }) });
      account.access = token.access_token; account.refresh = token.refresh_token || account.refresh; account.expires = Date.now() + Number(token.expires_in || 3600) * 1000;
      if (!account.access) throw fail(401, "Reconnect your email account.");
      await store.put("account", await seal(env, account));
    }
    if (action === "messages") {
      if (account.provider === "outlook") {
        const result = await this.api(account, "/mailFolders/inbox/messages?$top=25&$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime%20desc");
        return { ok: true, messages: (result.value || []).map(m => ({ id:m.id, subject:m.subject, from:m.from?.emailAddress?.address, text:m.bodyPreview, at:m.receivedDateTime, unread:!m.isRead })) };
      }
      const result = await this.api(account, "/messages?maxResults=15&labelIds=INBOX");
      const messages = await Promise.all((result.messages || []).map(m => this.message(account, m.id, true)));
      return { ok: true, messages };
    }
    if (action === "message") return { ok: true, message: await this.message(account, z.string().min(1).max(1000).parse(data.id)) };
    if (action === "campaign") {
      if(env.BUSINESS_MARKETING_ENABLED !== "true") throw fail(503,"Marketing delivery is awaiting sender, consent and unsubscribe acceptance.");
      const input=z.object({email:z.string().email().max(320),subject:z.string().trim().min(1).max(300).refine(v=>!/[\r\n]/.test(v)),text:z.string().trim().min(1).max(20000),requestId:z.string().uuid()}).strict().parse(data);
      const publicOrigin=new URL(env.PRIVACY_PUBLIC_ORIGIN || "https://invalid.invalid");
      if(publicOrigin.protocol!=="https:" || publicOrigin.hostname==="invalid.invalid" || publicOrigin.username || publicOrigin.password) throw fail(503,"Configure the HTTPS unsubscribe endpoint first.");
      const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",utf8(JSON.stringify(input))))].map(n=>n.toString(16).padStart(2,"0")).join("");
      const key=`campaign:${input.requestId}`, prior=await store.get(key);
      if(prior) {
        if(prior.digest!==digest)throw fail(409,"This send reference belongs to another draft.");
        if(prior.status === "accepted" && prior.deliveryId) await privacyRpc(env,"crm_marketing_finish",{p_id:prior.deliveryId,p_status:"sent",p_provider_id:prior.providerId || null});
        return {ok:true,status:prior.status,repeated:true};
      }
      const record=await privacyRpc(env,"crm_marketing_prepare",{p_workspace:auth.workspace,p_actor:auth.actor,p_request_id:input.requestId,p_email:input.email,p_sender:account.email,p_subject:input.subject,p_digest:digest});
      if(record.duplicate) return {ok:true,status:record.status==="sent"?"accepted":"unknown",repeated:true};
      const unsubscribe=new URL("/api/privacy/unsubscribe",publicOrigin.origin);unsubscribe.searchParams.set("token",z.string().uuid().parse(record.token));
      const payload=marketingPayload({email:input.email,sender:account.email,subject:input.subject,text:input.text},record.settings,unsubscribe.href);
      const mime=`From: ${account.email}\r\nTo: ${input.email}\r\nSubject: =?UTF-8?B?${b64(utf8(input.subject))}?=\r\nList-Unsubscribe: <${unsubscribe.href}>\r\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(utf8(payload.text))}`;
      await store.put(key,{digest,status:"unknown",at:Date.now()});
      let result;
      try {
        result=account.provider==="gmail" ? await this.api(account,"/messages/send",{method:"POST",body:JSON.stringify({raw:url64(utf8(mime))})}) : await this.api(account,"/sendMail",{method:"POST",headers:{"content-type":"text/plain"},body:b64(utf8(mime))});
      } catch(err) { await privacyRpc(env,"crm_marketing_finish",{p_id:record.id,p_status:"uncertain",p_provider_id:null}); throw err; }
      await store.put(key,{digest,status:"accepted",deliveryId:record.id,providerId:result.id || null,at:Date.now()});
      await privacyRpc(env,"crm_marketing_finish",{p_id:record.id,p_status:"sent",p_provider_id:result.id || null});
      return {ok:true,status:"accepted"};
    }
    if (action === "reply") {
      const input = replySchema.parse(data), key = `send:${input.requestId}`;
      const digest = url64(new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(JSON.stringify({id:input.id,text:input.text})))));
      const prior = await store.get(key);
      if (prior) {
        if (prior.digest !== digest) throw fail(409, "This send reference belongs to a different draft.");
        return { ok: true, status: prior.status, repeated: true };
      }
      const original = await this.message(account, input.id);
      const to = z.string().email().parse(original.replyTo || original.from);
      // Commit before transport: any timeout/crash becomes uncertain, never auto-retried.
      await store.put(key, { digest, status: "unknown", at: Date.now() });
      if (account.provider === "outlook") await this.api(account, `/messages/${encodeURIComponent(input.id)}/reply`, { method:"POST", body:JSON.stringify({comment:input.text}) });
      else {
        const subject = String(original.subject || "").replace(/[\r\n]/g, " ").slice(0,300);
        const reference = /^[^\r\n]{1,500}$/.test(original.messageId || "") ? original.messageId : "";
        const mime = `From: ${account.email}\r\nTo: ${to}\r\nSubject: =?UTF-8?B?${b64(utf8(/^re:/i.test(subject) ? subject : `Re: ${subject}`))}?=\r\n${reference ? `In-Reply-To: ${reference}\r\nReferences: ${reference}\r\n` : ""}MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(utf8(input.text))}`;
        await this.api(account, "/messages/send", { method:"POST", body:JSON.stringify({raw:url64(utf8(mime)),threadId:original.threadId}) });
      }
      await store.put(key, { digest, status:"accepted", at:Date.now() });
      return { ok:true, status:"accepted" };
    }
    throw fail(404, "Mailbox action not found.");
  }
  api(account, path, options = {}) {
    return remote(`${account.provider === "gmail" ? "https://gmail.googleapis.com/gmail/v1/users/me" : "https://graph.microsoft.com/v1.0/me"}${path}`, { ...options, headers:{ authorization:`Bearer ${account.access}`, "content-type":"application/json", Prefer:'outlook.body-content-type="text"', ...options.headers } });
  }
  async message(account, id, metadata = false) {
    const m = await this.api(account, `/messages/${encodeURIComponent(id)}${account.provider === "gmail" ? `?format=${metadata ? "metadata" : "full"}` : "?$select=id,subject,from,replyTo,receivedDateTime,body,internetMessageId"}`);
    if (account.provider === "outlook") return { id:m.id, subject:m.subject, from:m.from?.emailAddress?.address, replyTo:m.replyTo?.[0]?.emailAddress?.address, text:m.body?.content || "", at:m.receivedDateTime };
    const header = name => m.payload?.headers?.find(h => h.name.toLowerCase() === name)?.value || "";
    const address = value => value.match(/<([^<>]+)>/)?.[1] || value.trim();
    const plain = part => part?.mimeType === "text/plain" && part.body?.data ? new TextDecoder().decode(un64(part.body.data.replace(/-/g,"+").replace(/_/g,"/"))) : (part?.parts || []).map(plain).filter(Boolean).join("\n");
    return { id:m.id, threadId:m.threadId, subject:header("subject"), from:address(header("from")), replyTo:address(header("reply-to")) || undefined, messageId:header("message-id"), text:plain(m.payload) || m.snippet || "", at:new Date(Number(m.internalDate)).toISOString(), unread:m.labelIds?.includes("UNREAD") };
  }
}
