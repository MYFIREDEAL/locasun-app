# 🚨 PROBLÈME : Formulaires ne s'affichent pas côté client

## 📋 Contexte du projet

**Application** : Locasun - Gestion de projets énergétiques (solaire, ACC, autonomie)  
**Stack** : React + Vite + Supabase + Tailwind CSS  
**Architecture** : Dual-user system (Admins + Clients)

---

## 🎯 Système attendu : Envoi automatique de formulaires via Charly AI

### Flow normal
1. **Admin configure un prompt Charly AI** pour un projet (ex: "ACC", "Centrale", "Autonomie")
2. **Prompt contient des étapes** (`project_steps_status`) avec des **actions automatiques**
3. Quand le client **complète une étape**, Charly AI déclenche l'action suivante
4. **Action type `show_form`** : Doit envoyer un formulaire au client
5. **Client doit voir le formulaire** dans son espace :
   - 📩 Message dans le chat avec le formulaire interactif
   - 📋 Panneau latéral "Formulaires à compléter"

---

## ❌ Problème actuel

### Symptômes
- ✅ Admin envoie le formulaire via le chat (message créé dans `chat_messages`)
- ✅ Message apparaît dans le chat admin
- ❌ **Client ne voit PAS le formulaire** dans son espace
- ❌ **Panneau latéral "Formulaires à compléter" reste vide**

### Tests effectués
- Testé avec client "Eva" : ❌ Aucun formulaire affiché
- Testé avec client "Georges" : ❌ Aucun formulaire affiché
- Vérifié console navigateur : Pas d'erreurs JS
- Vérifié Supabase : Pas d'erreurs RLS

---

## 🔍 Analyse technique

### 1. **Architecture actuelle du système**

#### Tables Supabase impliquées
```sql
-- Messages chat (fonctionne ✅)
chat_messages (
    id, prospect_id, project_type, sender,
    text, form_id, prompt_id, step_index, created_at
)

-- Formulaires clients (PROBLÈME ❌)
client_form_panels (
    id, panel_id, prospect_id, project_type,
    form_id, status, message_timestamp, created_at
)

-- Définitions formulaires (fonctionne ✅)
forms (
    form_id, name, description, fields, created_at
)

-- Prompts Charly AI (fonctionne ✅)
prompts (
    id, prompt_id, project_id, name, steps, created_at
)

-- Étapes projets (fonctionne ✅)
project_steps_status (
    id, prospect_id, project_type, step_name, 
    status, completed_at
)
```

#### Hooks Supabase
- ✅ `useSupabaseChatMessages.js` : Charge messages avec real-time
- ✅ `useSupabaseForms.js` : Charge définitions formulaires
- ✅ `useSupabasePrompts.js` : Charge prompts Charly AI
- ⚠️ `useSupabaseClientFormPanels.js` : **EXISTE mais NON UTILISÉ**

---

### 2. **Code actuel (commit b191aed)**

#### Fichier: `src/App.jsx`
```javascript
// ❌ PROBLÈME : clientFormPanels utilise React state (ligne 187)
const [clientFormPanels, setClientFormPanels] = useState([]);

// ❌ registerClientForm écrit dans React state, PAS dans Supabase (ligne 1009)
const registerClientForm = useCallback((formPayload) => {
  setClientFormPanels(prev => {
    // Stockage en mémoire uniquement ❌
    // Perdu au refresh de page
    // Pas de sync entre admin et client
  });
}, []);
```

**Conséquence** :
- Formulaires stockés en mémoire (React state)
- Pas de persistance Supabase
- Pas de real-time sync
- Formulaires perdus au refresh

---

#### Fichier: `src/components/admin/ProspectDetailsAdmin.jsx`

**Code actuel (ligne 201-217)** :
```javascript
if (action.type === 'show_form' && action.formId) {
  // ✅ Message chat créé
  const formMessage = {
    sender: 'pro',
    formId: action.formId,
    promptId: prompt.id,
    stepIndex: currentStepIndex,
  };
  addChatMessage(prospectId, projectType, formMessage);
  
  // ✅ AJOUT RÉCENT : Appel registerClientForm
  registerClientForm({
    prospectId: prospectId,
    projectType: projectType,
    formId: action.formId,
    currentStepIndex: currentStepIndex,
    promptId: prompt.id,
    messageTimestamp: Date.now(),
    status: 'pending'
  });
}
```

**Problème identifié** :
- ✅ `registerClientForm()` est bien appelé
- ❌ Mais écrit dans React state (pas Supabase)
- ❌ Client ne charge pas `clientFormPanels` de l'admin

---

#### Fichier: `src/components/client/ClientFormPanel.jsx`

**Code actuel (ligne 21-27)** :
```javascript
const relevantForms = useMemo(() => {
  if (!currentUser) return [];
  
  return clientFormPanels
    .filter(panel => panel.prospectId === currentUser.id)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}, [clientFormPanels, currentUser]);
```

**Problème** :
- Client filtre `clientFormPanels` par son `currentUser.id`
- Mais `clientFormPanels` vient du React state de l'admin
- **Client et Admin ont des états React séparés** ❌
- Pas de partage de données entre sessions

---

### 3. **Hook Supabase existant mais non utilisé**

#### Fichier: `src/hooks/useSupabaseClientFormPanels.js`

**Ce qui existe** :
```javascript
export function useSupabaseClientFormPanels(prospectId = null) {
  const [formPanels, setFormPanels] = useState([]);
  
  // ✅ Charge depuis Supabase
  useEffect(() => {
    const { data } = await supabase
      .from('client_form_panels')
      .select('*')
      .eq('prospect_id', prospectId);
    // ...
  }, [prospectId]);
  
  // ✅ Real-time subscription
  const channel = supabase
    .channel(`client-form-panels-${prospectId}`)
    .on('postgres_changes', { table: 'client_form_panels' }, ...)
    .subscribe();
  
  // ❌ MANQUE : Fonction pour CRÉER un formulaire
  // Fonctions disponibles : updateFormPanel, deleteFormPanel
  // Fonction manquante : createFormPanel / registerFormPanel
}
```

**Problèmes** :
1. Hook **PAS importé** dans `App.jsx`
2. **Pas de fonction `createFormPanel`** pour INSERT
3. Hook uniquement pour UPDATE/DELETE

---

## 🔧 Solutions possibles

### **Option A : Migration Supabase complète** (RECOMMANDÉ)

#### 1. Ajouter `createFormPanel` dans le hook
```javascript
// src/hooks/useSupabaseClientFormPanels.js
const createFormPanel = async (formPanelData) => {
  const { error } = await supabase
    .from('client_form_panels')
    .insert({
      panel_id: `panel-${formPanelData.prospectId}-${formPanelData.projectType}-${formPanelData.formId}-${Date.now()}`,
      prospect_id: formPanelData.prospectId,
      project_type: formPanelData.projectType,
      form_id: formPanelData.formId,
      message_timestamp: formPanelData.messageTimestamp,
      status: 'pending'
    });
  
  if (error) throw error;
};

return {
  formPanels,
  createFormPanel, // ← AJOUTER ICI
  updateFormPanel,
  deleteFormPanel
};
```

#### 2. Importer et utiliser dans `App.jsx`
```javascript
// Ligne 32 - AJOUTER :
import { useSupabaseClientFormPanels } from '@/hooks/useSupabaseClientFormPanels';

// Ligne 187 - REMPLACER :
// const [clientFormPanels, setClientFormPanels] = useState([]);

// PAR :
const { 
  formPanels: clientFormPanels, 
  createFormPanel: registerClientForm,
  updateFormPanel: updateClientFormPanel,
  deleteFormPanelsByProspect: clearClientFormsFor
} = useSupabaseClientFormPanels(currentUser?.id); // ← Charge pour l'utilisateur connecté
```

#### 3. Supprimer l'ancien `registerClientForm` (lignes 1009-1037)

#### 4. Vérifier table Supabase
```sql
-- Vérifier que la table existe
SELECT * FROM client_form_panels LIMIT 5;

-- Vérifier RLS policies
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'client_form_panels';

-- Vérifier Realtime
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'client_form_panels';
```

**Avantages** :
- ✅ Persistance Supabase
- ✅ Real-time sync Admin ↔ Client
- ✅ Formulaires conservés au refresh
- ✅ Architecture cohérente (comme notifications, chat, forms, prompts)

---

### **Option B : Quick fix React state** (TEMPORAIRE)

Garder React state mais partager via `localStorage` :

```javascript
// Dans registerClientForm (App.jsx)
const registerClientForm = useCallback((formPayload) => {
  setClientFormPanels(prev => {
    const updated = [...prev, normalized];
    
    // ⚠️ Partager via localStorage (hack temporaire)
    try {
      localStorage.setItem('clientFormPanels', JSON.stringify(updated));
    } catch (e) {
      console.error('localStorage error:', e);
    }
    
    return updated;
  });
}, []);
```

**Inconvénients** :
- ❌ Pas de real-time (client doit refresh)
- ❌ localStorage limité (5MB)
- ❌ Pas de sync multi-onglets
- ❌ Données perdues si localStorage vidé

---

## 🧪 Tests à effectuer après fix

### 1. Test complet Admin → Client
```
1. Admin (Jack) : Se connecter
2. Admin : Aller sur prospect "Georges"
3. Admin : Projet "ACC" → Compléter étape qui déclenche formulaire
4. Admin : Vérifier console F12 → Logs "registerClientForm"
5. Client (Georges) : Se connecter
6. Client : Aller sur projet "ACC"
7. Client : Vérifier panneau latéral "Formulaires à compléter"
8. ✅ Formulaire doit apparaître IMMÉDIATEMENT (si real-time)
9. Client : Remplir et soumettre formulaire
10. Admin : Doit recevoir notification + voir données
```

### 2. Test persistance
```
1. Client : Voir formulaire dans panneau
2. Client : Rafraîchir page F5
3. ✅ Formulaire doit toujours être là (si Supabase)
4. ❌ Formulaire disparu = React state non persisté
```

### 3. Test SQL Supabase
```sql
-- Après envoi admin :
SELECT * FROM client_form_panels 
WHERE prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
ORDER BY created_at DESC;

-- Doit retourner 1+ ligne avec form_id, status='pending'
```

---

## 📊 État actuel des migrations Supabase

| Table | Migré ? | Real-time ? | Utilisé par |
|-------|---------|-------------|-------------|
| `appointments` | ✅ Oui | ✅ Oui | Admin Agenda |
| `prospects` | ❌ Non (localStorage) | ❌ Non | Admin + Client |
| `chat_messages` | ✅ Oui | ✅ Oui | Admin + Client |
| `forms` | ✅ Oui | ✅ Oui | Admin (création) |
| `prompts` | ✅ Oui | ✅ Oui | Admin (Charly AI) |
| `notifications` | ✅ Oui | ✅ Oui | Admin |
| `client_notifications` | ✅ Oui | ✅ Oui | Client |
| **`client_form_panels`** | ❌ **Non (React state)** | ❌ **Non** | **Admin + Client** |
| `project_steps_status` | ✅ Oui | ✅ Oui | Admin + Client |

---

## 🎯 Recommandation finale

**Faire Option A (Migration Supabase)** car :
1. Hook existe déjà (`useSupabaseClientFormPanels.js`)
2. Architecture cohérente avec le reste (notifications, chat, forms, prompts)
3. Real-time essentiel pour UX (client voit formulaire instantanément)
4. Pas de perte de données au refresh
5. Même pattern que les autres tables déjà migrées

**Temps estimé** : 15 minutes
- 5 min : Ajouter `createFormPanel` dans hook
- 5 min : Intégrer hook dans `App.jsx`
- 5 min : Tester + vérifier Supabase

---

## 📝 Questions pour clarification

1. **La table `client_form_panels` existe-t-elle dans Supabase ?**
   - Si oui : Vérifier RLS policies + Realtime
   - Si non : Créer table avec script SQL fourni

2. **Les RLS policies sont-elles correctes ?**
   - Admins : ALL sur client_form_panels
   - Clients : SELECT uniquement leurs formulaires

3. **La table est-elle dans `supabase_realtime` publication ?**
   - Vérifier avec : `SELECT * FROM pg_publication_tables WHERE tablename = 'client_form_panels'`

4. **Y a-t-il des données existantes dans la table ?**
   - Si oui : Vérifier format (panel_id, prospect_id, etc.)
   - Si non : Normal, on va créer les premières entrées

---

## 🔗 Fichiers à modifier

1. `src/hooks/useSupabaseClientFormPanels.js` : Ajouter `createFormPanel`
2. `src/App.jsx` : Remplacer React state par hook Supabase
3. `src/components/admin/ProspectDetailsAdmin.jsx` : ✅ Déjà OK (appelle registerClientForm)
4. `src/components/client/ClientFormPanel.jsx` : ✅ Déjà OK (filtre clientFormPanels)

---

**Besoin d'aide sur** :
- Intégration du hook dans App.jsx
- Vérification/création table Supabase
- Tests après migration
