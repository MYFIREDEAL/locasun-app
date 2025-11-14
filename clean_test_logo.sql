-- Nettoyer le logo de test et remettre à NULL

UPDATE public.company_settings
SET logo_url = NULL,
    updated_at = NOW()
WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';

-- Vérifier
SELECT 
  id, 
  company_name, 
  logo_url,
  CASE 
    WHEN logo_url IS NULL THEN '✅ Logo nettoyé (NULL)'
    ELSE '⚠️ Logo contient: ' || logo_url
  END as status
FROM public.company_settings;
