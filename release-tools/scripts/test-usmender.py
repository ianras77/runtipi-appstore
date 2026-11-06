import copy, importlib.util, pathlib, unittest
p=pathlib.Path(__file__).with_name('check-usmender.py');s=importlib.util.spec_from_file_location('check',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Contract(unittest.TestCase):
 def setUp(self):self.lock=m.read(m.DATA/'release-lock.json')
 def test_disabled_package(self):m.validate(self.lock)
 def test_missing_release_fails(self):
  with self.assertRaises(AssertionError):m.validate(self.lock,True)
 def test_mutated_contract_fails(self):
  self.lock['sourceContractSha256']='0'*64
  with self.assertRaises(AssertionError):m.validate(self.lock)
 def test_runtime_only_rewrite_fails(self):
  self.lock['webBuildArguments']={}
  with self.assertRaises(AssertionError):m.validate(self.lock)
 def test_wrong_service_fails(self):
  self.lock['webBuildArguments']['API_INTERNAL_URL']='http://old-api:3001'
  with self.assertRaises(AssertionError):m.validate(self.lock)
 def test_missing_image_fails(self):
  self.lock['sourceCommit']='a'*40
  with self.assertRaises(AssertionError):m.validate(self.lock,True)
 def test_tag_only_fails(self):
  self.lock['sourceCommit']='a'*40;self.lock['images']={k:'example.test/app:latest' for k in self.lock['images']}
  with self.assertRaises(AssertionError):m.validate(self.lock,True)
 def test_placeholder_fails(self):
  self.lock['sourceCommit']='a'*40;self.lock['images']={k:'example.test/app@sha256:'+'0'*64 for k in self.lock['images']}
  with self.assertRaises(AssertionError):m.validate(self.lock,True)
 def test_matrix_profile_not_implied(self):
  self.lock['profile']='matrix'
  with self.assertRaises(AssertionError):m.validate(self.lock)
 def test_source_changes_require_review(self):
  self.lock['images']['worker']=None
  with self.assertRaises(AssertionError):m.validate(self.lock)
if __name__=='__main__':unittest.main()
