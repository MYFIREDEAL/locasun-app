-- =====================================================
-- RPC : Vérifier si un prospect existe par email
-- Utilisé lors de l'inscription pour éviter les doublons
-- SECURITY DEFINER : Autorise les utilisateurs anonymes
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_prospect_exists(
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Retourner TRUE si un prospect avec cet email existe, FALSE sinon
  RETURN EXISTS (
    SELECT 1 
    FROM public.prospects 
    WHERE email = p_email
  );
END;
$$;

-- Accorder l'exécution aux utilisateurs anonymes ET authentifiés
GRANT EXECUTE ON FUNCTION public.check_prospect_exists TO anon, authenticated;

COMMENT ON FUNCTION public.check_prospect_exists IS 'Vérifie si un prospect existe avec cet email (accessible aux anonymes pour l''inscription)';
