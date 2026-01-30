# ✅ CHECKLIST DE DÉPLOIEMENT — Relances Automatiques

**Date** : 30 janvier 2026  
**Durée estimée** : 15 minutes  
**Prérequis** : Accès Supabase Dashboard + CLI Supabase installé

---

## 📋 Phase 1 : Base de données (5 min)

### ☐ 1. Ouvrir Supabase Dashboard
- URL : https://supabase.com/dashboard/project/YOUR_PROJECT_ID
- Onglet : **SQL Editor**

### ☐ 2. Exécuter migration
```bash
# Copier le contenu de :
supabase/migrations/add_reminder_columns_to_client_form_panels.sql

# Coller dans SQL Editor
# Cliquer "Run"
```

### ☐ 3. Vérifier colonnes créées
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'client_form_panels'
  AND column_name LIKE 'reminder%' OR column_name = 'task_created';
```

**Résultat attendu** : 6 lignes (reminder_count, reminder_delay_days, etc.)

✅ **Phase 1 terminée** → Passer à Phase 2

---

## 📋 Phase 2 : Edge Function (5 min)

### ☐ 1. Déployer fonction
```bash
cd /Users/jackluc/Desktop/LOCASUN\ \ SUPABASE
supabase functions deploy auto-form-reminders
```

**Sortie attendue** :
```
Deploying function auto-form-reminders...
Function deployed successfully!
```

### ☐ 2. Tester manuellement
```bash
# Remplacer YOUR_PROJECT_ID et YOUR_ANON_KEY
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-form-reminders' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Hors fenêtre autorisée" // ou "0 relances traitées"
}
```

### ☐ 3. Configurer cron (Supabase Dashboard)
- Onglet : **Database** → **Cron Jobs** → **New Cron Job**
- Nom : `auto-form-reminders-hourly`
- Schedule : `0 * * * *` (toutes les heures)
- SQL :
```sql
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-form-reminders',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
  )
) AS request_id;
```

**⚠️ Important** : Remplacer `YOUR_PROJECT_ID` !

✅ **Phase 2 terminée** → Passer à Phase 3

---

## 📋 Phase 3 : Frontend (5 min)

### ☐ 1. Build
```bash
npm run build
```

**Vérifier** : Aucune erreur de build

### ☐ 2. Deploy
```bash
npm run deploy
```

**Vérifier** : URL GitHub Pages accessible

### ☐ 3. Test navigateur
1. Ouvrir app déployée
2. Se connecter en tant qu'Admin
3. Aller dans **Workflow V2 Config**
4. Vérifier que tout charge sans erreur console

✅ **Phase 3 terminée** → Passer à Phase 4

---

## 📋 Phase 4 : Tests fonctionnels (15 min)

### Test A : Création formulaire avec relances

☐ 1. Dans Workflow V2 Config :
- Sélectionner module "Formulaire Client"
- Activer relances (toggle ON)
- Délai : J+1
- Seuil : 2 relances
- Sauvegarder

☐ 2. Générer ActionOrder :
- Cliquer "Générer Ordre"
- Vérifier JSON contient `reminderConfig`

☐ 3. Exécuter :
- Cliquer "Exécuter"
- Toast de confirmation apparaît

☐ 4. Vérifier DB :
```sql
SELECT 
  panel_id,
  auto_reminder_enabled,
  reminder_delay_days,
  max_reminders_before_task
FROM client_form_panels
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu** :
- `auto_reminder_enabled = true`
- `reminder_delay_days = 1`
- `max_reminders_before_task = 2`

---

### Test B : Relance manuelle

☐ 1. Modifier date création panel (simuler J+1) :
```sql
UPDATE client_form_panels
SET created_at = NOW() - INTERVAL '2 days'
WHERE panel_id = 'VOTRE_PANEL_ID';
```

☐ 2. Appeler fonction manuellement :
```bash
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-form-reminders' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

☐ 3. Vérifier compteur incrémenté :
```sql
SELECT reminder_count, last_reminder_at
FROM client_form_panels
WHERE panel_id = 'VOTRE_PANEL_ID';
```

**Résultat attendu** :
- `reminder_count = 1`
- `last_reminder_at` = timestamp récent

☐ 4. Vérifier message chat :
```sql
SELECT content, metadata
FROM chat_messages
WHERE prospect_id = 'VOTRE_PROSPECT_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu** :
- Contient `🔔 **Rappel automatique**`
- `metadata->>'type' = 'reminder'`

---

### Test C : Création tâche au seuil

☐ 1. Appeler fonction 2ème fois (atteindre seuil) :
```bash
# Même commande curl qu'avant
```

☐ 2. Vérifier tâche créée :
```sql
SELECT title, priority, metadata
FROM tasks
WHERE prospect_id = 'VOTRE_PROSPECT_ID'
  AND metadata->>'type' = 'form_reminder_escalation'
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu** :
- Tâche existe avec `priority = 'high'`
- `client_form_panels.task_created = true`

☐ 3. Vérifier relances bloquées :
```bash
# Appeler fonction 3ème fois → aucune relance envoyée
```

✅ **Phase 4 terminée** → Système opérationnel !

---

## 📋 Phase 5 : Monitoring (post-déploiement)

### ☐ Vérifier logs Edge Function (J+1)
```bash
supabase functions logs auto-form-reminders --tail
```

**Rechercher** :
- Erreurs (HTTP 500)
- Relances envoyées
- Tâches créées

### ☐ Vérifier métriques (J+7)
```sql
-- Relances envoyées cette semaine
SELECT COUNT(*) AS total_reminders
FROM client_form_panels
WHERE auto_reminder_enabled = true
  AND last_reminder_at > NOW() - INTERVAL '7 days';

-- Tâches créées cette semaine
SELECT COUNT(*) AS tasks_created
FROM client_form_panels
WHERE task_created = true
  AND updated_at > NOW() - INTERVAL '7 days';
```

---

## ⚠️ Rollback Plan (si problème)

### En cas de bug critique :

1. **Désactiver cron** :
```sql
SELECT cron.unschedule('auto-form-reminders-hourly');
```

2. **Désactiver hook frontend** (src/App.jsx) :
```javascript
// useFormReminderWatcher(!authLoading && adminReady);
useFormReminderWatcher(false); // ← Forcer à false
```

3. **Rebuild & redeploy** :
```bash
npm run build && npm run deploy
```

---

## ✅ Validation finale

- [ ] Migration SQL exécutée sans erreur
- [ ] Edge Function déployée et testée
- [ ] Cron configuré et actif
- [ ] Frontend déployé sans erreur
- [ ] Test A réussi (création formulaire)
- [ ] Test B réussi (relance envoyée)
- [ ] Test C réussi (tâche créée)
- [ ] Logs Edge Function propres
- [ ] Aucune erreur console navigateur

**Si toutes les cases sont cochées** → 🎉 **SYSTÈME EN PRODUCTION !**

---

## 📞 Support

**Logs utiles** :
```bash
# Edge Function
supabase functions logs auto-form-reminders --tail

# Frontend
localStorage.setItem('debug', 'FormReminder,WorkflowV2');
# Puis refresh navigateur
```

**Requêtes debug** :
```sql
-- Voir tous les panels avec relances
SELECT * FROM client_form_panels
WHERE auto_reminder_enabled = true
ORDER BY created_at DESC;

-- Voir statut cron
SELECT * FROM cron.job WHERE jobname LIKE '%reminder%';
```

---

**Document de référence complet** : `DEPLOYMENT_GUIDE_AUTO_REMINDERS.md`

**Bonne chance ! 🚀**
