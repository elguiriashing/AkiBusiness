(function (root) {
  "use strict";
  const C = root.AkiRotasCore,
    E = C.esc;
  const words = {
    en: {
      title: "Schedules & rotas",
      intro:
        "Build the draft, check coverage, then publish. Staff see their own published shifts.",
      loading: "Loading schedule…",
      retry: "Reload latest",
      save: "Save draft",
      publish: "Publish rota",
      saved: "Draft saved",
      published: "Published",
      draft: "Draft",
      staff: "Staff",
      all: "All staff",
      from: "From",
      through: "Through",
      period: "Period",
      week: "1 week",
      two: "2 weeks",
      four: "4 weeks",
      month: "Month",
      custom: "Custom",
      view: "View",
      list: "List",
      grid: "Weekly grid",
      print: "Print / PDF",
      csv: "Export CSV",
      ics: "Calendar file",
      add: "Add shifts",
      edit: "Edit shift",
      name: "Name",
      department: "Department",
      hours: "Weekly hours target",
      manual: "Add manual staff",
      linked: "Add from Teams",
      member: "Team member",
      noAccount:
        "Manual profiles do not create accounts or grant workspace access.",
      teamHint:
        "Use staff already added to Teams, including Gmail sign-ins. No inbox access is needed.",
      role: "Role / job",
      location: "Location / area",
      notes: "Shift notes",
      date: "Start date",
      start: "Start time",
      endDate: "End date",
      end: "End time",
      break: "Unpaid break (minutes)",
      repeat: "Repeat through",
      work: "Days on",
      rest: "Days off",
      weekdays: "Repeat on weekdays",
      remove: "Remove",
      copy: "Copy period forward",
      absence: "Record time off / unavailable",
      reason: "Reason (manager only)",
      settings: "Schedule settings",
      timezone: "Timezone (IANA)",
      scheduleName: "Schedule title",
      template: "Shift template",
      none: "No template",
      saveTemplate: "Save as template",
      templateName: "Template name",
      status: "Status",
      total: "Scheduled hours",
      empty: "No shifts in this period. Add staff, then add a shift.",
      pending: "Unpublished changes",
      noChanges: "Draft matches published rota",
      review: "Review before publishing",
      overlap: "Overlapping shifts",
      absenceWarning: "Shift during time off",
      hoursWarning: "Weekly target exceeded",
      readOnly: "Your published schedule",
      noStaff: "Add a team member or manual profile first.",
      error: "Could not save. Your previous saved rota is unchanged.",
      unsaved: "Save the current form before leaving this tool.",
      deleteStaff: "Remove staff and all their draft shifts / time off?",
      deleteShift: "Remove this shift from the draft?",
      publishConfirm:
        "Publish the complete saved rota? Staff will see their own shifts when they open Rotas. No email is sent.",
      copyConfirm:
        "Copy visible shifts immediately after this period? Copies stay in draft.",
      savedNotice: "Saved to this workspace.",
      noPublished: "No published shifts yet.",
      clock:
        "Times and totals use the schedule’s local wall clock. Breaks are deducted. This is planning, not payroll.",
      privacy: "Only managers can see the complete rota and time-off reasons.",
      delete: "Delete",
      cancel: "Cancel edit",
      updated: "Last published",
      refreshWarning: "Reload and discard unsaved form changes?",
      conflict:
        "Another manager saved changes. Reload latest before saving again.",
      target: "Target",
      timeFormat: "Time format",
      hour24: "24 hour",
      hour12: "12 hour",
      exportDraft: "Export saved draft",
      exportPublished: "Export published rota",
      noTeam: "No unlinked Teams members available.",
      access:
        "People access is required. Ask your workspace owner to enable it.",
      prev: "Previous period",
      next: "Next period",
      printLayout: "Print layout",
      teamPrint: "Whole team",
      individualPrint: "Page per staff member",
      paper: "Paper",
      orientation: "Orientation",
      landscape: "Landscape",
      portrait: "Portrait",
    },
    es: {
      title: "Horarios y turnos",
      intro:
        "Prepara el borrador, revisa la cobertura y publica. Cada empleado ve sus turnos publicados.",
      loading: "Cargando horario…",
      retry: "Recargar última versión",
      save: "Guardar borrador",
      publish: "Publicar horario",
      saved: "Borrador guardado",
      published: "Publicado",
      draft: "Borrador",
      staff: "Personal",
      all: "Todo el personal",
      from: "Desde",
      through: "Hasta",
      period: "Periodo",
      week: "1 semana",
      two: "2 semanas",
      four: "4 semanas",
      month: "Mes",
      custom: "Personalizado",
      view: "Vista",
      list: "Lista",
      grid: "Cuadrante semanal",
      print: "Imprimir / PDF",
      csv: "Exportar CSV",
      ics: "Archivo de calendario",
      add: "Añadir turnos",
      edit: "Editar turno",
      name: "Nombre",
      department: "Departamento",
      hours: "Objetivo de horas semanales",
      manual: "Añadir perfil manual",
      linked: "Añadir desde Equipo",
      member: "Miembro del equipo",
      noAccount:
        "Los perfiles manuales no crean cuentas ni dan acceso al espacio de trabajo.",
      teamHint:
        "Usa el personal añadido a Equipo, incluidos los accesos con Gmail. No se accede al correo.",
      role: "Puesto / función",
      location: "Ubicación / zona",
      notes: "Notas del turno",
      date: "Fecha de inicio",
      start: "Hora de inicio",
      endDate: "Fecha de fin",
      end: "Hora de fin",
      break: "Descanso no remunerado (minutos)",
      repeat: "Repetir hasta",
      work: "Días de trabajo",
      rest: "Días de descanso",
      weekdays: "Repetir en días de la semana",
      remove: "Quitar",
      copy: "Copiar al siguiente periodo",
      absence: "Registrar vacaciones / indisponibilidad",
      reason: "Motivo (solo responsables)",
      settings: "Ajustes del horario",
      timezone: "Zona horaria (IANA)",
      scheduleName: "Título del horario",
      template: "Plantilla de turno",
      none: "Sin plantilla",
      saveTemplate: "Guardar como plantilla",
      templateName: "Nombre de la plantilla",
      status: "Estado",
      total: "Horas planificadas",
      empty:
        "No hay turnos en este periodo. Añade personal y después un turno.",
      pending: "Cambios sin publicar",
      noChanges: "El borrador coincide con el horario publicado",
      review: "Revisar antes de publicar",
      overlap: "Turnos solapados",
      absenceWarning: "Turno durante una ausencia",
      hoursWarning: "Objetivo semanal superado",
      readOnly: "Tu horario publicado",
      noStaff: "Añade primero un miembro del equipo o un perfil manual.",
      error: "No se pudo guardar. El horario guardado no ha cambiado.",
      unsaved: "Guarda el formulario actual antes de salir.",
      deleteStaff:
        "¿Quitar este perfil y todos sus turnos y ausencias del borrador?",
      deleteShift: "¿Quitar este turno del borrador?",
      publishConfirm:
        "¿Publicar todo el horario guardado? Cada empleado verá sus turnos al abrir Horarios. No se enviará ningún correo.",
      copyConfirm:
        "¿Copiar los turnos visibles justo después de este periodo? Se guardan como borrador.",
      savedNotice: "Guardado en este espacio de trabajo.",
      noPublished: "Aún no hay turnos publicados.",
      clock:
        "Los horarios y totales usan el reloj local del horario. Se descuentan los descansos. Es planificación, no nómina.",
      privacy:
        "Solo los responsables ven el horario completo y los motivos de ausencia.",
      delete: "Eliminar",
      cancel: "Cancelar edición",
      updated: "Última publicación",
      refreshWarning: "¿Recargar y descartar los cambios del formulario?",
      conflict:
        "Otro responsable ha guardado cambios. Recarga la última versión antes de guardar.",
      target: "Objetivo",
      timeFormat: "Formato de hora",
      hour24: "24 horas",
      hour12: "12 horas",
      exportDraft: "Exportar borrador guardado",
      exportPublished: "Exportar horario publicado",
      noTeam: "No hay miembros de Equipo pendientes de añadir.",
      access: "Se necesita acceso a Equipo. Pide al propietario que lo active.",
      prev: "Periodo anterior",
      next: "Periodo siguiente",
      printLayout: "Diseño de impresión",
      teamPrint: "Todo el equipo",
      individualPrint: "Una página por persona",
      paper: "Papel",
      orientation: "Orientación",
      landscape: "Horizontal",
      portrait: "Vertical",
    },
  };
  const opt = (v, t, s) =>
    `<option value="${E(v)}"${String(v) === String(s) ? " selected" : ""}>${E(t)}</option>`;
  function create(ctx) {
    let data = null,
      published = null,
      revision = 0,
      members = [],
      manage = false,
      error = "",
      busy = false,
      loading = false,
      disposed = false,
      scope = "",
      requestId = 0,
      editing = "",
      dirty = false,
      publishedAt = null;
    let from = new Date().toISOString().slice(0, 10),
      through = C.addDays(from, 6),
      period = "7",
      view = "list",
      staffFilter = "",
      exportMode = "draft",
      note = "",
      printLayout = "team",
      paper = "A4",
      orientation = "landscape";
    const lang = () => (ctx.scope().locale === "es" ? "es" : "en"),
      w = () => words[lang()],
      current = () => {
        const s = ctx.scope();
        return s.workspace + ":" + s.user;
      };
    const active = (key) => !disposed && key === current() && key === scope;
    const button = (key, action, attrs = "") =>
      `<button type="button" class="action-btn" data-rota-action="${action}" ${attrs}${busy ? " disabled" : ""}>${E(w()[key])}</button>`;
    const field = (key, name, value = "", type = "text", attrs = "") =>
      `<label>${E(w()[key])}<input name="${name}" type="${type}" value="${E(value)}" ${attrs}></label>`;
    const staffOptions = (selected = "") =>
      (data?.staff || []).map((p) => opt(p.id, p.name, selected)).join("");
    function repaint() {
      if (!disposed) ctx.refresh();
    }
    function reset() {
      data = null;
      published = null;
      revision = 0;
      members = [];
      manage = false;
      error = "";
      note = "";
      busy = false;
      loading = false;
      editing = "";
      staffFilter = "";
      dirty = false;
      publishedAt = null;
      requestId++;
    }
    async function call(name, args = {}) {
      const key = scope;
      const response = await ctx
        .client()
        .rpc(name, { p_workspace: ctx.scope().workspace, ...args });
      if (!active(key)) throw Error("Workspace changed.");
      if (response.error)
        throw Object.assign(Error(response.error.message), {
          code: response.error.code,
        });
      return response.data;
    }
    async function load() {
      const key = current();
      if (scope !== key) {
        reset();
        scope = key;
      }
      if (loading) return;
      loading = true;
      error = "";
      const id = ++requestId;
      try {
        const value = await call("crm_rota_read");
        if (!active(key) || id !== requestId) return;
        data = value.data;
        published = value.published;
        publishedAt = value.publishedAt;
        revision = value.revision;
        members = value.members || [];
        manage = value.manage === true;
        exportMode = manage ? "draft" : "published";
        note = "";
        dirty = false;
      } catch (e) {
        if (active(key) && id === requestId) {
          error = e.message;
          if (e.code === "42501") {
            data = null;
            published = null;
            members = [];
            manage = false;
            dirty = false;
          }
        }
      } finally {
        if (active(key) && id === requestId) {
          loading = false;
          repaint();
        }
      }
    }
    async function save(next, publish = false) {
      if (!manage || busy) throw Error(w().access);
      C.validate(next);
      if (publish && C.conflicts(next).length) throw Error(w().review);
      const key = scope;
      busy = true;
      error = "";
      repaint();
      try {
        const value = await call("crm_rota_save", {
          p_data: next,
          p_revision: revision,
          p_publish: publish,
        });
        if (!active(key)) return;
        data = value.data;
        published = value.published;
        publishedAt = value.publishedAt;
        revision = value.revision;
        note = publish ? w().published : w().savedNotice;
        dirty = false;
      } catch (e) {
        if (active(key)) {
          error = e.code === "40001" ? w().conflict : e.message;
          if (e.code === "42501") {
            data = null;
            published = null;
            members = [];
            manage = false;
            dirty = false;
          }
          throw e;
        }
      } finally {
        if (active(key)) {
          busy = false;
          repaint();
        }
      }
    }
    function fmt(time) {
      if (data?.settings.timeFormat !== "12") return time;
      const [h, m] = time.split(":").map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
    }
    function shiftText(s) {
      return `${fmt(s.start)} – ${fmt(s.end)}${s.endDate !== s.date ? " (+1)" : ""}`;
    }
    function shiftForm() {
      const s = data.shifts.find((s) => s.id === editing) || {
        date: from,
        endDate: from,
        start: "09:00",
        end: "17:00",
        breakMinutes: 0,
      };
      return `<details ${editing ? "open" : ""} class="rota-block"><summary>${E(editing ? w().edit : w().add)}</summary><form data-rota-form="shift"><input type="hidden" name="id" value="${E(editing)}"><div class="rota-fields"><label>${E(w().staff)}<select name="staffId" required>${staffOptions(s.staffId)}</select></label><label>${E(w().template)}<select name="template"><option value="">${E(w().none)}</option>${data.templates.map((t) => opt(t.id, t.name)).join("")}</select></label>${field("date", "date", s.date, "date", "required")}${field("start", "start", s.start, "time", "required")}${field("endDate", "endDate", s.endDate, "date", "required")}${field("end", "end", s.end, "time", "required")}${field("break", "breakMinutes", s.breakMinutes, "number", 'required min="0" max="1439" step="1"')}${field("role", "role", s.role || "", "text", 'maxlength="120"')}${field("location", "location", s.location || "", "text", 'maxlength="120"')}<label>${E(w().notes)}<textarea name="notes" maxlength="1000">${E(s.notes || "")}</textarea></label>${!editing ? `${field("repeat", "through", s.date, "date", "required")}${field("work", "work", 1, "number", 'min="1" max="28" required')}${field("rest", "rest", 0, "number", 'min="0" max="28" required')}<fieldset><legend>${E(w().weekdays)}</legend>${(lang() === "es" ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((day, i) => `<label class="rota-check"><input type="checkbox" name="weekday" value="${i}" checked>${day}</label>`).join("")}</fieldset>` : ""}${field("templateName", "templateName", "", "text", 'maxlength="120"')}<label class="rota-check"><input name="saveTemplate" type="checkbox">${E(w().saveTemplate)}</label></div><div class="rota-actions"><button class="action-btn primary" ${busy ? "disabled" : ""}>${E(w().save)}</button>${editing ? button("cancel", "cancel") : ""}</div></form></details>`;
    }
    function staffPanel() {
      const available = members.filter(
        (m) => !data.staff.some((p) => p.profileId === m.profileId),
      );
      return `<details class="rota-block"><summary>${E(w().staff)} (${data.staff.length})</summary><p>${E(w().teamHint)}</p><form data-rota-form="linked" class="rota-fields"><label>${E(w().member)}<select name="profileId" required ${available.length ? "" : "disabled"}>${available.map((m) => opt(m.profileId, m.name)).join("")}</select></label><button class="action-btn" ${busy || !available.length ? "disabled" : ""}>${E(w().linked)}</button>${available.length ? "" : `<p>${E(w().noTeam)}</p>`}</form><p>${E(w().noAccount)}</p><form data-rota-form="staff" class="rota-fields">${field("name", "name", "", "text", 'required maxlength="120"')}${field("department", "department", "", "text", 'maxlength="120"')}${field("hours", "weeklyHours", 40, "number", 'min="0" max="168" step="0.25" required')}<button class="action-btn" ${busy ? "disabled" : ""}>${E(w().manual)}</button></form>${data.staff.map((p) => `<form data-rota-form="staff-edit" class="rota-fields"><input type="hidden" name="id" value="${E(p.id)}">${field("name", "name", p.name, "text", 'required maxlength="120"')}${field("department", "department", p.department || "", "text", 'maxlength="120"')}${field("hours", "weeklyHours", p.weeklyHours, "number", 'required min="0" max="168" step="0.25"')}<span>${E(p.profileId ? "Teams" : lang() === "es" ? "Manual" : "Manual")}</span><button class="action-btn" ${busy ? "disabled" : ""}>${E(w().save)}</button>${button("remove", "remove-staff", `data-id="${E(p.id)}"`)}</form>`).join("")}</details>`;
    }
    function absencePanel() {
      return `<details class="rota-block"><summary>${E(w().absence)}</summary><form data-rota-form="absence" class="rota-fields"><label>${E(w().staff)}<select name="staffId" required>${staffOptions()}</select></label>${field("from", "from", from, "date", "required")}${field("through", "through", from, "date", "required")}${field("reason", "reason", "", "text", 'maxlength="200"')}<button class="action-btn" ${busy ? "disabled" : ""}>${E(w().save)}</button></form>${data.absences.map((a) => `<p>${E(data.staff.find((p) => p.id === a.staffId)?.name)} · ${E(a.from)} — ${E(a.through)} · ${E(a.reason)} ${button("remove", "remove-absence", `data-id="${E(a.id)}"`)}</p>`).join("")}</details>`;
    }
    function render() {
      if (scope !== current()) {
        reset();
        scope = current();
      }
      if (!data && !loading && !error) void load();
      const text = w();
      if (!data)
        return `<section class="panel rota-shell"><h2>${E(text.title)}</h2><p role="${error ? "alert" : "status"}">${E(error || text.loading)}</p>${error ? button("retry", "reload") : ""}</section>`;
      const shifts = C.select(data, from, through, staffFilter),
        warn = manage ? C.warnings(data) : [],
        pending = JSON.stringify(data) !== JSON.stringify(published),
        hours = shifts.reduce((n, s) => n + C.duration(s), 0);
      let board = "";
      if (view === "grid") {
        const days = [];
        for (
          let day = from;
          day <= through && days.length < 31;
          day = C.addDays(day, 1)
        )
          days.push(day);
        board = `<div class="rota-scroll" tabindex="0" role="region" aria-label="${E(text.grid)}"><table class="data-table rota-grid"><caption>${E(from)} — ${E(through)}${days.length === 31 && through > C.addDays(from, 30) ? " · " + E(lang() === "es" ? "Mostrando los primeros 31 días" : "Showing first 31 days") : ""}</caption><thead><tr><th scope="col">${E(text.staff)}</th>${days.map((d) => `<th scope="col">${E(d)}</th>`).join("")}</tr></thead><tbody>${data.staff
          .filter((p) => !staffFilter || p.id === staffFilter)
          .map(
            (p) =>
              `<tr><th scope="row">${E(p.name)}</th>${days
                .map(
                  (d) =>
                    `<td>${
                      shifts
                        .filter((s) => s.staffId === p.id && s.date === d)
                        .map((s) =>
                          manage
                            ? `<button class="rota-shift" data-rota-action="edit" data-id="${E(s.id)}">${E(shiftText(s))}<small>${E(s.role)} · ${C.duration(s).toFixed(2)} h</small></button>`
                            : `<span class="rota-shift">${E(shiftText(s))}<small>${E(s.role)}</small></span>`,
                        )
                        .join("") || "—"
                    }</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}</tbody></table></div>`;
      } else
        board = `<div class="rota-scroll" tabindex="0" role="region" aria-label="${E(text.list)}"><table class="data-table"><caption>${E(from)} — ${E(through)}</caption><thead><tr>${[text.staff, text.date, text.start + " / " + text.end, text.break, text.role, text.location, text.total, text.notes, manage ? text.edit : ""].map((t) => `<th scope="col">${E(t)}</th>`).join("")}</tr></thead><tbody>${shifts.map((s) => `<tr><th scope="row">${E(data.staff.find((p) => p.id === s.staffId)?.name)}</th><td>${E(s.date)}</td><td>${E(shiftText(s))}</td><td>${s.breakMinutes} min</td><td>${E(s.role)}</td><td>${E(s.location)}</td><td>${C.duration(s).toFixed(2)} h</td><td>${E(s.notes)}</td><td>${manage ? button("edit", "edit", `data-id="${E(s.id)}"`) + button("remove", "remove-shift", `data-id="${E(s.id)}"`) : ""}</td></tr>`).join("")}</tbody></table></div>`;
      return `<section class="panel rota-shell" aria-label="${E(text.title)}"><header class="rota-heading"><div><h2>${E(data.settings.title || text.title)}</h2><p>${E(manage ? text.intro : text.readOnly)}</p><p>${E(text.clock)}</p></div><div class="rota-actions">${button("retry", "reload")}${manage ? button("publish", "publish") : ""}</div></header><p role="status">${E(note)} · ${E(manage ? (pending ? text.pending : text.noChanges) : text.published)}${published ? ` · ${E(text.updated)}: ${E(publishedAt || "")}` : ""}</p>${error ? `<p role="alert" class="rota-error">${E(error)}</p>` : ""}<div class="rota-filters">${field("from", "filter-from", from, "date", 'required data-rota-filter="from"')}${field("through", "filter-through", through, "date", 'required data-rota-filter="through"')}<label>${E(text.period)}<select data-rota-filter="period">${[
        ["7", text.week],
        ["14", text.two],
        ["28", text.four],
        ["month", text.month],
        ["custom", text.custom],
      ]
        .map(([v, t]) => opt(v, t, period))
        .join(
          "",
        )}</select></label><label>${E(text.staff)}<select data-rota-filter="staff"><option value="">${E(text.all)}</option>${staffOptions(staffFilter)}</select></label><label>${E(text.view)}<select data-rota-filter="view">${opt("list", text.list, view)}${opt("grid", text.grid, view)}</select></label></div><div class="rota-actions">${button("prev", "prev")}${button("next", "next")}<strong>${E(text.total)}: ${hours.toFixed(2)} h</strong>${manage ? `<label><select data-rota-filter="exportMode" aria-label="${E(text.status)}">${opt("draft", text.exportDraft, exportMode)}${opt("published", text.exportPublished, exportMode)}</select></label>` : ""}<label>${E(text.printLayout)}<select data-rota-filter="printLayout">${opt("team", text.teamPrint, printLayout)}${opt("individual", text.individualPrint, printLayout)}</select></label><label>${E(text.paper)}<select data-rota-filter="paper">${opt("A4", "A4", paper)}${opt("Letter", "Letter", paper)}</select></label><label>${E(text.orientation)}<select data-rota-filter="orientation">${opt("landscape", text.landscape, orientation)}${opt("portrait", text.portrait, orientation)}</select></label>${button("print", "print")}${button("csv", "csv")}${button("ics", "ics")}${manage ? button("copy", "copy") : ""}</div>${shifts.length ? board : `<p class="rota-empty">${E(manage ? text.empty : text.noPublished)}</p>`}${
        manage
          ? `${
              warn.length
                ? `<details open class="rota-block rota-error"><summary>${E(text.review)} (${warn.length})</summary><ul>${warn
                    .slice(0, 100)
                    .map(
                      (a) =>
                        `<li>${E(data.staff.find((p) => p.id === a.staffId)?.name)} · ${E(a.date)}: ${E(a.kind === "hours" ? text.hoursWarning : a.kind === "absence" ? text.absenceWarning : text.overlap)}${a.hours ? " (" + a.hours.toFixed(2) + " h)" : ""}</li>`,
                    )
                    .join("")}</ul></details>`
                : ""
            }${staffPanel()}${data.staff.length ? shiftForm() + absencePanel() : `<p>${E(text.noStaff)}</p>`}<details class="rota-block"><summary>${E(text.settings)}</summary><form data-rota-form="settings" class="rota-fields">${field("scheduleName", "title", data.settings.title, "text", 'required maxlength="120"')}${field("timezone", "timezone", data.settings.timezone, "text", 'required maxlength="80"')}<label>${E(text.timeFormat)}<select name="timeFormat">${opt("24", text.hour24, data.settings.timeFormat)}${opt("12", text.hour12, data.settings.timeFormat)}</select></label><button class="action-btn" ${busy ? "disabled" : ""}>${E(text.save)}</button></form></details><p>${E(text.privacy)}</p>`
          : ""
      }</section>`;
    }
    function editData() {
      if (!data || !manage || busy) throw Error(w().access);
      return structuredClone(data);
    }
    async function submit(form) {
      const kind = form.dataset.rotaForm,
        values = Object.fromEntries(new FormData(form)),
        next = editData();
      if (kind === "linked") {
        const m = members.find((m) => m.profileId === values.profileId);
        if (!m) throw Error(w().noTeam);
        next.staff.push({
          id: root.crypto.randomUUID(),
          profileId: m.profileId,
          name: m.name,
          department: "",
          weeklyHours: 40,
        });
      }
      if (kind === "staff")
        next.staff.push({
          id: root.crypto.randomUUID(),
          profileId: null,
          name: values.name.trim(),
          department: values.department,
          weeklyHours: Number(values.weeklyHours),
        });
      if (kind === "staff-edit") {
        const p = next.staff.find((p) => p.id === values.id);
        if (!p) throw Error("Staff no longer exists.");
        Object.assign(p, {
          name: values.name.trim(),
          department: values.department,
          weeklyHours: Number(values.weeklyHours),
        });
      }
      if (kind === "shift") {
        const s = {
          id: values.id || root.crypto.randomUUID(),
          staffId: values.staffId,
          date: values.date,
          endDate: values.endDate,
          start: values.start,
          end: values.end,
          breakMinutes: Number(values.breakMinutes),
          role: values.role,
          location: values.location,
          notes: values.notes,
        };
        if (values.id) {
          const index = next.shifts.findIndex((s) => s.id === values.id);
          if (index < 0) throw Error("Shift no longer exists.");
          next.shifts[index] = s;
        } else {
          const weekdays = new FormData(form).getAll("weekday").map(Number);
          if (!weekdays.length) throw Error(w().weekdays);
          next.shifts.push(
            ...C.repeat(s, {
              through: values.through,
              work: Number(values.work),
              rest: Number(values.rest),
              weekdays,
            }),
          );
        }
        if (values.saveTemplate) {
          if (!values.templateName.trim()) throw Error(w().templateName);
          next.templates.push({
            id: root.crypto.randomUUID(),
            name: values.templateName.trim(),
            start: s.start,
            end: s.end,
            overnight: s.endDate !== s.date,
            breakMinutes: s.breakMinutes,
            role: s.role,
            location: s.location,
          });
        }
      }
      if (kind === "absence")
        next.absences.push({
          id: root.crypto.randomUUID(),
          staffId: values.staffId,
          from: values.from,
          through: values.through,
          reason: values.reason,
        });
      if (kind === "settings")
        next.settings = {
          title: values.title.trim(),
          timezone: values.timezone.trim(),
          timeFormat: values.timeFormat,
        };
      await save(next);
      editing = "";
      repaint();
    }
    function source() {
      const value = exportMode === "published" ? published : data;
      if (!value) throw Error(w().noPublished);
      return value;
    }
    async function action(action, id) {
      if (action === "reload") {
        if (dirty && !root.confirm(w().refreshWarning)) return;
        await load();
        return;
      }
      if (action === "edit") {
        if (dirty) throw Error(w().unsaved);
        editing = id;
        repaint();
        setTimeout(
          () =>
            root.document
              .querySelector('[data-rota-form="shift"] input[name="date"]')
              ?.focus(),
          0,
        );
        return;
      }
      if (action === "cancel") {
        editing = "";
        dirty = false;
        repaint();
        return;
      }
      if (action === "prev" || action === "next") {
        if (dirty) throw Error(w().unsaved);
        const days =
            Math.round((Date.parse(through) - Date.parse(from)) / 86400000) + 1,
          offset = days * (action === "prev" ? -1 : 1);
        from = C.addDays(from, offset);
        through = C.addDays(through, offset);
        repaint();
        return;
      }
      if (["print", "csv", "ics"].includes(action)) {
        if (dirty) throw Error(w().unsaved);
        const doc = source();
        if (action === "print") {
          const popup = root.open("", "_blank");
          if (!popup) throw Error("Allow the print window to open.");
          popup.opener = null;
          popup.document.write(
            C.printHTML(
              doc,
              from,
              through,
              staffFilter,
              lang(),
              exportMode === "published" ? w().published : w().draft,
              { layout: printLayout, paper, orientation },
            ),
          );
          popup.document.close();
          popup.focus();
          popup.print();
        } else
          ctx.download(
            "rota-" + from + "." + action,
            C[action](doc, from, through, staffFilter),
            action === "csv"
              ? "text/csv;charset=utf-8"
              : "text/calendar;charset=utf-8",
          );
        return;
      }
      const next = editData();
      if (action === "publish") {
        if (dirty) throw Error(w().unsaved);
        if (!root.confirm(w().publishConfirm)) return;
        await save(next, true);
        return;
      }
      if (action === "remove-staff") {
        if (!root.confirm(w().deleteStaff)) return;
        next.staff = next.staff.filter((p) => p.id !== id);
        next.shifts = next.shifts.filter((s) => s.staffId !== id);
        next.absences = next.absences.filter((a) => a.staffId !== id);
      }
      if (action === "remove-shift") {
        if (!root.confirm(w().deleteShift)) return;
        next.shifts = next.shifts.filter((s) => s.id !== id);
      }
      if (action === "remove-absence")
        next.absences = next.absences.filter((a) => a.id !== id);
      if (action === "copy") {
        if (!root.confirm(w().copyConfirm)) return;
        const offset =
          Math.round((Date.parse(through) - Date.parse(from)) / 86400000) + 1;
        next.shifts.push(
          ...C.select(data, from, through, staffFilter)
            .filter((s) => s.date >= from)
            .map((s) => ({
              ...s,
              id: root.crypto.randomUUID(),
              date: C.addDays(s.date, offset),
              endDate: C.addDays(s.endDate, offset),
            })),
        );
      }
      await save(next);
    }
    function change(target) {
      const filter = target.dataset.rotaFilter;
      if (filter) {
        if (dirty) throw Error(w().unsaved);
        if (filter === "from" && C.date(target.value)) {
          from = target.value;
          if (period !== "custom")
            through =
              period === "month"
                ? new Date(
                    Date.UTC(
                      Number(from.slice(0, 4)),
                      Number(from.slice(5, 7)),
                      0,
                    ),
                  )
                    .toISOString()
                    .slice(0, 10)
                : C.addDays(from, Number(period) - 1);
          else if (through < from) through = from;
        }
        if (filter === "through" && C.date(target.value)) {
          through = target.value;
          period = "custom";
          if (through < from) from = through;
        }
        if (filter === "printLayout") printLayout = target.value;
        if (filter === "paper") paper = target.value;
        if (filter === "orientation") orientation = target.value;
        if (filter === "staff") staffFilter = target.value;
        if (filter === "view") view = target.value;
        if (filter === "exportMode") exportMode = target.value;
        if (filter === "period") {
          period = target.value;
          if (period !== "custom")
            through =
              period === "month"
                ? new Date(
                    Date.UTC(
                      Number(from.slice(0, 4)),
                      Number(from.slice(5, 7)),
                      0,
                    ),
                  )
                    .toISOString()
                    .slice(0, 10)
                : C.addDays(from, Number(period) - 1);
        }
        repaint();
        return;
      }
      if (
        target.name === "date" &&
        target.closest('[data-rota-form="shift"]')
      ) {
        const form = target.closest("form");
        if (form.elements.endDate.value < target.value)
          form.elements.endDate.value = target.value;
        if (form.elements.through && form.elements.through.value < target.value)
          form.elements.through.value = target.value;
      }
      if (target.name === "template") {
        const t = data.templates.find((t) => t.id === target.value),
          form = target.closest("form");
        if (t) {
          for (const key of [
            "start",
            "end",
            "breakMinutes",
            "role",
            "location",
          ])
            form.elements[key].value = t[key] ?? "";
          form.elements.endDate.value = C.addDays(
            form.elements.date.value,
            t.overnight ? 1 : 0,
          );
        }
      }
      if (target.closest("[data-rota-form]")) dirty = true;
    }
    function capture() {
      if (scope !== current()) return null;
      return [
        ...root.document.querySelectorAll(".rota-shell form[data-rota-form]"),
      ].map((form) => ({
        key: form.dataset.rotaForm,
        id: form.querySelector("[name=id]")?.value || "",
        open: form.closest("details")?.open,
        fields: dirty
          ? [...form.querySelectorAll("[name]")].map((f) => ({
              name: f.name,
              value: f.value,
              checked: f.checked,
            }))
          : null,
      }));
    }
    function restore(snapshot) {
      if (!snapshot || scope !== current()) return;
      for (const item of snapshot) {
        const form = [
          ...root.document.querySelectorAll(".rota-shell form[data-rota-form]"),
        ].find(
          (f) =>
            f.dataset.rotaForm === item.key &&
            (f.querySelector("[name=id]")?.value || "") === item.id,
        );
        if (!form) continue;
        if (item.open && form.closest("details"))
          form.closest("details").open = true;
        if (item.fields && dirty)
          for (const field of item.fields) {
            const control = [...form.elements].find(
              (f) =>
                f.name === field.name &&
                (f.type !== "checkbox" || f.value === field.value),
            );
            if (control) {
              if (control.type === "checkbox") control.checked = field.checked;
              else control.value = field.value;
            }
          }
      }
    }
    return {
      render,
      load,
      submit,
      action,
      change,
      capture,
      restore,
      markDirty() {
        dirty = true;
      },
      isDirty: () => dirty,
      dispose() {
        disposed = true;
        reset();
      },
    };
  }
  const api = { create, words };
  if (typeof module === "object") module.exports = api;
  root.AkiRotas = api;
})(typeof window !== "undefined" ? window : globalThis);
