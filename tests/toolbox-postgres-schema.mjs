import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./toolbox-db.test.mjs',import.meta.url),'utf8');
const fixture=source.match(/await db\.exec\(`([\s\S]*?)`\);/)[1];
console.log(fixture);
console.log(await readFile(new URL('../supabase/migrations/20261020170509_subscription_toolbox.sql',import.meta.url),'utf8'));
