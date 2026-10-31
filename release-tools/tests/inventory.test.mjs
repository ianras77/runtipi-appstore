import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCompose, compare, inventory, validateComposeCoverage } from '../scripts/validate-inventory.mjs';
const v1={services:[{name:'app',image:'example/app:1.0',environment:{FOO:'bar'}}]};
const v2={schemaVersion:2,services:[{name:'app',image:'example/app:1.0',environment:[{key:'FOO',value:'bar'}]}]};
const fixtures=[
 ['v1 accepted as legacy',v1,'json','dynamic-json-v1',true],
 ['v2 accepted as current',v2,'json','dynamic-json-v2',true],
 ['v2 object environment rejected',{...v2,services:v1.services},'json','dynamic-json-v2',false],
 ['v1 array environment rejected',{services:v2.services},'json','dynamic-json-v1',false],
 ['unknown version fails closed',{...v2,schemaVersion:3},'json','unsupported-json',false],
 ['string version fails closed',{...v2,schemaVersion:'2'},'json','unsupported-json',false],
 ['explicit v1 is not undefined-version legacy',{...v1,schemaVersion:1},'json','unsupported-json',false],
 ['empty v2 rejected',{schemaVersion:2,services:[]},'json','dynamic-json-v2',false],
 ['missing image rejected',{schemaVersion:2,services:[{name:'app'}]},'json','dynamic-json-v2',false],
 ['plain Compose accepted only as legacy',{services:{app:{image:'example/app:1.0'}}},'yaml','compose-yaml-legacy',true],
 ['Runtipi YAML tagged accepted',{'x-runtipi':{schema_version:2},services:{app:{image:'example/app:1.0'}}},'yaml','runtipi-yaml',true],
 ['Runtipi YAML unknown version rejected',{'x-runtipi':{schema_version:9},services:{app:{image:'example/app:1.0'}}},'yaml','runtipi-yaml',false],
 ['Compose invalid ports rejected',{services:{app:{image:'example/app:1.0',ports:'not-an-array'}}},'yaml','compose-yaml-legacy',false],
 ['Compose invalid unknown key rejected',{services:{app:{image:'example/app:1.0',invented_option:true}}},'yaml','compose-yaml-legacy',false],
];
for(const [label,data,ext,format,pass] of fixtures)test(label,()=>{const result=checkCompose(data,ext);assert.equal(result.format,format);assert.equal(result.issues.length===0,pass);});
const existing={id:'existing',files:{'config.json':'hash'},issues:[{code:'known-failure'}],warnings:[],tipiVersion:2,formats:[{format:'dynamic-json-v2'}]};
const snapshot=p=>({packages:[p]});
test('unchanged baseline failures remain visible, not regressions',()=>{const r=compare(snapshot(existing),snapshot(existing));assert.equal(r.knownBaselineIssues.length,1);assert.equal(r.regressions.length,0);});
test('changed broken package loses its baseline exception',()=>{const p=structuredClone(existing);p.files['config.json']='changed';p.tipiVersion=3;assert(compare(snapshot(p),snapshot(existing)).regressions.some(i=>i.code==='known-failure'));});
test('new issue in unchanged bytes cannot be swallowed',()=>{const p=structuredClone(existing);p.issues.push({code:'new-failure'});assert(compare(snapshot(p),snapshot(existing)).regressions.some(i=>i.code==='new-failure'));});
test('changed package requires tipi_version increase',()=>{const p=structuredClone(existing);p.files['config.json']='changed';p.issues=[];assert(compare(snapshot(p),snapshot(existing)).regressions.some(i=>i.code==='changed-package-requires-tipi-version-increase'));});
test('schema downgrade blocked',()=>{const p=structuredClone(existing);p.formats=[{format:'dynamic-json-v1'}];assert(compare(snapshot(p),snapshot(existing)).regressions.some(i=>i.code==='schema-downgrade'));});
test('package removal blocked',()=>assert.equal(compare({packages:[]},snapshot(existing)).regressions[0].code,'existing-package-removed'));
test('new floating latest image blocked',()=>{const p={...existing,id:'new',issues:[],warnings:[{code:'floating-image'}]};assert(compare(snapshot(p),{packages:[]}).regressions.some(i=>i.code==='floating-image'));});
test('nonrecursive scan never reads nested source/env and refuses symlink config',()=>{
 const root=mkdtempSync(join(tmpdir(),'store-fixture-'));
 try{mkdirSync(join(root,'nested/source'),{recursive:true});writeFileSync(join(root,'nested/source/.env'),'synthetic unreadable fixture');mkdirSync(join(root,'app'));symlinkSync('/definitely-not-readable',join(root,'app/config.json'));writeFileSync(join(root,'app/docker-compose.json'),JSON.stringify(v2));
 // Add normal package so scanner cannot claim empty success.
 mkdirSync(join(root,'normal'));writeFileSync(join(root,'normal/config.json'),JSON.stringify({id:'normal',name:'Fixture',available:false,tipi_version:1,short_desc:'fixture',author:'fixture',source:'https://example.invalid'}));writeFileSync(join(root,'normal/docker-compose.json'),JSON.stringify(v2));
 const r=inventory(root);assert(r.excludedDirectories.includes('nested'));assert(r.packages.find(p=>p.id==='app')?.issues.some(i=>i.code==='symlink-refused'));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('invalid null metadata is reported, not a validator crash',()=>{
 const root=mkdtempSync(join(tmpdir(),'store-null-'));
 try{mkdirSync(join(root,'broken'));writeFileSync(join(root,'broken/config.json'),'null');writeFileSync(join(root,'broken/docker-compose.json'),JSON.stringify(v2));const r=inventory(root);assert(r.packages[0].issues.some(i=>i.code==='metadata-not-object'));}
 finally{rmSync(root,{recursive:true,force:true});}
});

const requests=[{id:'app-a/docker-compose.yml@hash-a'},{id:'app-b/docker-compose.yml@hash-b'}];
const good=requests.map(({id})=>({id,problems:[]}));
for(const [name,results] of [
 ['truncated',good.slice(0,1)],
 ['empty',[]],
 ['extraneous',[...good,{id:'extra',problems:[]}]],
 ['duplicate',[good[0],good[0]]],
 ['unknown identity',[good[0],{id:'other',problems:[]}]],
 ['wrong content hash',[good[0],{id:'app-b/docker-compose.yml@stale',problems:[]}]],
 ['malformed result',[good[0],{id:requests[1].id,problems:null}]],
 ['malformed problem',[good[0],{id:requests[1].id,problems:[{}]}]],
 ['non-array response',{}],
])test('batch coverage rejects '+name,()=>assert.throws(()=>validateComposeCoverage(requests,results)));
test('batch result order cannot misattribute a failure',()=>{
 const problem={path:'$.services.app.ports',rule:'type'};
 assert.deepEqual(validateComposeCoverage(requests,[{id:requests[1].id,problems:[problem]},good[0]]),[[],[problem]]);
});
test('duplicate request identity fails closed',()=>assert.throws(()=>validateComposeCoverage([requests[0],requests[0]],good)));
