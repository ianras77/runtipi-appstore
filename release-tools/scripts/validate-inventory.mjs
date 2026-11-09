import { readFileSync, readdirSync, existsSync, lstatSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { type } from 'arktype';
import { appInfoSchema } from '../schemas/compiled/schemas/app-info.js';
import { dynamicComposeSchemaV1 } from '../schemas/compiled/schemas/utils/converters/v1.js';
import { dynamicComposeSchemaV2 } from '../schemas/compiled/schemas/dynamic-compose.js';
import { dynamicComposeSchemaYaml } from '../schemas/compiled/schemas/compose-yaml.js';
const HERE=dirname(fileURLToPath(import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
const metadata=appInfoSchema.omit('urn');
const present=p=>{try{lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
// Require one well-formed result for every exact request identity. Never equate
// a truncated/empty validator response with a successful unchecked document.
export function validateComposeCoverage(documents, results) {
 if(!Array.isArray(results)||results.length!==documents.length)throw new Error('Compose batch coverage count mismatch');
 const expected=new Set(documents.map(d=>d.id));
 if(expected.size!==documents.length)throw new Error('Compose request identity collision');
 const found=new Map();
 for(const result of results){
  if(result===null||typeof result!=='object'||typeof result.id!=='string'||!expected.has(result.id)||found.has(result.id))throw new Error('Compose batch duplicate or unexpected identity');
  if(!Array.isArray(result.problems)||result.problems.some(p=>p===null||typeof p!=='object'||typeof p.path!=='string'||typeof p.rule!=='string'))throw new Error('Compose batch malformed validation result');
  found.set(result.id,result.problems);
 }
 if(found.size!==expected.size)throw new Error('Compose batch incomplete coverage');
 return documents.map(d=>found.get(d.id));
}
function runComposeChecks(documents){
 const result=spawnSync('python3',[join(HERE,'compose-check.py'),'--batch'],{input:JSON.stringify(documents),encoding:'utf8'});
 if(result.status!==0)throw new Error('Compose validator unavailable (not a package pass)');
 return validateComposeCoverage(documents,JSON.parse(result.stdout));
}
export function checkCompose(value, extension, composeSpec=true) {
 const issues=[]; let format;
 if(extension==='json') {
  if(value?.schemaVersion===undefined)format='dynamic-json-v1';
  else if(value?.schemaVersion===2)format='dynamic-json-v2';
  else return {format:'unsupported-json',issues:[{code:'unsupported-schema-version'}]};
  const result=(format.endsWith('v1')?dynamicComposeSchemaV1:dynamicComposeSchemaV2)(value);
  if(result instanceof type.errors)issues.push({code:'official-schema',paths:Array.from(result,e=>String(e.path))});
 } else {
  format=value?.['x-runtipi']===undefined?'compose-yaml-legacy':'runtipi-yaml';
  if(format==='runtipi-yaml'){
   const result=dynamicComposeSchemaYaml(value);
   if(result instanceof type.errors)issues.push({code:'official-schema',paths:Array.from(result,e=>String(e.path))});
  }
  if(composeSpec){
  const [problems]=runComposeChecks([{id:hash(JSON.stringify(value)),value}]);
  if(problems.length)issues.push({code:'compose-spec',paths:problems.map(x=>x.path+':'+x.rule)});
  }
 }
 return {format,issues};
}
export function inventory(root) {
 const packages=[], excluded=[], composeDocuments=[];
 for(const dir of readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  // Deliberately nonrecursive: never read nested repositories, env files or assets.
  if(!dir.isDirectory())continue;
  const base=join(root,dir.name), configPath=join(base,'config.json');
  if(!present(configPath)){excluded.push(dir.name);continue;}
  const p={id:dir.name,files:{},issues:[],warnings:[],formats:[],version:null,tipiVersion:null};packages.push(p);
  let config;
  for(const file of ['config.json','docker-compose.json','docker-compose.yml','docker-compose.yaml']){
   const path=join(base,file);if(!present(path))continue;
   if(lstatSync(path).isSymbolicLink()){p.issues.push({file,code:'symlink-refused'});continue;}
   const bytes=readFileSync(path);p.files[file]=hash(bytes);
   let value;try{value=file.endsWith('.json')?JSON.parse(bytes):parse(bytes.toString());}catch{p.issues.push({file,code:'parse-error'});continue;}
   if(file==='config.json'){
    if(value===null||typeof value!=='object'||Array.isArray(value)){p.issues.push({file,code:'metadata-not-object'});continue;}
    config=value;p.version=value.version;p.tipiVersion=value.tipi_version;
    const result=metadata(value);if(result instanceof type.errors)p.issues.push({file,code:'official-schema',paths:Array.from(result,e=>String(e.path))});
    if(value.id!==dir.name)p.issues.push({file,code:'folder-id-mismatch'});
   }else{
    if(!file.endsWith('.json'))composeDocuments.push({p,file,value,id:dir.name+'/'+file+'@'+p.files[file]});
    const result=checkCompose(value,file.endsWith('.json')?'json':'yaml',false);p.formats.push({file,format:result.format});p.issues.push(...result.issues.map(x=>({file,...x})));
    const services=Array.isArray(value?.services)?value.services:Object.values(value?.services||{});
    for(const [index,service] of services.entries())if(typeof service?.image==='string'&&(!service.image.includes('@sha256:'))){
     const last=service.image.split('/').at(-1);
     if(!last.includes(':')||/:latest$|:nightly$|:main$|:master$/.test(last))p.warnings.push({file,code:'floating-image',serviceIndex:index});
    }
   }
  }
  if(!p.formats.length)p.issues.push({code:'missing-compose'});
  if(config?.dynamic_config&&p.formats.every(x=>x.format==='compose-yaml-legacy'))p.issues.push({code:'dynamic-config-without-dynamic-contract'});
  if(p.formats.some(x=>x.format==='dynamic-json-v1'))p.warnings.push({code:'legacy-v1-supported-not-current'});
  if(p.formats.length>1)p.warnings.push({code:'multiple-compose-files-all-validated-no-runtime-precedence-claim'});
  if(!config?.available)p.warnings.push({code:'unavailable-not-install-qualified'});
 }
 if(composeDocuments.length){
  runComposeChecks(composeDocuments.map(({id,value})=>({id,value}))).forEach((problems,i)=>{if(problems.length)composeDocuments[i].p.issues.push({file:composeDocuments[i].file,code:'compose-spec',paths:problems.map(x=>x.path+':'+x.rule)});});
 }
 if(packages.length===0)throw new Error('No direct app packages found');
 return {schemaVersion:1,validatorRelease:'v4.11.0',packages,excludedDirectories:excluded};
}
export function compare(current,baseline){
 const regressions=[],known=[];const old=new Map(baseline.packages.map(p=>[p.id,p]));
 for(const p of current.packages){
  const before=old.get(p.id);old.delete(p.id);
  const unchanged=before&&JSON.stringify(p.files)===JSON.stringify(before.files);
  for(const issue of p.issues){
   if(unchanged&&before.issues.some(i=>JSON.stringify(i)===JSON.stringify(issue)))known.push({app:p.id,...issue});
   else regressions.push({app:p.id,...issue});
  }
  if(before&&!unchanged&&(!(Number.isInteger(p.tipiVersion)&&p.tipiVersion>before.tipiVersion)))regressions.push({app:p.id,code:'changed-package-requires-tipi-version-increase'});
  if(before&&before.formats.some(f=>f.format==='dynamic-json-v2')&&p.formats.some(f=>f.format==='dynamic-json-v1'))regressions.push({app:p.id,code:'schema-downgrade'});
  if(!unchanged)for(const warning of p.warnings.filter(w=>w.code==='floating-image'))regressions.push({app:p.id,...warning});
 }
 for(const p of old.values())regressions.push({app:p.id,code:'existing-package-removed'});
 return {regressions,knownBaselineIssues:known};
}
function main(){
 const args=process.argv.slice(2), get=(flag,fallback)=>args.includes(flag)?args[args.indexOf(flag)+1]:fallback;
 const report=inventory(resolve(get('--apps',join(HERE,'../../apps'))));
 const baselinePath=get('--baseline',null);if(baselinePath)Object.assign(report,compare(report,JSON.parse(readFileSync(baselinePath))));
 const errors=report.packages.reduce((n,p)=>n+p.issues.length,0);
 report.summary={packages:report.packages.length,packagesWithIssues:report.packages.filter(p=>p.issues.length).length,issues:errors,warnings:report.packages.reduce((n,p)=>n+p.warnings.length,0),newRegressions:report.regressions?.length??null};
 if(get('--output',null))writeFileSync(get('--output'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.summary));
 if(baselinePath)console.log(`Inventory ${errors?'DEGRADED':'schema-clean'}; regression gate ${report.regressions.length?'FAIL':'PASS'}. Schema checks are not install qualification.`);
 process.exitCode=baselinePath?Number(report.regressions.length>0):Number(errors>0);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
