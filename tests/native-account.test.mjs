import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(
    new URL("../cloudflare/package.json", import.meta.url),
  ),
  { JSDOM } = require("jsdom");
const html = readFileSync(new URL("../account.html", import.meta.url), "utf8"),
  script = readFileSync(
    new URL("../assets/account.js", import.meta.url),
    "utf8",
  ),
  navigation = readFileSync(
    new URL("../assets/suite-navigation.js", import.meta.url),
    "utf8",
  );
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function fixture(
  t,
  {
    query = "?locale=en&tier=standard",
    guest = false,
    locations = [
      { id: "private-fixture", name: "Private workplace", role: "owner" },
    ],
    failedBilling = false,
    failedCreate = false,
    canOperate = true,
    failedAccess = false,
  } = {},
) {
  const dom = new JSDOM(html, {
    url: "https://akibusiness.com/account" + query,
    runScripts: "outside-only",
  });
  t.after(() => dom.window.close());
  const w = dom.window,
    calls = [],
    destinations = [];
  w.eval(navigation);
  const profile = {
    display_name: "Shared Alex",
    username: "shared_alex",
    bio: "Fixture",
    phone: "123",
    locality: "Fuengirola",
    province: "Málaga",
    preferred_locale: "en",
    profile_visibility: "private",
    contact_visibility: "members",
    terms_version: "2026-07-23",
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user: guest
            ? null
            : { id: "verified-owner", email: "fixture@example.test" },
        },
        error: null,
      }),
      getSession: async () => ({
        data: { session: { access_token: "fixture-token" } },
      }),
      signInWithPassword: async () => ({}),
      signUp: async () => ({ data: { session: null } }),
      signInWithOAuth: async (value) => {
        calls.push(["oauth", value]);
        return {};
      },
      signOut: async (value) => {
        calls.push(["signout", value]);
        return {};
      },
      updateUser: async () => ({}),
      resetPasswordForEmail: async () => ({}),
    },
    from: (table) => {
      let mutation = null;
      const q = {
        select: () => q,
        update: (value) => {
          mutation = value;
          return q;
        },
        eq: (key, value) => {
          assert.equal(key, "id");
          assert.equal(value, "verified-owner");
          return q;
        },
        maybeSingle: async () => {
          if (mutation) {
            calls.push(["profile", mutation]);
            return { data: { id: "verified-owner" }, error: null };
          }
          return { data: profile, error: null };
        },
      };
      assert.equal(table, "profiles");
      return q;
    },
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === "list_managed_operating_locations")
        return { data: locations, error: null };
      if (name === "crm_workspace_access")
        return {
          data: {
            can_operate: canOperate,
            tool_keys: canOperate ? ["pos"] : [],
          },
          error: failedAccess ? { code: "fixture-denial" } : null,
        };
      if (name === "create_private_operating_location")
        return {
          data: failedCreate ? null : "private-created",
          error: failedCreate ? { code: "PT409" } : null,
        };
      return { data: true, error: null };
    },
  };
  w.AKIHQ_CONFIG = {
    SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_ANON_KEY: "fixture-public",
  };
  w.supabase = { createClient: () => client };
  w.AkiAccountEligibility = { allowed: async () => true };
  const url = new URL(w.location.href);
  url.assign = (target) => destinations.push(target);
  vm.runInNewContext(script, {
    window: w,
    document: w.document,
    location: url,
    sessionStorage: w.sessionStorage,
    localStorage: w.localStorage,
    URL,
    URLSearchParams,
    Intl,
    FormData: w.FormData,
    Event: w.Event,
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    AbortSignal,
    fetch: async (url, options) => {
      calls.push(["billing", url, options]);
      if (failedBilling) throw Error("fixture failure");
      return {
        ok: true,
        json: async () => ({ subscriptions: [], hasCustomer: false }),
      };
    },
  });
  for (let i = 0; i < 8; i++) await tick();
  return { w, calls, destinations };
}
for (const locale of ["en", "es"])
  test(`native ${locale} journey keeps plan, profile and dashboard on AkiBusiness`, async (t) => {
    const f = await fixture(t, { query: `?locale=${locale}&tier=standard` });
    assert.equal(f.w.document.documentElement.lang, locale);
    assert.match(f.w.document.body.textContent, /Standard/);
    assert.equal(
      f.w.document.querySelector("[name=displayName]").value,
      "Shared Alex",
    );
    const dashboard = f.w.document.querySelector("a.primary");
    assert.equal(new URL(dashboard.href).origin, "https://akibusiness.com");
    assert.equal(
      new URL(dashboard.href).searchParams.get("workspace"),
      "private-fixture",
    );
    assert.equal(f.destinations.length, 0);
  });
for (const locale of ["en", "es"]) {
  test(`privacy links preserve ${locale} and expose the shared human deletion process without submitting it`, async (t) => {
    const f = await fixture(t, { query: `?locale=${locale}` });
    assert.equal(
      f.w.document.getElementById("account-privacy-request").href,
      `https://akipasa.com/${locale}/account/privacy`,
    );
    assert.equal(
      f.w.document.getElementById("account-deletion-instructions").href,
      `https://akipasa.com/${locale}/account-deletion`,
    );
    const panel = f.w.document.getElementById("privacy-and-deletion");
    assert.match(panel.textContent, /48/);
    assert.match(panel.textContent, /support@akipasa.com/);
    assert.match(
      panel.textContent,
      locale === "es" ? /cinco productos/ : /all five products/,
    );
    assert.equal(panel.querySelectorAll("form").length, 0);
    assert.equal(
      f.calls.some(([name]) => /delet|eras|privacy_request/.test(name)),
      false,
    );
  });
}

test("profile updates are atomic and cannot submit roles or foreign identity", async (t) => {
  const f = await fixture(t),
    form = f.w.document.getElementById("profile");
  form.querySelector("[name=displayName]").value = "New shared name";
  const injected = f.w.document.createElement("input");
  injected.name = "app_role";
  injected.value = "administrator";
  form.append(injected);
  form.dispatchEvent(new f.w.Event("submit", { cancelable: true }));
  await tick();
  const update = f.calls.find((c) => c[0] === "profile")[1];
  assert.equal(update.display_name, "New shared name");
  assert.equal(Object.hasOwn(update, "app_role"), false);
  assert.equal(Object.hasOwn(update, "id"), false);
});
test("an empty account creates a private location without linking any public venue", async (t) => {
  const f = await fixture(t, { locations: [] }),
    form = f.w.document.getElementById("create-location");
  form.querySelector("input").value = "Private office";
  form.dispatchEvent(new f.w.Event("submit", { cancelable: true }));
  await tick();
  const call = f.calls.find(
    (c) => c[0] === "create_private_operating_location",
  );
  assert.equal(call[1].p_name, "Private office");
  assert.deepEqual(Object.keys(call[1]).sort(), ["p_name", "p_request_id"]);
  assert.equal(
    new URL("https://akibusiness.com" + f.destinations[0]).searchParams.get(
      "workspace",
    ),
    "private-created",
  );
  assert.equal(
    f.calls.some((c) => /claim|link.*venue/.test(c[0])),
    false,
  );
});
test("failed location retries reuse one idempotency key and never grant tools", async (t) => {
  const f = await fixture(t, { locations: [], failedCreate: true }),
    form = f.w.document.getElementById("create-location");
  form.querySelector("input").value = "Private office";
  for (let n = 0; n < 2; n++) {
    form.dispatchEvent(new f.w.Event("submit", { cancelable: true }));
    await tick();
  }
  const calls = f.calls.filter(
    (c) => c[0] === "create_private_operating_location",
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].p_request_id, calls[1][1].p_request_id);
  assert.equal(f.destinations.length, 0);
});
for (const query of [
  "?workspace=foreign",
  "?workspace=private-fixture&workspace=other",
  "?workspace=%2F%2Fevil.test",
])
  test(
    "explicit foreign or ambiguous location never falls back: " + query,
    async (t) => {
      const f = await fixture(t, { query });
      assert.equal(
        f.calls.some((c) => c[0] === "crm_workspace_access"),
        false,
      );
      assert.equal(f.w.document.querySelector("a.primary"), null);
    },
  );
test("billing failure leaves profile controls available", async (t) => {
  const f = await fixture(t, { failedBilling: true });
  assert.ok(f.w.document.getElementById("profile"));
  assert.match(
    f.w.document.getElementById("billing").textContent,
    /could not be loaded/,
  );
});
test("signout remains host-local", async (t) => {
  const f = await fixture(t);
  f.w.document.getElementById("signout").click();
  await tick();
  assert.equal(f.calls.find((c) => c[0] === "signout")[1].scope, "local");
});
test("guest signup and Google entry stay native using the established callback", async (t) => {
  const f = await fixture(t, { guest: true });
  assert.ok(f.w.document.getElementById("signup"));
  f.w.document.getElementById("google").click();
  await tick();
  assert.equal(
    f.calls.find((c) => c[0] === "oauth")[1].options.redirectTo,
    "https://akibusiness.com/login",
  );
  const intent = JSON.parse(
    f.w.sessionStorage.getItem("akibusiness:account-return"),
  );
  assert.equal(intent.tier, "standard");
  assert.equal(Object.hasOwn(intent, "access_token"), false);
});

for (const [canOperate, failedAccess, path] of [
  [true, false, "/login"],
  [false, false, "/account"],
  [true, true, null],
])
  test(`location picker checks access and opens ${path || "no destination"}`, async (t) => {
    const f = await fixture(t, { canOperate, failedAccess });
    f.w.document
      .getElementById("location-picker")
      .dispatchEvent(new f.w.Event("submit", { cancelable: true }));
    await tick();
    assert.equal(
      f.calls.filter((c) => c[0] === "crm_workspace_access").length,
      2,
    );
    if (!path) {
      assert.equal(f.destinations.length, 0);
      return;
    }
    const destination = new URL(f.destinations[0], "https://akibusiness.com");
    assert.equal(destination.origin, "https://akibusiness.com");
    assert.equal(destination.pathname, path);
    assert.equal(destination.searchParams.get("workspace"), "private-fixture");
    assert.equal(destination.searchParams.get("tier"), "standard");
  });

test("section keyboard navigation and theme/language changes preserve profile drafts", async (t) => {
  const f = await fixture(t),
    d = f.w.document;
  const workspace = d.querySelector('[data-account-nav="workspace"]');
  workspace.dispatchEvent(
    new f.w.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  assert.equal(
    d
      .querySelector('[data-account-nav="membership"]')
      .getAttribute("aria-selected"),
    "true",
  );
  d.querySelector('[data-account-nav="profile"]').click();
  d.querySelector('[name="displayName"]').value = "Unsaved profile";
  d.getElementById("theme").click();
  assert.equal(
    d.querySelector('[name="displayName"]').value,
    "Unsaved profile",
  );
  d.getElementById("language").click();
  assert.equal(
    d.querySelector('[name="displayName"]').value,
    "Unsaved profile",
  );
  assert.equal(d.getElementById("view-profile").hidden, false);
});
test("location selection removes the previous direct dashboard shortcut", async (t) => {
  const f = await fixture(t, {
      query: "?workspace=private-fixture",
      locations: [
        { id: "private-fixture", name: "First" },
        { id: "second-fixture", name: "Second" },
      ],
    }),
    d = f.w.document;
  const radio = d.querySelector('[value="second-fixture"]');
  radio.checked = true;
  radio.dispatchEvent(new f.w.Event("change"));
  assert.equal(d.getElementById("open-dashboard").hidden, true);
  assert.equal(d.getElementById("open-location").hidden, false);
});
test("empty workspaces expose location setup and disable the empty picker", async (t) => {
  const f = await fixture(t, { locations: [] }),
    d = f.w.document;
  assert.equal(d.querySelector(".create-panel").open, true);
  assert.equal(d.getElementById("open-location").disabled, true);
});

test("installed account cache includes the exact script and stylesheet versions requested by the document", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  for (const match of html.matchAll(
    /(?:src|href)="(assets\/account\.(?:js|css)\?v=[^"]+)"/g,
  )) {
    assert.ok(
      sw.includes('"./' + match[1] + '"'),
      "Missing account precache entry: " + match[1],
    );
  }
});
