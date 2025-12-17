-- ═══════════════════════════════════════════════════════════════
-- 📊 VOIR TOUS LES PROJETS DANS SUPABASE
-- ═══════════════════════════════════════════════════════════════

SELECT 
    pss.id,
    p.name as client,
    pss.project_type,
    pss.steps,
    pss.created_at,
    u.name as commercial
FROM public.project_steps_status pss
JOIN public.prospects p ON pss.prospect_id = p.id
LEFT JOIN public.users u ON p.owner_id = u.user_id
ORDER BY pss.created_at DESC;
