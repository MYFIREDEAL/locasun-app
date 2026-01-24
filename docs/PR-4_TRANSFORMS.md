# PR-4: Transforms Centralisés

## Objectif
Éviter les bugs et divergences de mapping entre snake_case (Supabase) et camelCase (React) en centralisant les transformations.

## Fichier créé
**`src/lib/transforms.js`** - Source unique de vérité pour les mappings

### Prospects
```javascript
import { prospectToCamel, prospectToSnake } from '@/lib/transforms';

// Supabase → App (lecture)
const camelProspect = prospectToCamel(dbProspect);

// App → Supabase (écriture)
const snakeProspect = prospectToSnake(appProspect);
```

**Champs mappés:**
| Supabase (snake_case) | App (camelCase) |
|----------------------|-----------------|
| company_name | companyName |
| owner_id | ownerId |
| created_at | createdAt |
| updated_at | updatedAt |
| last_contact_date | lastContactDate |
| form_data | formData |

### Appointments
```javascript
import { appointmentToCamel, appointmentToSnake } from '@/lib/transforms';

// Supabase → App (lecture)
const camelApt = appointmentToCamel(dbAppointment);
```

**Champs mappés:**
| Supabase (snake_case) | App (camelCase) |
|----------------------|-----------------|
| start_time | start |
| end_time | end |
| contact_id | contactId |
| assigned_user_id | assignedUserId |
| project_id | projectId |
| created_at | createdAt |
| updated_at | updatedAt |

## Points de migration

### useSupabaseProspects.js (4 points)
1. `fetchProspects` - transformation des résultats
2. Real-time INSERT - `prospectToCamel(payload.new)`
3. Real-time UPDATE - `prospectToCamel(payload.new)`
4. `addProspect` / `updateProspect` - transformation résultat

### useSupabaseAgenda.js (4 points)
1. `fetchAppointments` - transformation des résultats
2. Real-time INSERT - `appointmentToCamel(payload.new)`
3. Real-time UPDATE - `appointmentToCamel(payload.new)`
4. `addAppointment` / `updateAppointment` - transformation résultat

## Règle importante
⚠️ **Ne jamais mapper manuellement** `start_time` → `start` ou `company_name` → `companyName`
→ Toujours utiliser les fonctions de `@/lib/transforms`

## Avant/Après

### ❌ Avant (risque de divergence)
```javascript
const newApt = {
  id: payload.new.id,
  start: payload.new.start_time,
  end: payload.new.end_time,
  contactId: payload.new.contact_id,
  // ... 10+ champs à mapper manuellement
};
```

### ✅ Après (centralisé)
```javascript
const newApt = appointmentToCamel(payload.new);
```

## Tests recommandés
1. Pipeline: ajouter/modifier un prospect → vérifier real-time
2. Agenda: créer/déplacer un RDV → vérifier mise à jour
3. Profil: modifier les infos → vérifier sauvegarde
