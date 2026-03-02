-- ============================================================================
-- TABLE: integration_keys
-- ============================================================================
-- OBJECTIF: Stocker les clés d'API pour l'authentification des webhooks.
--           Chaque clé est liée à une organisation et hashée (SHA-256).
--
-- SÉCURITÉ:
--   - La clé brute n'est JAMAIS stockée → seul le hash est en DB
--   - RLS activé → seuls les admins de l'org voient leurs clés
--   - La Edge Function utilise service_role pour lookup (côté serveur)
--
-- USAGE:
--   INSERT: Admin crée une clé via l'UI → génère UUID, hash SHA-256, stocke hash
--   SELECT: Edge Function reçoit Bearer token → hash → lookup → org_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,     -- SHA-256 du token Bearer (jamais la clé brute) — UNIQUE pour éviter collision
  key_prefix TEXT NOT NULL DEFAULT '',  -- Premiers caractères pour identification UI (ex: "eva_...")
  label TEXT NOT NULL DEFAULT '',    -- Nom donné par l'admin (ex: "Make Production")
  permissions TEXT[] NOT NULL DEFAULT '{webhook:create_prospect}', -- Permissions granulaires
  created_by UUID REFERENCES public.users(user_id),  -- Admin qui a créé la clé
  expires_at TIMESTAMPTZ,            -- NULL = pas d'expiration
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,          -- Dernière utilisation
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour lookup rapide par hash — UNIQUE constraint crée déjà un index implicite
-- On garde l'index org_id pour l'UI admin
CREATE INDEX IF NOT EXISTS idx_integration_keys_org_id ON public.integration_keys(organization_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.integration_keys ENABLE ROW LEVEL SECURITY;

-- Admins peuvent voir les clés de leur org
CREATE POLICY "integration_keys_select_own_org" ON public.integration_keys
  FOR SELECT
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u WHERE u.user_id = auth.uid()
    )
  );

-- Seuls les Global Admins peuvent créer des clés
CREATE POLICY "integration_keys_insert_global_admin" ON public.integration_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT u.organization_id FROM public.users u 
      WHERE u.user_id = auth.uid() AND u.role = 'Global Admin'
    )
  );

-- Seuls les Global Admins peuvent modifier (désactiver) des clés
CREATE POLICY "integration_keys_update_global_admin" ON public.integration_keys
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u 
      WHERE u.user_id = auth.uid() AND u.role = 'Global Admin'
    )
  );

-- Seuls les Global Admins peuvent supprimer des clés
CREATE POLICY "integration_keys_delete_global_admin" ON public.integration_keys
  FOR DELETE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u 
      WHERE u.user_id = auth.uid() AND u.role = 'Global Admin'
    )
  );
