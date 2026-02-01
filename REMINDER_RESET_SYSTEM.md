# 📋 SYSTÈME RESET RELANCES — Client Répond

**Date d'implémentation** : 1er février 2026  
**Statut** : ✅ Implémenté

---

## 🎯 OBJECTIF

Annuler automatiquement les relances futures dès qu'un client répond dans le chat.

**Comportement** :
- Reset `reminder_count` à 0
- Reset `last_reminder_at` à maintenant (force délai complet)
- Reset `presence_message_sent` à false
- Le cycle de relances repart de zéro

---

## 📁 FICHIERS CRÉÉS/MODIFIÉS

| Fichier | Action | Rôle |
|---------|--------|------|
| `src/hooks/useReminderReset.js` | **CRÉÉ** | Hook de surveillance et reset |
| `src/App.jsx` | **MODIFIÉ** | Import + activation du hook |

---

## 🔧 MÉCANISME

```
Client envoie message (chat_messages)
         ↓
useReminderReset détecte (real-time)
         ↓
Trouve tous les panels pending du prospect
         ↓
Reset : reminder_count=0, last_reminder_at=now()
         ↓
Prochaine relance dans reminder_delay_days jours
```

---

## 📊 CHAMPS IMPACTÉS

### Table `client_form_panels`

| Champ | Avant reset | Après reset | Impact |
|-------|-------------|-------------|--------|
| `reminder_count` | 2 | **0** | Compteur remis à zéro |
| `last_reminder_at` | 2026-01-30 09:00 | **now()** | Force délai complet |
| `presence_message_sent` | true | **false** | Permet nouveau message |
| `task_created` | ❌ Non touché | ❌ Non touché | Si tâche créée, reste |
| `auto_reminder_enabled` | ❌ Non touché | ❌ Non touché | Config préservée |

---

## 🔄 SCÉNARIOS AVANT / APRÈS

### Scénario 1 : Client répond après 2 relances

#### AVANT (sans reset)

```
T+0 (Lundi 09:00)   : Panel créé (count=0)
T+24h (Mardi 09:00) : Relance 1 (count=1)
T+48h (Mercredi 09:00) : Relance 2 (count=2)
T+50h (Mercredi 11:00) : Client répond ← RIEN NE SE PASSE
T+72h (Jeudi 09:00) : Relance 3 (count=3) → TÂCHE CRÉÉE ❌
```

**Problème** : Le client a répondu, mais reçoit quand même une relance et une tâche est créée.

#### APRÈS (avec reset)

```
T+0 (Lundi 09:00)   : Panel créé (count=0)
T+24h (Mardi 09:00) : Relance 1 (count=1)
T+48h (Mercredi 09:00) : Relance 2 (count=2)
T+50h (Mercredi 11:00) : Client répond → RESET (count=0, last=T+50h) ✅
T+72h (Jeudi 09:00) : Cron vérifie → (T+72h - T+50h) = 22h < 1 jour → PAS DE RELANCE ✅
T+74h (Jeudi 11:00) : 24h écoulées depuis last_reminder_at → Relance 1 (count=1) ✅
```

**Résultat** : Le cycle repart de zéro, pas de tâche créée prématurément.

---

### Scénario 2 : Client répond plusieurs fois

```
T+0   : Panel créé (count=0)
T+24h : Relance 1 (count=1)
T+25h : Client répond → RESET (count=0) ✅
T+49h : Relance 1 (count=1)
T+50h : Client répond → RESET (count=0) ✅
T+74h : Relance 1 (count=1)
T+75h : Client répond → RESET (count=0) ✅
...
```

**Résultat** : Tant que le client répond, le compteur ne dépasse jamais 1, aucune tâche créée.

---

### Scénario 3 : Client répond puis silence → Tâche finalement créée

```
T+0   : Panel créé (count=0)
T+24h : Relance 1 (count=1)
T+25h : Client répond → RESET (count=0) ✅
T+49h : Relance 1 (count=1)
T+73h : Relance 2 (count=2)
T+97h : Relance 3 (count=3) → TÂCHE CRÉÉE ✅
```

**Résultat** : Si le client ne répond plus, le seuil est finalement atteint → comportement normal.

---

### Scénario 4 : Client répond APRÈS tâche créée

```
T+0   : Panel créé (count=0)
T+24h : Relance 1 (count=1)
T+48h : Relance 2 (count=2)
T+72h : Relance 3 (count=3) → task_created=true ⚠️
T+80h : Client répond → useReminderReset NE TOUCHE PAS ce panel ✅
```

**Résultat** : Les panels avec `task_created=true` sont ignorés par le reset (tâche déjà escaladée).

---

### Scénario 5 : Multiples panels pour un prospect

```
Panel A : "Info bancaires" (count=2)
Panel B : "Pièce identité" (count=1)
Panel C : "Attestation" (count=0)

Client répond à 14:00 :
→ Panel A : count=0, last=14:00 ✅
→ Panel B : count=0, last=14:00 ✅
→ Panel C : count=0 (déjà), last=14:00 ✅
```

**Résultat** : TOUS les panels pending sont reset en même temps.

---

## 🛡️ GARANTIES

### Ce que ce système NE CASSE PAS

✅ **Logique cron préservée** : Le cron `auto-form-reminders` continue de fonctionner normalement
- Il lit `reminder_count` et `last_reminder_at` comme avant
- Si `reminder_count=0` et `last_reminder_at=récent`, il attend le délai

✅ **Création de tâche possible** : Si le client ne répond plus après reset
- Le compteur remonte progressivement
- Le seuil peut être atteint → tâche créée

✅ **Panels avec tâche ignorés** : Les panels `task_created=true` ne sont pas touchés

### Ce que ce système FAIT

✅ Reset immédiat du compteur quand client répond
✅ Force délai complet avant prochaine relance
✅ Permet nouveau message "Vous êtes toujours là ?"
✅ S'applique à TOUS les panels pending du prospect

---

## ⚙️ CONFIGURATION

Aucune configuration nécessaire. Le hook est activé automatiquement.

Pour désactiver :
```javascript
// Dans App.jsx, commenter cette ligne :
// useReminderReset(!authLoading && adminReady);
```

---

## 🧪 TESTS

### Test 1 : Reset après message client

```sql
-- 1. Créer un panel avec des relances
INSERT INTO client_form_panels (panel_id, prospect_id, project_type, status, reminder_count, last_reminder_at)
VALUES ('test-panel-1', 'prospect-uuid', 'centrale', 'pending', 2, '2026-01-30 09:00:00');

-- 2. Simuler message client (ou envoyer via l'app)
INSERT INTO chat_messages (prospect_id, project_type, sender, text)
VALUES ('prospect-uuid', 'centrale', 'client', 'Bonjour, je suis là');

-- 3. Vérifier le reset
SELECT panel_id, reminder_count, last_reminder_at, presence_message_sent
FROM client_form_panels
WHERE panel_id = 'test-panel-1';

-- Résultat attendu :
-- reminder_count = 0
-- last_reminder_at = ~maintenant
-- presence_message_sent = false
```

### Test 2 : Panel avec tâche ignoré

```sql
-- Panel avec task_created=true
UPDATE client_form_panels SET task_created = true WHERE panel_id = 'test-panel-1';

-- Message client
INSERT INTO chat_messages (prospect_id, project_type, sender, text)
VALUES ('prospect-uuid', 'centrale', 'client', 'Test');

-- Vérifier que reminder_count n'a PAS changé
SELECT reminder_count FROM client_form_panels WHERE panel_id = 'test-panel-1';
-- Devrait toujours être 2 (ou autre valeur avant)
```

---

## 📋 CHECKLIST DÉPLOIEMENT

- [x] Hook `useReminderReset.js` créé
- [x] Import ajouté dans `App.jsx`
- [x] Activation du hook
- [ ] Déployer le code
- [ ] Vérifier les logs `[ReminderReset]` dans la console
- [ ] Tester avec un message client réel

---

## 🔄 ROLLBACK

Dans `App.jsx` :
```javascript
// Commenter cette ligne
// useReminderReset(!authLoading && adminReady);
```

---

## ✅ FIN DOCUMENTATION
