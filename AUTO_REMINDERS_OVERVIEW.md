# 🚀 SYSTÈME DE RELANCES AUTOMATIQUES — Vue d'ensemble

**Status** : ✅ **DÉPLOYÉ ET OPÉRATIONNEL**  
**Date** : 31 janvier 2026  
**Version** : 1.0 (messages fixes)  

⚠️ **IMPORTANT** : Les messages de relance sont actuellement **FIXES et hardcodés**.  
L'intégration IA (messages contextuels personnalisés) sera ajoutée quand Charly sera en ligne sur EVATIME.

---

## 🎯 Qu'est-ce que ça fait ?

Envoie automatiquement des relances aux clients n'ayant pas complété leurs formulaires, puis crée une tâche pour le commercial après N relances infructueuses.

**Exemple concret** :
1. Admin envoie formulaire "Informations bancaires" au client
2. Client ne répond pas
3. **J+1** → Message automatique "🔔 Rappel : formulaire en attente"
4. Client ne répond toujours pas
5. **J+2** → 2ème rappel automatique
6. **J+3** → Tâche créée pour le commercial : "Relancer Monsieur X - Formulaire non complété"

---

## 📐 Architecture (conforme EVATIME)

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN configure relances dans Workflow V2 Config           │
│  ↓                                                           │
│  Envoie formulaire → Config copiée dans client_form_panels  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  EDGE FUNCTION (cron toutes les heures)                      │
│  ↓                                                           │
│  1. Query panels "pending" + relances activées               │
│  2. Filtre par délai (J+1, J+2, etc.)                       │
│  3. Envoie message chat "🔔 Rappel"                         │
│  4. Incrémente reminder_count                               │
│  5. Si seuil atteint → crée tâche                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  HOOK useFormReminderWatcher (real-time)                    │
│  ↓                                                           │
│  Écoute client_form_panels                                  │
│  Si reminder_count >= seuil → crée tâche + bloque relances │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Fichiers créés

| Fichier | Rôle |
|---------|------|
| `supabase/migrations/add_reminder_columns_to_client_form_panels.sql` | Ajoute 6 colonnes à la table |
| `src/hooks/useSupabaseFormReminder.js` | CRUD config reminder |
| `supabase/functions/auto-form-reminders/index.ts` | Edge Function cron |
| `src/hooks/useFormReminderWatcher.js` | Hook surveillance real-time (modifié) |
| `src/App.jsx` | Activation du hook (1 ligne) |
| `src/lib/actionOrderV2.js` | Inclut reminderConfig dans ActionOrder (modifié) |
| `src/lib/executeActionOrderV2.js` | Sauvegarde config dans DB (modifié) |

**Documentation** :
- `DEPLOYMENT_GUIDE_AUTO_REMINDERS.md` (guide complet 400+ lignes)
- `DEPLOYMENT_CHECKLIST.md` (checklist visuelle)
- `SESSION_RECAP_AUTO_REMINDERS.md` (récap technique)

---

## 🔧 Déploiement express (15 min)

### 1. SQL (2 min)
```bash
# Supabase Dashboard → SQL Editor
# Copier-coller : supabase/migrations/add_reminder_columns_to_client_form_panels.sql
# Run
```

### 2. Edge Function (5 min)
```bash
cd /Users/jackluc/Desktop/LOCASUN\ \ SUPABASE
supabase functions deploy auto-form-reminders

# Puis configurer cron dans Dashboard (voir DEPLOYMENT_CHECKLIST.md)
```

### 3. Frontend (5 min)
```bash
npm run build
npm run deploy
```

### 4. Test (3 min)
```bash
# Créer formulaire avec relances activées
# Appeler fonction manuellement (curl)
# Vérifier message chat + compteur incrémenté
```

**Guide détaillé** → `DEPLOYMENT_CHECKLIST.md`

---

## 💡 Configuration dans l'interface

**Workflow V2 Config** → Module "Formulaire Client" :

| Paramètre | Description | Valeurs |
|-----------|-------------|---------|
| **Relances activées** | Toggle ON/OFF | ✅ / ❌ |
| **Délai entre relances** | Jours entre chaque rappel | J+1, J+2, J+3, J+4 |
| **Seuil avant tâche** | Nombre de relances avant escalade | 1, 2, 3, 4, 5 |

**Exemple** :
- Délai J+2 + Seuil 3 = 3 relances espacées de 2 jours, puis tâche créée (= 6 jours total)

---

## 📊 Données stockées (table `client_form_panels`)

| Colonne | Type | Description |
|---------|------|-------------|
| `auto_reminder_enabled` | bool | Relances activées ? |
| `reminder_delay_days` | int (1-4) | Délai entre relances |
| `max_reminders_before_task` | int (1-5) | Seuil de relances |
| `reminder_count` | int | Compteur (incrémenté par Edge Function) |
| `last_reminder_at` | timestamp | Dernière relance envoyée |
| `task_created` | bool | Tâche créée ? (bloque relances) |

---

## ⚙️ Configuration Edge Function

**Fenêtre d'envoi** :
- **Horaires** : 08:00 - 20:00
- **Jours** : Lundi à vendredi
- **Timezone** : Europe/Paris

**Cron** : Toutes les heures (`0 * * * *`)

**Message envoyé (V1.0 - FIXE)** :
```
🔔 **Rappel automatique**

Vous n'avez pas encore complété le formulaire **{Nom du formulaire}**.

Merci de le remplir dès que possible pour que nous puissions avancer sur votre projet.
```

⚠️ **Note** : Message identique pour toutes les relances. L'intégration IA pour messages personnalisés sera ajoutée plus tard.

**Logique** :
```
SI formulaire.status = 'pending'
ET formulaire.auto_reminder_enabled = true
ET formulaire.task_created = false
ET (maintenant - dernière_relance) >= délai_jours
ALORS
  ↓ Envoyer message chat (texte fixe)
  ↓ Incrémenter compteur
  ↓ SI compteur >= seuil
      → Créer tâche
      → Marquer task_created = true
```

---

## ✅ Checklist déploiement rapide

- [x] Migration SQL exécutée
- [x] Edge Function déployée
- [x] Cron configuré
- [x] Frontend buildé et déployé
- [x] Test manuel réussi (curl)
- [x] Message chat visible
- [x] Compteur incrémenté
- [x] Tâche créée au seuil

**Status** : ✅ **SYSTÈME EN PRODUCTION**

⚠️ **Version actuelle** : 1.0 (messages fixes)  
📅 **Prochaine version** : 2.0 (intégration IA Charly pour messages personnalisés)

---

## 🔍 Monitoring post-déploiement

**Logs Edge Function** :
```bash
supabase functions logs auto-form-reminders --tail
```

**Statistiques DB** :
```sql
-- Relances envoyées aujourd'hui
SELECT COUNT(*) FROM client_form_panels
WHERE last_reminder_at::date = CURRENT_DATE;

-- Tâches créées cette semaine
SELECT COUNT(*) FROM client_form_panels
WHERE task_created = true
  AND updated_at > NOW() - INTERVAL '7 days';
```

---

## 📞 En cas de problème

**Désactiver système** :
1. Dashboard → Cron Jobs → Unschedule `auto-form-reminders-hourly`
2. `src/App.jsx` → `useFormReminderWatcher(false)`
3. Rebuild + redeploy

**Support** :
- Logs : `supabase functions logs auto-form-reminders`
- Debug frontend : `localStorage.setItem('debug', 'FormReminder')`
- Doc complète : `DEPLOYMENT_GUIDE_AUTO_REMINDERS.md`

---

## 🎯 Métriques de succès (J+7)

- **80%** des formulaires non complétés relancés
- **+30%** de taux de complétion post-relance
- **0** bug / erreur critique
- **100%** respect fenêtre horaire (08:00-20:00, lun-ven)

---

**Documents de référence** :
1. `DEPLOYMENT_CHECKLIST.md` — Checklist visuelle étape par étape
2. `DEPLOYMENT_GUIDE_AUTO_REMINDERS.md` — Guide complet avec tests
3. `SESSION_RECAP_AUTO_REMINDERS.md` — Récap technique détaillé

**✅ Système prêt à déployer !** 🚀
