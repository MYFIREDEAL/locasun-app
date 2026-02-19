-- 2️⃣ Vérifier l'organization_id du partenaire test57
SELECT 
  p.id,
  p.company_name,
  p.email,
  p.organization_id,
  p.active,
  o.name as org_name
FROM partners p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.company_name = 'test57' OR p.email = 'teeffstest57@yopmail.com';
