import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function lintArguments(base) {
 if(!/^[a-f0-9]{40}$/.test(base||'')||/^0+$/.test(base))throw new Error('Set BASE_SHA to the actual nonzero PR base or previous push commit');
 return ['ci','--changed',`--since=${base}`,'--error-on-warnings','--no-errors-on-unmatched'];
}
function main(){
 const args=lintArguments(process.env.BASE_SHA);
 const present=spawnSync('git',['cat-file','-e',`${process.env.BASE_SHA}^{commit}`]);
 if(present.status!==0)throw new Error('BASE_SHA commit is missing; fetch full PR/base history before linting');
 const result=spawnSync(resolve('node_modules/.bin/biome'),args,{stdio:'inherit'});
 if(result.error)throw result.error;
 process.exitCode=result.status??1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
