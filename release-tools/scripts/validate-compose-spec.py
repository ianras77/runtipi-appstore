#!/usr/bin/env python3
import json,pathlib,sys,yaml,jsonschema
root=pathlib.Path(__file__).resolve().parents[1]
schema=json.loads((root/'schemas/compose-spec.json').read_text());validator=jsonschema.Draft202012Validator(schema)
errors=0;files=0
for folder in sys.argv[1:] or ['../apps/web-usmender']:
 for p in ([pathlib.Path(folder)/'docker-compose.yml'] if (pathlib.Path(folder)/'config.json').exists() else sorted(pathlib.Path(folder).glob('*/docker-compose.yml'))):
  found=list(validator.iter_errors(yaml.safe_load(p.read_text())))
  print(('FAIL' if found else 'PASS')+' compose-spec '+str(p));errors+=len(found);files+=1
  for e in found:print(e.json_path,e.message)
print(json.dumps({'files':files,'errors':errors}));sys.exit(bool(errors))
