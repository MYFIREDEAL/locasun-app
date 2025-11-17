# Migration Chat Messages vers Supabase

## Vue d'ensemble
Migration du système de chat de **localStorage** vers **Supabase** avec synchronisation en temps réel bidirectionnelle admin ↔ client.

## Problème résolu
### Avant (localStorage)
- ❌ Messages stockés localement dans chaque navigateur (isolation)
- ❌ Admin et client ne pouvaient **pas** communiquer réellement
- ❌ Aucune synchronisation entre les sessions
- ❌ Perte de messages lors du changement de navigateur

### Après (Supabase)
- ✅ Messages centralisés dans PostgreSQL
- ✅ Communication bidirectionnelle en temps réel
- ✅ Synchronisation automatique sur tous les appareils
- ✅ Historique persistant et sécurisé
- ✅ RLS policies pour sécurité multi-tenant

## Architecture

### Table Supabase: `chat_messages`
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin', 'pro')),
  text TEXT,
  file JSONB,
  form_id TEXT,
  completed_form_id TEXT,
  prompt_id TEXT,
  step_index INTEGER,
  related_message_timestamp TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Hook: `useSupabaseChatMessages.js`
```javascript
const { messages, loading, error, sendMessage, markAsRead } = 
  useSupabaseChatMessages(prospectId, projectType);
```

**Fonctionnalités:**
- ✅ Chargement automatique des messages filtrés par `prospect_id` + `project_type`
- ✅ Subscription real-time avec gestion des événements INSERT/UPDATE/DELETE
- ✅ Déduplication intelligente (prompts, formulaires complétés)
- ✅ Transformation snake_case ↔ camelCase
- ✅ Channel unique pour éviter conflits Vite HMR

## Intégrations

### 1. App.jsx
**Avant:**
```javascript
const [chatMessages, setChatMessages] = useState({});
const storedChatMessages = localStorage.getItem('evatime_chat_messages');
setChatMessages(storedChatMessages ? JSON.parse(storedChatMessages) : {});
```

**Après:**
```javascript
// State et localStorage supprimés
// addChatMessage() modifié pour insérer directement dans Supabase
const addChatMessage = async (prospectId, projectType, message) => {
  const { data, error } = await supabaseClient
    .from('chat_messages')
    .insert([dbPayload])
    .select()
    .single();
  // Real-time synchronise automatiquement tous les clients
};
```

### 2. ProspectDetailsAdmin.jsx (Admin)
**Avant:**
```javascript
const messages = getChatMessages(prospectId, projectType);
```

**Après:**
```javascript
const { messages, loading } = useSupabaseChatMessages(prospectId, projectType);
```

### 3. ProjectDetails.jsx (Client)
**Avant:**
```javascript
const messages = currentUser ? getChatMessages(currentUser.id, project.type) : [];
```

**Après:**
```javascript
const { messages, loading } = useSupabaseChatMessages(currentUser?.id, project.type);
```

## Sécurité (RLS Policies)

### Admins
```sql
-- Lecture: Admins voient les messages de leurs prospects
CREATE POLICY "Users can view their prospects chat"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM prospects
    WHERE prospects.id = chat_messages.prospect_id
    AND prospects.owner_id = auth.uid()
  )
);
```

### Clients
```sql
-- Lecture: Clients voient leurs propres messages
CREATE POLICY "Clients can view their own chat"
ON chat_messages FOR SELECT
USING (auth.uid() = prospect_id);

-- Écriture: Clients peuvent envoyer des messages
CREATE POLICY "Clients can send messages"
ON chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = prospect_id 
  AND sender = 'client'
);
```

## Real-Time Configuration

### Activation
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

### Subscription Pattern
```javascript
const channel = supabase
  .channel(`chat-${prospectId}-${projectType}-${Math.random().toString(36).slice(2)}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'chat_messages',
    filter: `prospect_id=eq.${prospectId}`
  }, (payload) => {
    // Filtrer par project_type côté client
    if (payload.new.project_type !== projectType) return;
    
    if (payload.eventType === 'INSERT') {
      setMessages(prev => [...prev, transformFromDB(payload.new)]);
    }
  })
  .subscribe();
```

**Note:** Channel name avec `Math.random()` pour éviter conflits Vite HMR.

## Migration des données

### Script: `migrate_chat_to_supabase.js`
1. Backup automatique dans localStorage (`evatime_chat_messages_backup_${timestamp}`)
2. Transformation des messages au format Supabase
3. Insertion par lots de 100 (limite Supabase)
4. Rapport détaillé (migrés, erreurs, backup key)

### Exécution
```javascript
// Dans la console navigateur (F12) sur page admin
import { migrateChatMessagesToSupabase } from './migrate_chat_to_supabase.js';
await migrateChatMessagesToSupabase();
```

### Après migration
```javascript
// Vérifier que les messages s'affichent correctement
// Puis supprimer l'ancien localStorage:
localStorage.removeItem('evatime_chat_messages');
```

## Déduplication

### Formulaires complétés
```javascript
// Vérifier que le client n'a pas déjà soumis ce formulaire
const { data } = await supabase
  .from('chat_messages')
  .select('id')
  .eq('completed_form_id', message.completedFormId)
  .eq('related_message_timestamp', message.relatedMessageTimestamp);
```

### Prompts (actions Charly AI)
```javascript
// Vérifier que le prompt n'a pas déjà été envoyé pour cette étape
const { data } = await supabase
  .from('chat_messages')
  .select('id')
  .eq('prompt_id', message.promptId)
  .eq('step_index', message.stepIndex)
  .eq('text', message.text);
```

## Connexions avec autres systèmes

### 1. Formulaires dynamiques
- Admin envoie formulaire via chat (`form_id`)
- Client remplit et soumet (`completed_form_id` + `related_message_timestamp`)
- Admin reçoit notification en temps réel

### 2. Prompts Charly AI
- Prompt déclenche actions automatiques (`prompt_id`)
- Actions peuvent envoyer messages/formulaires
- Lien avec étape projet via `step_index`
- Auto-complétion étape si configurée

### 3. Fichiers (RIB ACC)
- Client envoie fichier via chat (`file` JSONB)
- Stocké dans `project_infos` pour projet ACC
- Admin reçoit notification

### 4. Notifications
- Compteur groupé par `prospect_id` + `project_type`
- Badge en temps réel dans navigation
- Marquage lu via `markAsRead(messageIds)`

## Tests de validation

### Scénario 1: Admin → Client
1. Admin ouvre fiche prospect, projet ACC
2. Admin envoie message "Bonjour"
3. Client se connecte, ouvre Dashboard → Projet ACC
4. ✅ Message apparaît instantanément

### Scénario 2: Client → Admin
1. Client envoie message "Question sur ACC"
2. Admin voit notification badge (+1)
3. Admin ouvre fiche prospect
4. ✅ Message visible immédiatement

### Scénario 3: Formulaire
1. Admin envoie formulaire via Charly AI prompt
2. Client voit formulaire dans chat
3. Client remplit et soumet
4. ✅ Admin voit soumission en temps réel
5. ✅ Étape auto-complétée si configuré

### Scénario 4: Multi-device
1. Admin ouvre fiche sur PC
2. Admin ouvre même fiche sur mobile
3. Client envoie message
4. ✅ Message apparaît sur PC et mobile simultanément

## Performance

### Chargement initial
- Limite: 1000 messages par défaut (pas de pagination implémentée)
- Tri: `created_at ASC` (chronologique)
- Index: `(prospect_id, project_type, created_at)`

### Real-time
- 1 channel par conversation (prospect + projet)
- Filtrage serveur: `prospect_id`
- Filtrage client: `project_type` (Supabase filter ne supporte qu'un critère)
- Cleanup automatique au démontage du composant

## Limitations connues

1. **Pagination absente**: Tous les messages chargés d'un coup
   - Solution future: Lazy loading avec `offset` + `limit`

2. **Upload fichiers**: Pas de Supabase Storage
   - Actuel: Métadonnées seulement dans `file` JSONB
   - Solution future: Intégrer Supabase Storage + signed URLs

3. **Indicateur "en train d'écrire"**: Non implémenté
   - Solution future: Utiliser Supabase Presence

4. **Marquage lu automatique**: Manuel via `markAsRead()`
   - Solution future: Auto-marquer à l'ouverture du chat

## Rollback

Si problème après migration:

```javascript
// 1. Restaurer depuis backup
const backupKey = 'evatime_chat_messages_backup_TIMESTAMP';
const backup = localStorage.getItem(backupKey);
localStorage.setItem('evatime_chat_messages', backup);

// 2. Revenir au commit précédent
git log --oneline | head -5  // Trouver le commit avant migration
git revert COMMIT_HASH

// 3. Désactiver real-time temporairement
ALTER PUBLICATION supabase_realtime DROP TABLE chat_messages;
```

## Prochaines étapes (TODO)

- [ ] Migrer `notifications` vers Supabase (evatime_notifications)
- [ ] Migrer `clientNotifications` vers Supabase (evatime_client_notifications)
- [ ] Migrer `projectInfos` vers Supabase (evatime_project_infos)
- [ ] Implémenter pagination messages (lazy loading)
- [ ] Ajouter Supabase Storage pour fichiers
- [ ] Indicateur "en train d'écrire" avec Presence
- [ ] Auto-marquage messages lus à l'ouverture

## Fichiers modifiés

✅ `src/hooks/useSupabaseChatMessages.js` (NEW)
✅ `src/App.jsx` (addChatMessage migré)
✅ `src/components/admin/ProspectDetailsAdmin.jsx` (hook intégré)
✅ `src/components/ProjectDetails.jsx` (hook intégré)
✅ `enable_realtime_chat_messages.sql` (NEW)
✅ `migrate_chat_to_supabase.js` (NEW)

## Support

Pour toute question ou problème:
1. Vérifier les logs console (`🔥`, `✅`, `❌`)
2. Vérifier RLS policies dans Supabase Dashboard
3. Vérifier real-time activé: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`
4. Consulter `supabase/schema.sql` pour structure complète
