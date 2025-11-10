# 🎯 Intégration du Système de Gestion Dynamique des Projets

## ✅ Problème identifié

Dans le code existant (`src/pages/admin/ProfilePage.jsx`), il existe un **système de gestion dynamique des projets** qui permet aux admins de :

1. **Créer de nouveaux types de projets** (à partir de zéro ou par copie d'un modèle)
2. **Modifier les projets existants** (titre, icône, couleur, étapes)
3. **Publier/Dépublier** les projets (contrôle de visibilité côté client)
4. **Supprimer** des types de projets

Ce système remplace le fichier statique `src/data/projects.js` par une interface dynamique dans ProfilePage.

## ❌ Ce qui manquait dans le schéma initial

Le schéma Supabase initial avait une table `projects` qui était utilisée à tort pour stocker à la fois :
- Les **modèles de projets** (templates configurables)
- Les **instances de projets** assignées aux prospects

Cette confusion architecturale ne reflétait pas le système dynamique de l'application.

## ✅ Solution implémentée

### 1. Renommage : `projects` → `project_templates`

La table a été renommée et clarifiée pour représenter correctement les **MODÈLES de projets**.

```sql
CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT UNIQUE NOT NULL, -- 'ACC', 'Autonomie', 'Centrale', etc.
  title TEXT NOT NULL, -- "Autoconsommation Collective"
  client_title TEXT NOT NULL, -- "Mon Projet ACC"
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT 'gradient-blue',
  is_public BOOLEAN DEFAULT TRUE, -- Contrôle de visibilité
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Structure du champ `steps` (JSONB)

Chaque modèle contient ses étapes au format JSON :

```json
[
  {
    "id": "step-acc-1",
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
```

Le champ `globalStepId` permet d'associer chaque étape de projet à une étape du pipeline global (`global_pipeline_steps`).

### 3. Relations avec les autres tables

Les tables suivantes ont été mises à jour pour référencer `project_templates.type` :

```sql
-- project_steps_status : État d'avancement pour un prospect
ALTER TABLE public.project_steps_status
ADD CONSTRAINT fk_project_type
FOREIGN KEY (project_type) REFERENCES public.project_templates(type) ON DELETE CASCADE;

-- project_infos : Informations spécifiques (RIB, documents)
ALTER TABLE public.project_infos
ADD CONSTRAINT fk_project_type
FOREIGN KEY (project_type) REFERENCES public.project_templates(type) ON DELETE CASCADE;

-- client_form_panels : Formulaires envoyés aux clients
ALTER TABLE public.client_form_panels
ADD CONSTRAINT fk_project_type
FOREIGN KEY (project_type) REFERENCES public.project_templates(type) ON DELETE CASCADE;
```

### 4. RLS Policies (Row Level Security)

#### Pour les Admins (CRUD complet) :
```sql
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
```

#### Pour les Clients (lecture seule des modèles publics) :
```sql
CREATE POLICY "Clients can view public project templates"
  ON public.project_templates
  FOR SELECT
  USING (is_public = TRUE);
```

### 5. Données par défaut (5 modèles)

Les 5 modèles de projets existants ont été migrés :

| Type | Titre | Icône | Couleur | Public |
|------|-------|-------|---------|--------|
| `ACC` | Autoconsommation Collective | 🌞 | gradient-blue | ✅ |
| `Autonomie` | Autonomie | 🔋 | gradient-green | ✅ |
| `Centrale` | Centrale (3-500 kWc) | ☀️ | gradient-orange | ✅ |
| `Investissement` | Investissement | 💎 | gradient-purple | ✅ |
| `ProducteurPro` | Producteur Pro | ⚡ | gradient-yellow | ❌ (brouillon) |

## 🔄 Impact sur le code React

### Avant (fichier statique) :
```javascript
import projectsData from '@/data/projects.js';
```

### Après (Supabase) :
```javascript
import { supabase } from '@/lib/supabase';

// Récupérer tous les modèles de projets publics
const { data: projectTemplates } = await supabase
  .from('project_templates')
  .select('*')
  .eq('is_public', true);

// Créer un nouveau modèle (Admin)
const { data: newTemplate } = await supabase
  .from('project_templates')
  .insert({
    type: 'MonNouveauProjet',
    title: 'Mon Nouveau Projet',
    client_title: 'Mon Projet Client',
    icon: '🚀',
    color: 'gradient-blue',
    is_public: true,
    steps: [
      {
        id: 'step-1',
        name: 'Étape 1',
        status: 'pending',
        icon: '📝',
        descriptions: {
          pending: 'En cours...',
          done: 'Terminé !'
        }
      }
    ]
  });

// Modifier un modèle existant (Admin)
const { data: updated } = await supabase
  .from('project_templates')
  .update({ 
    title: 'Nouveau titre',
    is_public: false  // Dépublier
  })
  .eq('type', 'ACC');

// Supprimer un modèle (Admin)
const { error } = await supabase
  .from('project_templates')
  .delete()
  .eq('type', 'MonProjet');
```

## 📊 Schéma des relations

```
project_templates (modèles configurables)
    │
    ├──→ project_steps_status (instances pour prospects)
    │       │
    │       └──→ prospects
    │
    ├──→ project_infos (données spécifiques)
    │       │
    │       └──→ prospects
    │
    └──→ client_form_panels (formulaires clients)
            │
            └──→ prospects
```

## 🎯 Avantages de cette architecture

1. **Flexibilité** : Les admins peuvent créer/modifier/supprimer des types de projets sans toucher au code
2. **Séparation des préoccupations** : Modèles (templates) vs Instances (project_steps_status)
3. **Contrôle de visibilité** : `is_public` permet de gérer les projets en brouillon
4. **Référentiel centralisé** : Toutes les tables référencent les modèles via FK
5. **Sécurité** : RLS policies séparent Admin (CRUD) vs Client (lecture seule publics)

## 📝 Prochaines étapes

1. ✅ Schéma corrigé avec `project_templates`
2. ⏳ Créer le service `projectTemplateService.js` dans `src/services/`
3. ⏳ Modifier `ProfilePage.jsx` pour utiliser Supabase au lieu de localStorage
4. ⏳ Migrer les données existantes de `localStorage` vers Supabase
5. ⏳ Tester la création/modification/suppression de projets dynamiques

## 🔍 Fichiers modifiés

- ✅ `/supabase/schema.sql` - Table renommée et relations ajoutées
- ✅ `/supabase/PROJECT_TEMPLATES_ADDITION.sql` - Documentation détaillée (fichier séparé)
- ⏳ `src/services/projectTemplateService.js` - À créer
- ⏳ `src/pages/admin/ProfilePage.jsx` - À migrer vers Supabase
- ⏳ `src/components/AddProjectModal.jsx` - À migrer vers Supabase

---

**✅ Le système de gestion dynamique des projets est maintenant correctement intégré dans le schéma Supabase !**
