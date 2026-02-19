-- 1️⃣ Vérifier l'organization_id de LOCASUN
SELECT id, name, slug FROM organizations WHERE slug = 'locasun' OR name ILIKE '%locasun%';
