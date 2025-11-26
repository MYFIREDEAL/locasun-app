-- 🔥 FIX: Créer une fonction RPC pour SELECT prospects
-- Contourne le problème de auth.uid() qui retourne NULL dans les RLS policies SELECT

CREATE OR REPLACE FUNCTION public.get_prospects_safe()
RETURNS SETOF public.prospects
LANGUAGE plpgsql
SECURITY DEFINER -- 🔥 Bypass RLS avec les droits du créateur de la fonction
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- 1. Récupérer l'UUID de l'utilisateur authentifié
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  -- 2. Vérifier le rôle de l'utilisateur
  SELECT role INTO v_user_role
  FROM public.users
  WHERE user_id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé dans la table users';
  END IF;

  -- 3. Retourner les prospects selon le rôle
  IF v_user_role = 'Global Admin' THEN
    -- Global Admin voit TOUS les prospects
    RETURN QUERY SELECT * FROM public.prospects ORDER BY created_at DESC;
  ELSIF v_user_role = 'Manager' THEN
    -- Manager voit ses prospects + ceux de son équipe
    RETURN QUERY 
      SELECT p.* FROM public.prospects p
      LEFT JOIN public.users u ON u.id = p.owner_id
      WHERE p.owner_id = v_user_id 
         OR u.manager_id = v_user_id
      ORDER BY p.created_at DESC;
  ELSE
    -- Commercial voit ses prospects + ceux de access_rights.users
    RETURN QUERY
      SELECT DISTINCT p.*
      FROM public.prospects p
      WHERE 
        p.owner_id = v_user_id
        OR p.owner_id IN (
          SELECT jsonb_array_elements_text(access_rights->'users')::UUID
          FROM public.users
          WHERE user_id = v_user_id
        )
      ORDER BY p.created_at DESC;
  END IF;
END;
$$;

-- Accorder l'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_prospects_safe TO authenticated;

-- Commenter la fonction
COMMENT ON FUNCTION public.get_prospects_safe IS 
'Récupère les prospects en contournant le problème de auth.uid() qui retourne NULL dans les RLS policies SELECT. 
Retourne les prospects selon le rôle de l''utilisateur (Global Admin, Manager, Commercial).';
