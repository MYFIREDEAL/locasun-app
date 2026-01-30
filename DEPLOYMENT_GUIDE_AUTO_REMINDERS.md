# 🚀 GUIDE DE DÉPLOIEMENT — Système de Relances Automatiques

**Date**: 30 janvier 2026  
**Feature**: Relances automatiques pour formulaires clients non complétés  
**Status**: ✅ READY TO DEPLOY

---

## 📋 Vue d'ensemble

Ce système permet d'envoyer automatiquement des relances aux clients n'ayant pas complété leurs formulaires, puis de créer une tâche pour le commercial après N relances infructueuses.

### Architecture EVATIME respectée ✅

- **Pipeline** : Pas impacté (vue calculée)
- **Projets** : Config stockée dans `client_form_panels`
- **Workflows** : Relances = actions workflow encadrées
- **IA Charly** : Exécutant encadré (envoie relances dans cadre strict)
- **Traçabilité** : Tout est tracé (count, lastReminderAt, taskCreated)

---

## 🗂️ Fichiers créés/modifiés

### ✅ Migration SQL
```
supabase/migrations/add_reminder_columns_to_client_form_panels.sql
```
- Ajoute 6 colonnes à `client_form_panels`
- Index optimisé pour requêtes cron
- **Action requise** : Exécuter dans Supabase Dashboard SQL Editor

### ✅ Hook persistance
```
src/hooks/useSupabaseFormReminder.js
```
- Sauvegarde config reminder lors création formulaire
- Incrémente compteur (appelé par Edge Function)
- Marque tâche créée (bloque futures relances)

### ✅ Edge Function Supabase
```
supabase/functions/auto-form-reminders/index.ts
```
- Cron toutes les heures (à configurer)
- Fenêtre autorisée : 08:00-20:00, lun-ven, Europe/Paris
- Envoie relances + crée tâches au seuil

### ✅ Hook surveillance
```
src/hooks/useFormReminderWatcher.js (modifié)
```
- Écoute mises à jour `client_form_panels` en temps réel
- Crée tâche quand seuil atteint
- Marque `task_created = true`

### ✅ Activation App.jsx
```
src/App.jsx (modifié)
```
- Import + activation du hook `useFormReminderWatcher`
- Active au boot si admin connecté

### ✅ Intégration exécution V2
```
src/lib/executeActionOrderV2.js (modifié)
src/lib/actionOrderV2.js (modifié)
```
- Sauvegarde `reminderConfig` lors création panel
- Inclus dans ActionOrder JSON

---

## 🔧 Étapes de déploiement

### 1️⃣ Migration base de données

**Dans Supabase Dashboard → SQL Editor** :

```bash
# Copier-coller le contenu de :
supabase/migrations/add_reminder_columns_to_client_form_panels.sql
```

**Vérification** :
```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'client_form_panels'
  AND column_name IN (
    'auto_reminder_enabled',
    'reminder_delay_days',
    'max_reminders_before_task',
    'reminder_count',
    'last_reminder_at',
    'task_created'
  );
```

---

### 2️⃣ Déployer Edge Function

**Via CLI Supabase** :

```bash
# Dans le dossier du projet
cd /Users/jackluc/Desktop/LOCASUN\ \ SUPABASE

# Déployer la fonction
supabase functions deploy auto-form-reminders

# Vérifier
supabase functions list
```

**Configurer le cron** (Supabase Dashboard → Database → Cron Jobs) :

```sql
-- Cron toutes les heures
SELECT cron.schedule(
  'auto-form-reminders-hourly',
  '0 * * * *', -- Toutes les heures à minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-form-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
```

**⚠️ Remplacer** :
- `YOUR_PROJECT_ID` par votre vrai project ID Supabase
- `service_role_key` par la vraie clé (Dashboard → Settings → API)

---

### 3️⃣ Déployer code frontend

**Build & Deploy** :

```bash
npm run build
npm run deploy
```

**Vérifier** :
- Page Workflow V2 Config accessible
- Modal "Champs requis" affiche les champs
- Toggle relances fonctionne
- Sélection délai/seuil sauvegardée

---

### 4️⃣ Tester le système complet

#### Test 1 : Création formulaire avec relances

1. Ouvrir Workflow V2 Config
2. Configurer module "Formulaire Client" :
   - Activer relances ✅
   - Délai : J+1
   - Seuil : 2 relances
3. Générer ActionOrder
4. Exécuter (bouton "Exécuter")
5. Vérifier DB :

```sql
SELECT 
  panel_id,
  auto_reminder_enabled,
  reminder_delay_days,
  max_reminders_before_task,
  reminder_count,
  status
FROM client_form_panels
ORDER BY created_at DESC
LIMIT 5;
```

**Résultat attendu** :
- `auto_reminder_enabled = true`
- `reminder_delay_days = 1`
- `max_reminders_before_task = 2`

#### Test 2 : Relance manuelle (simulate cron)

```bash
# Appeler la fonction manuellement
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-form-reminders' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Résultat attendu** :
```json
{
  "success": true,
  "message": "X relances traitées",
  "processed": 1,
  "results": [
    {
      "panel_id": "panel-xxx",
      "action": "reminder_sent",
      "newCount": 1
    }
  ]
}
```

#### Test 3 : Vérifier message chat

```sql
SELECT 
  content,
  sender,
  metadata,
  created_at
FROM chat_messages
WHERE prospect_id = 'PROSPECT_UUID'
ORDER BY created_at DESC
LIMIT 5;
```

**Résultat attendu** :
- Message avec `🔔 **Rappel automatique**`
- `metadata.type = 'reminder'`
- `metadata.automated = true`

#### Test 4 : Création tâche au seuil

1. Simuler 2 relances (appeler fonction 2x)
2. Vérifier hook `useFormReminderWatcher` crée tâche
3. Check DB :

```sql
SELECT 
  title,
  description,
  status,
  priority,
  metadata
FROM tasks
WHERE prospect_id = 'PROSPECT_UUID'
  AND metadata->>'type' = 'form_reminder_escalation'
ORDER BY created_at DESC;
```

**Résultat attendu** :
- Tâche créée avec priorité `high`
- `client_form_panels.task_created = true`

---

## 🔍 Monitoring & Logs

### Logs Edge Function

```bash
supabase functions logs auto-form-reminders --tail
```

### Logs Frontend

```javascript
// Dans la console navigateur
localStorage.setItem('debug', 'FormReminder,WorkflowV2');
```

### Requêtes utiles

```sql
-- Formulaires en attente de relance
SELECT 
  cfp.panel_id,
  p.name AS prospect_name,
  f.name AS form_name,
  cfp.reminder_count,
  cfp.max_reminders_before_task,
  cfp.last_reminder_at,
  cfp.task_created
FROM client_form_panels cfp
JOIN prospects p ON cfp.prospect_id = p.id
JOIN forms f ON cfp.form_id = f.form_id
WHERE cfp.status = 'pending'
  AND cfp.auto_reminder_enabled = true
  AND cfp.task_created = false;

-- Statistiques relances
SELECT 
  DATE_TRUNC('day', last_reminder_at) AS day,
  COUNT(*) AS reminders_sent,
  AVG(reminder_count) AS avg_reminders
FROM client_form_panels
WHERE auto_reminder_enabled = true
  AND last_reminder_at IS NOT NULL
GROUP BY DATE_TRUNC('day', last_reminder_at)
ORDER BY day DESC;
```

---

## ⚠️ Troubleshooting

### Relances non envoyées

**Causes possibles** :
1. Hors fenêtre autorisée (08:00-20:00, lun-ven)
2. Cron non configuré
3. Edge Function erreur (check logs)

**Solutions** :
```bash
# Test manuel immédiat (ignore fenêtre)
curl -X POST 'https://...' -H "Authorization: Bearer ..."

# Vérifier cron
SELECT * FROM cron.job WHERE jobname = 'auto-form-reminders-hourly';
```

### Tâches non créées

**Causes possibles** :
1. Hook `useFormReminderWatcher` pas activé
2. `task_created = true` déjà (dédupe)
3. Seuil pas atteint

**Solutions** :
```javascript
// Vérifier hook actif dans App.jsx
console.log('[App] FormReminderWatcher enabled:', !authLoading && adminReady);
```

### Config perdue au refresh

**Cause** : Config en mémoire, pas encore persistée en DB

**Solution** : Phase 9 (table `workflow_module_templates`) - à venir

---

## 📊 Métriques de succès

Après 1 semaine de production :

- ✅ Relances envoyées automatiquement
- ✅ Compteur s'incrémente correctement
- ✅ Tâches créées au seuil
- ✅ Aucune relance après `task_created = true`
- ✅ Fenêtre horaire respectée (08:00-20:00, lun-ven)

---

## 🎯 Prochaines étapes (Phase 9)

1. **Persistance config DB** :
   - Migrer `reminderConfig` vers `workflow_module_templates`
   - Auto-load au refresh

2. **Personnalisation messages** :
   - Template de message configurable
   - Variables dynamiques (nom client, nom formulaire)

3. **Analytics** :
   - Dashboard taux de conversion post-relance
   - Optimisation délai/seuil

---

## 📞 Support

**En cas de problème** :
1. Vérifier logs Edge Function : `supabase functions logs auto-form-reminders`
2. Vérifier console navigateur : `localStorage.setItem('debug', 'FormReminder')`
3. Vérifier DB : Requêtes ci-dessus

**Contact** : [Votre email/support]

---

**✅ Système READY - Déploiement recommandé !**
