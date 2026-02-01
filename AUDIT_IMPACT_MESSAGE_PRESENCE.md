# 🔍 AUDIT D'IMPACT — Message "Vous êtes toujours là ?" + Reset Relances

**Date** : 1er février 2026  
**Projet** : EVATIME (Locasun Supabase)  
**Objectif** : Valider la faisabilité d'ajout du système de présence sans effet de bord

---

## ✅ CONCLUSION PRÉLIMINAIRE

L'ajout du système **"Vous êtes toujours là ?"** + **reset des relances** est **FAISABLE** avec les contraintes suivantes :

- ✅ **Aucune modification du cron existant** (`auto-form-reminders/index.ts`)
- ✅ **Aucune modification de la logique de relance J+X**
- ✅ **Aucune refactorisation de l'existant**
- ⚠️ **Ajout de 2 nouvelles colonnes DB** (strictement nécessaire)
- ⚠️ **Ajout d'un nouveau hook de surveillance** (isolation totale)

---

## 📊 FICHIERS À MODIFIER

### 🔴 NIVEAU CRITIQUE (Modifications DB)

#### 1. **Nouvelle migration SQL**
**Fichier** : `supabase/migrations/add_activity_tracking_to_client_form_panels.sql` (CRÉER)

**Ce qui sera ajouté** :
```sql
-- 2 colonnes UNIQUEMENT
ALTER TABLE public.client_form_panels
  ADD COLUMN IF NOT EXISTS last_client_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presence_message_sent BOOLEAN DEFAULT false;
```

**Ce qui NE sera PAS modifié** :
- ❌ Colonnes existantes de relance (`reminder_count`, `last_reminder_at`, `task_created`, etc.)
- ❌ Logique RLS de la table
- ❌ Triggers existants
- ❌ Index de relance (`idx_client_form_panels_reminder_lookup`)

**Raison** : Isolation totale du système de présence. Ces colonnes ne seront **JAMAIS** lues par le cron de relance.

---

### 🟠 NIVEAU ÉLEVÉ (Nouveau hook de surveillance)

#### 2. **Hook de détection d'activité client**
**Fichier** : `src/hooks/useClientPresenceWatcher.js` (CRÉER)

**Ce qui sera ajouté** :
```javascript
/**
 * Hook pour surveiller l'activité client et envoyer "Vous êtes toujours là ?"
 * 
 * ISOLATION TOTALE:
 * - N'interagit PAS avec le système de relance cron
 * - N'utilise PAS les colonnes reminder_*
 * - Utilise UNIQUEMENT last_client_message_at
 */
export function useClientPresenceWatcher(enabled = false) {
  // Surveillance real-time de chat_messages (sender='client')
  // Timer local pour détecter silence 30-60 min
  // Envoi message système si silence détecté
  // Update last_client_message_at + presence_message_sent
}
```

**Ce qui NE sera PAS modifié** :
- ❌ `useFormReminderWatcher.js` (système de relance existant)
- ❌ `useSupabaseChatMessages.js` (hook messages chat)
- ❌ Logique de surveillance des relances J+X

**Raison** : Nouveau fichier isolé. Aucun risque de collision avec l'existant.

---

### 🟡 NIVEAU MOYEN (Ajout logique reset)

#### 3. **Hook de reset des relances après réponse client**
**Fichier** : `src/hooks/useReminderReset.js` (CRÉER)

**Ce qui sera ajouté** :
```javascript
/**
 * Hook pour reset les compteurs de relance après réponse client
 * 
 * LOGIQUE STRICTE:
 * - Écoute chat_messages (sender='client')
 * - Si message client détecté → reset reminder_count à 0
 * - Update last_client_message_at
 * - Reset presence_message_sent à false
 */
export function useReminderReset(enabled = false) {
  // Surveillance real-time de chat_messages
  // Détecte nouveau message client
  // Reset reminder_count UNIQUEMENT si > 0
  // NE touche PAS à last_reminder_at (historique préservé)
}
```

**Ce qui NE sera PAS modifié** :
- ❌ Logique du cron (continue de lire `reminder_count`)
- ❌ Logique de création de tâche (seuil inchangé)
- ❌ Calcul des délais J+X

**Raison** : Reset = simple UPDATE de `reminder_count`. Le cron relira la nouvelle valeur naturellement.

---

### 🟢 NIVEAU FAIBLE (Activation des hooks)

#### 4. **Activation dans App.jsx**
**Fichier** : `src/App.jsx`

**Ce qui sera ajouté** :
```javascript
// Dans le composant App (ligne ~100)
import { useClientPresenceWatcher } from '@/hooks/useClientPresenceWatcher';
import { useReminderReset } from '@/hooks/useReminderReset';

function App() {
  // ...existing code...
  
  // ✅ NOUVEAUX HOOKS (feature flags possibles)
  useClientPresenceWatcher(true);  // Détection silence
  useReminderReset(true);          // Reset après réponse
  
  // ...existing code...
}
```

**Ce qui NE sera PAS modifié** :
- ❌ `useFormReminderWatcher(false)` → reste désactivé comme actuellement
- ❌ Context existant (prospects, chat, projectStepsStatus)
- ❌ Fonction `addChatMessage()` (déjà migré Supabase)

**Raison** : Simple ajout de 2 hooks. Aucun changement de logique existante.

---

### 🔵 NIVEAU MINIMAL (Helper optionnel)

#### 5. **Helper pour envoi message système**
**Fichier** : `src/lib/systemMessages.js` (CRÉER - OPTIONNEL)

**Ce qui sera ajouté** :
```javascript
/**
 * Envoie un message système fixe (pas d'IA)
 */
export async function sendPresenceCheckMessage(prospectId, projectType) {
  return await supabase
    .from('chat_messages')
    .insert({
      prospect_id: prospectId,
      project_type: projectType,
      sender: 'system',  // ⚠️ Nouveau sender type
      text: "👋 Vous êtes toujours là ? N'hésitez pas si vous avez des questions.",
      metadata: { type: 'presence_check', automated: true },
      read: false,
    });
}
```

**Alternative** : Utiliser directement `useSupabaseChatMessages.sendMessage()` avec `sender: 'system'`.

**Ce qui NE sera PAS modifié** :
- ❌ Messages de relance cron (toujours `sender: 'admin'`)
- ❌ Structure de `chat_messages` table

**Raison** : Optionnel. Peut être inliné dans le hook.

---

## 🛡️ VALIDATION AUCUNE CASSE DU CRON

### Fichier : `supabase/functions/auto-form-reminders/index.ts`

**⚠️ ZÉRO MODIFICATION DE CE FICHIER**

**Garanties** :
1. ✅ Le cron continuera de requêter avec les **mêmes colonnes** :
   ```typescript
   .select('reminder_count, last_reminder_at, reminder_delay_days, ...')
   .eq('status', 'pending')
   .eq('auto_reminder_enabled', true)
   .eq('task_created', false);
   ```

2. ✅ Le cron **ignorera complètement** les nouvelles colonnes :
   - `last_client_message_at` → JAMAIS lu par le cron
   - `presence_message_sent` → JAMAIS lu par le cron

3. ✅ Le cron continuera de calculer les relances avec la **même logique** :
   ```typescript
   if (!panel.last_reminder_at) {
     const diffDays = (now - panel.created_at) / (1000*60*60*24);
     return diffDays >= panel.reminder_delay_days;
   }
   const diffDays = (now - panel.last_reminder_at) / (1000*60*60*24);
   return diffDays >= panel.reminder_delay_days;
   ```

4. ✅ Le reset de `reminder_count` par le hook `useReminderReset` **ne cassera rien** :
   - Si `reminder_count` passe de 2 → 0 (client répond)
   - Au prochain cron, `reminder_count` sera incrémenté à 1 (comme si première relance)
   - Comportement attendu : "pardon client actif" ✅

**AUCUN changement de comportement du cron.**

---

## 📋 SCHÉMA DB FINAL

```sql
-- Table client_form_panels (AVANT + APRÈS)

-- ✅ COLONNES EXISTANTES (non modifiées)
panel_id                     TEXT PRIMARY KEY
prospect_id                  UUID
project_type                 TEXT
form_id                      TEXT
status                       TEXT (pending/approved/rejected)
auto_reminder_enabled        BOOLEAN
reminder_delay_days          INTEGER
max_reminders_before_task    INTEGER
reminder_count               INTEGER  -- ⚠️ Peut être reset par useReminderReset
last_reminder_at             TIMESTAMPTZ
task_created                 BOOLEAN
created_at                   TIMESTAMPTZ

-- 🆕 NOUVELLES COLONNES (ajoutées)
last_client_message_at       TIMESTAMPTZ  -- Dernière activité client
presence_message_sent        BOOLEAN      -- Flag "Vous êtes toujours là ?" envoyé
```

**Impact** :
- ✅ Backward compatible (colonnes optionnelles)
- ✅ Pas de migration des données existantes requise
- ✅ Pas de conflit avec index existants

---

## 🔄 FLOW FINAL (Après implémentation)

### Scénario 1 : Client actif puis silence court

```
T+0 : Panel créé (reminder_count=0)
T+5min : Client écrit → last_client_message_at=T+5min
T+35min : Silence détecté (30-60 min)
  → useClientPresenceWatcher envoie "Vous êtes toujours là ?"
  → presence_message_sent=true
  
T+40min : Client répond
  → useReminderReset: reminder_count=0 (déjà 0, aucun changement)
  → presence_message_sent=false
  → last_client_message_at=T+40min
  
T+24h : Cron exécute
  → diffDays = (T+24h - created_at) = 1 jour ✅
  → Relance J+1 envoyée (comportement normal)
```

### Scénario 2 : Relance J+1 déjà envoyée, puis client répond

```
T+0 : Panel créé (reminder_count=0)
T+24h : Cron → Relance 1 envoyée (reminder_count=1, last_reminder_at=T+24h)
T+25h : Client répond
  → useReminderReset: reminder_count=0 ✅ (RESET)
  → last_client_message_at=T+25h
  
T+48h : Cron exécute
  → reminder_count=0 (reset)
  → last_reminder_at=T+24h (historique préservé)
  → diffDays = (T+48h - T+24h) = 1 jour ✅
  → NOUVELLE relance envoyée (compteur reparti de 0) ✅
```

**Comportement voulu** : Le client "gagne du temps" en répondant (compteur reset).

### Scénario 3 : Plusieurs relances, puis client répond AVANT seuil

```
T+0 : Panel créé
T+24h : Relance 1 (reminder_count=1)
T+48h : Relance 2 (reminder_count=2)
T+50h : Client répond → reminder_count=0 (RESET) ✅
T+72h : Cron → Relance 1 (comme si nouvelle série) ✅
  
Résultat : PAS de tâche créée (seuil jamais atteint) ✅
```

### Scénario 4 : Seuil atteint MALGRÉ reset

```
T+0 : Panel créé
T+24h : Relance 1 (count=1)
T+25h : Client répond → count=0
T+48h : Relance 1 (count=1)
T+49h : Client répond → count=0
T+72h : Relance 1 (count=1)
T+96h : Relance 2 (count=2)
T+120h : Relance 3 (count=3) → Tâche créée ✅ → task_created=true
  
Résultat : Blocage définitif (cron ignore panels avec task_created=true)
```

**Tous les cas d'usage respectent le comportement attendu.**

---

## ⚠️ RISQUES IDENTIFIÉS

### 🔴 RISQUE MAJEUR : Aucun identifié

Le système est conçu pour **isolation totale** :
- Nouvelles colonnes **jamais lues** par le cron
- Nouveaux hooks **jamais appelés** par l'existant
- Reset de `reminder_count` **compatible** avec logique cron

### 🟡 RISQUES MINEURS

#### 1. Race condition timer vs cron

**Scénario** :
```
T+23h59min : Client répond → reminder_count=0 (reset)
T+24h : Cron exécute → Relance envoyée (count=1)
```

**Impact** : Client pourrait recevoir relance 1 min après avoir répondu.

**Mitigation** :
- Hook `useReminderReset` peut aussi updater `last_reminder_at = now()`
- Forcer le cron à attendre le prochain cycle complet (J+2 au lieu de J+1)

**Solution recommandée** :
```javascript
// Dans useReminderReset
await supabase
  .from('client_form_panels')
  .update({
    reminder_count: 0,
    last_reminder_at: new Date().toISOString(),  // ✅ Force délai
  })
  .eq('panel_id', panelId);
```

**Effet** : Le cron verra `last_reminder_at = "il y a 1 min"` → pas de relance immédiate.

#### 2. Message "Vous êtes toujours là ?" + Relance J+1 le même jour

**Scénario** :
```
T+0 (09:00) : Panel créé
T+1h (10:00) : Silence 60 min → "Vous êtes toujours là ?" envoyé
T+24h (09:00 lendemain) : Cron → Relance J+1 envoyée
```

**Impact** : Client reçoit 2 messages (présence + relance) dans un court laps de temps.

**Mitigation** :
- Désactiver le message de présence **après première relance cron**
- Vérifier `reminder_count > 0` avant d'envoyer "Vous êtes toujours là ?"

**Solution recommandée** :
```javascript
// Dans useClientPresenceWatcher
if (panel.reminder_count > 0) {
  // Déjà une relance envoyée → ne pas envoyer message présence
  return;
}
```

#### 3. Détection de silence pendant weekend

**Scénario** :
```
Vendredi 18:00 : Client écrit
Lundi 09:00 : Silence détecté (3 jours)
  → Message "Vous êtes toujours là ?" envoyé
```

**Impact** : Message peut sembler agressif (client peut être inactif le weekend).

**Mitigation** :
- Limiter détection de silence aux **jours ouvrés uniquement**
- Même fenêtre horaire que le cron (08:00-20:00, lun-ven)

**Solution recommandée** :
```javascript
// Dans useClientPresenceWatcher
function isInAllowedTimeWindow() {
  const now = new Date();
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const hour = parisTime.getHours();
  const day = parisTime.getDay();
  
  return (
    day >= 1 && day <= 5 &&  // Lundi-vendredi
    hour >= 8 && hour < 20   // 08:00-20:00
  );
}
```

---

## 🧪 TESTS CRITIQUES AVANT DÉPLOIEMENT

### 1. Test DB : Colonnes n'impactent pas le cron

```sql
-- Vérifier que le cron SELECT fonctionne inchangé
SELECT 
  panel_id,
  reminder_count,
  last_reminder_at,
  reminder_delay_days,
  max_reminders_before_task,
  created_at
FROM client_form_panels
WHERE status = 'pending'
  AND auto_reminder_enabled = true
  AND task_created = false;
  
-- ✅ Doit retourner résultats MÊME si last_client_message_at IS NULL
```

### 2. Test reset : reminder_count après réponse client

```javascript
// Créer panel avec reminder_count=2
// Simuler message client
// Vérifier reminder_count=0
// Attendre cron
// Vérifier nouvelle relance envoyée (count=1)
```

### 3. Test présence : Message envoyé après 30-60 min

```javascript
// Créer panel
// Simuler message client
// Attendre 35 min (accéléré en dev)
// Vérifier message "Vous êtes toujours là ?" envoyé
// Vérifier presence_message_sent=true
```

### 4. Test isolation : Cron ignore nouvelles colonnes

```javascript
// Créer panel avec last_client_message_at=now
// Créer panel avec presence_message_sent=true
// Lancer cron manuellement
// Vérifier relances envoyées UNIQUEMENT selon logique existante
```

---

## 📦 PLAN DE ROLLBACK

### Si problème détecté après déploiement

#### 1. Rollback immédiat (code uniquement)

```javascript
// Dans App.jsx, commenter les hooks
// useClientPresenceWatcher(true);  // ❌ DÉSACTIVÉ
// useReminderReset(true);          // ❌ DÉSACTIVÉ
```

**Effet** : Système revient à l'état V1.0 (relances J+X sans reset).

#### 2. Rollback DB (si nécessaire)

```sql
-- Supprimer les colonnes ajoutées
ALTER TABLE public.client_form_panels
  DROP COLUMN IF EXISTS last_client_message_at,
  DROP COLUMN IF EXISTS presence_message_sent;
```

**⚠️ Uniquement si corruption de données. Pas nécessaire pour simple désactivation.**

---

## ✅ VALIDATION FINALE

### Checklist avant implémentation

- [ ] Migration SQL créée et testée localement
- [ ] Hook `useClientPresenceWatcher` créé avec feature flag
- [ ] Hook `useReminderReset` créé avec feature flag
- [ ] App.jsx modifié avec hooks désactivés par défaut
- [ ] Tests unitaires des 4 scénarios critiques réalisés
- [ ] Vérification que le cron Edge Function n'a **AUCUNE modification**
- [ ] Plan de rollback documenté et validé
- [ ] Review de code par une seconde personne

### Questions critiques à répondre

1. **Le cron continuera-t-il de fonctionner exactement comme avant ?**
   - ✅ OUI - Aucune modification du fichier `auto-form-reminders/index.ts`

2. **Les nouvelles colonnes peuvent-elles causer des conflits ?**
   - ✅ NON - Colonnes optionnelles, jamais lues par le cron

3. **Le reset de `reminder_count` peut-il casser la logique de seuil ?**
   - ✅ NON - Le compteur sera simplement ré-incrémenté par le cron

4. **Les nouveaux hooks peuvent-ils interférer avec l'existant ?**
   - ✅ NON - Hooks isolés, aucune dépendance avec `useFormReminderWatcher`

5. **Le message "Vous êtes toujours là ?" peut-il se confondre avec les relances ?**
   - ⚠️ POSSIBLE - Mitigation : vérifier `reminder_count > 0` avant envoi

---

## 🎯 CONCLUSION

**L'implémentation est FAISABLE** avec les garanties suivantes :

✅ **AUCUNE modification du cron existant**  
✅ **AUCUNE refactorisation de code existant**  
✅ **Isolation totale via nouveaux hooks**  
✅ **Backward compatible (colonnes optionnelles)**  
✅ **Rollback simple (désactivation feature flags)**  

**Risques mineurs identifiés** :
- ⚠️ Race condition timer/cron (mitigation : update `last_reminder_at`)
- ⚠️ Double message présence/relance (mitigation : check `reminder_count > 0`)
- ⚠️ Détection weekend (mitigation : fenêtre horaire stricte)

**Prochaine étape** : Implémenter en suivant l'ordre suivant :
1. Migration SQL (colonnes DB)
2. Hook `useReminderReset` (logique critique)
3. Hook `useClientPresenceWatcher` (feature secondaire)
4. Activation dans App.jsx (feature flags OFF par défaut)
5. Tests + validation + activation progressive

---

**FIN AUDIT D'IMPACT**
