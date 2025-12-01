# 🐛 FIX: Notifications Admin - Groupement des Messages

## 📋 Problème Identifié

**Symptôme** : L'admin reçoit **UNE seule notification** même quand le client envoie **plusieurs messages consécutifs**.

**Capture d'écran** : Client envoie 5 messages ("ferer", "sfr", "er", "fre", "e") mais admin ne voit qu'une notification avec count=1.

---

## 🔍 Cause Racine

### Bug #1 : Marquage automatique comme "lue"

**Fichier** : `src/components/admin/ProspectDetailsAdmin.jsx` (ligne 850)

```javascript
useEffect(() => {
  if (notificationId) {
    markNotificationAsRead(parseInt(notificationId));  // ❌ PROBLÈME ICI
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('notificationId');
    setSearchParams(newParams, { replace: true });
  }
}, [notificationId, markNotificationAsRead, setSearchParams, searchParams]);
```

**Scénario problématique** :
1. Client envoie message 1 → Notification créée (count=1, read=false)
2. Client envoie message 2 → Notification incrémentée (count=2, read=false)
3. **Admin a la fiche ouverte** → useEffect marque la notification comme **read=true** 
4. Client envoie message 3 → **NOUVELLE notification créée** (count=1, read=false)
5. Admin a la fiche ouverte → Notification marquée comme read=true
6. → Cycle infini : l'admin ne voit jamais le compteur s'incrémenter !

---

### Bug #2 : Possible duplication de notifications

Si plusieurs notifications existent pour le même `(prospect_id, project_type)` avec `read=false`, cela indique un problème de **contrainte unique** manquante.

---

## ✅ Solution Appliquée

### 1. Supprimer le marquage automatique

**Fichier modifié** : `src/components/admin/ProspectDetailsAdmin.jsx`

```javascript
// ❌ SUPPRIMÉ: Marquage automatique des notifications
// Le marquage se fait uniquement via le clic dans AdminHeader
// useEffect(() => {
//   if (notificationId) {
//     markNotificationAsRead(parseInt(notificationId));
//     ...
//   }
// }, [notificationId, ...]);
```

**Nouveau comportement** :
- ✅ Notification reste **non lue** tant que l'admin ne clique pas dessus **manuellement** dans le dropdown
- ✅ Le compteur **s'incrémente correctement** quand le client envoie plusieurs messages
- ✅ L'admin voit "7 nouveaux messages de john" au lieu de 7 notifications séparées

---

### 2. Ajouter une contrainte unique en base de données

**Fichier SQL** : `fix_notification_grouping.sql`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS unique_unread_admin_notification 
ON public.notifications (prospect_id, project_type) 
WHERE read = FALSE;
```

**Effet** : Empêche la création de doublons. Si une notification non lue existe déjà, Supabase va lever une erreur, forçant l'incrémentation au lieu de l'insertion.

---

### 3. Script de nettoyage des doublons existants

**Exécuter** : `fix_notification_grouping.sql` section 3

Le script :
1. Détecte les doublons (même `prospect_id` + `project_type`)
2. Additionne les `count` de toutes les notifications en double
3. Garde UNE seule notification avec le count total
4. Supprime les autres

---

## 🧪 Test de Validation

### Scénario de test
1. **Client** : Se connecte et envoie 5 messages consécutifs sur le projet "Autonomie"
2. **Admin** : Ouvre l'espace admin (sans ouvrir la fiche du client)
3. **Vérifier** : Le dropdown notifications doit afficher :
   ```
   🔔 [5] Nouveau message de john
   Projet: Autonomie
   5 nouveaux messages
   ```

### SQL de vérification
```sql
-- Doit retourner UNE SEULE ligne avec count=5
SELECT * FROM public.notifications 
WHERE prospect_name = 'john' 
  AND read = false;
```

---

## 📊 Comportement Attendu (Avant/Après)

### ❌ AVANT (Bug)
```
Notifications (Admin)
┌─────────────────────────────┐
│ [1] Nouveau message de john │ ← count=1
└─────────────────────────────┘
```
*Même si 5 messages envoyés, seul 1 affiché*

### ✅ APRÈS (Fix)
```
Notifications (Admin)
┌─────────────────────────────┐
│ [5] 5 nouveaux messages     │ ← count=5
│     de john                 │
│     Projet: Autonomie       │
└─────────────────────────────┘
```
*Compteur incrémental comme côté client*

---

## 🔄 Impact sur le Workflow

### Ancien workflow (Bugué)
1. Client envoie 5 messages
2. Admin voit 1 notification
3. Admin clique → Fiche s'ouvre
4. **Notification marquée automatiquement comme lue**
5. Client envoie 2 messages de plus
6. Admin voit 1 nouvelle notification (au lieu de 7 total)

### Nouveau workflow (Corrigé)
1. Client envoie 5 messages
2. Admin voit **"5 nouveaux messages"**
3. Admin clique → Fiche s'ouvre
4. **Notification RESTE non lue**
5. Client envoie 2 messages de plus
6. Admin voit **"7 nouveaux messages"** (incrémentation)
7. Admin doit **cliquer à nouveau** sur la notification pour la marquer comme lue

---

## 🎯 Résumé

| Composant | Action |
|-----------|--------|
| **ProspectDetailsAdmin.jsx** | ❌ Supprimé marquage auto |
| **AdminHeader.jsx** | ✅ Garde marquage manuel |
| **useSupabaseNotifications.js** | ✅ Logique d'incrémentation OK |
| **Base de données** | ✅ Contrainte unique ajoutée |

**Résultat** : Le système de notification admin fonctionne maintenant **exactement comme le système client** avec groupement et incrémentation correcte ! 🎉
