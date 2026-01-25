-- =====================================================
-- PR-8: Pagination pour get_prospects_safe()
-- 
-- OBJECTIF : Éviter les charges massives (1000+ prospects)
-- 
-- PARAMÈTRES AJOUTÉS :
-- - p_limit (INT, default 500) : Nombre max de prospects
-- - p_offset (INT, default 0) : Décalage pour pagination
-- 
-- RÉTROCOMPATIBILITÉ : Si appelé sans paramètres, retourne les 500 premiers
-- =====================================================

-- Supprimer l'ancienne version
DROP FUNCTION IF EXISTS public.get_prospects_safe();
DROP FUNCTION IF EXISTS public.get_prospects_safe(INT, INT);

-- Créer avec pagination
CREATE OR REPLACE FUNCTION public.get_prospects_safe(
  p_limit INT DEFAULT 500,
  p_offset INT DEFAULT 0
)
RETURNS SETOF public.prospects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_organization_id UUID;
BEGIN
  -- Récupérer l'UUID de l'utilisateur connecté
  v_user_id := auth.uid();
  
  -- Récupérer le rôle ET l'organization_id de l'utilisateur
  SELECT role, organization_id 
  INTO v_user_role, v_organization_id 
  FROM public.users 
  WHERE user_id = v_user_id;
  
  -- 🔐 MULTI-TENANT : Toujours filtrer par organization_id
  IF v_user_role = 'Global Admin' THEN
    -- Global Admin : voit tous les prospects de SON organisation
    RETURN QUERY 
      SELECT * FROM public.prospects 
      WHERE organization_id = v_organization_id
      ORDER BY created_at DESC
      LIMIT p_limit
      OFFSET p_offset;
      
  ELSIF v_user_role = 'Manager' THEN
    -- Manager : voit ses prospects + ceux de son équipe (même org)
    RETURN QUERY 
      SELECT p.* FROM public.prospects p
      LEFT JOIN public.users u ON u.user_id = p.owner_id
      WHERE p.organization_id = v_organization_id
        AND (p.owner_id = v_user_id OR u.manager_id = v_user_id)
      ORDER BY p.created_at DESC
      LIMIT p_limit
      OFFSET p_offset;
        
  ELSE
    -- Commercial : voit uniquement ses propres prospects (même org)
    RETURN QUERY 
      SELECT * FROM public.prospects 
      WHERE organization_id = v_organization_id
        AND owner_id = v_user_id
      ORDER BY created_at DESC
      LIMIT p_limit
      OFFSET p_offset;
  END IF;
END;
$$;

-- 🔥 Fonction de comptage total (pour UI pagination)
CREATE OR REPLACE FUNCTION public.get_prospects_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_organization_id UUID;
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  
  SELECT role, organization_id 
  INTO v_user_role, v_organization_id 
  FROM public.users 
  WHERE user_id = v_user_id;
  
  IF v_user_role = 'Global Admin' THEN
    SELECT COUNT(*) INTO v_count FROM public.prospects 
    WHERE organization_id = v_organization_id;
      
  ELSIF v_user_role = 'Manager' THEN
    SELECT COUNT(p.*) INTO v_count FROM public.prospects p
    LEFT JOIN public.users u ON u.user_id = p.owner_id
    WHERE p.organization_id = v_organization_id
      AND (p.owner_id = v_user_id OR u.manager_id = v_user_id);
        
  ELSE
    SELECT COUNT(*) INTO v_count FROM public.prospects 
    WHERE organization_id = v_organization_id
      AND owner_id = v_user_id;
  END IF;
  
  RETURN v_count;
END;
$$;

-- Accorder l'exécution
GRANT EXECUTE ON FUNCTION public.get_prospects_safe(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prospects_count() TO authenticated;

COMMENT ON FUNCTION public.get_prospects_safe(INT, INT) IS 
  'Retourne les prospects paginés (limit/offset) accessibles à l''utilisateur, triés par date desc';

COMMENT ON FUNCTION public.get_prospects_count() IS 
  'Retourne le nombre total de prospects accessibles à l''utilisateur (pour pagination UI)';

-- =====================================================
-- TEST
-- =====================================================
-- SELECT * FROM get_prospects_safe(50, 0);  -- Page 1
-- SELECT * FROM get_prospects_safe(50, 50); -- Page 2
-- SELECT get_prospects_count();             -- Total
