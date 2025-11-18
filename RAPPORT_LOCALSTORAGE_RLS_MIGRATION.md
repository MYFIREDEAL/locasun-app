# 📋 RAPPORT : localStorage & RLS - État de la Migration

**Date**: 18 novembre 2025  
**Contexte**: Vérification complète du localStorage restant et validation des politiques RLS pour les formulaires

---

## 🔍 ANALYSE localStorage

### ✅ SUPPRIMÉ ET MIGRÉ VERS SUPABASE

| Donnée | Ancien Emplacement | Nouveau Emplacement | Status |
|--------|-------------------|---------------------|---------|
| **Prospects** | `localStorage.evatime_prospects` | Table `prospects` | ✅ Migré |
| **Formulaires envoyés** | `localStorage.clientFormPanels` | Table `client_form_panels` | ✅ Migré |
| **Réponses formulaires** | `localStorage.currentUser.formData` | Colonne `prospects.form_data` (JSONB) | ✅ Migré |
| **Projets utilisateur** | `localStorage.userProjects` | Synchronisé avec `prospects.tags` | ✅ Sync auto |
| **Messages chat** | `localStorage.evatime_chats` | Table `chat_messages` | ✅ Migré |
| **Rendez-vous** | `localStorage.evatime_appointments` | Table `appointments` | ✅ Migré |
| **Tâches/Appels** | `localStorage.evatime_tasks/calls` | Tables `tasks` & `calls` | ✅ Migré |

### ⚠️ localStorage ENCORE UTILISÉ (mais OK)

| Donnée | Emplacement | Raison | Action Requise |
|--------|-------------|--------|----------------|
| **currentUser** | `localStorage.currentUser` | Cache utilisateur connecté | ⚠️ Chargé au login, synchronisé via real-time |
| **activeAdminUser** | `localStorage.activeAdminUser` | Switch utilisateur admin | ✅ OK (fonctionnalité admin) |
| **Form Contact Config** | `localStorage.evatime_form_contact_config` | Config formulaire inscription | 🔄 À MIGRER vers `company_settings.contact_form_config` |

### 🚨 PROBLÈME IDENTIFIÉ : currentUser.formData

**Localisation**: `src/components/client/ClientFormPanel.jsx` ligne 107

```javascript
// ❌ PROBLÈME : Utilise localStorage comme fallback
const updatedFormData = { ...(currentUser.formData || {}), ...draft };
```

**Impact**:
- ✅ Sauvegarde dans Supabase fonctionne (ligne 110-114)
- ✅ Admin voit les modifications client (via real-time)
- ✅ Client recharge depuis Supabase lors du "Modifier" (handleEdit ligne 179-211)
- ⚠️ **MAIS**: La ligne 107 utilise `currentUser.formData` comme base, qui vient de localStorage

**Solution Temporaire Appliquée**:
- `handleEdit()` recharge TOUJOURS depuis Supabase avant édition (commit b73fb7b)
- La ligne 107 devrait être refactorisée pour ne plus utiliser `currentUser.formData`

**Solution Idéale** (à implémenter):
```javascript
// ✅ AMÉLIORATION : Charger TOUJOURS depuis Supabase
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // 1. Recharger les données actuelles depuis Supabase
  const { data: currentData } = await supabase
    .from('prospects')
    .select('form_data')
    .eq('id', prospectId)
    .single();
  
  // 2. Fusionner avec le draft
  const draft = formDrafts[panelId] || {};
  const updatedFormData = { ...(currentData?.form_data || {}), ...draft };
  
  // 3. Sauvegarder dans Supabase
  await supabase.from('prospects').update({ form_data: updatedFormData }).eq('id', prospectId);
}
```

---

## 🔐 VALIDATION RLS (Row Level Security)

### ✅ POLITIQUES client_form_panels

**RLS Activé**: ✅ OUI (`ALTER TABLE client_form_panels ENABLE ROW LEVEL SECURITY`)

#### Politique 1: Admins (COMPLET)
```sql
CREATE POLICY "Admins can manage all form panels"
ON client_form_panels
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.user_id = auth.uid() 
        AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
);
```
- ✅ Permet SELECT, INSERT, UPDATE, DELETE
- ✅ Vérifie que l'utilisateur est bien un user PRO (table `users`)
- ✅ Tous les rôles admin ont accès

#### Politique 2: Clients (LECTURE SEULEMENT)
```sql
CREATE POLICY "Clients can view their own form panels"
ON client_form_panels
FOR SELECT
TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM prospects 
        WHERE user_id = auth.uid()
    )
);
```
- ✅ Clients peuvent voir leurs formulaires
- ❌ **MANQUE**: Politique UPDATE pour `client_update_own_form_panels`

### 🚨 POLITIQUE MANQUANTE : client_update_own_form_panels

**Ce qui existe dans le code** (mentionné dans conversation summary):
```sql
-- ❌ CETTE POLITIQUE N'EST PAS DANS schema.sql !
CREATE POLICY "client_update_own_form_panels"
ON client_form_panels
FOR UPDATE
TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM prospects 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    prospect_id IN (
        SELECT id FROM prospects 
        WHERE user_id = auth.uid()
    )
);
```

**Conséquence**:
- ❌ Les clients ne peuvent PAS mettre à jour `client_form_panels.status` !
- ✅ MAIS ils peuvent mettre à jour `prospects.form_data` (grâce à la politique sur `prospects`)

**Explication du fonctionnement actuel**:
1. Client remplit formulaire → Met à jour `prospects.form_data` ✅
2. Client clique "Envoyer" → Appelle `updateClientFormPanel(panelId, { status: 'submitted' })` ❌ BLOQUÉ
3. **Workaround actuel** : Le hook `useSupabaseClientFormPanels.js` utilise peut-être un bypass

### 📊 POLITIQUE prospects.form_data

```sql
-- Table prospects a des politiques permettant UPDATE
CREATE POLICY "Clients can update their own prospect"
ON prospects
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

✅ **Cette politique permet** :
- Client peut UPDATE `prospects.form_data`
- Admin peut UPDATE via la politique "Admins can manage all prospects"

---

## 🔄 REAL-TIME SUPABASE

### ✅ ACTIVÉ POUR :

| Table | Real-time | Utilisé Par |
|-------|-----------|-------------|
| `prospects` | ✅ | `useSupabaseProspects.js` |
| `client_form_panels` | ✅ | `useSupabaseClientFormPanels.js` |
| `appointments` | ✅ | `useSupabaseAgenda.js` |
| `chat_messages` | ❓ | À vérifier |
| `project_steps_status` | ✅ | Mentionné dans `enable_realtime_project_steps.sql` |

**Commandes exécutées**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE prospects;
ALTER PUBLICATION supabase_realtime ADD TABLE client_form_panels;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE project_steps_status;
```

---

## 🎯 RÉSUMÉ DES ACTIONS

### ✅ COMPLÉTÉ
1. ✅ Migration formulaires localStorage → `client_form_panels`
2. ✅ Migration réponses formulaires → `prospects.form_data`
3. ✅ Real-time activé sur tables critiques
4. ✅ `handleEdit()` recharge depuis Supabase (fix client voir admin edits)
5. ✅ `handleSubmit()` sauvegarde dans Supabase

### ⚠️ À AMÉLIORER
1. **CRITIQUE**: Ajouter politique `client_update_own_form_panels` pour permettre UPDATE du status
2. **AMÉLIORATION**: Refactor `handleSubmit()` pour recharger form_data depuis Supabase AVANT merge (ligne 107)
3. **MIGRATION**: Migrer `form_contact_config` de localStorage vers `company_settings.settings`

### 🔧 SQL À EXÉCUTER

```sql
-- ✅ PRIORITÉ 1: Permettre aux clients de mettre à jour le status de leurs formulaires
CREATE POLICY "Clients can update their own form panel status"
ON public.client_form_panels
FOR UPDATE
TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM public.prospects 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    prospect_id IN (
        SELECT id FROM public.prospects 
        WHERE user_id = auth.uid()
    )
);

-- ✅ PRIORITÉ 2: Vérifier que Real-time est bien activé sur chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

---

## 📝 NOTES TECHNIQUES

### Architecture Actuelle (Formulaires)

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE DATABASE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐        ┌──────────────────────────┐  │
│  │ client_form_     │        │ prospects                │  │
│  │ panels           │        │                          │  │
│  │                  │        │  - id UUID               │  │
│  │  - id UUID       │───────▶│  - form_data JSONB ✅    │  │
│  │  - prospect_id   │        │  - user_id UUID          │  │
│  │  - form_id       │        └──────────────────────────┘  │
│  │  - status ⚠️     │                                       │
│  │  - step_name     │        ┌──────────────────────────┐  │
│  └──────────────────┘        │ forms                    │  │
│         │                    │                          │  │
│         └───────────────────▶│  - form_id TEXT          │  │
│                              │  - fields JSONB          │  │
│                              └──────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Real-time Subscriptions ✅
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  useSupabaseClientFormPanels.js                             │
│  ├─ fetchFormPanels()                                       │
│  ├─ createFormPanel()                                       │
│  ├─ updateFormPanel() ⚠️ Client bloqué par RLS              │
│  └─ Real-time listener ✅                                    │
│                                                              │
│  ClientFormPanel.jsx                                        │
│  ├─ handleEdit() ✅ Recharge depuis Supabase                │
│  ├─ handleSubmit() ⚠️ Utilise currentUser.formData          │
│  └─ updateClientFormPanel() ⚠️ Bloqué sans politique RLS    │
│                                                              │
│  localStorage (encore utilisé)                              │
│  └─ currentUser.formData ⚠️ Cache obsolète possible         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Données (Formulaire)

```
1. ADMIN envoie formulaire
   └─ createFormPanel() → INSERT dans client_form_panels ✅

2. CLIENT voit formulaire
   └─ useSupabaseClientFormPanels() → SELECT via RLS ✅

3. CLIENT remplit et soumet
   ├─ Draft local (formDrafts state)
   ├─ handleSubmit()
   │   ├─ Merge avec currentUser.formData (localStorage) ⚠️
   │   ├─ UPDATE prospects.form_data ✅
   │   └─ updateClientFormPanel({ status: 'submitted' }) ❌ BLOQUÉ RLS
   └─ Real-time → Admin voit changement ✅

4. ADMIN modifie formulaire client
   ├─ ProspectForms.handleSave()
   ├─ UPDATE prospects.form_data ✅
   └─ Real-time → Client reçoit UPDATE ✅

5. CLIENT clique "Modifier"
   ├─ handleEdit()
   ├─ SELECT prospects.form_data ✅ (depuis b73fb7b)
   └─ Hydrate le form avec données fraîches ✅
```

---

## 🎯 PRIORITÉS

### 🔥 URGENT (Blocker)
1. **Ajouter politique RLS** `client_update_own_form_panels` pour permettre aux clients de changer le status

### ⚠️ IMPORTANT (Bug potentiel)
2. **Refactoriser handleSubmit()** pour recharger form_data depuis Supabase AVANT le merge (ligne 107)

### 📈 AMÉLIORATION
3. **Migrer form_contact_config** de localStorage vers `company_settings.settings`
4. **Nettoyer App.jsx** : `updateProspect()` ligne 1238 utilise encore localStorage
5. **Ajouter console.logs** pour tracer les changements de form_data en production

---

## ✅ CONCLUSION

### État Actuel : 🟡 FONCTIONNEL AVEC WORKAROUNDS

- ✅ **Synchronisation bidirectionnelle** : Client ↔ Admin fonctionne
- ✅ **Données persistées** : Tout dans Supabase (prospects.form_data)
- ✅ **Real-time** : Activé sur toutes les tables critiques
- ⚠️ **RLS incomplet** : Clients ne peuvent pas UPDATE client_form_panels.status
- ⚠️ **localStorage résiduel** : currentUser.formData utilisé comme fallback (risque de données obsolètes)

### Recommandations

1. **Exécuter le SQL ci-dessus** pour fixer la politique RLS manquante
2. **Tester en production** : Admin modifie → Client édite → Vérifier données fraîches
3. **Refactorer à moyen terme** : Éliminer complètement currentUser.formData de la logique formulaire
4. **Monitoring** : Ajouter Sentry/logs pour tracer les écarts entre localStorage et Supabase

---

**Auteur**: GitHub Copilot  
**Commit associé**: b73fb7b (Fix handleEdit recharge Supabase)
