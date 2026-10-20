#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(directory, "store-release.json"), "utf8"));
const fingerprint = (process.env.ANDROID_APP_SIGNING_SHA256 || "").toUpperCase().replaceAll(":", "");
const team = (process.env.APPLE_TEAM_ID || "").toUpperCase();
const universalLinks = (process.env.APPLE_UNIVERSAL_LINK_PATHS || "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

if (!/^[0-9A-F]{64}$/.test(fingerprint)) throw new Error("Use the real Play App Signing SHA-256 fingerprint");
if (!/^[A-Z0-9]{10}$/.test(team)) throw new Error("Use the real Apple Developer Team ID");
if (universalLinks.length === 0 || universalLinks.some((path) => path === "*" || path === "/*" || !path.startsWith("/") || path.includes("..") || path.includes("?"))) {
  throw new Error("APPLE_UNIVERSAL_LINK_PATHS must contain reviewed, scoped paths");
}

const certificate = fingerprint.match(/.{2}/g).join(":");
const android = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: config.proposedIdentifiers.androidApplicationId,
    sha256_cert_fingerprints: [certificate]
  }
}];
const apple = {
  applinks: {
    apps: [],
    details: [{
      appID: `${team}.${config.proposedIdentifiers.iosBundleId}`,
      paths: universalLinks
    }]
  }
};

console.log(`# ${config.webOrigin}/.well-known/assetlinks.json`);
console.log(JSON.stringify(android, null, 2));
console.log(`# ${config.webOrigin}/.well-known/apple-app-site-association`);
console.log(JSON.stringify(apple, null, 2));

