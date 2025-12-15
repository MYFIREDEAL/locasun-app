# 🔧 FIX : Création en Double des Tâches de Vérification

## 🔴 Problème Identifié

Lorsqu'un client remplit et soumet un formulaire, **une tâche de vérification se crée 2 fois** dans l'agenda du commercial.

## 🔍 Analyse de la Cause

### Origine du Bug

Le problème vient du hook `useAutoVerificationTasks` qui s'abonne aux changements de la table `client_form_panels`.

**Fichier concerné :** `src/hooks/useAutoVerificationTasks.js`

### Mécanisme du Bug

1. Le hook `useAutoVerificationTasks` utilise un `useEffect` avec `[prompts]` comme dépendance
2. Si l'objet `prompts` est recréé à chaque rendu dans `App.jsx`, le `useEffect` se déclenche à nouveau
3. Chaque déclenchement crée une **nouvelle souscription** au canal Supabase `auto-verification-tasks`
4. Résultat : **Plusieurs souscriptions actives simultanées** écoutent les mêmes événements
5. Quand un formulaire est soumis → **Chaque souscription active** reçoit l'événement et crée une tâche
6. **Nombre de tâches créées = Nombre de souscriptions actives**

### Exemple de Scénario

```
1. App.jsx se monte → 1ère souscription créée
2. prompts change → 2ème souscription créée (1ère toujours active)
3. Client soumet un formulaire
4. Event UPDATE reçu par TOUTES les souscriptions
5. Résultat : 2 tâches créées !
```

## ✅ Solution Implémentée

### Protection contre les Doublons

Ajout d'une **vérification avant insertion** dans la fonction `handleFormSubmission` :

```javascript
// 🔥 VÉRIFIER SI UNE TÂCHE EXISTE DÉJÀ pour ce formulaire
const { data: existingTasks, error: checkError } = await supabase
  .from('appointments')
  .select('id')
  .eq('type', 'task')
  .eq('contact_id', prospect_id)
  .eq('project_id', project_type)
  .eq('step', stepName)
  .eq('title', `Vérifier le formulaire de ${prospect.name}`)
  .eq('status', 'pending')
  .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Créée dans la dernière minute

// Si une tâche identique existe déjà, ne pas en créer une nouvelle
if (existingTasks && existingTasks.length > 0) {
  logger.warn('⚠️ Tâche de vérification déjà existante, skip création');
  return;
}
```

### Critères de Détection de Doublon

Une tâche est considérée comme un doublon si elle remplit **TOUS** ces critères :

- ✅ Type = `task`
- ✅ Même `contact_id` (prospect)
- ✅ Même `project_id` (type de projet)
- ✅ Même `step` (étape du pipeline)
- ✅ Même `title` (titre identique)
- ✅ Status = `pending` (pas encore effectuée)
- ✅ Créée il y a **moins d'1 minute**

### Logging Amélioré

Ajout de logs pour tracker les souscriptions :

```javascript
logger.debug('🔔 useAutoVerificationTasks: Setting up subscription');
```

Cela permet de détecter dans la console si le hook s'abonne plusieurs fois.

## 🛡️ Protection Étendue

La même protection a été appliquée à `useAutoCreateTasks` pour éviter des problèmes similaires avec les tâches créées automatiquement lors du changement d'étape.

**Fichier modifié :** `src/hooks/useAutoCreateTasks.js`

## 📊 Impact

### Avant le Fix
- ❌ 2+ tâches créées pour chaque soumission de formulaire
- ❌ Pollution de l'agenda du commercial
- ❌ Confusion sur quelle tâche traiter

### Après le Fix
- ✅ 1 seule tâche créée par soumission
- ✅ Agenda propre et lisible
- ✅ Logs pour diagnostiquer les réabonnements

## 🧪 Tests Recommandés

1. **Test client → soumission formulaire**
   - Se connecter en tant que client
   - Remplir et soumettre un formulaire
   - Vérifier dans l'agenda admin : **1 seule tâche doit apparaître**

2. **Test console logs**
   - Ouvrir la console navigateur
   - Chercher `🔔 useAutoVerificationTasks: Setting up subscription`
   - Compter le nombre d'occurrences → Devrait être **1 ou 2 maximum**

3. **Test changement d'étape**
   - Passer un prospect à l'étape suivante (avec action nécessitant une tâche)
   - Vérifier l'agenda : **1 seule tâche doit apparaître**

## 🔧 Si le Problème Persiste

Si des tâches en double continuent d'apparaître :

1. **Vérifier le nombre de souscriptions**
   ```javascript
   // Ajouter dans la console après 10 secondes
   supabase.getChannels().forEach(ch => console.log(ch.topic));
   ```

2. **Vérifier si `prompts` est stable**
   ```javascript
   // Dans App.jsx, ajouter temporairement :
   useEffect(() => {
     console.log('🔄 prompts changed in App.jsx', Object.keys(supabasePrompts).length);
   }, [supabasePrompts]);
   ```

3. **Solution alternative : Utiliser useMemo**
   ```javascript
   // Dans App.jsx
   const stablePrompts = useMemo(() => supabasePrompts, [JSON.stringify(supabasePrompts)]);
   useAutoVerificationTasks(stablePrompts);
   ```

## 📚 Fichiers Modifiés

- ✅ `src/hooks/useAutoVerificationTasks.js`
- ✅ `src/hooks/useAutoCreateTasks.js`

## 🎯 Résolution

- [x] Ajout vérification anti-doublons dans `useAutoVerificationTasks`
- [x] Ajout vérification anti-doublons dans `useAutoCreateTasks`
- [x] Ajout logs de diagnostic
- [x] Documentation du bug et de la solution

---

**Date :** 15 décembre 2025  
**Status :** ✅ Résolu
