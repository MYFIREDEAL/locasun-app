# ✅ Flow EVATIME ↔ Hangar 3D — Confirmation par le code

> **Date** : 5 mars 2026  
> **Statut** : Validé end-to-end (Rosca Finance = preuve vivante)

---

## 1️⃣ Hangar 3D lit les prospects directement depuis la même base Supabase

Hangar 3D (sur `locasun-invest.vercel.app`) utilise le **même `SUPABASE_URL`** (`vvzxvtiyybilkswslqfn.supabase.co`) et la **même `anon key`**.

Comme Rosca Finance est connecté en tant qu'utilisateur authentifié sur Hangar 3D, il accède aux prospects **via RLS** — exactement comme le frontend EVATIME dans `src/lib/supabase.js`.

Il n'y a **aucune Edge Function de lecture** dans le repo, ce qui confirme :

> **Hangar 3D lit directement la table `prospects` via Supabase client + RLS.**

---

## 2️⃣ Hangar 3D ajoute un projet via `webhook-v1` avec `action: "add_project"`

Le code dans `supabase/functions/webhook-v1/index.ts` lignes 166-228 le confirme explicitement :

```
POST /functions/v1/webhook-v1
Authorization: Bearer eva_live_xxxxx
{
  "action": "add_project",
  "prospect_id": "uuid-du-prospect",
  "type_projet": "fenetre"
}
```

### Flow dans le code :

| Étape | Code | Détail |
|-------|------|--------|
| **Auth** | L.60-128 | Bearer token → SHA-256 → lookup `integration_keys` → récupère `organization_id` |
| **Routage** | L.164-167 | `if (action === 'add_project')` → branche dédiée |
| **RPC** | L.179-184 | Appel `add_project_to_prospect(p_prospect_id, p_organization_id, p_project_type)` |
| **SQL** | `add_project_to_prospect.sql` | Voir ci-dessous |
| **Retour** | L.218-228 | `201` avec `prospect_id`, `prospect_name`, `project_type`, `steps_count` |

### Détail de la RPC SQL (`add_project_to_prospect.sql`) :

- ✅ Vérifie prospect ∈ org
- ✅ Vérifie template existe
- ✅ Vérifie pas de doublon
- ✅ `array_append(tags, project_type)` → ajoute le tag
- ✅ `INSERT INTO project_steps_status` → initialise les étapes (1ère = `in_progress`, reste = `pending`)

---

## 3️⃣ Pour qu'une nouvelle org fonctionne comme Rosca Finance

Le code de `supabase/functions/generate-integration-key/index.ts` montre exactement ça :

1. **L'utilisateur EVATIME** clique "Générer une clé" → Edge Function crée `eva_live_xxxx`, hash en SHA-256, stocke dans `integration_keys` avec `permissions: ['webhook:create_prospect']`
2. **L'utilisateur copie la clé** (affichée une seule fois, L.172)
3. **L'utilisateur colle la clé dans Hangar 3D** à l'inscription
4. **Hangar 3D utilise la clé** comme `Bearer` pour appeler `webhook-v1` avec `action: "add_project"`

---

## 🎯 Conclusion

**D'un simple ajout de clé, boom, tout marche exactement comme Rosca Finance.**

Le code le confirme — **zéro config supplémentaire côté EVATIME**.

### Fichiers de référence

| Fichier | Rôle |
|---------|------|
| `src/lib/supabase.js` | Client Supabase partagé (même URL + anon key) |
| `supabase/functions/webhook-v1/index.ts` | Auth Bearer + routage `add_project` |
| `supabase/functions/add_project_to_prospect.sql` | RPC SQL (SECURITY DEFINER) |
| `supabase/functions/generate-integration-key/index.ts` | Génération clé `eva_live_xxx` |
| `supabase/migrations/create_integration_keys_table.sql` | Table `integration_keys` |
| `src/pages/admin/IntegrationsPage.jsx` | UI onglet Plugins (card Hangar 3D) |
