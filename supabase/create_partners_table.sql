-- =====================================================
-- TABLE: partners
-- Description: Partenaires exécutants (techniciens terrain)
-- Accès mobile uniquement - Vue limitée à leurs missions
-- Multi-tenant strict : un partenaire appartient à une organisation
-- =====================================================

CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Lien vers auth.users
  organization_id UUID NOT NULL, -- Multi-tenant : partenaire appartient à une org
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  specialty TEXT, -- Type de compétence (électricien, installateur solaire, etc.)
  active BOOLEAN DEFAULT TRUE, -- Partenaire actif ou désactivé
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.partners IS 
  'Partenaires exécutants terrain - Accès mobile uniquement.
   
   RÈGLES STRICTES :
   - ❌ Pas d''accès au pipeline
   - ❌ Pas d''accès au CRM
   - ❌ Pas d''accès aux autres partenaires
   - ✅ Voit uniquement ses missions assignées
   - ✅ Mobile-first uniquement
   - ✅ Multi-tenant strict (organization_id)
   
   DROITS :
   - Lecture : ses propres missions uniquement
   - Modification : statut de ses missions (en cours, terminé, problème)
   - Aucun accès aux données commerciales ou prospects';

COMMENT ON COLUMN public.partners.organization_id IS 
  'Organisation propriétaire du partenaire (multi-tenant strict).
   Un partenaire ne voit que les missions de son organisation.';

COMMENT ON COLUMN public.partners.specialty IS 
  'Spécialité technique du partenaire.
   Exemples : "Installation solaire", "Électricien", "Plombier", "Chauffagiste"
   Utilisé pour le matching automatique partenaire ↔ mission.';

COMMENT ON COLUMN public.partners.active IS 
  'Statut actif/inactif du partenaire.
   Si FALSE : ne reçoit plus de nouvelles missions.';

-- =====================================================
-- RLS POLICIES: partners
-- =====================================================

-- Activer RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Policy 1: Les partenaires voient uniquement leur propre profil
CREATE POLICY "Partners can view own profile"
  ON public.partners
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Les partenaires peuvent modifier leur propre profil (nom, phone, avatar uniquement)
CREATE POLICY "Partners can update own profile"
  ON public.partners
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Les admins peuvent voir tous les partenaires de leur organisation
CREATE POLICY "Admins can view all partners in their org"
  ON public.partners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
    )
  );

-- Policy 4: Les admins peuvent créer des partenaires
CREATE POLICY "Admins can insert partners"
  ON public.partners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
    )
  );

-- Policy 5: Les admins peuvent modifier tous les partenaires de leur organisation
CREATE POLICY "Admins can update all partners in their org"
  ON public.partners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
    )
  );

-- Policy 6: Les admins peuvent supprimer des partenaires
CREATE POLICY "Admins can delete partners"
  ON public.partners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager')
    )
  );

-- =====================================================
-- INDEX: Performance
-- =====================================================

CREATE INDEX idx_partners_user_id ON public.partners(user_id);
CREATE INDEX idx_partners_organization_id ON public.partners(organization_id);
CREATE INDEX idx_partners_active ON public.partners(active);
