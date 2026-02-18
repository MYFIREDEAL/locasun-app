# ✅ MODIFICATION APPLIQUÉE : useSupabaseAgenda - Filtre multi-tenant

**Date** : 18 février 2026  
**Priorité** : 🔴 **P0 CRITIQUE**  
**Objectif** : Ajouter filtre `organization_id` à la subscription real-time de `useSupabaseAgenda`

---

## 🔧 MODIFICATIONS EFFECTUÉES

### 1️⃣ Fichier : `src/hooks/useSupabaseAgenda.js`

#### Changement de signature

**AVANT** :
```javascript
export const useSupabaseAgenda = (activeAdminUser) => {
```

**APRÈS** :
```javascript
export const useSupabaseAgenda = (activeAdminUser, organizationId) => {
```

#### Import supprimé

**AVANT** :
```javascript
import { useOrganization } from '@/contexts/OrganizationContext';
```

**APRÈS** : ❌ Import supprimé (organizationId passé en paramètre)

#### Guard ajouté

**AVANT** :
```javascript
useEffect(() => {
  if (!activeAdminUser) return;
```

**APRÈS** :
```javascript
useEffect(() => {
  if (!activeAdminUser || !organizationId) return;
```

#### Subscription real-time modifiée

**AVANT** :
```javascript
const channel = supabase
  .channel('agenda-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'appointments'
      // ❌ PAS DE FILTRE
    },
```

**APRÈS** :
```javascript
const channel = supabase
  .channel(`agenda-changes-${organizationId}`)  // ✅ Channel unique par org
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'appointments',
      filter: `organization_id=eq.${organizationId}`  // ✅ FILTRE MULTI-TENANT
    },
```

#### Dépendances useEffect

**AVANT** :
```javascript
}, [activeAdminUser]);
```

**APRÈS** :
```javascript
}, [activeAdminUser, organizationId]);
```

#### Cleanup (inchangé)

```javascript
return () => {
  supabase.removeChannel(channel);
};
```

---

### 2️⃣ Fichier : `src/App.jsx`

#### Appel du hook mis à jour

**AVANT** :
```javascript
} = useSupabaseAgenda(authLoading ? null : activeAdminUser); // ✅ Ne charger que si auth ready
```

**APRÈS** :
```javascript
} = useSupabaseAgenda(authLoading ? null : activeAdminUser, organizationId); // 🔥 MULTI-TENANT: Passer organizationId
```

---

## ✅ RÉSULTAT

### Avant modification
- ❌ Channel : `agenda-changes` (global)
- ❌ Filtre : **AUCUN**
- 🔴 Risque : Reçoit les INSERT/UPDATE/DELETE de **TOUS les RDV de TOUTES les organisations**

### Après modification
- ✅ Channel : `agenda-changes-${organizationId}` (unique par org)
- ✅ Filtre : `organization_id=eq.${organizationId}`
- 🟢 Sécurité : Ne reçoit que les événements de **SA PROPRE organisation**

---

## 📊 IMPACT

### Performance
- ✅ **Bande passante réduite** : Ne reçoit plus les événements RDV des autres orgs
- ✅ **Charge CPU réduite** : Pas de traitement d'événements non pertinents
- ✅ **Isolation multi-tenant** : Chaque org ne voit que ses RDV/tâches/appels

### Sécurité
- ✅ **Fuite de données corrigée** : Org A ne peut plus voir les RDV de Org B
- ✅ **Conformité RGPD** : Isolation stricte des données calendrier

### Compatibilité
- ✅ **Rétrocompatible** : Aucun breaking change (paramètre ajouté)
- ✅ **App.jsx mis à jour** : Passe organizationId correctement

---

## 🧪 TEST DE VALIDATION

### Scénario de test

1. **Org A** : Créer un RDV physique + 1 tâche + 1 appel
2. **Org B** : Vérifier qu'aucun event n'est reçu ✅
3. **Org A** : Vérifier que tous les events apparaissent en real-time ✅
4. **Org B** : Créer son propre RDV
5. **Org A** : Vérifier qu'elle ne voit PAS le RDV de Org B ✅

### Requête SQL de vérification

```sql
-- Vérifier que les appointments ont organization_id
SELECT id, title, type, organization_id, assigned_user_id
FROM appointments
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

### Log attendu (Org A)

```
🔄 [useSupabaseAgenda] Real-time INSERT received
{
  event: "INSERT",
  table: "appointments",
  new: {
    id: "...",
    title: "RDV Alice",
    organization_id: "06bb4924-7eaa-47bc-a671-2f283d58cdc0",  // ✅ Org A
    type: "physical"
  }
}
```

---

## 🔗 CONTEXTE DE LA MODIFICATION

Cette modification fait partie du **plan global multi-tenant** et corrige le **#4 de l'audit** :

| # | Hook | Table | Statut |
|---|------|-------|--------|
| 2 | `useSupabaseProspects` | `prospects` | ✅ **FAIT** |
| 4 | `useSupabaseAgenda` | `appointments` | ✅ **FAIT** |
| 29 | `useSupabaseUsersCRUD` | `users` | ⏳ À faire |

### Audit complet

Voir `AUDIT_SUBSCRIPTIONS_REALTIME_18FEV2026.md` pour la liste complète des 36 subscriptions.

---

## ⚠️ PROCHAINES ÉTAPES

### Hooks prioritaires restants (P0)

1. ✅ ~~`useSupabaseProspects`~~ → **FAIT**
2. ✅ ~~`useSupabaseAgenda`~~ → **FAIT**
3. **`useSupabaseUsersCRUD`** → Ajouter `filter: 'organization_id=eq.${organizationId}'`

### Pattern réutilisé

```javascript
// 1. Signature
export const useMyHook = (activeAdminUser, organizationId) => {

// 2. Guard
if (!activeAdminUser || !organizationId) return;

// 3. Channel unique par org
.channel(`my-channel-${organizationId}`)

// 4. Filter multi-tenant
filter: `organization_id=eq.${organizationId}`

// 5. Cleanup
return () => {
  supabase.removeChannel(channel);
};

// 6. Dependencies
}, [activeAdminUser, organizationId]);
```

---

## 📋 CHECKLIST DE VALIDATION

- [x] Signature modifiée : `organizationId` ajouté
- [x] Import `useOrganization` supprimé
- [x] Guard `if (!activeAdminUser || !organizationId) return;` ajouté
- [x] Channel renommé : `agenda-changes-${organizationId}`
- [x] Filter ajouté : `organization_id=eq.${organizationId}`
- [x] Dépendances mises à jour : `[activeAdminUser, organizationId]`
- [x] Cleanup inchangé (correct)
- [x] Appel dans App.jsx mis à jour
- [x] Aucune autre modification (respect de la règle "on ne touche à rien d'autre")

---

**FIN DU RAPPORT DE MODIFICATION**

✅ Hook `useSupabaseAgenda` maintenant **SAFE** pour multi-tenant  
🎯 **2/3 hooks P0 critiques corrigés** (prospects + agenda)  
⏳ Reste : `useSupabaseUsersCRUD`
