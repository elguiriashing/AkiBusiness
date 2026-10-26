/* AkiSelector login adapter for the static operating app. Same scene and interaction contract as the React engine. */
(function (root) {
  "use strict";
  const products = [
    { id: "pasa", label: "AkiPasa", effect: "ember", accent: "242,107,29", path: "/auth" },
    { id: "duermo", label: "AkiDuermo", effect: "breeze", accent: "47,194,165", path: "/account" },
    { id: "coches", label: "AkiCoches", effect: "bloom", accent: "255,48,71", path: "/account" },
    { id: "hq", label: "AkiHQ", effect: "solar", accent: "255,197,51", path: "/auth" },
    { id: "business", label: "AkiBusiness", effect: "aurora", accent: "154,112,250", path: "/login" },
  ];
  function mount(host, locale, current = "business") {
    if (!host || !products.some(item => item.id === current)) return;
    const doc = host.ownerDocument, es = locale === "es";
    let hovered = null;
    let selected = products.findIndex(item => item.id === current), startPoint = null, suppressClick = false;
    const element = (tag, className, text) => {
      const node = doc.createElement(tag); node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    host.replaceChildren(); host.className = "aki-workspace-picker";
    host.setAttribute("aria-label", es ? "Elige tu espacio" : "Choose your workspace");
    host.append(element("h2", "aki-workspace-picker__title", es ? "Elige tu espacio" : "Choose your workspace"));
    const selector = element("section", "aks-selector aki-workspace-selector");
    selector.dataset.intensity = "subtle"; selector.dataset.motion = "auto";
    const scene = element("div", "aks-selector__scene");
    scene.setAttribute("role", "group");scene.setAttribute("aria-label", es ? "Espacios AkiSuite" : "AkiSuite workspaces");
    for (const name of ["ambient", "floor"]) { const node = element("div", `aks-selector__${name}`);node.setAttribute("aria-hidden", "true");scene.append(node); }
    function handleKey(event) {
        hovered = null;energize();
        suppressClick = false;
        const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
        if (!delta && !["Home", "End"].includes(event.key)) return;
        event.preventDefault();choose(event.key === "Home" ? 0 : event.key === "End" ? products.length - 1 : (selected + delta + products.length) % products.length, true);
    }
    const buttons = products.map((item, index) => {
      const button = element("a", "aks-selector__card");
      button.href = root.AkiSuiteNavigation.href(item.id, locale, {path:item.path});
      if (item.id === current) button.setAttribute("aria-current", "page");
      button.setAttribute("aria-label", item.label);button.dataset.effect = item.effect;button.dataset.arrival = item.id;
      button.style.setProperty("--aks-own-glow", item.accent);
      const effect = element("span", "aks-selector__effect");effect.setAttribute("aria-hidden", "true");
      const sustain = element("span", "aks-selector__sustain");
      for (const part of ["orbit", "burst", "sparks"]) sustain.append(element("span", `aks-selector__effect-${part}`));
      effect.append(sustain);
      effect.append(element("span", "aks-selector__ignition"));
      const particles = element("span", "aks-selector__particles");
      for (let i = 0; i < 10; i++) { const particle = element("i", "");particle.style.setProperty("--aks-particle", String(i));particles.append(particle); }
      effect.append(particles);
      const face = element("span", "aks-selector__card-face"), symbol = element("span", "aks-selector__symbol");symbol.setAttribute("aria-hidden", "true");
      const icon = element("img", "");icon.src = `/assets/brand/v3/${item.id}.svg`;icon.alt = "";icon.width = 56;icon.height = 56;symbol.append(icon);
      face.append(symbol, element("span", "aks-selector__label", item.label));const arrival = element("span", "aks-selector__arrival");arrival.setAttribute("aria-hidden", "true");
      for (const part of ["trail", "actor", "detail"]) arrival.append(element("span", `aks-selector__arrival-${part}`));
      button.append(effect, arrival, face);
      button.addEventListener("click", event => { if (suppressClick) { event.preventDefault(); suppressClick = false; } });
      button.addEventListener("pointerenter", event => { if (event.pointerType === "mouse" && !startPoint) { hovered = index;energize(); } });
      button.addEventListener("pointerdown", () => { hovered = null;energize(); });
      button.addEventListener("keydown", handleKey);
      scene.append(button);return button;
    });
    function resetDrag(pointerId) {
      delete scene.dataset.dragging;scene.style.removeProperty("--aks-drag-offset");
      if (scene.hasPointerCapture?.(pointerId)) scene.releasePointerCapture(pointerId);
    }
    scene.addEventListener("dragstart", event => event.preventDefault());
    scene.addEventListener("pointerdown", event => {
      if (event.isPrimary === false || (event.pointerType === "mouse" && event.button !== 0)) return;
      suppressClick = false;hovered = null;energize();
      startPoint = {x:event.clientX,y:event.clientY,id:event.pointerId,dragging:false};
    });
    scene.addEventListener("pointermove", event => {
      const start = startPoint;if (!start || start.id !== event.pointerId) return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if (!start.dragging && (Math.abs(dx)<10 || Math.abs(dx)<Math.abs(dy)*1.3)) return;
      if (!start.dragging) { start.dragging=true;suppressClick=true;scene.setPointerCapture?.(event.pointerId);scene.dataset.dragging="true"; }
      event.preventDefault();const limit=scene.clientWidth*.3;
      scene.style.setProperty("--aks-drag-offset",`${Math.max(-limit,Math.min(limit,dx))}px`);
    });
    for (const type of ["pointercancel","lostpointercapture"]) scene.addEventListener(type,event=>{
      if(startPoint?.id!==event.pointerId)return;startPoint=null;resetDrag(event.pointerId);
    });
    scene.addEventListener("pointerup", event => {
      const start=startPoint;if(!start||start.id!==event.pointerId)return;startPoint=null;resetDrag(event.pointerId);
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(Math.hypot(dx,dy)>=10)suppressClick=true;
      if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy)*1.3)return;
      suppressClick=true;choose((selected+(dx<0?1:-1)+products.length)%products.length);
    });
    for(const delta of [-1,1]) {
      const button=element("button",`aks-selector__browse aks-selector__browse--${delta<0?"previous":"next"}`);
      button.type="button";button.setAttribute("aria-label",delta<0?(es?"Opción anterior":"Previous option"):(es?"Opción siguiente":"Next option"));
      const chevron=element("span","",delta<0?"‹":"›");chevron.setAttribute("aria-hidden","true");button.append(chevron);
      button.addEventListener("pointerdown",event=>event.stopPropagation());
      button.addEventListener("keydown",handleKey);
      button.addEventListener("click",()=>{hovered=null;choose((selected+delta+products.length)%products.length);});
      scene.append(button);
    }
    scene.addEventListener("pointerleave", () => { hovered = null;energize(); });
    selector.append(scene);host.append(selector);
    function choose(index, focus = false) {
      selected = index;energize();
      buttons.forEach((button, position) => {
        let distance = position - selected;if (distance > products.length / 2) distance -= products.length;if (distance < -products.length / 2) distance += products.length;
        button.style.left = `calc(50% + ${distance * 31}%)`;button.style.setProperty("--aks-order", String(Math.abs(distance)));button.dataset.selected = String(position === selected);button.tabIndex = position === selected ? 0 : -1;
      });
      if (focus) buttons[selected].focus({preventScroll:true});
    }
    function energize() {
      const index = hovered ?? selected, item = products[index];
      selector.dataset.effect = item.effect;selector.style.setProperty("--aks-glow", item.accent);
      buttons.forEach((button, position) => { button.dataset.energized = String(position === index); });
    }
    choose(selected);
  }
  root.AkiWorkspaceSelector = Object.freeze({ mount });
})(globalThis);
