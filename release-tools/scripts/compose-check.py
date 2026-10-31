import json, pathlib, sys, jsonschema
schema=json.loads((pathlib.Path(__file__).resolve().parents[1]/'schemas/compose-spec.json').read_text())
value=json.load(sys.stdin)
def check(v): return [{'path':e.json_path,'rule':e.validator} for e in jsonschema.Draft202012Validator(schema).iter_errors(v)]
print(json.dumps([{'id':v['id'],'problems':check(v['value'])} for v in value] if '--batch' in sys.argv else check(value)))
