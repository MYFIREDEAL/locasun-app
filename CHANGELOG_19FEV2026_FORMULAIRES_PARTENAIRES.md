# 📋 CHANGELOG - 19 Février 2026

## 🎯 Objectif du jour
**Corriger la persistance des données des formulaires partenaires** : après soumission par le partenaire, `form_data` restait `{}` en base et l'admin ne voyait pas les réponses.

---

## ✅ Corrections apportées

### 1️⃣ Ajout colonne `form_data` à la table `client_form_panels`
**Fichier SQL** : `add_form_data_to_rpc_client_form_panels.sql`

La colonne `form_data JSONB` stocke maintenant les réponses des formulaires directement dans le panel (au lieu de `prospects.form_data` qui était bloqué par RLS pour les partenaires).

### 2️⃣ Distinction `filled_by_role` (client vs partner)
**Fichiers modifiés** :
- `src/hooks/useSupabaseClientFormPanels.js`
- `src/components/admin/ProspectDetailsAdmin.jsx`
- `src/pages/partner/PartnerMissionDetailPage.jsx`

**Logique** :
- `filled_by_role = 'client'` → Formulaire rempli par le client
- `filled_by_role = 'partner'` → Formulaire rempli par le partenaire

L'admin affiche les données depuis `panel.formData` quand `filledByRole === 'partner'`.

### 3️⃣ Fix cache PostgREST - Lecture directe
**Problème** : Après modification de la fonction RPC `get_client_form_panels_for_org`, PostgREST gardait en cache l'ancienne signature et retournait l'erreur :
```
structure of query does not match function result type
```

**Solution** : Remplacer l'appel RPC par une requête directe `.from('client_form_panels')` :

```javascript
// AVANT (RPC cassé par cache)
const { data, error } = await supabase.rpc('get_client_form_panels_for_org_v2', {...});

// APRÈS (lecture directe)
let query = supabase
  .from('client_form_panels')
  .select('*')
  .eq('organization_id', organizationId);

if (prospectId) {
  query = query.eq('prospect_id', prospectId);
}

const { data, error } = await query.order('created_at', { ascending: false });
```

---

## 📁 Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useSupabaseClientFormPanels.js` | Lecture directe `.from()` au lieu de RPC |
| `src/components/admin/ProspectDetailsAdmin.jsx` | Lecture `panel.formData` pour partenaires |
| `src/pages/partner/PartnerMissionDetailPage.jsx` | Sauvegarde `form_data` + `filled_by_role` |
| `add_form_data_to_rpc_client_form_panels.sql` | SQL pour ajouter `form_data` à la RPC |
| `create_rpc_get_client_form_panels_for_org_v2.sql` | Tentative V2 (non utilisée finalement) |

---

## 🧪 Tests validés

1. ✅ **Partenaire** soumet un formulaire → `form_data` sauvegardé en DB
2. ✅ **Admin** voit les données dans "Formulaires soumis" après refresh
3. ✅ **Client** voit toujours ses propres formulaires (mode client inchangé)
4. ✅ Boutons "Valider" / "Refuser" fonctionnels côté admin

---

## 🔧 Architecture finale

```
┌─────────────────────────────────────────────────────────────┐
│                    SOUMISSION FORMULAIRE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CLIENT                          PARTENAIRE                  │
│  ───────                         ──────────                  │
│  filled_by_role = 'client'       filled_by_role = 'partner'  │
│  form_data dans panel            form_data dans panel        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ADMIN (ProspectDetailsAdmin.jsx)                           │
│  ─────────────────────────────────                          │
│  Lecture: panel.formData (pour les 2 cas)                   │
│  Affichage: Section "Formulaires soumis"                    │
│  Actions: Valider / Refuser                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Note technique : Cache PostgREST

Le cache PostgREST de Supabase est très agressif. Quand on modifie la signature d'une fonction RPC (ajout/suppression de colonnes), il faut soit :
1. Attendre que le cache expire (~1h sur Supabase hébergé)
2. Utiliser `NOTIFY pgrst, 'reload schema'` (ne fonctionne pas toujours)
3. **Solution retenue** : Utiliser une requête directe `.from()` au lieu de RPC

---

## 📊 Résumé

| Avant | Après |
|-------|-------|
| `form_data` restait `{}` après soumission partenaire | ✅ `form_data` sauvegardé correctement |
| Admin ne voyait pas les réponses | ✅ Réponses visibles dans "Formulaires soumis" |
| Erreur "structure mismatch" après refresh | ✅ Lecture directe, plus d'erreur |

---

**Déployé** : 19 février 2026, ~19h10
