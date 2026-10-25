import pathlib
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class CRMContracts(unittest.TestCase):
 def test_landing_is_database_backed(self):
  s=(ROOT/'index.html').read_text(encoding='utf-8')
  self.assertIn("from('products').select",s);self.assertIn("from('categories').select",s);self.assertIn('postgres_changes',s)
  self.assertNotIn('Bombas de Salmón',s);self.assertNotIn('producto sugerido',s.lower())
 def test_admin_routes(self):
  s=(ROOT/'admin.html').read_text(encoding='utf-8')
  for p in ('customers','inventory','reports'):self.assertIn(p,s)
 def test_marketing_table_is_public_read_only_when_published(self):
  s=(ROOT/'index.html').read_text(encoding='utf-8')
  self.assertIn("from('marketing_campaigns')",s);self.assertIn("table:'marketing_campaigns'",s)
  sql=(ROOT/'supabase/migrations/20261025010000_crm_operational_modules.sql').read_text(encoding='utf-8')
  self.assertIn('Public read marketing campaigns',sql)
 def test_migration_contains_security_and_atomic_stock(self):
  s=(ROOT/'supabase/migrations/20261025010000_crm_operational_modules.sql').read_text(encoding='utf-8')
  for k in ('ENABLE ROW LEVEL SECURITY','record_stock_movement','ON CONFLICT(idempotency_key)','receive_purchase_order','consume_recipe_stock_for_order'):self.assertIn(k,s)
if __name__=='__main__':unittest.main()
