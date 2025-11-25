-- 🔍 TESTER MANUELLEMENT LA POLICY "Users can insert prospects"

-- Simuler la condition WITH CHECK de la policy pour Charly
SELECT 
  'Test Condition 1: owner_id = auth.uid()' as test,
  ('e85ff206-87a2-4d63-9f1d-4d97f1842159' = 'e85ff206-87a2-4d63-9f1d-4d97f1842159') as result;

-- Simuler la condition EXISTS
SELECT 
  'Test Condition 2: User exists with role Commercial' as test,
  EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159' 
      AND role IN ('Commercial', 'Manager', 'Global Admin')
  ) as result;

-- Combiner les deux (logique AND)
SELECT 
  'Test Policy Complète' as test,
  (
    ('e85ff206-87a2-4d63-9f1d-4d97f1842159' = 'e85ff206-87a2-4d63-9f1d-4d97f1842159' OR 'e85ff206-87a2-4d63-9f1d-4d97f1842159' IS NULL) AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159' 
        AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  ) as "Policy devrait passer?";

-- Tester avec Jack LUC (Global Admin)
SELECT 
  'Test Jack LUC (Global Admin)' as test,
  (
    ('82be903d-9600-4c53-9cd4-113bfaaac12e' = '82be903d-9600-4c53-9cd4-113bfaaac12e' OR '82be903d-9600-4c53-9cd4-113bfaaac12e' IS NULL) AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = '82be903d-9600-4c53-9cd4-113bfaaac12e' 
        AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  ) as "Policy passe pour Jack?";
