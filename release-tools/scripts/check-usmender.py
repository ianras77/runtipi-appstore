#!/usr/bin/env python3
"""Validate preparation; release rendering requires immutable artifacts, never enables app."""
import argparse, hashlib, json, pathlib, re, sys, subprocess, shutil
import yaml
ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / 'release-tools/usmender'
APP = ROOT / 'apps/web-usmender'
IMAGE = re.compile(r'^[a-z0-9][a-z0-9./_-]+@sha256:[a-f0-9]{64}$')

def read(path): return json.loads(path.read_text())
def validate(lock, release=False):
    config = read(APP / 'config.json')
    compose = yaml.safe_load((APP / 'docker-compose.yml').read_text())
    assert config['available'] is False, 'No automatic publication/availability promotion'
    assert config['id'] == 'web-usmender'
    assert config['min_tipi_version'] == '4.11.0'
    assert compose['x-runtipi']['schema_version'] == 2
    services = compose['services']
    assert set(services) == {'web','api','postgres','cat'}
    assert sum(s.get('x-runtipi',{}).get('is_main',False) for s in services.values()) == 1
    for s in services.values():
        assert not any(k in s for k in ['build','ports','privileged','network_mode','devices']), 'No source builds or host exposure'
        for volume in s.get('volumes',[]):
            assert volume.startswith('${APP_DATA_DIR}/data/'), 'Persistent data must belong to this install'
    contract = read(DATA / 'source-runtime-contract.json')
    assert hashlib.sha256((DATA/'source-runtime-contract.json').read_bytes()).hexdigest() == lock['sourceContractSha256']
    env = services['api']['environment']
    assert set(contract['api']['requiredProductionEnvironment']) <= env.keys()
    assert set(contract['syntheticLocalPackage']['services']) == set(services)
    assert contract['syntheticLocalPackage']['releaseQualified'] is False
    assert set(contract['cat']['requiredEnvironment']) <= services['cat']['environment'].keys()
    assert contract['cat']['persistentDataPath'] == '/app/cat/data'
    assert contract['build']['catMajor2Compatible'] is False
    for key, value in contract['api']['productionValues'].items(): assert env[key] == value
    for key,value in {'USMENDER_MESSAGING_PROVIDER':'local','USMENDER_SMS_PROVIDER':'console','USMENDER_ALLOW_SIMULATED_DELIVERY':'true','ENABLE_DB_ENCRYPTION':'false'}.items(): assert env[key] == value
    assert services['api']['depends_on']['postgres']['condition'] == 'service_healthy'
    assert lock['webBuildArguments'] == {'NEXT_PUBLIC_API_URL':'/api','API_INTERNAL_URL':'http://api:3001'}, 'Rewrite must target actual service at build time'
    assert lock['profile'] == 'synthetic-local-only'
    assert set(lock['images']) == set(services)
    for rel,digest in read(DATA/'existing-package-sha256.json').items():
        assert hashlib.sha256((ROOT/rel).read_bytes()).hexdigest() == digest, f'Existing package changed: {rel}'
    if release:
        assert re.fullmatch(r'[a-f0-9]{40}',lock.get('sourceCommit') or ''), 'Exact published source commit missing'
        for service, image in lock['images'].items():
            assert isinstance(image,str) and IMAGE.fullmatch(image), f'Missing immutable image: {service}'
            assert len(set(image.split(':')[-1])) > 1, 'Obvious placeholder digest rejected'
    return compose

def main():
    p=argparse.ArgumentParser();p.add_argument('--lock',type=pathlib.Path,default=DATA/'release-lock.json');p.add_argument('--render',type=pathlib.Path);p.add_argument('--source',type=pathlib.Path)
    args=p.parse_args();lock=read(args.lock)
    compose=validate(lock,release=bool(args.render))
    if args.source:
        actual=args.source/'ops/release/runtime-contract.json'
        assert actual.read_bytes()==(DATA/'source-runtime-contract.json').read_bytes(), 'Source contract drift: refresh and review package pairing'
        # Pure source validator: no dotenv import, database, network, migration or credentials.
        compiled=(args.source/'apps/api/dist/runtimeConfig.js').resolve()
        assert compiled.is_file(), 'Build the source API before paired validation'
        env=dict(compose['services']['api']['environment'])
        env.update(DATABASE_URL='postgresql://synthetic:fixture@postgres:5432/usmender', JWT_SECRET='synthetic-fixture-not-for-deployment-00000000', USMENDER_PUBLIC_WEB_URL='https://synthetic.invalid')
        code='import {validateRuntimeConfig} from '+json.dumps(compiled.as_uri())+'; const status=validateRuntimeConfig('+json.dumps(env)+'); if(status.sensitiveConversationReady!==false||status.simulatedSms!==true)process.exit(1); console.log(JSON.stringify(status));'
        subprocess.run([shutil.which('node'),'--input-type=module','-e',code],check=True,env={})
    if args.render:
        assert args.render.resolve() != (APP/'docker-compose.yml').resolve(), 'Render staging artifacts separately; never overwrite the gated package'
        for name,s in compose['services'].items():s['image']=lock['images'][name]
        args.render.write_text(yaml.safe_dump(compose,sort_keys=False))
    print('PASS: disabled USMender package contract' + ('; staging image rendering only, not installation qualification' if args.render else ''))
if __name__=='__main__':
    try:main()
    except (AssertionError,KeyError,ValueError) as e:print(f'BLOCKED: {e}',file=sys.stderr);sys.exit(1)
