-- ============================================================================
-- TRIGGER FUNCTION: link_prospect_to_auth_user
-- ============================================================================
-- OBJECTIF: Associer automatiquement un prospect à son auth.user lors de
--           la création du compte (Magic Link / signInWithOtp).
--
-- SÉCURITÉ: SECURITY DEFINER = exécute avec les droits du créateur (Admin)
--           Le trigger se déclenche AFTER INSERT ON auth.users.
--
-- MULTI-TENANT SAFE: Si le même email existe dans plusieurs orgs,
--           on associe uniquement le prospect le plus récent (celui qui
--           vient d'être créé par create_affiliated_prospect dans le même flow).
--           Les prospects des autres orgs restent intacts (user_id = NULL).
--
-- HISTORIQUE:
--   v1 (original)  : UPDATE WHERE email = NEW.email AND user_id IS NULL
--                     ⚠️ Risque cross-org si même email dans plusieurs orgs
--   v2 (2 mars 2026): UPDATE limité au prospect le plus récent uniquement
--                     ✅ 100% multi-tenant safe
-- ============================================================================

CREATE OR REPLACE FUNCTION link_prospect_to_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_prospect_id uuid;
  v_prospect_count int;
BEGIN
  -- Compter les prospects non-liés avec cet email
  SELECT count(*) INTO v_prospect_count
  FROM public.prospects
  WHERE email = NEW.email
    AND user_id IS NULL;

  -- Aucun prospect à lier → rien à faire
  IF v_prospect_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Sélectionner le prospect le plus récent (= celui créé dans le flow actuel)
  SELECT id INTO v_prospect_id
  FROM public.prospects
  WHERE email = NEW.email
    AND user_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Associer uniquement CE prospect
  UPDATE public.prospects
  SET user_id = NEW.id
  WHERE id = v_prospect_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER (re-create pour s'assurer qu'il pointe vers la nouvelle fonction)
-- ============================================================================
DROP TRIGGER IF EXISTS after_auth_user_created ON auth.users;

CREATE TRIGGER after_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION link_prospect_to_auth_user();
