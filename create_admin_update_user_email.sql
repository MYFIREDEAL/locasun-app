-- Fonction RPC pour permettre aux Global Admin de changer l'email d'un utilisateur
-- Utilise auth.users (email de connexion) + public.users (email de profil)

CREATE OR REPLACE FUNCTION admin_update_user_email(
  target_user_id UUID,
  new_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuté avec les droits du propriétaire de la fonction
SET search_path = public
AS $$
DECLARE
  calling_user_role TEXT;
  result JSON;
BEGIN
  -- 1. Vérifier que l'appelant est Global Admin
  SELECT role INTO calling_user_role
  FROM public.users
  WHERE user_id = auth.uid();

  IF calling_user_role != 'Global Admin' THEN
    RAISE EXCEPTION 'Permission refusée: seuls les Global Admin peuvent changer les emails';
  END IF;

  -- 2. Mettre à jour l'email dans auth.users (table système Supabase)
  -- ⚠️ ATTENTION: Cette fonction nécessite que le rôle postgres ait les droits sur auth.users
  UPDATE auth.users
  SET email = new_email,
      email_confirmed_at = NOW(), -- Confirmer automatiquement (pas de validation email)
      updated_at = NOW()
  WHERE id = target_user_id;

  -- 3. Mettre à jour l'email dans public.users (table applicative)
  UPDATE public.users
  SET email = new_email,
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- 4. Retourner le résultat
  result := json_build_object(
    'success', true,
    'message', 'Email mis à jour avec succès',
    'new_email', new_email
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erreur lors de la mise à jour de l''email: %', SQLERRM;
END;
$$;

-- Commenter la fonction
COMMENT ON FUNCTION admin_update_user_email IS 
'Permet aux Global Admin de changer l''email d''un utilisateur (auth.users + public.users). 
L''email est confirmé automatiquement (pas de validation par lien).';
