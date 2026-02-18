-- ═══════════════════════════════════════════════════════════════
-- 🔥 AJOUT ORGANIZATION_ID À TOUTES LES TABLES (MULTI-TENANT COMPLET)
-- ═══════════════════════════════════════════════════════════════
-- Date: 18 février 2026
-- Problème: 5 tables critiques n'ont pas organization_id
--          → Impossible de filtrer les real-time par org
--          → Faille sécurité multi-tenant (RLS faibles)
--          → Nouvelles orgs ne voient pas leurs données
-- Solution: Ajouter organization_id + triggers + RLS partout
-- Tables: appointments, tasks, chat_messages, notifications, calls
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ TABLE: APPOINTMENTS (agenda + tâches)
-- ═══════════════════════════════════════════════════════════════

-- Ajouter colonne
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill depuis users.organization_id (via assigned_user_id)
UPDATE public.appointments a
SET organization_id = u.organization_id
FROM public.users u
WHERE a.assigned_user_id = u.user_id
  AND a.organization_id IS NULL;

-- Rendre NOT NULL
ALTER TABLE public.appointments
ALTER COLUMN organization_id SET NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id 
ON public.appointments(organization_id);

-- Trigger auto-fill
CREATE OR REPLACE FUNCTION auto_fill_appointments_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer organization_id depuis users (assigned_user_id)
  SELECT organization_id INTO NEW.organization_id
  FROM public.users
  WHERE user_id = NEW.assigned_user_id;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find organization_id for assigned_user_id %', NEW.assigned_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_fill_appointments_organization_id ON public.appointments;
CREATE TRIGGER trigger_auto_fill_appointments_organization_id
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_appointments_organization_id();

-- RLS policies multi-tenant
DROP POLICY IF EXISTS "Users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view shared appointments" ON public.appointments;

-- Admin: Voir/modifier les RDV/tâches de SON org
CREATE POLICY "admin_all_appointments_multi_tenant"
ON public.appointments FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE user_id = auth.uid() AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
);

-- Client: Voir SES RDV partagés (share=true)
CREATE POLICY "client_view_shared_appointments_multi_tenant"
ON public.appointments FOR SELECT TO authenticated
USING (
    share = true 
    AND contact_id IN (
        SELECT id FROM public.prospects 
        WHERE user_id = auth.uid() AND organization_id = appointments.organization_id
    )
);

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ TABLE: TASKS (si différente de appointments)
-- ═══════════════════════════════════════════════════════════════
-- Note: Si tasks est juste un type dans appointments, skip cette section

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') THEN
    -- Ajouter colonne
    ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

    -- Backfill (adapter selon la structure de tasks)
    EXECUTE 'UPDATE public.tasks t
             SET organization_id = u.organization_id
             FROM public.users u
             WHERE t.assigned_user_id = u.user_id
               AND t.organization_id IS NULL';

    -- NOT NULL
    ALTER TABLE public.tasks ALTER COLUMN organization_id SET NOT NULL;

    -- Index
    CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);

    RAISE NOTICE '✅ Table tasks mise à jour';
  ELSE
    RAISE NOTICE 'ℹ️ Table tasks n''existe pas (tasks = appointments.type)';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ TABLE: CHAT_MESSAGES
-- ═══════════════════════════════════════════════════════════════

-- Ajouter colonne
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill depuis prospects.organization_id
UPDATE public.chat_messages cm
SET organization_id = p.organization_id
FROM public.prospects p
WHERE cm.prospect_id = p.id
  AND cm.organization_id IS NULL;

-- NOT NULL
ALTER TABLE public.chat_messages
ALTER COLUMN organization_id SET NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_chat_messages_organization_id 
ON public.chat_messages(organization_id);

-- Trigger auto-fill
CREATE OR REPLACE FUNCTION auto_fill_chat_messages_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT organization_id INTO NEW.organization_id
  FROM public.prospects
  WHERE id = NEW.prospect_id;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find organization_id for prospect_id %', NEW.prospect_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_fill_chat_messages_organization_id ON public.chat_messages;
CREATE TRIGGER trigger_auto_fill_chat_messages_organization_id
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_chat_messages_organization_id();

-- RLS policies multi-tenant
DROP POLICY IF EXISTS "admin_all_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "client_own_chat_messages" ON public.chat_messages;

CREATE POLICY "admin_all_chat_messages_multi_tenant"
ON public.chat_messages FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE user_id = auth.uid() AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
);

CREATE POLICY "client_own_chat_messages_multi_tenant"
ON public.chat_messages FOR ALL TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM public.prospects 
        WHERE user_id = auth.uid() AND organization_id = chat_messages.organization_id
    )
);

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ TABLE: NOTIFICATIONS (admin)
-- ═══════════════════════════════════════════════════════════════

-- Ajouter colonne
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill depuis prospects.organization_id
UPDATE public.notifications n
SET organization_id = p.organization_id
FROM public.prospects p
WHERE n.prospect_id = p.id
  AND n.organization_id IS NULL;

-- NOT NULL
ALTER TABLE public.notifications
ALTER COLUMN organization_id SET NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id 
ON public.notifications(organization_id);

-- Trigger auto-fill
CREATE OR REPLACE FUNCTION auto_fill_notifications_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT organization_id INTO NEW.organization_id
  FROM public.prospects
  WHERE id = NEW.prospect_id;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find organization_id for prospect_id %', NEW.prospect_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_fill_notifications_organization_id ON public.notifications;
CREATE TRIGGER trigger_auto_fill_notifications_organization_id
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_notifications_organization_id();

-- RLS policies multi-tenant (remplacer les anciennes)
DROP POLICY IF EXISTS "Users can view notifications for their prospects" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications they own" ON public.notifications;

CREATE POLICY "admin_notifications_multi_tenant"
ON public.notifications FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE user_id = auth.uid() AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
);

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ TABLE: CALLS
-- ═══════════════════════════════════════════════════════════════

-- Ajouter colonne
ALTER TABLE public.calls
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill depuis users.organization_id (via assigned_user_id)
UPDATE public.calls c
SET organization_id = u.organization_id
FROM public.users u
WHERE c.assigned_user_id = u.user_id
  AND c.organization_id IS NULL;

-- NOT NULL
ALTER TABLE public.calls
ALTER COLUMN organization_id SET NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_calls_organization_id 
ON public.calls(organization_id);

-- Trigger auto-fill
CREATE OR REPLACE FUNCTION auto_fill_calls_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT organization_id INTO NEW.organization_id
  FROM public.users
  WHERE user_id = NEW.assigned_user_id;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find organization_id for assigned_user_id %', NEW.assigned_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_fill_calls_organization_id ON public.calls;
CREATE TRIGGER trigger_auto_fill_calls_organization_id
  BEFORE INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_calls_organization_id();

-- RLS policies multi-tenant
DROP POLICY IF EXISTS "Users can view calls" ON public.calls;
DROP POLICY IF EXISTS "Users can create calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update their calls" ON public.calls;
DROP POLICY IF EXISTS "Users can delete their calls" ON public.calls;

CREATE POLICY "admin_all_calls_multi_tenant"
ON public.calls FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE user_id = auth.uid() AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
);

-- ═══════════════════════════════════════════════════════════════
-- 6️⃣ VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  tables_updated TEXT[] := ARRAY['appointments', 'chat_messages', 'notifications', 'calls', 'client_form_panels'];
  v_table_name TEXT;
  col_exists BOOLEAN;
  v_trigger_name TEXT;
  trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VÉRIFICATION MULTI-TENANT';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  FOREACH v_table_name IN ARRAY tables_updated
  LOOP
    -- Vérifier colonne organization_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_table_name
        AND c.column_name = 'organization_id'
    ) INTO col_exists;

    -- Vérifier trigger
    v_trigger_name := 'trigger_auto_fill_' || v_table_name || '_organization_id';
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class cl ON cl.oid = t.tgrelid
      WHERE t.tgname = v_trigger_name
        AND cl.relname = v_table_name
    ) INTO trigger_exists;

    RAISE NOTICE '📋 % → organization_id: % | trigger: %', 
      v_table_name, 
      CASE WHEN col_exists THEN '✅' ELSE '❌' END,
      CASE WHEN trigger_exists THEN '✅' ELSE '❌' END;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Migration multi-tenant terminée !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;
