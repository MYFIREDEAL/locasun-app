-- =========================================================
-- STEP 1A — Platform Admin propre (table dédiée + helper)
-- =========================================================
-- Date : 5 février 2026
-- Objectif : Sortir platform_admin de public.users vers table dédiée
-- =========================================================

-- 0) Table platform_admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='platform_admins'
  ) THEN
    CREATE TABLE public.platform_admins (
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 1) Policy read self
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='platform_admins'
      AND policyname='platform_admins_read_self'
  ) THEN
    CREATE POLICY platform_admins_read_self
    ON public.platform_admins
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- 2) Helper: is_platform_admin()
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  );
$$;

-- 3) Sanity check (devrait retourner false/true selon contexte auth)
-- SELECT public.is_platform_admin();
