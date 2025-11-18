-- Vérifier les formulaires de Georges dans Supabase
SELECT 
    cfp.id,
    cfp.panel_id,
    cfp.prospect_id,
    cfp.project_type,
    cfp.form_id,
    cfp.status,
    cfp.step_name,
    cfp.created_at,
    p.name as prospect_name,
    p.form_data
FROM public.client_form_panels cfp
LEFT JOIN public.prospects p ON cfp.prospect_id = p.id
WHERE p.name ILIKE '%george%'
ORDER BY cfp.created_at DESC;
