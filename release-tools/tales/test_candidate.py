import json,pathlib,unittest,yaml
ROOT=pathlib.Path(__file__).resolve().parents[2]
class Candidate(unittest.TestCase):
 def test_contract(self):
  app=ROOT/'apps/web-totallyrighteoustales'
  cfg=json.loads((app/'config.json').read_text()); d=yaml.safe_load((app/'docker-compose.yml').read_text()); s=d['services']
  self.assertIs(cfg['available'],False); self.assertIs(cfg['exposable'],False)
  self.assertEqual(set(s),{'web','api','worker','postgres','redis'})
  for service in s.values():
   self.assertNotIn('build',service); self.assertNotIn('ports',service); self.assertNotIn('container_name',service)
   self.assertIn(':?Unreleased:',service['image'])
  self.assertEqual(s['api']['environment']['DEV_AUTH_BYPASS'],'false')
  self.assertEqual(s['worker']['environment']['DEV_AUTH_BYPASS'],'false')
  self.assertIn('${APP_DATA_DIR}/data/redis:/data',s['redis']['volumes'])
  self.assertIn('${APP_DATA_DIR}/data/postgres:/var/lib/postgresql/data',s['postgres']['volumes'])
  self.assertIn('noeviction',s['redis']['command']); self.assertIn('yes',s['redis']['command'])
  self.assertEqual(s['worker']['depends_on']['api']['condition'],'service_healthy')
  lock=json.loads((ROOT/'release-tools/tales/release-lock.json').read_text())
  self.assertEqual(lock['sourceCommit'],'2bcc0b9e56d1d66e122f70661f4e7e96f187d014')
  self.assertEqual(lock['webBuildArguments']['NEXT_PUBLIC_API_URL'],'/api')
  self.assertEqual(lock['webBuildArguments']['TALES_API_PROXY_ORIGIN'],'http://api:3191')
  self.assertIsNone(lock['webBuildArguments']['NEXT_PUBLIC_SUPABASE_URL'])
  self.assertIsNone(lock['webBuildArguments']['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
  self.assertEqual(s['web']['environment']['NEXT_PUBLIC_API_URL'],'/api')
  self.assertEqual(s['web']['environment']['API_INTERNAL_URL'],'http://api:3191')
  self.assertTrue(all(v is None for v in lock['images'].values()))
  self.assertTrue(all(v is None for v in lock['qualification'].values()))
if __name__=='__main__':unittest.main()
