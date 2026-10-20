#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const fail = (reason) => {
  console.error(`Mobile release: ${reason}`);
  process.exitCode = 1;
};

let data;
try {
  data = JSON.parse(readFileSync(join(directory, "store-release.json"), "utf8"));
} catch (error) {
  fail(`Unable to parse store-release.json: ${error.message}`);
  process.exit(1);
}

const idPattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,}$/;
const { proposedIdentifiers: ids, listingDraft: listing, gates, platformRequirements: requirements } = data;

if (data.schemaVersion !== 1) fail("Unsupported schema version");
if (data.product !== "AkiBusiness" || data.webOrigin !== "https://akibusiness.com") fail("Wrong product or canonical origin");
if (!ids || !idPattern.test(ids.androidApplicationId || "") || !idPattern.test(ids.iosBundleId || "")) fail("Invalid proposed mobile identifiers");
if (!requirements || requirements.googlePlayTargetApiMinimum < 36 || requirements.iosBuildWithXcodeMajorMinimum < 26) fail("Outdated platform requirements");
if (!listing || listing.primaryLocale !== "es-ES" || !listing.fullDescriptionEs || !listing.fullDescriptionEn) fail("Missing bilingual listing draft");
if (!gates || Object.keys(gates).length < 10 || Object.values(gates).some((value) => typeof value !== "boolean")) fail("Missing or invalid release gates");

if (process.argv.includes("--ship")) {
  if (data.status !== "READY_FOR_INTERNAL_REVIEW") fail("Status is not READY_FOR_INTERNAL_REVIEW");
  for (const [name, passed] of Object.entries(gates || {})) if (!passed) fail(`Release gate not verified: ${name}`);
  for (const name of ["privacyPolicyUrl", "supportUrl"]) if (!listing?.[name]) fail(`Required store metadata is empty: ${name}`);
} else if (!process.exitCode) {
  const passed = Object.values(gates).filter(Boolean).length;
  console.log(`AkiBusiness: metadata valid; ${passed}/${Object.keys(gates).length} release gates verified. Strict ship gate remains closed.`);
}

