-- =====================================================
-- AJOUT : TABLE project_templates
-- =====================================================
-- Cette table stocke les MODÈLES de projets configurables
-- depuis l'interface admin (Gestion des Projets).
-- Elle remplace le fichier statique src/data/projects.js
-- et permet la création dynamique de nouveaux types de projets.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT UNIQUE NOT NULL, -- 'ACC', 'Autonomie', 'Centrale', etc. (clé unique)
  title TEXT NOT NULL, -- Titre admin : "Autoconsommation Collective"
  client_title TEXT NOT NULL, -- Titre client : "Mon Projet ACC"
  icon TEXT NOT NULL DEFAULT '📁', -- Emoji ou icon
  color TEXT NOT NULL DEFAULT 'gradient-blue', -- Classe CSS Tailwind
  is_public BOOLEAN DEFAULT true, -- Visible pour les clients ?
  steps JSONB DEFAULT '[]'::jsonb, -- Étapes du projet (array d'objets)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.project_templates IS 
  'Modèles de projets configurables depuis l''interface admin. 
   Chaque modèle définit : type, titre, icône, couleur, étapes personnalisées.
   Le champ "steps" contient un tableau JSON avec la structure :
   [
     {
       "id": "step-123",
       "name": "Étude de faisabilité",
       "status": "pending",
       "icon": "📊",
       "descriptions": {
         "pending": "Analyse en cours...",
         "done": "Étude validée !"
       },
       "globalStepId": "uuid-of-global-pipeline-step"
     }
   ]
   La liaison globalStepId permet d''associer chaque étape de projet
   à une étape du pipeline global (table global_pipeline_steps).';

COMMENT ON COLUMN public.project_templates.type IS 
  'Identifiant unique du type de projet (slug). Ex: "ACC", "Autonomie", "Centrale".';

COMMENT ON COLUMN public.project_templates.is_public IS 
  'Si false, le modèle n''est pas visible côté client (brouillon admin).';

COMMENT ON COLUMN public.project_templates.steps IS 
  'Tableau JSON des étapes du projet. Chaque étape contient : 
   id, name, status, icon, descriptions (textes par statut), globalStepId (FK vers global_pipeline_steps).';

-- Index pour recherches rapides
CREATE INDEX idx_project_templates_type ON public.project_templates(type);
CREATE INDEX idx_project_templates_public ON public.project_templates(is_public);

-- Trigger pour mise à jour automatique de updated_at
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES : project_templates
-- =====================================================

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout faire
CREATE POLICY "Admins can manage project templates"
  ON public.project_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Les clients peuvent seulement voir les modèles publics (is_public = true)
CREATE POLICY "Clients can view public project templates"
  ON public.project_templates
  FOR SELECT
  USING (is_public = true);

-- =====================================================
-- DONNÉES PAR DÉFAUT (Migration depuis projects.js)
-- =====================================================

-- Modèle 1: Autoconsommation Collective (ACC)
INSERT INTO public.project_templates (type, title, client_title, icon, color, is_public, steps) VALUES (
  'ACC',
  'Autoconsommation Collective',
  'Mon Projet ACC',
  '🌞',
  'gradient-blue',
  true,
  '[
    {
      "id": "step-acc-1",
      "name": "Étude de faisabilité",
      "status": "pending",
      "icon": "📊",
      "descriptions": {
        "pending": "Analyse technique et réglementaire en cours...",
        "done": "Étude validée ! Votre projet est techniquement et économiquement viable."
      }
    },
    {
      "id": "step-acc-2",
      "name": "Conception du projet",
      "status": "pending",
      "icon": "📐",
      "descriptions": {
        "pending": "Dimensionnement de l''installation et définition des conventions.",
        "done": "Projet conçu avec succès."
      }
    },
    {
      "id": "step-acc-3",
      "name": "Validation administrative",
      "status": "pending",
      "icon": "📝",
      "descriptions": {
        "pending": "Dépôt des demandes d''autorisation et conventions.",
        "done": "Toutes les autorisations obtenues."
      }
    },
    {
      "id": "step-acc-4",
      "name": "Installation",
      "status": "pending",
      "icon": "⚡",
      "descriptions": {
        "pending": "Travaux de pose des panneaux et raccordement.",
        "done": "Installation terminée et mise en service effectuée."
      }
    },
    {
      "id": "step-acc-5",
      "name": "Suivi & Exploitation",
      "status": "pending",
      "icon": "📈",
      "descriptions": {
        "pending": "Monitoring de la production et gestion de la communauté.",
        "done": "Projet en fonctionnement optimal."
      }
    }
  ]'::jsonb
);

-- Modèle 2: Autonomie
INSERT INTO public.project_templates (type, title, client_title, icon, color, is_public, steps) VALUES (
  'Autonomie',
  'Autonomie',
  'Mon Projet Autonomie',
  '🔋',
  'gradient-green',
  true,
  '[
    {
      "id": "step-autonomie-1",
      "name": "Audit énergétique",
      "status": "pending",
      "icon": "🔍",
      "descriptions": {
        "pending": "Analyse de vos consommations et besoins.",
        "done": "Audit complété avec recommandations."
      }
    },
    {
      "id": "step-autonomie-2",
      "name": "Dimensionnement",
      "status": "pending",
      "icon": "📏",
      "descriptions": {
        "pending": "Calcul de la puissance PV + stockage nécessaire.",
        "done": "Solution optimisée définie."
      }
    },
    {
      "id": "step-autonomie-3",
      "name": "Installation PV + Batterie",
      "status": "pending",
      "icon": "🔌",
      "descriptions": {
        "pending": "Pose des panneaux et intégration du système de stockage.",
        "done": "Installation opérationnelle."
      }
    },
    {
      "id": "step-autonomie-4",
      "name": "Monitoring",
      "status": "pending",
      "icon": "📊",
      "descriptions": {
        "pending": "Mise en place du suivi de production et consommation.",
        "done": "Système autonome et suivi actif."
      }
    }
  ]'::jsonb
);

-- Modèle 3: Centrale (3-500 kWc)
INSERT INTO public.project_templates (type, title, client_title, icon, color, is_public, steps) VALUES (
  'Centrale',
  'Centrale (3-500 kWc)',
  'Ma Centrale Solaire',
  '☀️',
  'gradient-orange',
  true,
  '[
    {
      "id": "step-centrale-1",
      "name": "Étude de site",
      "status": "pending",
      "icon": "🏗️",
      "descriptions": {
        "pending": "Analyse du site (toiture, sol) et des contraintes.",
        "done": "Site validé pour l''installation."
      }
    },
    {
      "id": "step-centrale-2",
      "name": "Montage financier",
      "status": "pending",
      "icon": "💰",
      "descriptions": {
        "pending": "Recherche de financement et optimisation fiscale.",
        "done": "Financement sécurisé."
      }
    },
    {
      "id": "step-centrale-3",
      "name": "Autorisations",
      "status": "pending",
      "icon": "📄",
      "descriptions": {
        "pending": "Dépôt des permis et conventions de raccordement.",
        "done": "Toutes autorisations obtenues."
      }
    },
    {
      "id": "step-centrale-4",
      "name": "Construction",
      "status": "pending",
      "icon": "🏭",
      "descriptions": {
        "pending": "Travaux de construction de la centrale.",
        "done": "Centrale construite et raccordée au réseau."
      }
    },
    {
      "id": "step-centrale-5",
      "name": "Exploitation",
      "status": "pending",
      "icon": "⚡",
      "descriptions": {
        "pending": "Maintenance et suivi de production.",
        "done": "Centrale en production optimale."
      }
    }
  ]'::jsonb
);

-- Modèle 4: Investissement
INSERT INTO public.project_templates (type, title, client_title, icon, color, is_public, steps) VALUES (
  'Investissement',
  'Investissement',
  'Mon Investissement Solaire',
  '💎',
  'gradient-purple',
  true,
  '[
    {
      "id": "step-invest-1",
      "name": "Présentation opportunité",
      "status": "pending",
      "icon": "📊",
      "descriptions": {
        "pending": "Analyse du projet d''investissement et rendement.",
        "done": "Opportunité présentée et validée."
      }
    },
    {
      "id": "step-invest-2",
      "name": "Due diligence",
      "status": "pending",
      "icon": "🔎",
      "descriptions": {
        "pending": "Vérifications juridiques et techniques.",
        "done": "Due diligence complétée."
      }
    },
    {
      "id": "step-invest-3",
      "name": "Signature",
      "status": "pending",
      "icon": "✍️",
      "descriptions": {
        "pending": "Finalisation des documents et signatures.",
        "done": "Contrat signé."
      }
    },
    {
      "id": "step-invest-4",
      "name": "Suivi de l''investissement",
      "status": "pending",
      "icon": "📈",
      "descriptions": {
        "pending": "Reporting régulier de performance.",
        "done": "Investissement actif et rentable."
      }
    }
  ]'::jsonb
);

-- Modèle 5: Producteur Pro
INSERT INTO public.project_templates (type, title, client_title, icon, color, is_public, steps) VALUES (
  'ProducteurPro',
  'Producteur Pro',
  'Mon Activité de Producteur',
  '⚡',
  'gradient-yellow',
  true,
  '[
    {
      "id": "step-pro-1",
      "name": "Création de la structure",
      "status": "pending",
      "icon": "🏢",
      "descriptions": {
        "pending": "Montage juridique et administratif.",
        "done": "Société créée et immatriculée."
      }
    },
    {
      "id": "step-pro-2",
      "name": "Portefeuille de projets",
      "status": "pending",
      "icon": "📂",
      "descriptions": {
        "pending": "Identification et étude de sites potentiels.",
        "done": "Portefeuille de projets constitué."
      }
    },
    {
      "id": "step-pro-3",
      "name": "Développement",
      "status": "pending",
      "icon": "🚀",
      "descriptions": {
        "pending": "Développement des projets (autorisations, financement).",
        "done": "Projets développés et prêts à construire."
      }
    },
    {
      "id": "step-pro-4",
      "name": "Exploitation",
      "status": "pending",
      "icon": "💼",
      "descriptions": {
        "pending": "Gestion du parc de centrales.",
        "done": "Activité de producteur pleinement opérationnelle."
      }
    }
  ]'::jsonb
);

-- =====================================================
-- MODIFICATION : Table projects (ajout FK vers project_templates)
-- =====================================================

-- Ajouter une colonne template_type pour relier projects -> project_templates
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS template_type TEXT;

-- Créer une contrainte de clé étrangère vers project_templates.type
ALTER TABLE public.projects
ADD CONSTRAINT fk_projects_template_type
FOREIGN KEY (template_type) REFERENCES public.project_templates(type)
ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.template_type IS 
  'Type de modèle de projet utilisé (référence à project_templates.type).
   Permet de savoir quel template a été utilisé pour créer ce projet.';

CREATE INDEX idx_projects_template_type ON public.projects(template_type);

-- =====================================================
-- MODIFICATION : Mettre à jour la documentation
-- =====================================================

COMMENT ON TABLE public.projects IS 
  'Projets assignés aux prospects (instances de projets).
   Chaque projet est basé sur un modèle (project_templates) identifié par template_type.
   Un prospect peut avoir plusieurs projets de différents types.';
