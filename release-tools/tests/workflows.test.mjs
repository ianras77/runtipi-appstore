import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { parse } from 'yaml';
import { lintArguments } from '../scripts/lint-changed.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const close=parse(readFileSync(resolve(root,'.github/workflows/close-pr.yml'),'utf8'));
const job=close.jobs['close-external-pr'];
const condition=job.steps.find(s=>s.uses?.startsWith('superbrothers/close-pull-request@')).if;
const expression=condition.slice(3,-2).trim();
for(const [label,head,base,fork,expected] of [
 ['same-repository branch in fork stays open','ianras77/runtipi-appstore','ianras77/runtipi-appstore',true,false],
 ['same-repository nonfork stays open','ianras77/runtipi-appstore','ianras77/runtipi-appstore',false,false],
 ['external fork retains close policy','outside/runtipi-appstore','ianras77/runtipi-appstore',true,true],
])test(label,()=>assert.equal(runInNewContext(expression,{github:{event:{pull_request:{head:{repo:{full_name:head,fork}},base:{repo:{full_name:base}}}}}}),expected));
test('no-close label escape preserved',()=>assert.equal(job.if,"${{ !contains( github.event.pull_request.labels.*.name, 'no-close') }}"));
test('target workflow does not execute PR checkout or shell code',()=>{assert(job.steps.every(s=>!s.run&&!s.uses?.startsWith('actions/checkout')));assert.equal(close.permissions,undefined);});
const ci=parse(readFileSync(resolve(root,'.github/workflows/ci.yml'),'utf8'));
test('CI runs checked-in suite on current pinned runtime with lockfile-compatible pnpm',()=>{
 assert.equal(ci.jobs.ci.steps.find(s=>s.uses?.startsWith('actions/setup-node')).with['node-version'],'24.22.2');
 assert.equal(ci.jobs.ci.steps.find(s=>s.uses?.startsWith('pnpm/action-setup')).with.version,'12.16.1');
 assert(ci.jobs.ci.steps.some(s=>s.run==='pnpm test'));
 assert.equal(JSON.parse(readFileSync(resolve(root,'package.json'))).scripts.test,'npm run test:store-contracts');
 assert(ci.jobs.ci.steps.some(s=>s.run?.includes('--frozen-lockfile --ignore-scripts')));
});
test('CI uses actual event base, not origin/master',()=>{
 const step=ci.jobs.ci.steps.find(s=>s.run==='pnpm run lint:ci');assert.equal(step.env.BASE_SHA,'${{ github.event.pull_request.base.sha || github.event.before }}');
 assert(!JSON.parse(readFileSync(resolve(root,'biome.json'))).vcs.defaultBranch);
});
test('lint requires explicit valid base and cannot inject shell arguments',()=>{for(const base of [undefined,'origin/master','0'.repeat(40),'x; echo unsafe'])assert.throws(()=>lintArguments(base));assert(lintArguments('a'.repeat(40)).includes('--since='+'a'.repeat(40)));});

test('install workflows do not upload dependency advisory inventories',()=>{
 for(const filename of ['ci.yml','web-package-contracts.yml']){
  const workflow=parse(readFileSync(resolve(root,'.github/workflows',filename),'utf8'));
  assert.equal(workflow.env.npm_config_audit,'false');
  assert.equal(workflow.env.npm_config_fund,'false');
 }
});
