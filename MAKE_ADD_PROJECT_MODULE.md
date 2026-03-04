# 📦 MAKE — Module "Add Project" (EVATIME App)

> **Guide de configuration du 2ème module Make sur la Developer Platform**
> À exécuter depuis : https://www.make.com/en/developer

---

## 🎯 Objectif

Ajouter un **2ème module "Add Project"** dans l'app EVATIME sur Make.
Ce module permet d'ajouter un projet supplémentaire à un prospect **déjà existant**, sans recréer le contact.

**Flow** : Prospect existant → Add Project → Tag ajouté + Étapes workflow initialisées

---

## 📋 Prérequis

- L'app **EVATIME** existe déjà sur Make Developer Platform (v1.0.0)
- Le module **Create Prospect** fonctionne déjà end-to-end
- La **Connection** pointe sur `webhook-v1` avec `validate_only`
- Le webhook-v1 supporte déjà `action: "add_project"` côté Edge Function

---

## 🛠️ Étapes de configuration

### Étape 1 — Créer le module

1. Ouvrir l'app **EVATIME** sur https://www.make.com/en/developer
2. Aller dans **Modules** → **+ Create a new module**
3. Remplir :

| Champ | Valeur |
|-------|--------|
| **Name** | `Add Project` |
| **Label** | `Add Project to Prospect` |
| **Description** | `Add a new project type to an existing prospect. Initializes workflow steps automatically.` |
| **Action type** | `Action` (pas trigger) |
| **Connection** | Sélectionner la connexion existante (même que Create Prospect) |

---

### Étape 2 — Configurer les champs (Parameters)

Ajouter **2 champs obligatoires** dans l'onglet **Parameters** (Mappable) :

#### Champ 1 : `prospect_id`
| Propriété | Valeur |
|-----------|--------|
| **Name** | `prospect_id` |
| **Label** | `Prospect ID` |
| **Type** | `text` |
| **Required** | `true` |
| **Help** | `UUID of the existing prospect (found in EVATIME pipeline or via a previous Create Prospect module)` |

#### Champ 2 : `type_projet`
| Propriété | Valeur |
|-----------|--------|
| **Name** | `type_projet` |
| **Label** | `Project Type` |
| **Type** | `text` |
| **Required** | `true` |
| **Help** | `Project type slug to add (e.g. solaire, fenetre, piscine). Must match an existing project template in your organization.` |

---

### Étape 3 — Configurer la Communication

Dans l'onglet **Communication**, coller ce JSON :

```json
{
  "url": "{{connection.baseUrl}}/functions/v1/webhook-v1",
  "method": "POST",
  "body": {
    "action": "add_project",
    "prospect_id": "{{parameters.prospect_id}}",
    "type_projet": "{{parameters.type_projet}}"
  },
  "response": {
    "output": {
      "success": "{{body.success}}",
      "action": "{{body.action}}",
      "prospect_id": "{{body.prospect_id}}",
      "prospect_name": "{{body.prospect_name}}",
      "project_type": "{{body.project_type}}",
      "steps_count": "{{body.steps_count}}",
      "organization_id": "{{body.organization_id}}"
    },
    "error": {
      "message": "{{body.message}}",
      "type": "{{body.error}}"
    }
  }
}
```

> **⚠️ Important** : Ne pas redéclarer `headers` ici — ils sont hérités du **BASE** (`Authorization: Bearer` + `Content-Type`). Le `baseUrl` dans BASE est le domaine Supabase nu (`https://xxx.supabase.co`), donc il faut ajouter `/functions/v1/webhook-v1` dans l'URL du module.

---

### Étape 4 — Configurer les Output (Interface)

Ajouter les champs de sortie dans l'onglet **Interface** → **Output** :

| Name | Label | Type |
|------|-------|------|
| `success` | `Success` | `boolean` |
| `action` | `Action` | `text` |
| `prospect_id` | `Prospect ID` | `text` |
| `prospect_name` | `Prospect Name` | `text` |
| `project_type` | `Project Type` | `text` |
| `steps_count` | `Steps Count` | `number` |
| `organization_id` | `Organization ID` | `text` |

---

### Étape 5 — Tester

1. **Save** le module
2. Créer un **scénario de test** dans Make :
   - Module 1 : un trigger manuel ou un module EVATIME "Create Prospect" (pour avoir un `prospect_id`)
   - Module 2 : **EVATIME → Add Project** avec le `prospect_id` du module 1
3. **Run once**
4. Vérifier :
   - ✅ Status 201 + `success: true`
   - ✅ `steps_count` > 0
   - ✅ Dans EVATIME : le prospect a le nouveau tag + les étapes initialisées

---

### Étape 6 — Publier

1. Incrémenter la version de l'app (ex: `1.1.0`)
2. **Publish** l'app
3. Le module "Add Project" sera disponible pour tous les utilisateurs EVATIME sur Make

---

## 📊 Réponses attendues

### ✅ Succès (201)
```json
{
  "success": true,
  "action": "add_project",
  "prospect_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "prospect_name": "Jean Dupont",
  "project_type": "fenetre",
  "steps_count": 8,
  "organization_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
}
```

### ❌ Erreurs possibles

| HTTP | Code | Quand |
|------|------|-------|
| 400 | `MISSING_FIELDS` | `prospect_id` ou `type_projet` manquant |
| 400 | `INVALID_PROSPECT` | UUID prospect inconnu dans l'org |
| 400 | `INVALID_PROJECT_TYPE` | Slug projet inexistant |
| 409 | `DUPLICATE_PROJECT` | Prospect a déjà ce projet |
| 401 | `INVALID_KEY` | Clé API invalide |

---

## 🔗 Relation avec le module "Create Prospect"

| | Create Prospect | Add Project |
|---|---|---|
| **Action** | absent ou `"create_prospect"` | `"add_project"` |
| **Crée un contact** | ✅ Oui | ❌ Non |
| **Ajoute un projet** | ✅ Si `type_projet` fourni | ✅ Toujours |
| **Endpoint** | Même webhook-v1 | Même webhook-v1 |
| **Connection** | Même | Même |
| **Champs requis** | `nom` + `email` | `prospect_id` + `type_projet` |

---

## 💡 Cas d'usage typique sur Make

```
Trigger (ex: Google Form, Typeform, Webhook)
    ↓
Module 1 : EVATIME → Create Prospect
    → Retourne prospect_id
    ↓
Router (si condition : le client veut un 2ème projet)
    ↓
Module 2 : EVATIME → Add Project
    → prospect_id = {{1.prospect_id}}
    → type_projet = "fenetre"
```

---

## 📅 Historique

| Date | Action |
|------|--------|
| 4 mars 2026 | Documentation créée pour le 2ème module Make |
| 4 mars 2026 | Module prêt à configurer sur Make Developer Platform |
