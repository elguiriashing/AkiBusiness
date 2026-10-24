(function (root) {
  "use strict";
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const date = (v) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v + "T00:00Z")) &&
    new Date(v + "T00:00Z").toISOString().slice(0, 10) === v;
  const time = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const addDays = (v, n) =>
    new Date(Date.parse(v + "T00:00Z") + n * 86400000)
      .toISOString()
      .slice(0, 10);
  const minute = (d, t) => Date.parse(d + "T" + t + ":00Z") / 60000;
  const bounds = (s) => [minute(s.date, s.start), minute(s.endDate, s.end)];
  const duration = (s) => {
    const [a, b] = bounds(s);
    return (b - a - Number(s.breakMinutes || 0)) / 60;
  };
  function validate(data) {
    if (
      !data ||
      !Array.isArray(data.staff) ||
      !Array.isArray(data.shifts) ||
      !Array.isArray(data.absences) ||
      !Array.isArray(data.templates)
    )
      throw Error("Invalid rota document.");
    if (
      data.staff.length > 200 ||
      data.shifts.length > 1000 ||
      data.absences.length > 1000 ||
      data.templates.length > 100
    )
      throw Error(
        "Rota limit reached (200 staff, 1,000 shifts/absences, 100 templates).",
      );
    try {
      new Intl.DateTimeFormat("en", {
        timeZone: data.settings.timezone,
      }).format();
    } catch {
      throw Error("Choose a valid IANA timezone.");
    }
    const ids = new Set(),
      profiles = new Set();
    for (const p of data.staff) {
      if (
        !p.id ||
        ids.has(p.id) ||
        !p.name?.trim() ||
        p.name.length > 120 ||
        !Number.isFinite(Number(p.weeklyHours)) ||
        p.weeklyHours < 0 ||
        p.weeklyHours > 168
      )
        throw Error("Check staff names, unique IDs and weekly hours (0–168).");
      ids.add(p.id);
      if (p.profileId) {
        if (profiles.has(p.profileId))
          throw Error("A linked team member can only be added once.");
        profiles.add(p.profileId);
      }
    }
    const shiftIds = new Set();
    for (const s of data.shifts) {
      const [a, b] = bounds(s);
      if (
        !s.id ||
        shiftIds.has(s.id) ||
        !ids.has(s.staffId) ||
        !date(s.date) ||
        !date(s.endDate) ||
        !time(s.start) ||
        !time(s.end) ||
        !Number.isFinite(b - a) ||
        b <= a ||
        b - a > 1440 ||
        !Number.isInteger(Number(s.breakMinutes)) ||
        s.breakMinutes < 0 ||
        s.breakMinutes >= b - a
      )
        throw Error(
          "Each shift needs staff, valid dates/times, duration up to 24 hours and a shorter break.",
        );
      shiftIds.add(s.id);
    }
    const absenceIds = new Set();
    for (const a of data.absences) {
      if (
        !a.id ||
        absenceIds.has(a.id) ||
        !ids.has(a.staffId) ||
        !date(a.from) ||
        !date(a.through) ||
        a.through < a.from
      )
        throw Error("Check absence dates and staff.");
      absenceIds.add(a.id);
    }
    return data;
  }
  function conflicts(data) {
    const result = [];
    for (let i = 0; i < data.shifts.length; i++) {
      const s = data.shifts[i],
        [start, end] = bounds(s);
      for (let j = 0; j < i; j++) {
        const other = data.shifts[j],
          [a, b] = bounds(other);
        if (s.staffId === other.staffId && start < b && a < end)
          result.push({
            kind: "overlap",
            staffId: s.staffId,
            shiftId: s.id,
            date: s.date,
          });
      }
      for (const a of data.absences) {
        if (
          a.staffId === s.staffId &&
          start < minute(addDays(a.through, 1), "00:00") &&
          minute(a.from, "00:00") < end
        )
          result.push({
            kind: "absence",
            staffId: s.staffId,
            shiftId: s.id,
            date: s.date,
          });
      }
    }
    return result;
  }
  function warnings(data) {
    const result = conflicts(data);
    for (const p of data.staff) {
      if (!Number(p.weeklyHours)) continue;
      const weeks = new Map();
      for (const s of data.shifts.filter((s) => s.staffId === p.id)) {
        const weekday = (new Date(s.date + "T00:00Z").getUTCDay() + 6) % 7,
          key = addDays(s.date, -weekday);
        weeks.set(key, (weeks.get(key) || 0) + duration(s));
      }
      for (const [date, hours] of weeks)
        if (hours > p.weeklyHours)
          result.push({ kind: "hours", staffId: p.id, date, hours });
    }
    return result;
  }
  function repeat(
    base,
    { through = base.date, work = 1, rest = 0, weekdays = null } = {},
  ) {
    if (
      !date(base.date) ||
      !date(through) ||
      through < base.date ||
      minute(through, "00:00") - minute(base.date, "00:00") > 366 * 1440 ||
      !Number.isInteger(work) ||
      !Number.isInteger(rest) ||
      work < 1 ||
      work > 28 ||
      rest < 0 ||
      rest > 28
    )
      throw Error(
        "Choose a repeat end within a year and a valid work/rest pattern.",
      );
    const offset = Math.round(
        (Date.parse(base.endDate + "T00:00Z") -
          Date.parse(base.date + "T00:00Z")) /
          86400000,
      ),
      shifts = [];
    for (let d = base.date, i = 0; d <= through; d = addDays(d, 1), i++) {
      if (
        i % (work + rest) >= work ||
        (weekdays && !weekdays.includes(new Date(d + "T00:00Z").getUTCDay()))
      )
        continue;
      shifts.push({
        ...base,
        id: root.crypto.randomUUID(),
        date: d,
        endDate: addDays(d, offset),
      });
    }
    return shifts;
  }
  function select(data, from, through, staffId = "") {
    return data.shifts
      .filter(
        (s) =>
          (!staffId || s.staffId === staffId) &&
          s.date <= through &&
          s.endDate >= from,
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
      );
  }
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/"/g, '""')
      .replace(/^[\s]*[=+@-]/, "\u200b$&") +
    '"';
  function csv(data, from, through, staffId = "") {
    return (
      "\uFEFF" +
      [
        [
          "Staff",
          "Date",
          "Start",
          "End date",
          "End",
          "Break minutes",
          "Scheduled hours (wall clock)",
          "Role",
          "Location",
          "Notes",
          "Timezone",
        ],
        ...select(data, from, through, staffId).map((s) => [
          data.staff.find((p) => p.id === s.staffId)?.name,
          s.date,
          s.start,
          s.endDate,
          s.end,
          s.breakMinutes,
          duration(s).toFixed(2),
          s.role,
          s.location,
          s.notes,
          data.settings.timezone,
        ]),
      ]
        .map((row) => row.map(cell).join(","))
        .join("\r\n")
    );
  }
  const icsText = (v) =>
    String(v ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/[,;]/g, "\\$&");
  function ics(data, from, through, staffId = "") {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AkiBusiness//Rotas//EN",
      "CALSCALE:GREGORIAN",
      ...select(data, from, through, staffId).flatMap((s) => [
        "BEGIN:VEVENT",
        `UID:${s.id}@rotas.akibusiness.com`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d+Z/, "Z")}`,
        `DTSTART;TZID=${data.settings.timezone}:${s.date.replace(/-/g, "")}T${s.start.replace(":", "")}00`,
        `DTEND;TZID=${data.settings.timezone}:${s.endDate.replace(/-/g, "")}T${s.end.replace(":", "")}00`,
        `SUMMARY:${icsText((data.staff.find((p) => p.id === s.staffId)?.name || "") + " · " + (s.role || "Shift"))}`,
        `LOCATION:${icsText(s.location)}`,
        `DESCRIPTION:${icsText(s.notes)}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ];
    // RFC 5545 folds at 75 UTF-8 octets, never in the middle of a Unicode character.
    return (
      lines
        .map((line) => {
          let part = "",
            bytes = 0,
            out = [];
          for (const ch of line) {
            const n = new TextEncoder().encode(ch).length;
            if (bytes + n > 75) {
              out.push(part);
              part = " ";
              bytes = 1;
            }
            part += ch;
            bytes += n;
          }
          out.push(part);
          return out.join("\r\n");
        })
        .join("\r\n") + "\r\n"
    );
  }
  function printHTML(
    data,
    from,
    through,
    staffId = "",
    locale = "en",
    status = "Draft",
    options = {},
  ) {
    const paper = options.paper === "Letter" ? "Letter" : "A4",
      orientation =
        options.orientation === "portrait" ? "portrait" : "landscape",
      individual = options.layout === "individual";
    const es = locale === "es",
      shifts = select(data, from, through, staffId),
      staff = data.staff.filter(
        (p) =>
          (!staffId || p.id === staffId) &&
          shifts.some((s) => s.staffId === p.id),
      );
    return `<!doctype html><html lang="${es ? "es" : "en"}"><meta charset="utf-8"><title>${esc(data.settings.title)} · ${esc(from)}</title><style>@page{size:${paper} ${orientation};margin:12mm}body{font:12px Arial;color:#111}h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-bottom:20px}th,td{border:1px solid #777;padding:7px;text-align:left}tr{break-inside:avoid}section{break-inside:avoid-page}small{display:block}h2{margin-top:24px}@media print{button{display:none}.individual section+section{break-before:page}}</style><body class="${staffId || individual ? "individual" : "team"}"><h1>${esc(data.settings.title || "AkiBusiness")}</h1><p><b>${esc(status)}</b> · ${esc(from)} — ${esc(through)} · ${esc(data.settings.timezone)}</p><p>${es ? "Horas planificadas de reloj local; no es un registro de fichajes." : "Scheduled wall-clock hours; this is not a time clock record."}</p>${
      staff.length
        ? staff
            .map(
              (p) =>
                `<section><h2>${esc(p.name)} · ${shifts
                  .filter((s) => s.staffId === p.id)
                  .reduce((n, s) => n + duration(s), 0)
                  .toFixed(
                    2,
                  )} h</h2><table><thead><tr>${(es ? ["Fecha", "Horario", "Descanso", "Puesto / lugar", "Notas"] : ["Date", "Shift", "Break", "Role / location", "Notes"]).map((t) => `<th scope="col">${t}</th>`).join("")}</tr></thead><tbody>${shifts
                  .filter((s) => s.staffId === p.id)
                  .map(
                    (s) =>
                      `<tr><td>${esc(s.date)}</td><td>${esc(s.start)} – ${esc(s.end)}${s.endDate !== s.date ? " (" + esc(s.endDate) + ")" : ""}</td><td>${Number(s.breakMinutes)} min</td><td>${esc(s.role)} / ${esc(s.location)}</td><td>${esc(s.notes)}</td></tr>`,
                  )
                  .join("")}</tbody></table></section>`,
            )
            .join("")
        : `<p>${es ? "No hay turnos en este periodo." : "No shifts in this period."}</p>`
    }</body></html>`;
  }
  const api = {
    esc,
    date,
    time,
    addDays,
    bounds,
    duration,
    validate,
    conflicts,
    warnings,
    repeat,
    select,
    csv,
    ics,
    printHTML,
  };
  if (typeof module === "object") module.exports = api;
  root.AkiRotasCore = api;
})(typeof window !== "undefined" ? window : globalThis);
