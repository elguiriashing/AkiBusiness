(function(root) {
  "use strict";
  function create({request,refresh,escapeHtml:e,scope}) {
    let status=null, messages=[], selected=null, busy=false, error="", draft="", sendId=null, sendState="", loaded=false, disposed=false, mobileOpen=false;
    const words = () => scope().locale === "es";
    const say = (en,es) => words() ? es : en;
    async function load() {
      if (busy || disposed) return;
      busy=true; error="";
      try {
        status=await request("/api/business-mail/status");
        if (status.connected && scope().route === "inbox") messages=(await request("/api/business-mail/messages")).messages || [];
        else { messages=[]; selected=null; }
        loaded=true;
      } catch (err) { error=err.message; loaded=true; }
      finally {busy=false;if(!disposed)refresh();}
    }
    async function complete() {
      const params=new URLSearchParams(location.search), code=params.get("mail_code"), state=params.get("mail_state"), denied=params.get("mail_error");
      if (!code && !denied) return;
      let pending;
      try { pending=JSON.parse(sessionStorage.getItem("business-mail-oauth") || "null"); } catch {}
      if (!pending || pending.workspace !== scope().workspace) { error=say("Return to the workspace where you started connecting email.","Vuelve al espacio donde empezaste a conectar el correo."); return; }
      for (const key of ["mail_code","mail_state","mail_error"]) params.delete(key);
      history.replaceState(null,"",location.pathname+(params.size?`?${params}`:"")+location.hash);
      sessionStorage.removeItem("business-mail-oauth");
      if (denied) { error=say("Email connection was cancelled. You can try again.","Se canceló la conexión. Puedes intentarlo de nuevo."); return; }
      if (pending.state!==state) { error=say("Connection request does not match. Start again.","La solicitud no coincide. Empieza de nuevo."); return; }
      await request("/api/business-mail/complete",{method:"POST",body:{code,state}});
    }
    async function action(target) {
      if (busy) return;
      busy=true; error="";
      try {
        switch(target.dataset.action) {
          case "business-mail-back": mobileOpen=false;break;
          case "business-mail-refresh": busy=false;return load();
          case "business-mail-connect": {
            const result=await request("/api/business-mail/start",{method:"POST",body:{provider:target.dataset.provider}});
            sessionStorage.setItem("business-mail-oauth",JSON.stringify({state:result.state,workspace:scope().workspace,route:scope().route}));
            location.assign(result.url);break;
          }
          case "business-mail-disconnect":
            if (!confirm(say("Disconnect this mailbox for everyone in this workspace? Existing emails remain with the provider.","¿Desconectar este buzón para todo el espacio? Los correos permanecen en el proveedor."))) break;
            await request("/api/business-mail/disconnect",{method:"POST",body:{}}); status=null; selected=null;messages=[];draft="";sendId=null;sendState="";loaded=false;break;
          case "business-mail-open":
            if (draft && !confirm(say("Discard this unsent draft and open another email?","¿Descartar el borrador y abrir otro correo?"))) break;
            selected=(await request(`/api/business-mail/message?id=${encodeURIComponent(target.dataset.id)}`)).message;draft="";sendId=null;sendState="";mobileOpen=true;break;
        }
      } catch(err){error=err.message;}
      finally{busy=false;if(!disposed)refresh();}
    }
    async function submit(form) {
      if(busy || !selected || sendState) return;
      draft=String(new FormData(form).get("text")||"").trim(); if(!draft)return;
      sendId ||= crypto.randomUUID(); busy=true;error="";
      try {
        const result=await request("/api/business-mail/reply",{method:"POST",body:{id:selected.id,text:draft,requestId:sendId}});
        sendState=result.status;
        if(sendState==="accepted")draft="";
      } catch(err){error=err.message; /* Preserve reference and draft for a status-safe retry. */}
      finally{busy=false;if(!disposed)refresh();}
    }
    function render() {
      if(!loaded && !busy) { busy=true; Promise.resolve().then(async()=>{try{await complete();}catch(err){error=err.message;}finally{busy=false;if(!error)await load();else{loaded=true;if(!disposed)refresh();}}}); }
      const button=(action,label,extra="")=>`<button class="action-btn" data-action="${action}" ${busy?"disabled":""} ${extra}>${label}</button>`;
      return `<section class="panel business-mail"><div class="panel-header"><div><h2>${say("Business email","Correo de empresa")}</h2><p>${status?.connected?e(status.email):say("Connect your own Gmail or Microsoft 365 mailbox.","Conecta tu buzón de Gmail o Microsoft 365.")}</p></div><div class="panel-actions">${button("business-mail-refresh",say("Refresh","Actualizar"))}${status?.connected && status.canManage?button("business-mail-disconnect",say("Disconnect","Desconectar")):""}</div></div>
      ${error?`<div class="mail-feedback" role="alert">${e(error)}</div>`:""}
      ${busy?`<p class="panel-body" role="status">${say("Checking your connection…","Comprobando la conexión…")}</p>`:""}
      ${loaded && !status?.canManage?`<p class="panel-body">${say("Ask a workspace owner or administrator to connect or disconnect the shared business mailbox.","Pide a un propietario o administrador que conecte o desconecte el buzón compartido.")}</p>`:""}
      ${!status?.connected?`<div class="panel-body"><p>${say("Workspace members with Inbox access can read this mailbox. Connect a dedicated business address, as its contents will be shared with your team.","Los miembros con acceso a Buzón podrán leer este correo. Conecta una dirección de empresa, ya que su contenido se compartirá con el equipo.")}</p><div class="panel-actions">${(status?.providers||[]).map(provider=>button("business-mail-connect",provider==="gmail"?say("Connect with Google","Conectar con Google"):say("Connect with Microsoft","Conectar con Microsoft"),`data-provider="${provider}" ${!status?.canManage?"disabled":""}`)).join("")}</div>${loaded&&!status?.configured?`<p role="status">${say("Provider setup is pending. An AkiBusiness operator must configure the OAuth apps before connections can be authorized.","La configuración del proveedor está pendiente. AkiBusiness debe configurar las aplicaciones OAuth antes de autorizar conexiones.")}</p>`:""}</div>`:
      scope().route !== "inbox" ? `<p class="panel-body">${say("Mailbox connected. Use Inbox to read and reply, or Marketing to review a campaign for a consented recipient.","Buzón conectado. Usa Buzón para leer y responder, o Marketing para revisar una campaña con consentimiento.")}</p>` : `<div class="inbox-layout ${mobileOpen?"chat-open":""}"><div class="conversation-list">${messages.map(m=>`<button class="conversation-item ${selected?.id===m.id?"active":""}" data-action="business-mail-open" data-id="${e(m.id)}"><span><strong>${e(m.from||"")}</strong><span class="conv-subject">${e(m.subject||say("No subject","Sin asunto"))}</span><span class="conv-preview">${e(m.text||"")}</span></span></button>`).join("") || `<p class="panel-body">${say("No recent inbox messages.","No hay mensajes recientes.")}</p>`}</div><div class="chat-pane">${selected?`<div class="chat-head"><button class="mini-btn business-mail-back" data-action="business-mail-back">${say("Back","Volver")}</button><div><strong>${e(selected.subject||"")}</strong><p>${e(selected.from||"")}</p></div></div><div class="business-mail-body">${e(selected.text||"")}</div>${sendState?`<p class="mail-feedback" role="status">${sendState==="accepted"?say("Accepted by your email provider. This does not confirm delivery.","Aceptado por tu proveedor. Esto no confirma la entrega."):say("Send outcome is unknown. Check your provider's Sent folder; this reference will not be resent.","El resultado del envío es incierto. Revisa Enviados en tu proveedor; esta referencia no se reenviará.")}</p>`:""}${status.canSend?`<form class="composer" data-form="business-mail-reply" data-id="${e(selected.id)}:${e(sendState||"draft")}"><label>${say("Reply to","Responder a")} ${e(selected.replyTo||selected.from||"")}<textarea name="text" required maxlength="20000" ${sendState?"disabled":""} placeholder="${say("Write your reply…","Escribe tu respuesta…")}">${e(draft)}</textarea></label><button class="action-btn primary" type="submit" ${busy||sendState?"disabled":""}>${say("Send reply","Enviar respuesta")}</button></form>`:""}`:`<div class="panel-body">${say("Choose an email to read and reply.","Elige un correo para leer y responder.")}</div>`}</div></div>`}</section>`;
    }
    return {render,action,submit,input:target=>{if(target.closest?.('[data-form="business-mail-reply"]'))draft=target.value;},dispose:()=>{disposed=true;}};
  }
  root.AkiBusinessMail={create};
})(typeof window!=="undefined"?window:globalThis);
