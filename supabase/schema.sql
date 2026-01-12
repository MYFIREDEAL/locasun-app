-- =====================================================
-- LOCASUN SUPABASE DATABASE SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: 10 novembre 2025
-- Description: Schéma complet pour migrer de localStorage vers Supabase
-- 
-- ⚠️ ARCHITECTURE IMPORTANTE :
-- 
-- 2 TYPES D'UTILISATEURS DISTINCTS :
-- 
-- 1️⃣ USERS PRO (Admin/Manager/Commercial)
--    - Stockés dans : auth.users + public.users
--    - Accès à : /admin/* (Pipeline, Agenda, Contacts, Charly)
--    - Rôles : Global Admin, Manager, Commercial
--    - Gèrent les prospects et clients
-- 
-- 2️⃣ CLIENTS (Prospects inscrits)
--    - Stockés dans : auth.users + public.prospects (avec user_id NOT NULL)
--    - Accès à : /dashboard/* (Projets, Parrainage, Profil, Offres)
--    - Peuvent consulter leurs projets, étapes, documents
--    - Peuvent envoyer des messages via le chat
-- 
-- DISTINCTION :
-- - prospects.user_id IS NULL → Prospect non inscrit (visible admin uniquement)
-- - prospects.user_id IS NOT NULL → Client inscrit (peut se connecter)
-- 
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: users
-- Description: Utilisateurs PRO de l'application (Admin, Manager, Commercial)
-- Accès à /admin/* - Gèrent les prospects
-- Liée à auth.users de Supabase Auth
-- Système de droits d'accès granulaires (modules + filtrage par utilisateur)
-- =====================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Lien vers auth.users
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Global Admin', 'Manager', 'Commercial')),
  manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  access_rights JSONB DEFAULT '{"modules": ["Pipeline", "Agenda", "Contacts"], "users": []}'::jsonb,
  avatar_url TEXT,
  phone TEXT,
  affiliate_slug TEXT UNIQUE,  -- Slug unique pour lien d'affiliation (ex: "jack-luc")
  affiliate_link TEXT,         -- Lien complet généré automatiquement (ex: "https://evatime.fr/inscription/jack-luc")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 
  'Utilisateurs PRO (Admin, Manager, Commercial) - Accès à l''espace admin (/admin/*).
   Système de droits d''accès à 2 niveaux :
   1. Accès aux modules (Pipeline, Agenda, Contacts)
   2. Filtrage des données par utilisateur (voir uniquement ses propres clients + ceux des utilisateurs autorisés)
   
   Hiérarchie :
   - Global Admin : Accès total à tout, tous modules, tous utilisateurs
   - Manager : Accès à ses clients + ceux de son équipe (défini par access_rights)
   - Commercial : Accès uniquement à ses clients (sauf si access_rights.users défini)
   
   DROITS DE MODIFICATION DANS LA PAGE PROFIL (/admin/profil) :
   
   📝 SECTION "INFORMATIONS PERSONNELLES" (tous les rôles) :
   - ✅ Modifiable : name, email, phone
   - ✅ Modifiable : password (via Supabase Auth updateUser)
   - 🔒 Non modifiable : role (lecture seule)
   
   🔐 SECTIONS ADMIN UNIQUEMENT (cachées si role = "Commercial") :
   - Logo Entreprise (Global Admin uniquement)
   - Gestion des Entreprises (Global Admin uniquement)
   - Gestion du Formulaire Contact (Admin/Global Admin)
   - Gestion des Pipelines Globales (Admin/Global Admin)
   - Gestion des Projets (Admin/Global Admin)
   - Gestion des Formulaires (Admin/Global Admin)
   - Gestion de l''Affichage des Projets (Admin/Global Admin)
   - Création de Prompt (Admin/Global Admin)
   - Gestion des utilisateurs PRO (Admin/Global Admin)
   
   ℹ️  Un Commercial voit UNIQUEMENT "Informations personnelles" dans son profil.';

COMMENT ON COLUMN public.users.role IS 
  'Rôle de l''utilisateur : 
   - Global Admin : Accès complet sans restriction
   - Manager : Gère une équipe (définie via manager_id sur d''autres users)
   - Commercial : Utilisateur standard avec accès restreint';

COMMENT ON COLUMN public.users.manager_id IS 
  'ID du manager de cet utilisateur (hiérarchie). 
   Permet de créer des équipes. Un Manager peut voir les données de son équipe.';

COMMENT ON COLUMN public.users.affiliate_slug IS 
  'Slug unique généré automatiquement à partir du nom pour créer le lien d''affiliation.
   Exemples : "Jack Luc" → "jack-luc", "Marie Dupont" → "marie-dupont"
   Utilisé pour construire le lien : https://evatime.fr/inscription/{affiliate_slug}';

COMMENT ON COLUMN public.users.affiliate_link IS 
  'Lien d''affiliation complet généré automatiquement.
   Exemple : https://evatime.fr/inscription/jack-luc
   Quand un prospect s''inscrit via ce lien, il devient automatiquement propriété de ce user (owner_id).
   Le système de tracking est géré dans la table "referrals".';

COMMENT ON COLUMN public.users.access_rights IS 
  'Droits d''accès granulaires configurés depuis ProfilePage > Droits d''accès.
   Structure JSON :
   {
     "modules": ["Pipeline", "Agenda", "Contacts"],  // Modules accessibles
     "users": ["user-uuid-1", "user-uuid-2"]         // IDs des utilisateurs dont on peut voir les données
   }
   
   Fonctionnement :
   - modules : Liste des modules autorisés (si vide ou absent, tous les modules)
   - users : Liste des user IDs dont cet utilisateur peut voir les données
   
   Exemples d''usage :
   1. Commercial A peut voir l''agenda du Commercial B :
      access_rights.users = ["uuid-commercial-b"]
      → Dans l''agenda, affiche les RDV de A + B
   
   2. Manager peut voir toute son équipe :
      access_rights.users = ["uuid-comm-1", "uuid-comm-2", "uuid-comm-3"]
      → Voit tous les prospects/RDV de son équipe
   
   3. Commercial sans accès Agenda :
      access_rights.modules = ["Pipeline", "Contacts"]
      → Ne peut pas accéder à /admin/agenda
   
   Filtrage appliqué dans :
   - Agenda.jsx : Filtre appointments/calls/tasks par allowedIds
   - FinalPipeline.jsx : Filtre prospects par allowedIds
   - CompleteOriginalContacts.jsx : Filtre contacts par allowedIds';

-- Index pour les recherches fréquentes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_manager_id ON public.users(manager_id);
CREATE INDEX idx_users_access_rights_users ON public.users USING GIN((access_rights->'users'));
CREATE INDEX idx_users_affiliate_slug ON public.users(affiliate_slug);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour générer automatiquement le slug d'affiliation unique
CREATE OR REPLACE FUNCTION generate_affiliate_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Générer le slug de base à partir du nom (minuscules, espaces remplacés par tirets)
  base_slug := lower(regexp_replace(trim(NEW.name), '[^a-zA-Z0-9]+', '-', 'g'));
  final_slug := base_slug;
  
  -- Vérifier si le slug existe déjà (en excluant la ligne actuelle en cas d'UPDATE)
  WHILE EXISTS (
    SELECT 1 FROM public.users 
    WHERE affiliate_slug = final_slug 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) LOOP
    -- Si doublon, ajouter un suffixe numérique : jean-dupont-2, jean-dupont-3, etc.
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  -- Assigner le slug unique
  NEW.affiliate_slug := final_slug;
  
  -- Générer le lien complet
  NEW.affiliate_link := 'https://evatime.fr/inscription/' || final_slug;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_affiliate_slug
  BEFORE INSERT OR UPDATE OF name ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION generate_affiliate_slug();

-- =====================================================
-- TABLE: prospects
-- Description: Prospects et CLIENTS
-- - Si user_id IS NULL : prospect non inscrit (visible uniquement par les admins)
-- - Si user_id IS NOT NULL : client inscrit (peut se connecter à /dashboard/*)
-- =====================================================
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = prospect, NOT NULL = client inscrit
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Commercial qui gère ce prospect/client
  status TEXT DEFAULT 'Intéressé' CHECK (status IN ('Intéressé', 'Lead', 'Qualified', 'Opportunity', 'Won', 'Lost')),
  tags TEXT[] DEFAULT '{}', -- Liste des projets associés (ACC, Centrale, etc.)
  affiliate_name TEXT, -- Nom du parrain/affilié
  has_appointment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.prospects IS 
'Gestion des prospects et clients. 
DROITS DE MODIFICATION (users PRO) :

✅ COMMERCIAL - SES PROPRES CONTACTS (owner_id = user_id) :
- Tous les champs modifiables : name, email, phone, company_name, address, status, tags, has_appointment, formData
- owner_id modifiable : ✅ OUI - peut réassigner à un collègue (ex: départ en vacances)

✅ COMMERCIAL - CONTACTS PARTAGÉS (via access_rights.users) :
- Tous les champs modifiables SAUF owner_id
- owner_id modifiable : ❌ NON - protégé par RLS WITH CHECK (empêche le "vol" de contacts)

✅ MANAGER - CONTACTS DE SON ÉQUIPE (manager_id = lui) :
- Tous les champs modifiables : name, email, phone, company_name, address, status, tags, has_appointment, formData
- owner_id modifiable : ✅ OUI - peut réassigner entre membres de son équipe (WITH CHECK valide que nouveau owner est dans équipe)

✅ GLOBAL ADMIN :
- Tous les contacts modifiables sans restriction

❌ CONTACTS DES AUTRES :
- Aucune modification possible';

COMMENT ON COLUMN public.prospects.owner_id IS 
'Commercial propriétaire du contact.

QUI PEUT MODIFIER owner_id :
- ✅ Propriétaire lui-même : peut réassigner à un collègue
- ✅ Manager de l''équipe : peut réassigner entre membres de son équipe (WITH CHECK vérifie)
- ✅ Global Admin : peut tout faire
- ❌ User avec accès partagé : INTERDIT (protection RLS WITH CHECK empêche vol de contacts)';

-- Index pour les recherches
CREATE INDEX idx_prospects_user_id ON public.prospects(user_id);
CREATE INDEX idx_prospects_owner_id ON public.prospects(owner_id);
CREATE INDEX idx_prospects_status ON public.prospects(status);
CREATE INDEX idx_prospects_tags ON public.prospects USING GIN(tags);
CREATE INDEX idx_prospects_email ON public.prospects(email);

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour auto-assigner owner_id à l'utilisateur qui crée le prospect (si NULL)
CREATE OR REPLACE FUNCTION auto_assign_prospect_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Si owner_id est NULL, assigner le user qui insère
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_assign_owner_on_insert
  BEFORE INSERT ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_prospect_owner();

-- =====================================================
-- TABLE: project_templates (anciennement "projects")
-- Description: MODÈLES de projets configurables depuis l'interface admin
-- Cette table remplace le fichier statique src/data/projects.js
-- Permet la création dynamique de nouveaux types de projets
-- =====================================================
CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT UNIQUE NOT NULL, -- ACC, Centrale, Autonomie, Investissement, ProducteurPro (clé unique)
  title TEXT NOT NULL, -- Titre admin : "Autoconsommation Collective"
  client_title TEXT NOT NULL, -- Titre client : "Mon Projet ACC"
  icon TEXT DEFAULT '📁', -- Emoji ou icon
  color TEXT DEFAULT 'gradient-blue', -- Classe CSS Tailwind (gradient-blue, gradient-green, etc.)
  image_url TEXT, -- URL de l'image du projet (affichée dans le dashboard client)
  client_description TEXT, -- Description du projet visible par le client dans le dashboard
  cta_text TEXT DEFAULT 'Ajouter ce projet', -- Texte du bouton Call-to-Action visible par le client
  is_public BOOLEAN DEFAULT TRUE, -- Si false, modèle non visible côté client (brouillon)
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Structure des étapes du projet (voir commentaire détaillé ci-dessous)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.project_templates IS 
  'MODÈLES de projets configurables depuis l''interface admin (ProfilePage > Gestion des Projets).
   Permet de créer/modifier/supprimer des types de projets dynamiquement sans toucher au code.
   Chaque modèle définit : type unique, titre admin/client, icône, couleur, étapes personnalisées, visibilité.';

COMMENT ON COLUMN public.project_templates.type IS 
  'Identifiant unique du type de projet (slug). Ex: "ACC", "Autonomie", "Centrale", "Investissement", "ProducteurPro".
   Utilisé comme clé de référence dans project_steps_status et client_form_panels.';

COMMENT ON COLUMN public.project_templates.image_url IS 
  'URL de l''image du projet (photo, illustration) affichée dans le dashboard client. 
   Peut être stockée dans Supabase Storage ou URL externe. Améliore la présentation visuelle du projet.';

COMMENT ON COLUMN public.project_templates.client_description IS 
  'Description du projet visible par le client dans son dashboard. 
   Texte explicatif présentant les avantages et caractéristiques du projet de manière accessible.';

COMMENT ON COLUMN public.project_templates.cta_text IS 
  'Texte du bouton Call-to-Action (CTA) visible par le client. 
   Par défaut : "Ajouter ce projet". Personnalisable par projet (ex: "Découvrir cette offre", "Me lancer").';

COMMENT ON COLUMN public.project_templates.is_public IS 
  'Contrôle la visibilité du modèle côté client. Si false, le modèle n''apparaît pas dans l''interface client (mode brouillon admin).';

COMMENT ON COLUMN public.project_templates.steps IS 
  'Tableau JSON des étapes du projet. Structure attendue :
   [
     {
       "id": "step-123",
       "name": "Étude de faisabilité",
       "status": "pending",
       "icon": "📊",
       "descriptions": {
         "pending": "Analyse en cours...",
         "done": "Étude validée !",
         "blocked": "En attente de documents"
       },
       "globalStepId": "uuid-of-global-pipeline-step"
     }
   ]
   Le champ globalStepId permet d''associer chaque étape de projet à une étape du pipeline global (table global_pipeline_steps).';

CREATE INDEX idx_project_templates_type ON public.project_templates(type);
CREATE INDEX idx_project_templates_public ON public.project_templates(is_public);

CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: project_steps_status
-- Description: État d'avancement des étapes par projet et par prospect
-- Lie un prospect à un modèle de projet (project_templates)
-- =====================================================
CREATE TABLE public.project_steps_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL REFERENCES public.project_templates(type) ON DELETE CASCADE, -- Référence au modèle
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- État de chaque étape
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prospect_id, project_type)
);

COMMENT ON TABLE public.project_steps_status IS 
  'État d''avancement des étapes de projet par prospect.
   Chaque ligne représente l''instance d''un projet (basé sur project_templates) pour un prospect donné.
   Le champ steps contient l''état actuel de chaque étape (pending, done, blocked).';

COMMENT ON COLUMN public.project_steps_status.project_type IS 
  'Type de projet (clé étrangère vers project_templates.type). Ex: "ACC", "Autonomie", etc.';

CREATE INDEX idx_project_steps_prospect_id ON public.project_steps_status(prospect_id);
CREATE INDEX idx_project_steps_project_type ON public.project_steps_status(project_type);

CREATE TRIGGER update_project_steps_status_updated_at
  BEFORE UPDATE ON public.project_steps_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: project_infos
-- Description: Informations spécifiques par projet (RIB, documents, etc.)
-- =====================================================
CREATE TABLE public.project_infos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL REFERENCES public.project_templates(type) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Données flexibles (ribFile, documents, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prospect_id, project_type)
);

COMMENT ON TABLE public.project_infos IS 
  'Informations spécifiques à un projet pour un prospect donné.
   Stocke des données comme le RIB, les documents uploadés, les notes spécifiques, etc.
   Structure flexible via JSONB pour s''adapter à différents types de projets.
   
   CHAMPS MODIFIABLES PAR UN USER PRO (dans fiche détail client) :
   - amount (DECIMAL) : Montant du deal en euros (ex: 15000.50)
   - ribFile (TEXT) : URL/path du fichier RIB uploadé
   - documents (ARRAY) : Liste des documents uploadés pour ce projet
   - notes (TEXT) : Notes spécifiques au projet
   
   Structure JSONB du champ "data" :
   {
     "amount": 15000.50,
     "ribFile": "path/to/rib.pdf",
     "documents": ["doc1.pdf", "doc2.pdf"],
     "notes": "Client très intéressé"
   }';

COMMENT ON COLUMN public.project_infos.project_type IS 
  'Type de projet (clé étrangère vers project_templates.type).';

COMMENT ON COLUMN public.project_infos.data IS 
  'Données flexibles du projet (JSONB).
   Champs fréquents :
   - amount : Montant du deal (modifiable via fiche détail)
   - ribFile : Chemin du RIB uploadé
   - documents : Liste des documents
   - notes : Notes du commercial';

CREATE INDEX idx_project_infos_prospect_id ON public.project_infos(prospect_id);
CREATE INDEX idx_project_infos_project_type ON public.project_infos(project_type);

CREATE TRIGGER update_project_infos_updated_at
  BEFORE UPDATE ON public.project_infos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: appointments
-- Description: Rendez-vous dans l'agenda
-- =====================================================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  contact_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id TEXT, -- Type de projet (ACC, Centrale, etc.)
  step TEXT, -- Étape du projet concernée
  type TEXT DEFAULT 'physical' CHECK (type IN ('physical', 'virtual', 'call', 'task')), -- Type: physical/virtual (calendrier), call/task (sidebar uniquement)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'effectue', 'annule', 'reporte')),
  rescheduled_from_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL, -- Lien vers le RDV d'origine si c'est un report
  share BOOLEAN DEFAULT FALSE, -- Partager avec le client
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_assigned_user_id ON public.appointments(assigned_user_id);
CREATE INDEX idx_appointments_contact_id ON public.appointments(contact_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_type ON public.appointments(type);
CREATE INDEX idx_appointments_rescheduled_from ON public.appointments(rescheduled_from_id);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: calls
-- Description: Appels téléphoniques planifiés
-- =====================================================
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  contact_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'effectue', 'annule')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_assigned_user_id ON public.calls(assigned_user_id);
CREATE INDEX idx_calls_contact_id ON public.calls(contact_id);
CREATE INDEX idx_calls_date ON public.calls(date);
CREATE INDEX idx_calls_status ON public.calls(status);

CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: tasks
-- Description: Tâches à accomplir
-- =====================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  date DATE NOT NULL,
  contact_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  done BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned_user_id ON public.tasks(assigned_user_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_date ON public.tasks(date);
CREATE INDEX idx_tasks_done ON public.tasks(done);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: chat_messages
-- Description: Messages échangés entre admin et clients
-- =====================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin', 'pro')),
  text TEXT,
  file JSONB, -- {name, size, type, url}
  form_id TEXT,
  completed_form_id TEXT,
  prompt_id TEXT,
  step_index INTEGER,
  related_message_timestamp TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_prospect_id ON public.chat_messages(prospect_id);
CREATE INDEX idx_chat_messages_project_type ON public.chat_messages(project_type);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_read ON public.chat_messages(read);

-- =====================================================
-- TABLE: notifications
-- Description: Notifications pour les admins
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE, -- 🔥 Admin qui doit voir la notification
  project_type TEXT,
  prospect_name TEXT,
  project_name TEXT,
  count INTEGER DEFAULT 1,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_prospect_id ON public.notifications(prospect_id);
CREATE INDEX idx_notifications_owner_id ON public.notifications(owner_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- =====================================================
-- TABLE: client_notifications
-- Description: Notifications pour les clients
-- =====================================================
CREATE TABLE public.client_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  project_name TEXT,
  message TEXT,
  count INTEGER DEFAULT 1,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_notifications_prospect_id ON public.client_notifications(prospect_id);
CREATE INDEX idx_client_notifications_read ON public.client_notifications(read);
CREATE INDEX idx_client_notifications_created_at ON public.client_notifications(created_at DESC);

-- =====================================================
-- TABLE: forms
-- Description: Formulaires personnalisés créés par les admins
-- Ces formulaires sont envoyés aux clients via le chat
-- =====================================================
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, -- Nom interne du formulaire (ex: "Formulaire RIB")
  fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Champs du formulaire (voir structure ci-dessous)
  project_ids TEXT[] DEFAULT ARRAY[]::TEXT[], -- Types de projets associés (ex: ['ACC', 'Centrale'])
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.forms IS 
  'Formulaires dynamiques créés depuis ProfilePage > Gestion des Formulaires.
   Les admins peuvent créer des formulaires personnalisés pour collecter des infos clients.
   Ces formulaires sont envoyés aux clients via le chat (client_form_panels).';

COMMENT ON COLUMN public.forms.name IS 
  'Nom interne du formulaire (visible uniquement admin). Ex: "Formulaire RIB", "Documents identité".';

COMMENT ON COLUMN public.forms.fields IS 
  'Tableau JSON des champs du formulaire. Structure :
   [
     {
       "id": "field-123",
       "label": "Numéro de compte bancaire",
       "type": "text",
       "placeholder": "FR76 XXXX XXXX XXXX",
       "required": true
     },
     {
       "id": "field-456",
       "label": "Document RIB",
       "type": "file",
       "placeholder": "",
       "required": true
     }
   ]
   Types supportés : text, email, phone, number, file';

COMMENT ON COLUMN public.forms.project_ids IS 
  'Liste des types de projets associés à ce formulaire (références vers project_templates.type).
   Ex: ["ACC", "Centrale"] signifie que ce formulaire est disponible pour ces projets.
   Si vide, le formulaire est disponible pour tous les projets.';

CREATE INDEX idx_forms_form_id ON public.forms(form_id);
CREATE INDEX idx_forms_project_ids ON public.forms USING GIN(project_ids);

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: prompts
-- Description: Prompts/Scénarios pour Charly AI avec actions automatiques
-- Système de workflow intelligent par étape de projet
-- =====================================================
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, -- Nom du prompt (ex: "Relance après RDV")
  tone TEXT, -- Ton du prompt (professionnel, détendu, humain)
  project_id TEXT REFERENCES public.project_templates(type) ON DELETE CASCADE, -- Projet associé
  steps_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Configuration par étape (voir structure ci-dessous)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.prompts IS 
  'Prompts/Scénarios configurés depuis ProfilePage > Création de Prompt.
   Permet de définir des actions automatiques à chaque étape d''un projet :
   - Messages à envoyer automatiquement
   - Formulaires à afficher
   - Actions à déclencher (signature, paiement, document)
   - Règles de complétion automatique d''étapes (si formulaire rempli → passer à l''étape suivante)
   
   Workflow :
   1. Admin crée un prompt pour un projet spécifique
   2. Pour chaque étape du projet, définit des actions (messages + formulaires)
   3. Configure si la complétion d''un formulaire doit automatiquement passer à l''étape suivante
   4. Charly AI utilise ces prompts pour guider les clients automatiquement';

COMMENT ON COLUMN public.prompts.name IS 
  'Nom du prompt (ex: "Relance après RDV", "Workflow ACC complet")';

COMMENT ON COLUMN public.prompts.tone IS 
  'Ton à utiliser pour les messages générés : "professionnel", "détendu", "humain"';

COMMENT ON COLUMN public.prompts.project_id IS 
  'Type de projet associé (référence vers project_templates.type). Ex: "ACC", "Centrale"';

COMMENT ON COLUMN public.prompts.steps_config IS 
  'Configuration des actions par étape. Structure :
   {
     "0": {  // Index de l''étape dans project_templates.steps
       "actions": [
         {
           "id": "action-123",
           "message": "Bonjour, merci de compléter le formulaire RIB",
           "type": "show_form",
           "formId": "form-456"
         },
         {
           "id": "action-124",
           "message": "Veuillez signer le contrat",
           "type": "start_signature",
           "documentUrl": "https://..."
         }
       ],
       "autoCompleteStep": true  // Si true, passer automatiquement à l''étape suivante quand le formulaire est rempli
     },
     "1": {
       "actions": [
         {
           "id": "action-125",
           "message": "Merci d''envoyer votre pièce d''identité",
           "type": "request_document",
           "documentType": "id_card"
         }
       ],
       "autoCompleteStep": false
     }
   }
   
   Types d''actions supportés :
   - none : Aucune action
   - show_form : Afficher un formulaire (nécessite formId)
   - start_signature : Lancer une signature électronique
   - request_document : Demander un document
   - open_payment : Ouvrir un lien de paiement';

CREATE INDEX idx_prompts_prompt_id ON public.prompts(prompt_id);
CREATE INDEX idx_prompts_project_id ON public.prompts(project_id);

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: global_pipeline_steps
-- Description: Configuration des colonnes du pipeline admin
-- =====================================================
CREATE TABLE public.global_pipeline_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_global_pipeline_steps_position ON public.global_pipeline_steps(position);

CREATE TRIGGER update_global_pipeline_steps_updated_at
  BEFORE UPDATE ON public.global_pipeline_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: client_form_panels
-- Description: Instances de formulaires envoyés aux clients via le chat
-- Un admin peut envoyer un formulaire à un client pour qu'il le remplisse
-- =====================================================
CREATE TABLE public.client_form_panels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id TEXT UNIQUE NOT NULL, -- Identifiant unique du panel
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL REFERENCES public.project_templates(type) ON DELETE CASCADE,
  form_id TEXT NOT NULL REFERENCES public.forms(form_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message_timestamp TEXT, -- Timestamp du message chat associé
  user_override TEXT, -- Override de statut par l'utilisateur
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.client_form_panels IS 
  'Instances de formulaires envoyés aux clients via le chat.
   Workflow : 
   1. Admin envoie un formulaire depuis le chat (crée une ligne ici)
   2. Client voit le formulaire dans son interface (ClientFormPanel.jsx)
   3. Client remplit et soumet → met à jour prospects.formData et change status
   4. Admin voit la soumission et peut approuver/rejeter';

COMMENT ON COLUMN public.client_form_panels.panel_id IS 
  'Identifiant unique du panel (généré côté front : panel-{timestamp})';

COMMENT ON COLUMN public.client_form_panels.status IS 
  'Statut du formulaire : 
   - pending : En attente de soumission par le client
   - approved : Validé par l''admin
   - rejected : Rejeté par l''admin (client doit resoumettre)';

COMMENT ON COLUMN public.client_form_panels.message_timestamp IS 
  'Timestamp du message chat où le formulaire a été envoyé. Permet de retrouver le message dans chat_messages.';

CREATE INDEX idx_client_form_panels_prospect_id ON public.client_form_panels(prospect_id);
CREATE INDEX idx_client_form_panels_project_type ON public.client_form_panels(project_type);
CREATE INDEX idx_client_form_panels_form_id ON public.client_form_panels(form_id);
CREATE INDEX idx_client_form_panels_status ON public.client_form_panels(status);

CREATE TRIGGER update_client_form_panels_updated_at
  BEFORE UPDATE ON public.client_form_panels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: company_settings
-- Description: Paramètres globaux de l'entreprise (logo, formulaire contact, etc.)
-- =====================================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_url TEXT,
  company_name TEXT,
  settings JSONB DEFAULT '{}'::jsonb, -- Paramètres flexibles :
  -- {
  --   "contact_form_config": [{id, name, type, placeholder, required}, ...],
  --   "other_setting": "value"
  -- }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_steps_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_infos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_pipeline_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_form_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- =====================================================
-- RLS POLICIES - USERS (Admin/Commercial/Manager)
-- =====================================================

-- Users PRO peuvent voir leur propre profil
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users PRO peuvent modifier leurs propres informations personnelles
-- Champs modifiables depuis /admin/profil > Informations personnelles : name, email, phone
-- Champs PROTÉGÉS (non modifiables) : role, manager_id, access_rights
-- Le mot de passe se change via Supabase Auth (supabase.auth.updateUser)
CREATE POLICY "Users can update their own info"
  ON public.users
  FOR UPDATE
  USING (user_id = auth.uid());

-- Global Admin peut tout voir et modifier (y compris roles, access_rights)
CREATE POLICY "Global Admin can manage all users"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

-- Managers peuvent voir leur équipe
CREATE POLICY "Managers can view their team"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Manager'
    ) AND manager_id = auth.uid()
  );

-- =====================================================
-- RLS POLICIES - PROSPECTS
-- =====================================================

-- CLIENT inscrit peut voir ses propres données (via user_id)
CREATE POLICY "Clients can view their own data"
  ON public.prospects
  FOR SELECT
  USING (user_id = auth.uid());

-- CLIENT inscrit peut modifier ses propres données (nom, email, phone, company_name, address)
-- Champs modifiables depuis /dashboard/profil : name, email, phone, company_name, address
-- Champs PROTÉGÉS (non modifiables) : user_id, owner_id, status, tags, affiliate_name, has_appointment
CREATE POLICY "Clients can update their own data"
  ON public.prospects
  FOR UPDATE
  USING (user_id = auth.uid());

-- COMMERCIAL voit ses prospects/clients + ceux des users autorisés via access_rights
CREATE POLICY "Users can view their own and authorized prospects"
  ON public.prospects
  FOR SELECT
  USING (
    -- Ses propres prospects
    owner_id = auth.uid() OR
    -- Ou si c'est un client qui consulte ses propres données
    user_id = auth.uid() OR
    -- Ou prospects des utilisateurs autorisés via access_rights.users
    owner_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  );

-- COMMERCIAL peut CRÉER des prospects (devient automatiquement propriétaire)
CREATE POLICY "Users can insert prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (
    -- Le owner_id doit être le user qui crée OU vide (sera auto-assigné par trigger)
    (owner_id = auth.uid() OR owner_id IS NULL) AND
    -- S'assurer que c'est bien un user PRO/Manager/Admin (pas un client)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  );

-- COMMERCIAL peut SUPPRIMER uniquement ses propres prospects
CREATE POLICY "Users can delete their own prospects"
  ON public.prospects
  FOR DELETE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  );

-- COMMERCIAL peut MODIFIER ses propres prospects
CREATE POLICY "Users can update their own prospects"
  ON public.prospects
  FOR UPDATE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Commercial', 'Manager', 'Global Admin')
    )
  );

-- COMMERCIAL peut modifier les prospects qui lui sont partagés via access_rights.users
-- ⚠️  SÉCURITÉ : owner_id ne peut PAS être modifié (empêche le "vol" de contacts)
CREATE POLICY "Users can manage authorized prospects"
  ON public.prospects
  FOR UPDATE
  USING (
    owner_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Empêcher la modification de owner_id (doit rester le propriétaire d'origine)
    owner_id = (SELECT owner_id FROM public.prospects WHERE id = prospects.id)
  );

-- MANAGER voit les prospects de son équipe
CREATE POLICY "Managers can view their team prospects"
  ON public.prospects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    )
  );

-- MANAGER peut gérer (modifier) les prospects de son équipe, y compris changer owner_id
-- Cas d'usage : réassigner un contact d'un commercial A à un commercial B dans son équipe
CREATE POLICY "Managers can manage their team prospects"
  ON public.prospects
  FOR UPDATE
  USING (
    -- Le contact appartient à quelqu'un de son équipe
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    ) AND
    -- S'assurer que c'est bien un Manager
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Manager'
    )
  )
  WITH CHECK (
    -- Le nouveau owner_id doit être dans son équipe (ou lui-même)
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    )
  );

-- MANAGER peut CRÉER des prospects pour son équipe
CREATE POLICY "Managers can insert team prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (
    -- Le owner_id doit être le Manager lui-même OU quelqu'un de son équipe
    (owner_id = auth.uid() OR
     EXISTS (
       SELECT 1 FROM public.users u
       WHERE u.id = owner_id AND u.manager_id = auth.uid()
     )) AND
    -- S'assurer que c'est bien un Manager
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Manager'
    )
  );

-- MANAGER peut SUPPRIMER les prospects de son équipe
CREATE POLICY "Managers can delete team prospects"
  ON public.prospects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.manager_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Manager'
    )
  );

-- GLOBAL ADMIN voit et gère tous les prospects
CREATE POLICY "Global Admin can manage all prospects"
  ON public.prospects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

-- =====================================================
-- RLS POLICIES - PROJECT_TEMPLATES (Modèles de projets)
-- =====================================================

-- Les ADMINS peuvent tout gérer (créer, modifier, supprimer les modèles)
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

-- Les CLIENTS peuvent seulement voir les modèles publics (is_public = true)
-- Ceci permet d'afficher les projets disponibles côté client
CREATE POLICY "Clients can view public project templates"
  ON public.project_templates
  FOR SELECT
  USING (is_public = TRUE);

-- Les utilisateurs NON authentifiés peuvent aussi voir les modèles publics
-- (utile pour landing pages, etc.)
CREATE POLICY "Anyone can view public project templates"
  ON public.project_templates
  FOR SELECT
  USING (is_public = TRUE);

-- =====================================================
-- RLS POLICIES - APPOINTMENTS (avec access_rights.users)
-- =====================================================

-- USERS PRO voient leurs propres RDV + ceux des users autorisés
CREATE POLICY "Users can view their own and authorized appointments"
  ON public.appointments
  FOR SELECT
  USING (
    -- Ses propres RDV
    assigned_user_id = auth.uid() OR
    -- RDV des utilisateurs autorisés via access_rights.users
    assigned_user_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  );

-- USERS PRO gèrent uniquement leurs propres RDV (pas ceux des autres)
CREATE POLICY "Users can manage their own appointments"
  ON public.appointments
  FOR ALL
  USING (
    assigned_user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );

-- CLIENTS peuvent voir les RDV partagés (share = TRUE)
CREATE POLICY "Clients can view shared appointments"
  ON public.appointments
  FOR SELECT
  USING (
    share = TRUE AND
    contact_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - CALLS (avec access_rights.users)
-- =====================================================

-- USERS PRO voient leurs propres appels + ceux des users autorisés
CREATE POLICY "Users can view their own and authorized calls"
  ON public.calls
  FOR SELECT
  USING (
    -- Ses propres appels
    assigned_user_id = auth.uid() OR
    -- Appels des utilisateurs autorisés via access_rights.users
    assigned_user_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  );

-- USERS PRO gèrent uniquement leurs propres appels
CREATE POLICY "Users can manage their own calls"
  ON public.calls
  FOR ALL
  USING (assigned_user_id = auth.uid());

-- =====================================================
-- RLS POLICIES - TASKS (avec access_rights.users)
-- =====================================================

-- USERS PRO voient leurs propres tâches + celles des users autorisés
CREATE POLICY "Users can view their own and authorized tasks"
  ON public.tasks
  FOR SELECT
  USING (
    -- Ses propres tâches
    assigned_user_id = auth.uid() OR
    -- Tâches des utilisateurs autorisés via access_rights.users
    assigned_user_id IN (
      SELECT jsonb_array_elements_text(access_rights->'users')::UUID
      FROM public.users
      WHERE user_id = auth.uid()
    )
  );

-- USERS PRO gèrent uniquement leurs propres tâches
CREATE POLICY "Users can manage their own tasks"
  ON public.tasks
  FOR ALL
  USING (assigned_user_id = auth.uid());

-- =====================================================
-- RLS POLICIES - CHAT MESSAGES
-- =====================================================

-- USERS PRO peuvent voir les messages de leurs prospects
CREATE POLICY "Users can view their prospects chat"
  ON public.chat_messages
  FOR ALL
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );

-- CLIENTS peuvent voir leurs propres messages
CREATE POLICY "Clients can view their own chat"
  ON public.chat_messages
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- CLIENTS peuvent envoyer des messages
CREATE POLICY "Clients can send messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    ) AND
    sender = 'client'
  );

-- Notifications: Admins voient leurs notifications
CREATE POLICY "Admins can view their notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- =====================================================
-- RLS POLICIES - CLIENT NOTIFICATIONS
-- =====================================================

-- CLIENTS voient leurs propres notifications
CREATE POLICY "Clients can view their notifications"
  ON public.client_notifications
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- CLIENTS peuvent marquer leurs notifications comme lues
CREATE POLICY "Clients can update their notifications"
  ON public.client_notifications
  FOR UPDATE
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - PROJECT STEPS STATUS
-- =====================================================

-- USERS PRO peuvent voir et modifier les steps de leurs prospects
CREATE POLICY "Users can manage their prospects steps"
  ON public.project_steps_status
  FOR ALL
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );

-- CLIENTS peuvent voir leurs propres steps
CREATE POLICY "Clients can view their own steps"
  ON public.project_steps_status
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - PROJECT INFOS
-- =====================================================

-- USERS PRO peuvent gérer les infos de leurs prospects
CREATE POLICY "Users can manage their prospects infos"
  ON public.project_infos
  FOR ALL
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );

-- USERS PRO peuvent modifier les infos des prospects partagés via access_rights.users
CREATE POLICY "Users can manage authorized prospects infos"
  ON public.project_infos
  FOR UPDATE
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects 
      WHERE owner_id IN (
        SELECT jsonb_array_elements_text(access_rights->'users')::UUID
        FROM public.users
        WHERE user_id = auth.uid()
      )
    )
  );

-- CLIENTS peuvent voir leurs propres infos
CREATE POLICY "Clients can view their own infos"
  ON public.project_infos
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- CLIENTS peuvent modifier leurs propres infos (documents, etc.)
CREATE POLICY "Clients can update their own infos"
  ON public.project_infos
  FOR UPDATE
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - FORMS (Gestion dynamique des formulaires)
-- =====================================================

-- Les ADMINS peuvent créer/modifier/supprimer des formulaires
CREATE POLICY "Admins can manage forms"
  ON public.forms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid() 
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Les CLIENTS peuvent voir les définitions de formulaires
-- (nécessaire pour afficher les champs quand un formulaire leur est envoyé)
CREATE POLICY "Clients can view forms"
  ON public.forms
  FOR SELECT
  USING (TRUE);

-- =====================================================
-- RLS POLICIES - CLIENT_FORM_PANELS (Formulaires envoyés aux clients)
-- =====================================================

-- Les ADMINS peuvent envoyer/gérer les formulaires clients
CREATE POLICY "Admins can manage client form panels"
  ON public.client_form_panels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
  );

-- Les CLIENTS peuvent voir et modifier leurs propres formulaires
CREATE POLICY "Clients can manage their own form panels"
  ON public.client_form_panels
  FOR ALL
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - PROMPTS
-- =====================================================

-- Admins peuvent gérer les prompts
CREATE POLICY "Admins can manage prompts"
  ON public.prompts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role IN ('Global Admin', 'Manager')
    )
  );

-- =====================================================
-- RLS POLICIES - GLOBAL PIPELINE STEPS
-- =====================================================

-- Global Admin peut gérer les colonnes du pipeline
CREATE POLICY "Admins can manage pipeline steps"
  ON public.global_pipeline_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

-- =====================================================
-- RLS POLICIES - COMPANY SETTINGS
-- =====================================================

-- Global Admin peut gérer les paramètres
CREATE POLICY "Global Admin can manage company settings"
  ON public.company_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

-- =====================================================
-- FUNCTIONS UTILES
-- =====================================================

-- Fonction pour obtenir tous les prospects d'un manager (incluant sous-équipes)
CREATE OR REPLACE FUNCTION get_manager_team_prospects(manager_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  owner_id UUID,
  status TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.prospects p
  WHERE p.owner_id IN (
    SELECT u.id FROM public.users u
    WHERE u.manager_id = manager_user_id OR u.id = manager_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compter les activités en retard par utilisateur
CREATE OR REPLACE FUNCTION get_overdue_activities(user_id UUID)
RETURNS TABLE (
  overdue_calls BIGINT,
  overdue_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.calls WHERE assigned_user_id = user_id AND date < CURRENT_DATE AND status = 'pending') AS overdue_calls,
    (SELECT COUNT(*) FROM public.tasks WHERE assigned_user_id = user_id AND date < CURRENT_DATE AND done = FALSE) AS overdue_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insérer les modèles de projets par défaut (remplace src/data/projects.js)
INSERT INTO public.project_templates (type, title, client_title, icon, color, is_public, steps)
VALUES
  ('ACC', 'Autoconsommation Collective', 'Mon Projet ACC', '🌞', 'gradient-blue', TRUE, 
   '[
     {"id": "step-acc-1", "name": "Inscription", "status": "pending", "icon": "✅", "descriptions": {"pending": "En attente d''inscription", "done": "Inscription complétée"}},
     {"id": "step-acc-2", "name": "Connexion à la centrale", "status": "pending", "icon": "⚡", "descriptions": {"pending": "En cours de connexion", "done": "Connecté à la centrale"}},
     {"id": "step-acc-3", "name": "Contrat", "status": "pending", "icon": "📝", "descriptions": {"pending": "Contrat en préparation", "done": "Contrat signé"}},
     {"id": "step-acc-4", "name": "Attente raccordement", "status": "pending", "icon": "⏳", "descriptions": {"pending": "En attente du raccordement", "done": "Raccordement effectué"}},
     {"id": "step-acc-5", "name": "Actif", "status": "pending", "icon": "🌞", "descriptions": {"pending": "Projet en attente", "done": "Projet actif et opérationnel"}}
   ]'::jsonb),
  ('Autonomie', 'Autonomie', 'Mon Projet Autonomie', '�', 'gradient-green', TRUE,
   '[
     {"id": "step-auto-1", "name": "Inscription", "status": "pending", "icon": "✅", "descriptions": {"pending": "Inscription en cours", "done": "Inscription validée"}},
     {"id": "step-auto-2", "name": "Étude", "status": "pending", "icon": "🔎", "descriptions": {"pending": "Étude de faisabilité en cours", "done": "Étude terminée"}},
     {"id": "step-auto-3", "name": "Contrat", "status": "pending", "icon": "📝", "descriptions": {"pending": "Contrat en préparation", "done": "Contrat signé"}},
     {"id": "step-auto-4", "name": "Installation", "status": "pending", "icon": "🛠️", "descriptions": {"pending": "Installation programmée", "done": "Installation terminée"}},
     {"id": "step-auto-5", "name": "Actif", "status": "pending", "icon": "🌞", "descriptions": {"pending": "Mise en service prévue", "done": "Système autonome actif"}}
   ]'::jsonb),
  ('Centrale', 'Centrale (3-500 kWc)', 'Ma Centrale Solaire', '☀️', 'gradient-orange', TRUE,
   '[
     {"id": "step-cent-1", "name": "Inscription", "status": "pending", "icon": "✅", "descriptions": {"pending": "Inscription", "done": "Inscrit"}},
     {"id": "step-cent-2", "name": "Étude technique & financière", "status": "pending", "icon": "📝", "descriptions": {"pending": "Étude en cours", "done": "Étude validée"}},
     {"id": "step-cent-3", "name": "Dossier administratif", "status": "pending", "icon": "✍️", "descriptions": {"pending": "Dossier en préparation", "done": "Dossier déposé"}},
     {"id": "step-cent-4", "name": "Contrat", "status": "pending", "icon": "✍️", "descriptions": {"pending": "Contrat en cours", "done": "Contrat signé"}},
     {"id": "step-cent-5", "name": "Dépôt mairie", "status": "pending", "icon": "🏦", "descriptions": {"pending": "Dépôt en attente", "done": "Validé par la mairie"}},
     {"id": "step-cent-6", "name": "Validation Enedis", "status": "pending", "icon": "💡", "descriptions": {"pending": "En attente validation Enedis", "done": "Validé par Enedis"}},
     {"id": "step-cent-7", "name": "Commande matériel", "status": "pending", "icon": "📦", "descriptions": {"pending": "Matériel en commande", "done": "Matériel livré"}},
     {"id": "step-cent-8", "name": "Installation chantier", "status": "pending", "icon": "👷", "descriptions": {"pending": "Installation en cours", "done": "Installation terminée"}},
     {"id": "step-cent-9", "name": "Contrôles & Consuel", "status": "pending", "icon": "📋", "descriptions": {"pending": "Contrôles en cours", "done": "Contrôles validés"}},
     {"id": "step-cent-10", "name": "Mise en service", "status": "pending", "icon": "⚡️", "descriptions": {"pending": "Mise en service prévue", "done": "Centrale en production"}}
   ]'::jsonb),
  ('Investissement', 'Investissement', 'Mon Investissement Solaire', '�', 'gradient-purple', TRUE,
   '[
     {"id": "step-inv-1", "name": "Inscription", "status": "pending", "icon": "✅", "descriptions": {"pending": "Inscription", "done": "Inscrit"}},
     {"id": "step-inv-2", "name": "Validation", "status": "pending", "icon": "🔎", "descriptions": {"pending": "Dossier en validation", "done": "Dossier validé"}},
     {"id": "step-inv-3", "name": "Placement", "status": "pending", "icon": "💶", "descriptions": {"pending": "Placement en cours", "done": "Investissement placé"}},
     {"id": "step-inv-4", "name": "Gains", "status": "pending", "icon": "📈", "descriptions": {"pending": "Gains à venir", "done": "Gains générés"}}
   ]'::jsonb),
  ('ProducteurPro', 'Producteur Pro', 'Mon Activité de Producteur', '⚡', 'gradient-yellow', FALSE,
   '[
     {"id": "step-pro-1", "name": "Inscription", "status": "pending", "icon": "✅", "descriptions": {"pending": "Inscription", "done": "Inscrit"}},
     {"id": "step-pro-2", "name": "Analyse Technique", "status": "pending", "icon": "🔧", "descriptions": {"pending": "Analyse en cours", "done": "Analyse terminée"}},
     {"id": "step-pro-3", "name": "Offre de rachat", "status": "pending", "icon": "💶", "descriptions": {"pending": "Offre en préparation", "done": "Offre acceptée"}},
     {"id": "step-pro-4", "name": "Contrat Partenaire", "status": "pending", "icon": "✍️", "descriptions": {"pending": "Contrat en cours", "done": "Contrat signé"}},
     {"id": "step-pro-5", "name": "Actif", "status": "pending", "icon": "⚡️", "descriptions": {"pending": "Activation en attente", "done": "Producteur actif"}}
   ]'::jsonb);

-- Insérer les colonnes du pipeline par défaut
INSERT INTO public.global_pipeline_steps (step_id, label, color, position)
VALUES
  ('default-global-pipeline-step-0', 'MARKET', 'bg-blue-100', 0),
  ('default-global-pipeline-step-1', 'ETUDE', 'bg-yellow-100', 1),
  ('default-global-pipeline-step-2', 'OFFRE', 'bg-green-100', 2);

-- Insérer les paramètres de société par défaut (avec formulaire de contact)
INSERT INTO public.company_settings (company_name, settings)
VALUES (
  'Locasun',
  '{
    "contact_form_config": [
      {"id": "name", "name": "Nom*", "type": "text", "placeholder": "Jean Dupont", "required": true},
      {"id": "companyName", "name": "Société", "type": "text", "placeholder": "Nom de la société (optionnel)", "required": false},
      {"id": "email", "name": "Email*", "type": "email", "placeholder": "jean.dupont@email.com", "required": true},
      {"id": "phone", "name": "Téléphone", "type": "text", "placeholder": "06 12 34 56 78", "required": false},
      {"id": "address", "name": "Adresse", "type": "text", "placeholder": "1 Rue de la Paix, 75002 Paris", "required": false}
    ]
  }'::jsonb
);

-- =====================================================
-- COMMENTAIRES ET DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.users IS 'Utilisateurs de l''application (Admin, Manager, Commercial, Client)';
COMMENT ON TABLE public.prospects IS 'Prospects et clients (contacts commerciaux)';
COMMENT ON TABLE public.project_templates IS 'Configuration des types de projets disponibles';
COMMENT ON TABLE public.project_steps_status IS 'État d''avancement des étapes par projet et par prospect';
COMMENT ON TABLE public.project_infos IS 'Informations spécifiques par projet (documents, RIB, etc.)';
COMMENT ON TABLE public.appointments IS 
  'Rendez-vous dans l''agenda avec système de report (drag & drop).
   Workflow de report :
   1. User drag & drop un RDV vers une nouvelle date
   2. RDV original : status passe à "reporte"
   3. Nouveau RDV : créé avec rescheduled_from_id pointant vers l''original
   4. Historique complet des reports conservé via la chaîne de rescheduled_from_id';

COMMENT ON COLUMN public.appointments.type IS 
  'Type de rendez-vous :
   - physical : RDV physique (📍 sur place, au bureau, chez le client)
   - virtual : RDV virtuel (🎥 visioconférence, Zoom, Teams, Google Meet)
   
   Permet de différencier les RDV dans l''agenda avec des couleurs différentes.';

COMMENT ON COLUMN public.appointments.status IS 
  'Statut du rendez-vous :
   - pending : À venir (non qualifié)
   - effectue : Effectué (qualifié, RDV réalisé)
   - annule : Annulé
   - reporte : Reporté (un nouveau RDV a été créé)
   
   Note : Les RDV avec status="pending" et date passée apparaissent dans "Activités en retard" (sidebar agenda)';

COMMENT ON COLUMN public.appointments.rescheduled_from_id IS 
  'ID du rendez-vous d''origine si ce RDV est un report.
   Permet de tracer l''historique : RDV A (reporté) → RDV B (reporté) → RDV C (actif)';

COMMENT ON TABLE public.calls IS 
  'Appels téléphoniques planifiés.
   Les appels avec status="pending" et date/heure passée apparaissent dans "Activités en retard" (sidebar agenda).';

COMMENT ON COLUMN public.calls.status IS 
  'Statut de l''appel :
   - pending : À effectuer (non qualifié)
   - effectue : Effectué (appel réalisé et qualifié)
   - annule : Annulé';

COMMENT ON TABLE public.tasks IS 
  'Tâches à accomplir.
   Les tâches avec done=false et date passée apparaissent dans "Activités en retard" (sidebar agenda).';
COMMENT ON TABLE public.chat_messages IS 'Messages échangés entre admin et clients';
COMMENT ON TABLE public.notifications IS 'Notifications pour les administrateurs';
COMMENT ON TABLE public.client_notifications IS 'Notifications pour les clients';
COMMENT ON TABLE public.forms IS 'Formulaires personnalisés créés par les admins';
COMMENT ON TABLE public.prompts IS 'Scripts et prompts pour l''assistant IA Charly';
COMMENT ON TABLE public.global_pipeline_steps IS 'Configuration des colonnes du pipeline commercial';
COMMENT ON TABLE public.client_form_panels IS 'Formulaires envoyés aux clients avec leur statut';
COMMENT ON TABLE public.company_settings IS 'Paramètres globaux de l''entreprise (logo, formulaire de contact dynamique, etc.)';

-- =====================================================
-- FIN DU SCHÉMA
-- =====================================================
