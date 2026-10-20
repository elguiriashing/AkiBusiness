#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {buildMigrationManifest} from '../billing/migration-manifest.mjs';
const args=process.argv.slice(2);
if(args.length!==4||args[0]!=='--input'||args[2]!=='--output'){console.error('Usage: node tools/prepare-operations-migration.mjs --input PRIVATE-SNAPSHOT.json --output PRIVATE-MANIFEST.json (dry-run only)');process.exit(2);}
try{const manifest=buildMigrationManifest(JSON.parse(await readFile(args[1],'utf8')));await writeFile(args[3],JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({mode:manifest.mode,rows:manifest.rows.length,blocked:manifest.rows.filter(r=>r.status==='blocked').length,manifestSha256:manifest.manifestSha256}));}catch(error){console.error(error.message);process.exitCode=1;}
