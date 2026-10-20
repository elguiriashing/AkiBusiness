import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const generator = join(directory, "generate-associations.mjs");
const validEnvironment = {
  ...process.env,
  ANDROID_APP_SIGNING_SHA256: "AB".repeat(32),
  APPLE_TEAM_ID: "A1B2C3D4E5",
  APPLE_UNIVERSAL_LINK_PATHS: "/pos/*,/locations/*"
};

test("association output preserves reviewed Apple paths", () => {
  const output = execFileSync(process.execPath, [generator], {
    encoding: "utf8",
    env: validEnvironment
  });

  assert.match(output, /"\/pos\/\*"/);
  assert.match(output, /"\/locations\/\*"/);
  assert.doesNotMatch(output, /"paths": \[\s*"\*"/);
});

test("association generation rejects catch-all Apple paths", () => {
  assert.throws(
    () => execFileSync(process.execPath, [generator], {
      env: { ...validEnvironment, APPLE_UNIVERSAL_LINK_PATHS: "*" },
      stdio: "pipe"
    }),
    /Command failed/
  );
});

