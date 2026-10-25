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
    scene.setAttribute("role", "radiogroup");scene.setAttribute("aria-label", es ? "Espacios AkiSuite" : "AkiSuite workspaces");
    for (const name of ["ambient", "floor"]) { const node = element("div", `aks-selector__${name}`);node.setAttribute("aria-hidden", "true");scene.append(node); }
    const buttons = products.map((item, index) => {
      const button = element("button", "aks-selector__card");button.type = "button";
      button.setAttribute("role", "radio");button.setAttribute("aria-label", item.label);button.dataset.effect = item.effect;
      button.style.setProperty("--aks-own-glow", item.accent);
      const effect = element("span", "aks-selector__effect");effect.setAttribute("aria-hidden", "true");
      for (const part of ["orbit", "burst", "sparks"]) effect.append(element("span", `aks-selector__effect-${part}`));
      const face = element("span", "aks-selector__card-face"), symbol = element("span", "aks-selector__symbol");symbol.setAttribute("aria-hidden", "true");
      const icon = element("img", "");icon.src = `/assets/brand/v3/${item.id}.svg`;icon.alt = "";icon.width = 56;icon.height = 56;symbol.append(icon);
      face.append(symbol, element("span", "aks-selector__label", item.label));button.append(effect, face);
      button.addEventListener("click", () => { if (suppressClick) { suppressClick = false; return; } choose(index); });
      button.addEventListener("keydown", event => {
        const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
        if (!delta && !["Home", "End"].includes(event.key)) return;
        event.preventDefault();choose(event.key === "Home" ? 0 : event.key === "End" ? products.length - 1 : (selected + delta + products.length) % products.length, true);
      });scene.append(button);return button;
    });
    scene.addEventListener("pointerdown", event => { suppressClick = false; startPoint = ["touch", "pen"].includes(event.pointerType) ? {x:event.clientX,y:event.clientY,id:event.pointerId} : null; });
    scene.addEventListener("pointercancel", () => { startPoint = null; });
    scene.addEventListener("pointerup", event => {
      const start = startPoint;startPoint = null;if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      suppressClick = true;choose((selected + (dx < 0 ? 1 : -1) + products.length) % products.length);
    });
    const footer = element("div", "aks-selector__footer"), caption = element("div", "aks-selector__caption");
    caption.setAttribute("aria-live", "polite");caption.setAttribute("aria-atomic", "true");
    const name = element("strong", ""), subtitle = element("span", ""), count = element("small", "");caption.append(name, subtitle, count);
    const previous = element("button", "aks-selector__nav", "←"), next = element("button", "aks-selector__nav", "→");
    previous.type = next.type = "button";previous.setAttribute("aria-label", es ? "Opción anterior" : "Previous option");next.setAttribute("aria-label", es ? "Opción siguiente" : "Next option");
    previous.addEventListener("click", () => choose((selected + products.length - 1) % products.length, true));next.addEventListener("click", () => choose((selected + 1) % products.length, true));
    footer.append(previous, caption, next);selector.append(scene, footer);host.append(selector);
    const action = element("div", "aki-workspace-picker__action");host.append(action);
    function choose(index, focus = false) {
      selected = index; const item = products[index];selector.dataset.effect = item.effect;selector.style.setProperty("--aks-glow", item.accent);
      buttons.forEach((button, position) => {
        let distance = position - selected;if (distance > products.length / 2) distance -= products.length;if (distance < -products.length / 2) distance += products.length;
        button.style.left = `calc(50% + ${distance * 31}%)`;button.style.setProperty("--aks-order", String(Math.abs(distance)));button.dataset.selected = String(position === selected);button.setAttribute("aria-checked", String(position === selected));button.tabIndex = position === selected ? 0 : -1;
      });
      name.textContent = item.label;subtitle.textContent = item.id === current ? (es ? "Espacio actual" : "Current workspace") : "";count.textContent = `${index + 1} / ${products.length}`;
      const target = element(item.id === current ? "span" : "a", item.id === current ? "aki-workspace-picker__current" : "", item.id === current ? `${es ? "Estás en" : "You’re in"} ${item.label}` : `${es ? "Abrir" : "Open"} ${item.label} ↗`);
      if (item.id !== current) target.href = root.AkiSuiteNavigation.href(item.id, locale, {path:item.path});action.replaceChildren(target);
      if (focus) buttons[selected].focus();
    }
    choose(selected);
  }
  root.AkiWorkspaceSelector = Object.freeze({ mount });
})(globalThis);
