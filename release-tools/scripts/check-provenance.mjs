import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const provenance=JSON.parse(readFileSync(resolve(root,'schemas/provenance.json')));
assert.equal(provenance.runtipi_release,'v4.11.0');
assert.equal(provenance.runtipi_commit,'5e4d7a5bb1d537782191fc1fbcb7e30c0423d566');
for(const {path,git_blob_sha} of JSON.parse(readFileSync(resolve(root,'schemas/upstream-blob-shas.json')))){
 const data=readFileSync(resolve(root,'schemas/upstream',path));
 const actual=createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
 assert.equal(actual,git_blob_sha,`Upstream source differs: ${path}`);
}
console.log('PASS exact upstream schema blob provenance; latest stable verified 2026-10-30, not a perpetual freshness claim');
