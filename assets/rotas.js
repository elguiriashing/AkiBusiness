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
      publishedAt = null,
      panel = "",
      staffTab = "linked",
      shiftSeed = {},
      undoMove = null;
    let from = new Date().toISOString().slice(0, 10),
      through = C.addDays(from, 6),
      period = "7",
      view = "grid",
      staffFilter = "",
      exportMode = "draft",
      note = "",
      printLayout = "team",
      paper = "A4",
      orientation = "landscape";
    from = C.addDays(from, -((new Date(from + "T12:00Z").getUTCDay() + 6) % 7));
    through = C.addDays(from, 6);
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
      panel = "";
      shiftSeed = {};
      undoMove = null;
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
        undoMove = null;
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
    const uiText = () =>
      lang() === "es"
        ? {
            today: "Hoy",
            team: "Equipo",
            addShift: "Añadir turno",
            addStaff: "Añadir personal",
            publish: "Publicar",
            export: "Exportar",
            settings: "Ajustes",
            help: "Información",
            close: "Cerrar",
            week: "Semana",
            list: "Agenda",
            shifts: "turnos",
            hours: "horas",
            people: "personas",
            ready: "Publicado",
            draft: "Borrador",
            emptyTitle: "Tu semana empieza aquí",
            emptyBody: "Añade tu equipo y planifica el primer turno.",
            emptyShifts: "Haz clic en un día para añadir un turno.",
            teamTab: "Desde Equipo",
            manualTab: "Perfil manual",
            more: "Más opciones",
            repeat: "Repetir y guardar plantilla",
            overnight: "Termina al día siguiente",
            noShifts: "Sin turnos",
            off: "Ausencia",
            add: "Añadir",
            review: "Revisar",
            duration: "Duración rápida",
            editStaff: "Editar perfil",
            dates: "Fechas",
            copied: "Copiar periodo",
            noMatch: "No hay turnos en este periodo",
            firstShift: "Planifica tu primer turno",
            workload: "Horas planificadas",
            exportHint: "Imprime lo que necesitas. O llévalo a tu calendario.",
            save: "Guardar turno",
            saved: "Guardado",
            timezone: "Zona horaria",
            weekHint:
              "Pulsa un día para crear · arrastra un turno para moverlo",
            undo: "Deshacer movimiento",
          }
        : {
            today: "Today",
            team: "Team",
            addShift: "Add shift",
            addStaff: "Add staff",
            publish: "Publish",
            export: "Export",
            settings: "Settings",
            help: "About this planner",
            close: "Close",
            week: "Week",
            list: "Agenda",
            shifts: "shifts",
            hours: "hours",
            people: "people",
            ready: "Published",
            draft: "Draft",
            emptyTitle: "Your week starts here",
            emptyBody: "Bring in your team. Plan your first shift.",
            emptyShifts: "Click any day to add a shift.",
            teamTab: "From Teams",
            manualTab: "Manual profile",
            more: "More options",
            repeat: "Repeat & save template",
            overnight: "Ends the next day",
            noShifts: "No shifts",
            off: "Time off",
            add: "Add",
            review: "Review",
            duration: "Quick duration",
            editStaff: "Edit profile",
            dates: "Dates",
            copied: "Copy period",
            noMatch: "No shifts in this period",
            firstShift: "Plan your first shift",
            workload: "Scheduled hours",
            exportHint:
              "Print just what you need. Or take it to your calendar.",
            save: "Save shift",
            saved: "Saved",
            timezone: "Timezone",
            weekHint: "Click a day to create · drag a shift to move",
            undo: "Undo move",
          };
    const paths = {
      calendar:
        "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
      plus: "M12 5v14M5 12h14",
      left: "m14 6-6 6 6 6",
      right: "m10 6 6 6-6 6",
      users:
        "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-7a4 4 0 0 1 0 8m4 9v-2a4 4 0 0 0-3-3.87",
      more: "M5 12h.01M12 12h.01M19 12h.01",
      download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
      check: "m5 12 4 4L19 6",
      close: "m6 6 12 12M6 18 18 6",
      clock: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
      list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
      settings:
        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
      info: "M12 11v6m0-10h.01m9 5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      refresh: "M20 7v5h-5M4 17v-5h5m10-4a8 8 0 0 0-14-2M5 16a8 8 0 0 0 14 2",
      copy: "M8 8h12v12H8ZM4 16H3V3h13v1",
      alert: "m12 3 10 18H2L12 3Zm0 6v5m0 3h.01",
    };
    const ico = (name) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(
        paths[name] || paths.calendar
      )
        .split(/(?=M)/)
        .map((d) => `<path d="${d}"/>`)
        .join("")}</svg>`;
    const initials = (name) =>
      String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase();
    const tint = (id) =>
      [...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % 5;
    const dateLabel = (d, options) =>
      new Intl.DateTimeFormat(lang() === "es" ? "es-ES" : "en-GB", {
        timeZone: "UTC",
        ...options,
      }).format(new Date(d + "T12:00Z"));
    const ctl = (label, action, icon, attrs = "", cls = "") =>
      `<button type="button" class="rp-button ${cls}" data-rota-action="${action}" ${attrs} ${busy ? "disabled" : ""}>${icon ? ico(icon) : ""}<span>${E(label)}</span></button>`;
    function shiftForm() {
      const t = uiText(),
        s = data.shifts.find((s) => s.id === editing) || {
          staffId: shiftSeed.staffId || staffFilter,
          date: shiftSeed.date || from,
          endDate: shiftSeed.date || from,
          start: "09:00",
          end: "17:00",
          breakMinutes: 0,
        };
      return `<form data-rota-form="shift" class="rp-edit-form"><input name="id" type="hidden" value="${E(editing)}"><div class="rp-form-body"><label>${E(w().staff)}<select name="staffId" required>${staffOptions(s.staffId)}</select></label>${field("date", "date", s.date, "date", "required")}<div class="rp-time-pair">${field("start", "start", s.start, "time", "required")}${field("end", "end", s.end, "time", "required")}</div><label class="rp-check"><input type="checkbox" name="overnight" ${s.date !== s.endDate ? "checked" : ""}>${E(t.overnight)}</label><input name="endDate" type="hidden" value="${E(s.endDate)}"><div class="rp-duration" aria-label="${E(t.duration)}">${[4, 6, 8, 12].map((h) => ctl(h + "h", "duration", null, `data-id="${h}"`)).join("")}</div><div class="rp-time-pair">${field("role", "role", s.role || "", "text", 'maxlength="120"')}${field("break", "breakMinutes", s.breakMinutes, "number", 'required min="0" max="1439"')}</div><details class="rp-advanced"><summary>${E(t.more)}</summary>${field("location", "location", s.location || "", "text", 'maxlength="120"')}<label>${E(w().notes)}<textarea name="notes" rows="2" maxlength="1000">${E(s.notes || "")}</textarea></label><label>${E(w().template)}<select name="template"><option value="">${E(w().none)}</option>${data.templates.map((t) => opt(t.id, t.name)).join("")}</select></label></details><details class="rp-advanced"><summary>${E(t.repeat)}</summary>${!editing ? `${field("repeat", "through", s.date, "date", "required")}<div class="rp-time-pair">${field("work", "work", 1, "number", 'min="1" max="28" required')}${field("rest", "rest", 0, "number", 'min="0" max="28" required')}</div><fieldset class="rp-weekdays"><legend>${E(w().weekdays)}</legend>${(lang() === "es" ? ["D", "L", "M", "X", "J", "V", "S"] : ["S", "M", "T", "W", "T", "F", "S"]).map((day, i) => `<label><input type="checkbox" name="weekday" value="${i}" checked><span>${day}</span></label>`).join("")}</fieldset>` : ""}<label class="rp-check"><input type="checkbox" name="saveTemplate">${E(w().saveTemplate)}</label>${field("templateName", "templateName", "", "text", 'maxlength="120"')}</details></div><footer class="rp-drawer-footer">${editing ? ctl(w().remove, "remove-shift", "close", `data-id="${E(editing)}"`, "rp-danger") : ""}<button class="rp-button rp-primary" type="submit" ${busy ? "disabled" : ""}>${ico("check")}${E(t.save)}</button></footer></form>`;
    }
    function staffPanel() {
      const t = uiText(),
        available = members.filter(
          (m) => !data.staff.some((p) => p.profileId === m.profileId),
        );
      return `<div class="rp-tabs"><button type="button" data-rota-action="staff-tab" data-id="linked" aria-pressed="${staffTab === "linked"}">${E(t.teamTab)}</button><button type="button" data-rota-action="staff-tab" data-id="manual" aria-pressed="${staffTab === "manual"}">${E(t.manualTab)}</button></div><div class="rp-form-body">${staffTab === "linked" ? `<form data-rota-form="linked"><label>${E(w().member)}<select name="profileId" required ${available.length ? "" : "disabled"}>${available.map((m) => opt(m.profileId, m.name)).join("")}</select></label><button class="rp-button rp-primary" ${busy || !available.length ? "disabled" : ""}>${ico("plus")}${E(t.addStaff)}</button>${!available.length ? `<p class="rp-muted">${E(w().noTeam)}</p>` : ""}</form>` : `<form data-rota-form="staff">${field("name", "name", "", "text", 'required maxlength="120"')}${field("department", "department", "", "text", 'maxlength="120"')}${field("hours", "weeklyHours", 40, "number", 'required min="0" max="168" step="0.25"')}<p class="rp-muted">${E(w().noAccount)}</p><button class="rp-button rp-primary" ${busy ? "disabled" : ""}>${ico("plus")}${E(w().manual)}</button></form>`}<div class="rp-staff-list">${data.staff.map((p) => `<details><summary><span class="rp-avatar rp-tint-${tint(p.id)}">${E(initials(p.name))}</span><span>${E(p.name)}<small>${E(p.department || (p.profileId ? "Teams" : t.manualTab))}</small></span>${ico("settings")}</summary><form data-rota-form="staff-edit"><input name="id" type="hidden" value="${E(p.id)}">${field("name", "name", p.name, "text", 'required maxlength="120"')}${field("department", "department", p.department || "", "text", 'maxlength="120"')}${field("hours", "weeklyHours", p.weeklyHours, "number", 'required min="0" max="168" step="0.25"')}<div class="rp-inline-actions"><button class="rp-button rp-primary" ${busy ? "disabled" : ""}>${E(w().save)}</button>${ctl(w().remove, "remove-staff", "close", `data-id="${E(p.id)}"`, "rp-danger")}</div></form></details>`).join("")}</div></div>`;
    }
    function absencePanel() {
      return `<div class="rp-form-body"><form data-rota-form="absence"><label>${E(w().staff)}<select name="staffId" required>${staffOptions()}</select></label><div class="rp-time-pair">${field("from", "from", from, "date", "required")}${field("through", "through", from, "date", "required")}</div>${field("reason", "reason", "", "text", 'maxlength="200"')}<button class="rp-button rp-primary" ${busy ? "disabled" : ""}>${E(w().save)}</button></form>${data.absences.map((a) => `<div class="rp-absence-item"><div><b>${E(data.staff.find((p) => p.id === a.staffId)?.name)}</b><small>${E(a.from)} — ${E(a.through)}</small></div>${ctl(w().remove, "remove-absence", "close", `data-id="${E(a.id)}"`)}</div>`).join("")}</div>`;
    }
    function drawer() {
      if (!panel) return "";
      const t = uiText();
      let title = "",
        body = "";
      if (panel === "shift") {
        title = editing ? w().edit : t.addShift;
        body = shiftForm();
      }
      if (panel === "staff") {
        title = t.team;
        body = staffPanel();
      }
      if (panel === "absence") {
        title = w().absence;
        body = absencePanel();
      }
      if (panel === "settings") {
        title = t.settings;
        body = `<form data-rota-form="settings" class="rp-form-body">${field("scheduleName", "title", data.settings.title, "text", 'required maxlength="120"')}${field("timezone", "timezone", data.settings.timezone, "text", 'required maxlength="80"')}<label>${E(w().timeFormat)}<select name="timeFormat">${opt("24", w().hour24, data.settings.timeFormat)}${opt("12", w().hour12, data.settings.timeFormat)}</select></label><button class="rp-button rp-primary" ${busy ? "disabled" : ""}>${E(w().save)}</button></form>`;
      }
      if (panel === "export") {
        title = t.export;
        body = `<div class="rp-form-body"><p class="rp-muted">${E(t.exportHint)}</p>${manage ? `<label>${E(w().status)}<select data-rota-filter="exportMode">${opt("draft", w().exportDraft, exportMode)}${opt("published", w().exportPublished, exportMode)}</select></label>` : ""}<label>${E(w().staff)}<select data-rota-filter="staff"><option value="">${E(w().all)}</option>${staffOptions(staffFilter)}</select></label><label>${E(w().printLayout)}<select data-rota-filter="printLayout">${opt("team", w().teamPrint, printLayout)}${opt("individual", w().individualPrint, printLayout)}</select></label><div class="rp-time-pair"><label>${E(w().paper)}<select data-rota-filter="paper">${opt("A4", "A4", paper)}${opt("Letter", "Letter", paper)}</select></label><label>${E(w().orientation)}<select data-rota-filter="orientation">${opt("landscape", w().landscape, orientation)}${opt("portrait", w().portrait, orientation)}</select></label></div>${ctl(w().print, "print", "download", "", "rp-primary")}<div class="rp-export-options">${ctl(w().csv, "csv", "grid")}${ctl(w().ics, "ics", "calendar")}</div></div>`;
      }
      if (panel === "help") {
        title = t.help;
        body = `<div class="rp-form-body rp-help"><p>${E(w().intro)}</p><p>${E(w().clock)}</p><p>${E(w().privacy)}</p></div>`;
      }
      if (panel === "review") {
        title = t.review;
        body = `<div class="rp-form-body">${C.warnings(data)
          .map(
            (a) =>
              `<article class="rp-warning"><b>${E(data.staff.find((p) => p.id === a.staffId)?.name)}</b><p>${E(a.date)} · ${E(a.kind === "hours" ? w().hoursWarning : a.kind === "absence" ? w().absenceWarning : w().overlap)}</p></article>`,
          )
          .join("")}</div>`;
      }
      return `<dialog class="rp-drawer" aria-labelledby="rp-drawer-title" data-rota-panel="${panel}"><header><div><span class="rp-eyebrow">${E(data.settings.title)}</span><h2 id="rp-drawer-title">${E(title)}</h2></div>${ctl(t.close, "close-panel", "close", "", "rp-icon-only")}</header>${body}</dialog>`;
    }
    function shiftCard(s, mobile = false) {
      const p = data.staff.find((p) => p.id === s.staffId),
        t = uiText();
      return `<${manage ? "button" : "div"} ${manage ? 'type="button"' : ""} class="rp-shift rp-tint-${tint(s.staffId)}" ${manage ? `data-rota-action="edit" data-id="${E(s.id)}" draggable="true" data-rota-drag="${E(s.id)}"` : ""}><span class="rp-shift-time">${E(shiftText(s))}</span><span class="rp-shift-role">${E(mobile ? p?.name : s.role || t.addShift)}</span><span class="rp-shift-bottom">${E(mobile ? s.role || "" : s.location || "")}<b>${C.duration(s).toFixed(1)}h</b></span></${manage ? "button" : "div"}>`;
    }
    function render() {
      if (scope !== current()) {
        reset();
        scope = current();
      }
      if (!data && !loading && !error) void load();
      const t = uiText(),
        text = w();
      if (!data)
        return `<section class="panel rota-shell rp"><div class="rp-loading">${ico("calendar")}<h2>${E(text.title)}</h2><p role="${error ? "alert" : "status"}">${E(error || text.loading)}</p>${error ? ctl(text.retry, "reload", "refresh") : ""}</div></section>`;
      const shifts = C.select(data, from, through, staffFilter),
        people = data.staff.filter((p) => !staffFilter || p.id === staffFilter),
        warn = manage ? C.warnings(data) : [],
        pending = JSON.stringify(data) !== JSON.stringify(published),
        hours = shifts.reduce((n, s) => n + C.duration(s), 0),
        today = new Date().toISOString().slice(0, 10),
        days = [];
      for (let d = from; d <= through && days.length < 31; d = C.addDays(d, 1))
        days.push(d);
      const range =
        dateLabel(from, { day: "numeric", month: "short" }) +
        " – " +
        dateLabel(through, { day: "numeric", month: "short", year: "numeric" });
      const add = (d, p) =>
        ctl(
          t.addShift,
          "new-shift",
          "plus",
          `data-id="${E(p || "")}" data-date="${E(d)}"`,
          "rp-add-cell",
        );
      const board = `<div class="rp-board rp-desktop ${view === "list" ? "rp-hidden" : ""}" tabindex="0" role="region" aria-label="${E(text.grid)}"><table class="rp-table rota-grid"><thead><tr><th scope="col" class="rp-person-head">${E(t.team)} <span>${people.length}</span></th>${days.map((d) => `<th scope="col" class="${d === today ? "rp-today" : ""}"><span>${E(dateLabel(d, { weekday: "short" }))}</span><b>${E(dateLabel(d, { day: "2-digit" }))}</b></th>`).join("")}</tr></thead><tbody>${people
        .map((p) => {
          const own = shifts.filter((s) => s.staffId === p.id);
          return `<tr><th scope="row" class="rp-person"><div><span class="rp-avatar rp-tint-${tint(p.id)}">${E(initials(p.name))}</span><span><b>${E(p.name)}</b><small>${E(p.department || "")}<span>${own.reduce((n, s) => n + C.duration(s), 0).toFixed(1)} / ${Number(p.weeklyHours)}h</span></small></span></div></th>${days
            .map((d) => {
              const daily = own.filter((s) => s.date === d),
                absent = data.absences.some(
                  (a) => a.staffId === p.id && d >= a.from && d <= a.through,
                );
              return `<td class="${d === today ? "rp-today" : ""} ${absent ? "rp-is-off" : ""}" ${manage ? `data-rota-drop="${E(p.id)}" data-date="${d}"` : ""}>${absent ? `<span class="rp-off-label">${E(t.off)}</span>` : ""}${daily.map((s) => shiftCard(s)).join("")}${manage ? add(d, p.id) : ""}</td>`;
            })
            .join("")}</tr>`;
        })
        .join("")}</tbody></table></div>`;
      const agenda = `<div class="rp-agenda ${view === "grid" ? "rp-mobile" : ""}">${days
        .map((d) => {
          const daily = shifts.filter((s) => s.date === d);
          return `<section class="rp-day ${d === today ? "rp-day-today" : ""}"><header><div><b>${E(dateLabel(d, { weekday: "long" }))}</b><span>${E(dateLabel(d, { day: "numeric", month: "short" }))}</span></div>${manage ? add(d, staffFilter) : ""}</header><div class="rp-day-shifts">${daily.length ? daily.map((s) => shiftCard(s, true)).join("") : `<span class="rp-no-shift">${E(t.noShifts)}</span>`}</div></section>`;
        })
        .join("")}</div>`;
      const empty = !data.staff.length
        ? `<div class="rp-empty"><div class="rp-empty-art">${ico("calendar")}<span>${ico("plus")}</span></div><span class="rp-eyebrow">${E(dateLabel(from, { month: "long", year: "numeric" }))}</span><h2>${E(t.emptyTitle)}</h2><p>${E(manage ? t.emptyBody : text.noPublished)}</p>${manage ? ctl(t.addStaff, "open-staff", "users", "", "rp-primary") : ""}<div class="rp-empty-steps"><span class="rp-step-current">1 ${E(t.team)}</span><i></i><span>2 ${E(t.shifts)}</span><i></i><span>3 ${E(t.publish)}</span></div></div>`
        : "";
      return `<section class="panel rota-shell rp" aria-label="${E(text.title)}"><header class="rp-header"><div class="rp-title"><div class="rp-calendar-icon">${ico("calendar")}</div><div><h2>${E(data.settings.title)}</h2><span class="rp-status ${!pending ? "rp-status-live" : ""}" role="status"><i></i>${E(manage ? (pending ? t.draft : t.ready) : t.ready)}${note ? " · " + E(t.saved) : ""}</span></div></div><div class="rp-header-actions">${ctl(t.export, "open-export", "download", "", "rp-secondary-action")}${manage ? ctl(t.addShift, "new-shift", "plus", !data.staff.length ? "disabled" : "", "rp-primary") : ""}${manage ? ctl(t.publish, "publish", "check", !data.shifts.length ? "disabled" : "", "rp-publish") : ""}<details class="rp-menu"><summary aria-label="${E(t.more)}">${ico("more")}</summary><div>${manage ? ctl(t.settings, "open-settings", "settings") + ctl(text.absence, "open-absence", "calendar", !data.staff.length ? "disabled" : "") + ctl(t.copied, "copy", "copy", !shifts.length ? "disabled" : "") : ""}${ctl(t.help, "open-help", "info")}${ctl(text.retry, "reload", "refresh")}${ctl(t.export, "open-export", "download", "", "rp-mobile-export")}</div></details></div></header><div class="rp-toolbar"><div class="rp-date-nav">${ctl(text.prev, "prev", "left", "", "rp-icon-only")}${ctl(text.next, "next", "right", "", "rp-icon-only")}<details class="rp-date-picker"><summary>${ico("calendar")}<span>${E(range)}</span></summary><div>${field("from", "filter-from", from, "date", 'required data-rota-filter="from"')}${field("through", "filter-through", through, "date", 'required data-rota-filter="through"')}<label>${E(text.period)}<select data-rota-filter="period">${[
        ["7", text.week],
        ["14", text.two],
        ["28", text.four],
        ["month", text.month],
        ["custom", text.custom],
      ]
        .map(([v, l]) => opt(v, l, period))
        .join(
          "",
        )}</select></label></div></details>${ctl(t.today, "today", null, "", "rp-today-button")}</div><div class="rp-view-controls">${manage ? ctl(t.team + " · " + data.staff.length, "open-staff", "users", "", "rp-team-button") : ""}<select data-rota-filter="staff" aria-label="${E(text.staff)}"><option value="">${E(text.all)}</option>${staffOptions(staffFilter)}</select><div class="rp-view-switch">${ctl(t.week, "set-view", "grid", 'data-id="grid" aria-pressed="' + (view === "grid") + '"')}${ctl(t.list, "set-view", "list", 'data-id="list" aria-pressed="' + (view === "list") + '"')}</div></div></div>${error ? `<div class="rp-alert" role="alert">${ico("alert")}${E(error)}</div>` : ""}<div class="rp-summary"><span><b>${shifts.length}</b> ${E(t.shifts)}</span><span><b>${hours.toFixed(1)}</b> ${E(t.hours)}</span><span><b>${people.length}</b> ${E(t.people)}</span>${warn.length ? ctl(warn.length + " · " + t.review, "open-review", "alert", "", "rp-warning-button") : ""}${undoMove ? ctl(t.undo, "undo-move", "refresh", "", "rp-undo") : ""}<small>${E(data.settings.timezone)}</small></div>${empty || board + agenda}${days.length === 31 && through > C.addDays(from, 30) ? `<p class="rp-muted rp-range-note">${E(lang() === "es" ? "Mostrando los primeros 31 días. La exportación incluye todo el periodo." : "Showing the first 31 days. Exports include the full period.")}</p>` : ""}${data.staff.length ? `<footer class="rp-footer"><span>${manage ? E(t.weekHint) : E(text.readOnly)}</span><span>${ico("clock")}${E(t.workload)}</span></footer>` : ""}${drawer()}</section>`;
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
      if (kind !== "linked" && kind !== "staff" && kind !== "staff-edit")
        panel = "";
      repaint();
    }
    function source() {
      const value = exportMode === "published" ? published : data;
      if (!value) throw Error(w().noPublished);
      return value;
    }
    async function action(action, id, details = {}) {
      if (
        action.startsWith("open-") ||
        action === "new-shift" ||
        action === "close-panel" ||
        action === "staff-tab" ||
        action === "set-view"
      ) {
        if (dirty && action !== "close-panel") throw Error(w().unsaved);
        if (action === "close-panel") {
          if (dirty && !root.confirm(w().refreshWarning)) return;
          dirty = false;
          panel = "";
          editing = "";
        } else if (action === "new-shift") {
          if (!manage || !data.staff.length) return;
          editing = "";
          shiftSeed = {
            date: details.date || from,
            staffId: id || staffFilter,
          };
          panel = "shift";
        } else if (action === "staff-tab")
          staffTab = id === "manual" ? "manual" : "linked";
        else if (action === "set-view") view = id === "list" ? "list" : "grid";
        else panel = action.slice(5);
        repaint();
        return;
      }
      if (action === "duration") {
        const form = root.document.querySelector('[data-rota-form="shift"]'),
          h = Number(id);
        if (!form || ![4, 6, 8, 12].includes(h)) return;
        const [hour, minute] = form.elements.start.value.split(":").map(Number),
          end = hour * 60 + minute + h * 60;
        form.elements.end.value =
          String(Math.floor(end / 60) % 24).padStart(2, "0") +
          ":" +
          String(end % 60).padStart(2, "0");
        form.elements.overnight.checked = end >= 1440;
        form.elements.endDate.value = C.addDays(
          form.elements.date.value,
          end >= 1440 ? 1 : 0,
        );
        dirty = true;
        return;
      }
      if (action === "today") {
        if (dirty) throw Error(w().unsaved);
        const today = new Date().toISOString().slice(0, 10);
        from = C.addDays(
          today,
          -((new Date(today + "T12:00Z").getUTCDay() + 6) % 7),
        );
        through = C.addDays(from, Number(period) > 0 ? Number(period) - 1 : 6);
        repaint();
        return;
      }
      if (action === "undo-move") {
        if (dirty) throw Error(w().unsaved);
        if (!undoMove) return;
        const previous = undoMove,
          next = editData(),
          index = next.shifts.findIndex((s) => s.id === previous.id);
        if (index < 0) return;
        next.shifts[index] = previous;
        await save(next);
        undoMove = null;
        repaint();
        return;
      }

      if (action === "reload") {
        if (dirty && !root.confirm(w().refreshWarning)) return;
        await load();
        return;
      }
      if (action === "edit") {
        if (dirty) throw Error(w().unsaved);
        editing = id;
        panel = "shift";
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
        panel = "";
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
      if (action === "remove-shift") {
        panel = "";
        editing = "";
        repaint();
      }
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
        ["date", "overnight", "start", "end"].includes(target.name) &&
        target.closest('[data-rota-form="shift"]')
      ) {
        const f = target.closest("form");
        if (target.name === "end" || target.name === "start")
          f.elements.overnight.checked =
            f.elements.end.value <= f.elements.start.value;
        f.elements.endDate.value = C.addDays(
          f.elements.date.value,
          f.elements.overnight.checked ? 1 : 0,
        );
        if (
          f.elements.through &&
          f.elements.through.value < f.elements.date.value
        )
          f.elements.through.value = f.elements.date.value;
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
          form.elements.overnight.checked = !!t.overnight;
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
        details: [...form.querySelectorAll("details")].map((d) => d.open),
        focused: form.contains(root.document.activeElement)
          ? {
              name: root.document.activeElement.name,
              value: root.document.activeElement.value,
              start: root.document.activeElement.selectionStart,
              end: root.document.activeElement.selectionEnd,
            }
          : null,
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
      const dialog = root.document?.querySelector?.(".rp-drawer");
      if (dialog && !dialog.open && typeof dialog.showModal === "function")
        dialog.showModal();
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
        if (item.details)
          [...form.querySelectorAll("details")].forEach(
            (d, i) => (d.open = !!item.details[i]),
          );
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
        if (item.focused && dirty) {
          const control = [...form.elements].find(
            (f) =>
              f.name === item.focused.name &&
              (f.type !== "checkbox" || f.value === item.focused.value),
          );
          if (control) {
            control.focus({ preventScroll: true });
            if (
              typeof item.focused.start === "number" &&
              control.setSelectionRange
            )
              try {
                control.setSelectionRange(item.focused.start, item.focused.end);
              } catch {}
          }
        }
      }
    }
    async function moveShift(id, staffId, date) {
      if (dirty) throw Error(w().unsaved);
      if (!C.date(date)) return;
      const next = editData(),
        s = next.shifts.find((s) => s.id === id);
      if (!s || !next.staff.some((p) => p.id === staffId)) return;
      if (s.staffId === staffId && s.date === date) return;
      const previous = structuredClone(s),
        offset = Math.round(
          (Date.parse(s.endDate) - Date.parse(s.date)) / 86400000,
        );
      s.staffId = staffId;
      s.date = date;
      s.endDate = C.addDays(date, offset);
      await save(next);
      undoMove = previous;
      repaint();
    }
    return {
      moveShift,
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
