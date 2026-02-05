-- ============================================
-- 🏗️ MIGRATION #001 : PLATFORM ADMINS TABLE
-- ============================================
-- Objectif : Sortir platform_admin de public.users vers une table dédiée
-- Date : 5 février 2026
-- Étape : Cockpit Platform V1 - Étape #1
-- ============================================

-- ⚠️ IMPORTANT : Exécuter ce script dans Supabase SQL Editor
-- Ce script est IDEMPOTENT (peut être exécuté plusieurs fois)

-- ============================================
-- 1️⃣ CRÉER LA TABLE platform_admins
-- ============================================

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien vers auth.users (obligatoire)
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informations de base
  email TEXT NOT NULL,
  name TEXT,
  
  -- Permissions (extensible pour le futur)
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Contrainte d'unicité sur email
  CONSTRAINT platform_admins_email_unique UNIQUE (email)
);

-- Index pour recherche par email
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON public.platform_admins(email);
CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON public.platform_admins(user_id);

-- Commentaire de table
COMMENT ON TABLE public.platform_admins IS 'Administrateurs de la plateforme EVATIME (hors organisations)';
COMMENT ON COLUMN public.platform_admins.user_id IS 'Référence vers auth.users.id';
COMMENT ON COLUMN public.platform_admins.permissions IS 'Permissions JSON (read_orgs, create_orgs, delete_orgs, etc.)';

-- ============================================
-- 2️⃣ ACTIVER RLS SUR LA TABLE
-- ============================================

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3️⃣ CRÉER LES RLS POLICIES
-- ============================================

-- Policy SELECT : Un platform_admin peut lire sa propre ligne
DROP POLICY IF EXISTS "platform_admins_read_self" ON public.platform_admins;
CREATE POLICY "platform_admins_read_self"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy SELECT : Un platform_admin peut lire tous les autres platform_admins
DROP POLICY IF EXISTS "platform_admins_read_all" ON public.platform_admins;
CREATE POLICY "platform_admins_read_all"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid()
  )
);

-- Policy UPDATE : Un platform_admin peut modifier sa propre ligne
DROP POLICY IF EXISTS "platform_admins_update_self" ON public.platform_admins;
CREATE POLICY "platform_admins_update_self"
ON public.platform_admins
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy INSERT/DELETE : Réservé au service role (pas via API publique)
-- Aucune policy = aucun accès via anon/authenticated

-- ============================================
-- 4️⃣ TRIGGER POUR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_platform_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER trigger_platform_admins_updated_at
BEFORE UPDATE ON public.platform_admins
FOR EACH ROW
EXECUTE FUNCTION update_platform_admins_updated_at();

-- ============================================
-- 5️⃣ MIGRER LES DONNÉES EXISTANTES
-- ============================================
-- Copier les platform_admins existants depuis public.users

INSERT INTO public.platform_admins (user_id, email, name, permissions)
SELECT 
  user_id,
  email,
  COALESCE(name, CONCAT(first_name, ' ', last_name)),
  '{"read_orgs": true, "create_orgs": true, "manage_orgs": true}'::jsonb
FROM public.users
WHERE role = 'platform_admin'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 6️⃣ VÉRIFICATION
-- ============================================

-- Afficher les platform_admins migrés
SELECT 
  id,
  user_id,
  email,
  name,
  permissions,
  created_at
FROM public.platform_admins;

-- ============================================
-- ⚠️ NE PAS SUPPRIMER LES ENTRÉES DANS public.users
-- Le frontend utilise encore public.users.role = 'platform_admin'
-- On les supprimera après adaptation du frontend (Étape #1.4)
-- ============================================

-- ============================================
-- 📝 NOTES DE MIGRATION
-- ============================================
-- 
-- Après cette migration :
-- 1. La table platform_admins existe et contient les admins
-- 2. Les RLS policies protègent la table
-- 3. Les données de public.users restent intactes (backward compat)
-- 
-- Prochaine étape (#1.4) :
-- - Modifier PlatformLoginPage.jsx pour checker platform_admins au lieu de users.role
-- - Puis supprimer les platform_admins de public.users
-- ============================================
