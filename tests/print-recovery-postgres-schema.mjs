// Synthetic schema only. Never apply this generator to a deployed project.
import {readFileSync} from 'node:fs';
import {setupKitchenDatabase} from './pos-kds-fixture.mjs';
const parts=[];
await setupKitchenDatabase({async exec(sql){parts.push(sql);}});
parts.push("create function public.account_features_allowed() returns boolean language sql stable as $$select true$$;");
parts.push(readFileSync(new URL('../supabase/migrations/20261031113907_printer_recovery_ack.sql',import.meta.url),'utf8'));
process.stdout.write(parts.join('\n'));
