-- =====================================================
-- TABLE: missions
-- Description: Missions assignées aux partenaires
-- Source : workflow (automatique) ou IA (Charly)
-- Mobile-first : partenaire exécute, commercial valide
-- =====================================================

CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL, -- Multi-tenant strict
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE, -- Partenaire assigné
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE, -- Client concerné
  project_type TEXT NOT NULL, -- Type de projet (ACC, Centrale, etc.)
  step_name TEXT, -- Étape projet liée (optionnel)
  title TEXT NOT NULL, -- Titre de la mission
  description TEXT, -- Description détaillée
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  source TEXT DEFAULT 'workflow' CHECK (source IN ('workflow', 'ai', 'manual')), -- Origine de la mission
  due_date TIMESTAMPTZ, -- Date limite
  completed_at TIMESTAMPTZ, -- Date de complétion
  partner_notes TEXT, -- Notes du partenaire (compte-rendu terrain)
  admin_notes TEXT, -- Notes du commercial (validation/commentaires)
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Créateur (admin/IA)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.missions IS 
  'Missions assignées aux partenaires terrain.
   
   WORKFLOW :
   1. Mission créée par workflow ou IA
   2. Partenaire voit la mission (mobile)
   3. Partenaire change statut (pending → in_progress → completed)
   4. Partenaire ajoute notes terrain
   5. Commercial valide et commente
   
   RÈGLES :
   - Mobile-first strict
   - Un partenaire ne voit que SES missions
   - Pas d''accès aux données CRM
   - Pas de modification du prospect/projet
   
   SOURCES :
   - workflow : Créée automatiquement par un workflow projet
   - ai : Créée par Charly (IA) suite à une analyse
   - manual : Créée manuellement par un admin';

COMMENT ON COLUMN public.missions.partner_id IS 
  'Partenaire assigné à la mission.
   Le partenaire ne peut voir/modifier que ses propres missions.';

COMMENT ON COLUMN public.missions.prospect_id IS 
  'Client concerné par la mission.
   Le partenaire ne voit que les infos limitées (nom, adresse, phone).';

COMMENT ON COLUMN public.missions.project_type IS 
  'Type de projet lié (ACC, Centrale, Investissement, etc.).
   Permet le matching avec la spécialité du partenaire.';

COMMENT ON COLUMN public.missions.step_name IS 
  'Nom de l''étape projet qui a déclenché la mission (optionnel).
   Exemple : "Visite technique", "Installation", "SAV"';

COMMENT ON COLUMN public.missions.status IS 
  'Statut de la mission :
   - pending : En attente (assignée mais pas démarrée)
   - in_progress : En cours d''exécution
   - completed : Terminée par le partenaire
   - blocked : Bloquée (problème terrain)
   - cancelled : Annulée par l''admin';

COMMENT ON COLUMN public.missions.source IS 
  'Origine de la mission :
   - workflow : Créée automatiquement par un workflow projet
   - ai : Créée par Charly (IA) suite à analyse
   - manual : Créée manuellement par un admin';

COMMENT ON COLUMN public.missions.partner_notes IS 
  'Notes du partenaire terrain (compte-rendu).
   Modifiable uniquement par le partenaire assigné.';

COMMENT ON COLUMN public.missions.admin_notes IS 
  'Notes du commercial (validation, commentaires).
   Modifiable uniquement par les admins.';

-- =====================================================
-- RLS POLICIES: missions
-- =====================================================

-- Activer RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Les partenaires voient uniquement leurs missions
CREATE POLICY "Partners can view their own missions"
  ON public.missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.user_id = auth.uid()
      AND partners.id = missions.partner_id
    )
  );

-- Policy 2: Les partenaires peuvent modifier le statut et leurs notes
CREATE POLICY "Partners can update their missions status and notes"
  ON public.missions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.user_id = auth.uid()
      AND partners.id = missions.partner_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.user_id = auth.uid()
      AND partners.id = missions.partner_id
    )
  );

-- Policy 3: Les admins voient toutes les missions de leur organisation
CREATE POLICY "Admins can view all missions in their org"
  ON public.missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Policy 4: Les admins peuvent créer des missions
CREATE POLICY "Admins can insert missions"
  ON public.missions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Policy 5: Les admins peuvent modifier toutes les missions
CREATE POLICY "Admins can update all missions"
  ON public.missions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Policy 6: Les admins peuvent supprimer des missions
CREATE POLICY "Admins can delete missions"
  ON public.missions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- =====================================================
-- INDEX: Performance
-- =====================================================

CREATE INDEX idx_missions_partner_id ON public.missions(partner_id);
CREATE INDEX idx_missions_prospect_id ON public.missions(prospect_id);
CREATE INDEX idx_missions_organization_id ON public.missions(organization_id);
CREATE INDEX idx_missions_status ON public.missions(status);
CREATE INDEX idx_missions_source ON public.missions(source);
CREATE INDEX idx_missions_project_type ON public.missions(project_type);
CREATE INDEX idx_missions_due_date ON public.missions(due_date);
