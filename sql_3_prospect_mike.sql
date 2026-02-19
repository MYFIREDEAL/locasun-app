-- 3️⃣ Vérifier l'organization_id du prospect mike
SELECT 
  id,
  name,
  email,
  phone,
  address,
  organization_id
FROM prospects
WHERE name = 'mike';
