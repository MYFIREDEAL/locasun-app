-- ============================================================================
-- MIGRATION: Ajouter external_webhook_url à integration_keys
-- ============================================================================
-- OBJECTIF: Permettre à chaque organisation de configurer un webhook externe
--           qui sera appelé automatiquement après la création d'un prospect.
--
-- USAGE: Fire-and-forget — ne bloque jamais la création du prospect.
--        Si NULL ou vide, aucun appel externe n'est effectué.
-- ============================================================================

ALTER TABLE public.integration_keys
ADD COLUMN IF NOT EXISTS external_webhook_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.integration_keys.external_webhook_url IS 'URL du webhook externe à appeler après création prospect. NULL = désactivé.';
