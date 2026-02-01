# 🔍 ANALYSE SYSTÈME RELANCES AUTOMATIQUES — Pour ChatGPT

**Date** : 1er février 2026  
**Projet** : EVATIME (Locasun Supabase)  
**Contexte** : Analyse factuelle du système de relances automatiques existant

---

## 📋 CONTEXTE

Nous avons développé un système de relance avec :
- Un cron / scheduler
- Une Edge Function Supabase
- Un système de relance par message texte fixe (non généré par l'IA)
- Un paramétrage par étape (J+X, nombre de relances)
- Une IA conversationnelle utilisée pendant les actions (formulaires, échanges client)

**Cette analyse décrit UNIQUEMENT ce qui est actuellement codé et exécuté.**

---

## 1️⃣ FLOW GLOBAL ACTUEL

### Démarrage d'un projet/action

**Fichier** : `src/lib/executeActionOrderV2.js`

```javascript
async function executeFormAction(order, context) {
  // 1. Crée un client_form_panel
  const panelResult = await supabase
    .from('client_form_panels')
    .insert({
      prospect_id: prospectId,
      form_id: formId,
      status: 'pending',
      // Config relance COPIÉE ICI (snapshot)
      auto_reminder_enabled: reminderConfig?.enabled ?? false,
      reminder_delay_days: reminderConfig?.delayDays ?? 1,
      max_reminders_before_task: reminderConfig?.maxRemindersBeforeTask ?? 3,
      reminder_count: 0,
      last_reminder_at: null,
      task_created: false,
    });
  
  // 2. Envoie message chat
  await sendChatMessage({ content: message, sender: 'admin' });
}
```

**Timeline réelle** :
```
T+0 : Admin exécute action
  → Panel créé (status='pending', reminder_count=0)
  → Message chat envoyé
  → Rien d'autre (pas de relance immédiate)
```

### Déclenchement d'une relance

**Fichier** : `supabase/functions/auto-form-reminders/index.ts`

```typescript
// Cron : TOUTES LES HEURES (0 * * * *)
// Fenêtre : 08:00-20:00, lun-ven, Europe/Paris

Deno.serve(async (req) => {
  if (!isInAllowedTimeWindow()) {
    return { success: true, message: 'Hors fenêtre', processed: 0 };
  }
  
  // Query DB
  const { data: panels } = await supabase
    .from('client_form_panels')
    .select(...)
    .eq('status', 'pending')
    .eq('auto_reminder_enabled', true)
    .eq('task_created', false);
  
  // Filtre panels où relance DUE
  const panelsDue = panels.filter(panel => {
    if (!panel.last_reminder_at) {
      // Première relance : basée sur created_at
      const diffDays = (now - panel.created_at) / (1000*60*60*24);
      return diffDays >= panel.reminder_delay_days;
    }
    // Relances suivantes : basée sur last_reminder_at
    const diffDays = (now - panel.last_reminder_at) / (1000*60*60*24);
    return diffDays >= panel.reminder_delay_days;
  });
  
  // Pour chaque panel due → envoie relance
});
```

**⚠️ Le cron NE PLANIFIE PAS de relances futures. Il EXÉCUTE si conditions remplies au moment où il tourne.**

### Exemple concret : Délai J+1, Seuil 3 relances

```
T+0 (Lundi 09:00)
  → Panel créé : { reminder_count: 0, last_reminder_at: null }
  
T+24h (Mardi 09:00) ← Cron
  → Calcul : 24h = 1 jour ✅
  → RELANCE 1 envoyée
  → { reminder_count: 1, last_reminder_at: Mardi 09:00 }
  
T+48h (Mercredi 09:00) ← Cron
  → RELANCE 2 envoyée
  → { reminder_count: 2, last_reminder_at: Mercredi 09:00 }
  
T+72h (Jeudi 09:00) ← Cron
  → RELANCE 3 envoyée
  → { reminder_count: 3, last_reminder_at: Jeudi 09:00 }
  → reminder_count (3) >= max (3) ✅
  → TÂCHE CRÉÉE pour commercial
  → { task_created: true }
  
T+96h (Vendredi 09:00) ← Cron
  → Panel exclu (task_created = true)
  → AUCUNE relance (bloqué définitivement)
```

---

## 2️⃣ GESTION DU TEMPS

### Temps réel (pendant conversation)

```javascript
// ❌ AUCUNE gestion de relance en temps réel
// L'IA conversationnelle (Charly) :
// - Répond aux questions
// - Aide à remplir formulaires
// - Mais NE déclenche PAS de relances
```

**Constat** : Tout le système fonctionne en **temps différé** (cron uniquement).

### Temps différé (cron)

```typescript
// Le cron :
// ✅ Exécute des tâches existantes (panels déjà créés)
// ❌ NE planifie PAS de relances futures
// ✅ Peut déclencher plusieurs relances sans interaction client

for (const panel of panelsDue) {
  await sendReminderMessage(...);
  await supabase
    .from('client_form_panels')
    .update({ 
      reminder_count: newCount,
      last_reminder_at: now 
    });
  
  if (newCount >= max_reminders_before_task) {
    await createTaskForCommercial(...);
    await supabase
      .from('client_form_panels')
      .update({ task_created: true });
  }
}
```

**⚠️ Si cron en panne plusieurs jours, puis relancé : TOUTES les relances dues partent d'un coup.**

---

## 3️⃣ LOGIQUE DE RELANCE

### Délais J+X

```typescript
function isReminderDue(lastReminderAt, delayDays) {
  if (!lastReminderAt) {
    return true; // Première relance (SQL filtre par created_at)
  }
  const diffMs = now.getTime() - new Date(lastReminderAt).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= delayDays; // ⚠️ Opérateur >=
}
```

**Constat** :
- **Délai fixe** : Même `reminder_delay_days` entre chaque relance
- **Pas de progression** (J+1, J+2, J+3) → Toujours le même délai
- Exemple : `delay=2` → Relances à J+2, J+4, J+6

### Relances simultanées

```sql
-- UN prospect peut avoir PLUSIEURS panels simultanés
-- → Client peut recevoir PLUSIEURS relances en même temps (1 par formulaire)

-- Exemple :
-- Panel 1 : "Info bancaires" (relance due)
-- Panel 2 : "Pièce identité" (relance due)
-- Panel 3 : "Attestation" (relance due)
-- → 3 messages de relance en même temps
```

**⚠️ Aucune limitation du nombre de relances simultanées par prospect.**

### Déclencheur

La relance est déclenchée par **3 conditions cumulées** :

```typescript
// 1. TEMPS
diffDays >= panel.reminder_delay_days

// 2. STATUT
panel.status === 'pending'

// 3. FLAG tâche
panel.task_created === false
```

**PAS liée à** :
- ❌ Silence client (pas de détection activité chat)
- ❌ Objectif non atteint (pas de vérification progression)
- ✅ Uniquement : délai + statut + flag

---

## 4️⃣ NATURE DES MESSAGES

### Message envoyé

```typescript
async function sendReminderMessage(supabase, prospectId, projectType, formName, panelId) {
  const message = {
    prospect_id: prospectId,
    project_type: projectType,
    sender: 'admin', // ⚠️ Apparaît comme admin
    content: `🔔 **Rappel automatique**\n\nVous n'avez pas encore complété le formulaire **${formName}**.\n\nMerci de le remplir dès que possible pour que nous puissions avancer sur votre projet.`,
    metadata: {
      type: 'reminder',
      automated: true,
    },
  };
  
  await supabase.from('chat_messages').insert(message);
}
```

**Constat** :
- ✅ Message texte **fixe hardcodé**
- ❌ Identique pour relance 1, 2, 3
- ❌ Pas de personnalisation (nom client, contexte)
- ❌ Aucun appel IA (pas OpenAI)
- ⚠️ Apparaît comme message "admin" (pas distingué visuellement)

### Moments IA vs Système

```
IA (Charly) parle :
  ✅ Pendant conversations actives
  ✅ Aide remplissage formulaires
  ✅ Actions workflow (génération contrats)

Système (texte fixe) parle :
  ✅ Relances automatiques (cron)
  ✅ Entre 08:00-20:00, lun-ven
  ✅ Toutes les heures si conditions remplies

❌ L'IA N'intervient JAMAIS dans :
  - Décision d'envoyer relance
  - Génération message relance
  - Calcul délai
```

---

## 5️⃣ COMPORTEMENT RÉPONSE CLIENT

### Ce que fait le système

```javascript
// Hook useFormReminderWatcher
// Écoute real-time client_form_panels

.on('UPDATE', table: 'client_form_panels', (payload) => {
  const panel = payload.new;
  
  // ✅ Si status='approved' → Ignore
  if (panel.status === 'approved') return;
  
  // ✅ Si task_created=true → Ignore
  if (panel.task_created) return;
  
  // ⚠️ Si seuil atteint → Crée tâche
  if (panel.reminder_count >= panel.max_reminders_before_task) {
    await createTaskForUncompletedForm(...);
    await supabase.update({ task_created: true });
  }
});
```

**⚠️ Hook NE s'active PAS lors réponse client** (écoute `client_form_panels`, pas `chat_messages`).

### Annulation relances

```typescript
// ❌ AUCUNE annulation après réponse client

// Cron ne vérifie PAS :
// - Réponse client récente
// - Ouverture chat
// - Formulaire partiellement rempli

// ✅ Seules façons d'arrêter :
// 1. status → 'approved'
// 2. task_created → true
// 3. auto_reminder_enabled → false
```

**⚠️ Relance peut partir même si client a répondu 5 min avant (tant que status='pending').**

### Compteur

```typescript
// ❌ AUCUNE réinitialisation auto

// reminder_count :
// - Initialisé à 0 (création)
// - Incrémenté (chaque relance)
// - Jamais décrémenté (sauf DB manuelle)
```

**Compteur cumulatif et irréversible.**

### Scénarios

```
Scénario 1 : Client répond mais ne valide pas
  → status='pending'
  → Relances continuent

Scénario 2 : Client valide
  → Admin clique "Approuver"
  → status='approved'
  → Relances s'arrêtent

Scénario 3 : Client répond, admin ne fait rien
  → status='pending'
  → Relances continuent → Tâche créée
```

---

## 6️⃣ PARAMÉTRAGE PAR ÉTAPE

### Ce que contrôle la config

```javascript
// Interface Workflow V2 Config
const reminderConfig = {
  enabled: true,           // ✅ Utilisé
  delayDays: 2,           // ✅ Utilisé
  maxRemindersBeforeTask: 3, // ✅ Utilisé
};

// ⚠️ Config COPIÉE dans client_form_panels à la création
// → Si config change après, panels existants NE sont PAS mis à jour
```

### Ce qui est utilisé

```typescript
// Moteur utilise :
// ✅ reminder_delay_days
// ✅ max_reminders_before_task
// ✅ auto_reminder_enabled

// ❌ Moteur N'utilise PAS :
// - Autres données module (objectif, instructions IA)
// - Données prospect (tags, statut pipeline)
// - Données chat (activité, messages non lus)
```

### Ce qui est ignoré

```javascript
// Config globale (moduleAIConfig.js) :
// ✅ Sert à pré-remplir interface
// ✅ Génère ActionOrder JSON
// ✅ Copiée dans panels à création

// ❌ Jamais relue après création panel
// → Modification config globale = panels existants inchangés
```

**Pas de synchronisation dynamique.**

---

## 7️⃣ POINTS DE FRICTION

### 1. Relance pendant conversation active

```
T+0 : Admin envoie formulaire
T+24h (J+1) : Cron à 09:00
  → Client a écrit à 08:55 (5 min avant)
  → Relance part quand même
```

### 2. Plusieurs relances simultanées

```
Client : 3 formulaires en attente
  → Cron : 3 relances en même temps
```

### 3. Relance après validation

```
T+23h : Client remplit formulaire
T+23h30 : Admin valide (status='approved')
T+24h : Cron → Aucune relance ✅

MAIS si admin n'a pas validé :
T+24h : Relance part
  → "Complétez le formulaire"
  → Alors qu'il est déjà rempli
```

### 4. Compteur irréversible

```
Client répond au 1er rappel
  → reminder_count = 1 (reste à 1)

Client ne répond pas 2 jours
  → J+2 : count = 2
  → J+3 : count = 3 → Tâche créée

Impossible de "pardonner" sans DB manuelle
```

### 5. Message identique

```
Relance 1 : "🔔 Rappel... formulaire"
Relance 2 : "🔔 Rappel... formulaire"
Relance 3 : "🔔 Rappel... formulaire"
```

### 6. Ambiguïté admin/système

```javascript
{
  sender: 'admin', // Apparaît comme admin
  metadata: { automated: true }, // Mais flag système
}
// → Client ne sait pas si humain ou auto
```

### 7. Config snapshot

```
T+0 : Panel créé (delay=1)
T+12h : Admin change config (delay=3)
T+24h : Relance part toujours avec delay=1
```

### 8. Pas de détection progression

```sql
-- Panel : form_data 80% rempli
-- Mais status='pending'
-- → Relance part quand même
```

---

## 📊 SYNTHÈSE

### Conditions exactes relance

```typescript
IF (
  08:00 <= heure < 20:00 AND
  jour IN [lundi-vendredi] AND
  
  panel.status === 'pending' AND
  panel.auto_reminder_enabled === true AND
  panel.task_created === false AND
  
  (now - last_reminder_at) >= delay_days * 24h
) THEN
  envoyer_message_fixe()
  reminder_count++
  
  IF reminder_count >= max THEN
    creer_tache()
    task_created = true
  END
END
```

### Données ignorées

❌ Le système N'utilise PAS :
- `chat_messages` (pas détection activité)
- `prospect.tags` (pas filtrage projet)
- `project_steps_status` (pas lien pipeline)
- `client_form_panels.form_data` (pas détection progression)
- `users.last_seen_at` (pas détection connexion)
- Config globale après création (snapshot figé)

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `supabase/functions/auto-form-reminders/index.ts` | Moteur principal |
| `src/lib/executeActionOrderV2.js` | Création panels + copie config |
| `src/hooks/useFormReminderWatcher.js` | Surveillance real-time |
| `src/lib/actionOrderV2.js` | Génération ActionOrder |
| `supabase/migrations/add_reminder_columns_to_client_form_panels.sql` | Colonnes DB |

---

## ✅ FIN ANALYSE

**Cette analyse décrit uniquement le comportement codé actuellement.**

Aucune proposition d'amélioration n'a été faite conformément à la demande.
