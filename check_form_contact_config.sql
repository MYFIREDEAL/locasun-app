-- Vérifier le contenu actuel de company_settings
-- notamment le champ "settings" qui devrait contenir la config du formulaire contact

SELECT 
  id,
  company_name,
  CASE 
    WHEN logo_url IS NOT NULL THEN CONCAT('Logo: ', LENGTH(logo_url), ' chars')
    ELSE 'Pas de logo'
  END as logo_status,
  settings,
  CASE 
    WHEN settings IS NOT NULL AND settings != '{}'::jsonb THEN '✅ Settings configurés'
    ELSE '⚠️ Settings vides'
  END as settings_status,
  created_at,
  updated_at
FROM public.company_settings;

-- Détail des settings (formulaire contact devrait être ici)
SELECT 
  settings,
  jsonb_pretty(settings) as settings_formatted
FROM public.company_settings
WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';

-- Structure attendue pour le formulaire contact dans settings:
-- {
--   "form_contact_config": [
--     {"id": "name", "name": "Nom*", "type": "text", "placeholder": "...", "required": true},
--     {"id": "email", "name": "Email*", "type": "email", ...}
--   ]
-- }
