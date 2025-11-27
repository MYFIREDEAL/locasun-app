-- =====================================================
-- Mettre à jour les couleurs des projets existants
-- =====================================================

-- Les couleurs suivent le format "bg-{color}-100 text-{color}-800"
-- correspondant aux badges Tailwind utilisés dans l'interface

UPDATE public.project_templates
SET color = 'bg-blue-100 text-blue-800'
WHERE type = 'ACC';

UPDATE public.project_templates
SET color = 'bg-green-100 text-green-800'
WHERE type = 'Autonomie';

UPDATE public.project_templates
SET color = 'bg-orange-100 text-orange-800'
WHERE type = 'Centrale';

UPDATE public.project_templates
SET color = 'bg-teal-100 text-teal-800'
WHERE type = 'Investissement';

UPDATE public.project_templates
SET color = 'bg-purple-100 text-purple-800'
WHERE type = 'ProducteurPro';

-- Vérifier les résultats
SELECT type, title, color FROM public.project_templates ORDER BY type;
