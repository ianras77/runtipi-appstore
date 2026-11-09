import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { type } from 'arktype';
import { appInfoSchema } from '../schemas/compiled/schemas/app-info.js';
import { dynamicComposeSchemaYaml } from '../schemas/compiled/schemas/compose-yaml.js';

const roots=process.argv.slice(2);
if(!roots.length) roots.push('../apps/web-usmender');
let failures=0, count=0;
for(const root of roots) for(const name of (existsSync(join(resolve(root),"config.json")) ? ["."] : readdirSync(resolve(root)))) {
 const dir=join(resolve(root),name);
 if(!existsSync(join(dir,'config.json'))) continue;
 for(const [file,schema,parser] of [ ['config.json',appInfoSchema.omit('urn'),JSON.parse], ['docker-compose.yml',dynamicComposeSchemaYaml,parse] ]) {
  const value=parser(readFileSync(join(dir,file),'utf8'));
  const checked=schema(value);
  if(checked instanceof type.errors) { failures++; console.error(`${name}/${file}: ${checked.summary}`); }
  else {count++; console.log(`PASS official v4.11.0 ${name}/${file}`);}
 }
}
// Prove the real upstream validator rejects errors that YAML-only validation misses.
assert(dynamicComposeSchemaYaml({services:{app:{image:'test'}},'x-runtipi':{schema_version:99}}) instanceof type.errors);
assert(dynamicComposeSchemaYaml({services:{app:{}},'x-runtipi':{schema_version:2}}) instanceof type.errors);
assert(dynamicComposeSchemaYaml({services:{app:{image:'test'}},'x-runtipi':{schema_version:2,migrations:[]}}) instanceof type.errors);
console.log(JSON.stringify({validatedFiles:count,failures,negativeSchemaCases:3}));
process.exitCode=failures?1:0;
