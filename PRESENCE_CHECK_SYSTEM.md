# 📋 MESSAGE PRÉSENCE "VOUS ÊTES TOUJOURS LÀ ?"

**Date d'implémentation** : 1er février 2026  
**Statut** : ✅ Implémenté

---

## 🎯 OBJECTIF

Envoyer automatiquement un message système :
> "👋 Vous êtes toujours là ? N'hésitez pas si vous avez des questions, je suis là pour vous aider."

Quand :
- Une action est en cours (panel `status='pending'`)
- Le client a cessé de répondre depuis **10 minutes**
- Aucun message de présence n'a été envoyé pour cette action

**Disponibilité** : 24h/24, 7j/7 (le client est déjà actif sur l'app)

---

## 📁 FICHIERS CRÉÉS/MODIFIÉS

### 1. Migration SQL (CRÉÉ)
**Fichier** : `supabase/migrations/add_presence_check_to_client_form_panels.sql`

```sql
ALTER TABLE public.client_form_panels
  ADD COLUMN IF NOT EXISTS presence_message_sent BOOLEAN DEFAULT false;
```

**Rôle** : Flag pour éviter les doublons (1 seul message par panel).

### 2. Hook Principal (CRÉÉ)
**Fichier** : `src/hooks/usePresenceCheck.js`

**Rôle** : Surveille l'activité client et envoie le message après silence.

### 3. App.jsx (MODIFIÉ)
**Fichier** : `src/App.jsx`

**Ajouts** :
```javascript
import { usePresenceCheck } from '@/hooks/usePresenceCheck';

// Dans le composant App
usePresenceCheck(!authLoading && adminReady);
```

---

## 🔄 MÉCANISME DÉTAILLÉ

### Flow complet

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DÉMARRAGE APP                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 1. usePresenceCheck s'active                                        │
│ 2. Charge tous les panels pending avec presence_message_sent=false  │
│ 3. Pour chaque panel : calcule le temps écoulé depuis création      │
│    └─ Si > 10 min sans message client → Timer immédiat              │
│    └─ Sinon → Timer pour le temps restant                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SURVEILLANCE REAL-TIME                            │
├─────────────────────────────────────────────────────────────────────┤
│ Canal 1: chat_messages (INSERT)                                      │
│   └─ Si sender='client' → Annule timer + Redémarre 10 min           │
│                                                                      │
│ Canal 2: client_form_panels (INSERT/UPDATE)                          │
│   └─ INSERT panel pending → Démarre timer 10 min                    │
│   └─ UPDATE status != 'pending' → Annule timer                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TIMER EXPIRE (10 min)                             │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Vérifie panel.status === 'pending'                               │
│ 2. Vérifie panel.presence_message_sent === false                    │
│ 3. Actif 24h/24, 7j/7 (pas de restriction horaire)                  │
│ 4. Envoie message chat (sender='system')                            │
│ 5. Update presence_message_sent = true                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Déclencheurs

| Événement | Action |
|-----------|--------|
| Nouveau panel créé | Démarre timer 10 min |
| Client envoie message | Annule timer + Redémarre 10 min |
| Panel terminé (approved/rejected) | Annule timer |
| Timer expire | Envoie message (24h/24, 7j/7) |

---

## 🛡️ GARANTIES D'ISOLATION

### Ce que ce système NE FAIT PAS

❌ N'incrémente PAS `reminder_count`  
❌ Ne crée PAS de tâche  
❌ Ne touche PAS à `last_reminder_at`  
❌ Ne modifie PAS `task_created`  
❌ N'utilise PAS d'IA (message texte fixe)  
❌ N'utilise PAS de cron  

### Ce que ce système FAIT

✅ Surveille les messages chat (sender='client')  
✅ Utilise des timers applicatifs (`setTimeout`)  
✅ Envoie un message système unique par panel  
✅ Respecte la fenêtre horaire (08:00-20:00, lun-ven)  
✅ Reporte l'envoi si hors fenêtre  

---

## ⚙️ CONFIGURATION

### Constantes (modifiables dans `usePresenceCheck.js`)

```javascript
// Délai avant envoi (en millisecondes)
const PRESENCE_CHECK_DELAY_MS = 45 * 60 * 1000; // 45 minutes

// Message texte fixe
const PRESENCE_MESSAGE = "👋 Vous êtes toujours là ? N'hésitez pas si vous avez des questions, je suis là pour vous aider.";

// Fenêtre horaire
const ALLOWED_HOURS = { start: 8, end: 20 }; // 08:00-20:00
const ALLOWED_DAYS = [1, 2, 3, 4, 5]; // Lundi-vendredi
```

### Pour changer le délai (30 ou 60 min)

```javascript
// Valeur actuelle : 10 minutes
const PRESENCE_CHECK_DELAY_MS = 10 * 60 * 1000;

// Autres exemples :
// 5 minutes
const PRESENCE_CHECK_DELAY_MS = 5 * 60 * 1000;

// 30 minutes
const PRESENCE_CHECK_DELAY_MS = 30 * 60 * 1000;
```

---

## 📊 SCHÉMA DB

### Table `client_form_panels` (après migration)

| Colonne | Type | Défaut | Rôle |
|---------|------|--------|------|
| `presence_message_sent` | `BOOLEAN` | `false` | Flag message envoyé |

### Table `chat_messages` (message inséré)

```json
{
  "prospect_id": "uuid",
  "project_type": "centrale",
  "sender": "system",       // ⚠️ Identifié comme système
  "text": "👋 Vous êtes toujours là ?...",
  "read": false,
  "metadata": {
    "type": "presence_check",
    "automated": true,
    "panel_id": "panel-xxx"
  }
}
```

---

## 🧪 TESTS

### Test 1 : Nouveau panel → Message après 10 min

```
1. Créer un panel (status='pending')
2. Attendre 10 min
3. Vérifier qu'un message sender='system' apparaît dans chat_messages
4. Vérifier que presence_message_sent=true dans le panel
```

### Test 2 : Client répond → Timer reset

```
1. Créer un panel
2. Attendre 5 min
3. Envoyer un message client
4. Attendre 10 min SUPPLÉMENTAIRES
5. Vérifier le message (total 15 min depuis création)
```

### Test 3 : Panel terminé → Pas de message

```
1. Créer un panel
2. Attendre 20 min
3. Changer status='approved'
4. Attendre 45 min
5. Vérifier qu'AUCUN message n'a été envoyé
```

### Test 4 : Un seul message par panel

```
1. Créer un panel
2. Attendre 45 min → Message envoyé
3. Attendre 45 min de plus
4. Vérifier qu'AUCUN nouveau message (presence_message_sent=true)
```

---

## 📋 CHECKLIST DÉPLOIEMENT

- [ ] Exécuter la migration SQL dans Supabase Dashboard
- [ ] Déployer le code (hook + App.jsx modifié)
- [ ] Vérifier les logs `[PresenceCheck]` dans la console
- [ ] Tester avec un panel réel
- [ ] Valider que le cron de relances J+X continue de fonctionner

---

## 🔄 ROLLBACK

### Désactiver rapidement

Dans `App.jsx` :
```javascript
// Commenter cette ligne
// usePresenceCheck(!authLoading && adminReady);
```

### Supprimer la colonne DB (si nécessaire)

```sql
ALTER TABLE public.client_form_panels
  DROP COLUMN IF EXISTS presence_message_sent;
```

---

## ✅ FIN DOCUMENTATION
