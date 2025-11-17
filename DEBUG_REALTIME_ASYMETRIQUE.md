# PROBLÈME: Real-time Supabase Notifications Asymétrique

## SYMPTÔMES
- ✅ **Admin → Client**: Real-time fonctionne parfaitement (notification instantanée)
- ❌ **Client → Admin**: Real-time NE fonctionne PAS (besoin de recharger la page)

## ARCHITECTURE

### Tables Supabase
1. **`notifications`** (pour les admins)
   - Colonnes: prospect_id, project_type, prospect_name, project_name, count, read, created_at
   - RLS policies: INSERT/UPDATE/SELECT pour authenticated users
   - Real-time: ✅ ACTIVÉ (vérifié avec pg_publication_tables)

2. **`client_notifications`** (pour les clients)
   - Colonnes: prospect_id, project_type, project_name, message, count, read, created_at
   - RLS policies: INSERT/UPDATE/SELECT pour authenticated users
   - Real-time: ✅ ACTIVÉ

### Code React - Hook Admin (❌ NE REÇOIT PAS les événements)

```javascript
// useSupabaseNotifications.js - Hook ADMIN
export function useSupabaseNotifications(userId) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!userId) return
    
    loadNotifications()

    const channel = supabase
      .channel(`notifications-${userId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
        // PAS de filter - RLS fait le filtrage automatiquement
      }, (payload) => {
        console.log('🔔 [ADMIN] Real-time event:', payload)
        // ❌ CE CALLBACK N'EST JAMAIS APPELÉ quand Client envoie message
      })
      .subscribe((status) => {
        console.log('📡 [ADMIN] Channel status:', status)
        // ✅ Affiche "SUBSCRIBED" correctement
      })

    return () => supabase.removeChannel(channel)
  }, [userId])

  // Appel du hook dans App.jsx:
  // useSupabaseNotifications(activeAdminUser?.user_id)
  // activeAdminUser.user_id = "82be903d-9600-4c53-9cd4-113bfaaac12e"
}
```

### Code React - Hook Client (✅ FONCTIONNE)

```javascript
// useSupabaseClientNotifications.js - Hook CLIENT
export function useSupabaseClientNotifications(prospectId) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!prospectId) return
    
    loadNotifications()

    const channel = supabase
      .channel(`client-notifications-${prospectId}-${Math.random()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_notifications',
        filter: `prospect_id=eq.${prospectId}` // ⚠️ DIFFÉRENCE: Avec filter explicite
      }, (payload) => {
        console.log('🔔 [CLIENT] Real-time event:', payload)
        // ✅ CE CALLBACK EST APPELÉ instantanément
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [prospectId])

  // Appel du hook dans App.jsx:
  // useSupabaseClientNotifications(currentUser?.id)
  // currentUser.id = "e84730fe-5500-4b9c-bf64-0fdd9c98c1fc"
}
```

### Création des Notifications (App.jsx)

**Scénario 1: Client envoie message → Notification Admin**
```javascript
// App.jsx ligne 920-950
if (message.sender === 'client') {
  // 1. Charger prospect depuis Supabase
  const { data: prospectData } = await supabase
    .from('prospects')
    .select('name, owner_id')
    .eq('id', prospectId)
    .single()
  
  // 2. Créer notification admin via hook
  await createOrUpdateNotification({
    prospectId,
    projectType,
    prospectName: prospectData.name,
    projectName: projectsData[projectType]?.title
  })
  
  // Résultat:
  // ✅ INSERT dans table 'notifications' réussit (visible dans Supabase Dashboard)
  // ✅ loadNotifications() charge bien la notification au refresh
  // ❌ Hook Admin NE REÇOIT PAS l'événement real-time
}
```

**Scénario 2: Admin envoie message → Notification Client**
```javascript
// App.jsx
if (message.sender === 'admin') {
  await createOrUpdateClientNotification({
    prospectId,
    projectType,
    projectName: projectsData[projectType]?.title,
    message: message.text
  })
  
  // Résultat:
  // ✅ INSERT dans 'client_notifications' réussit
  // ✅ Hook Client REÇOIT l'événement real-time INSTANTANÉMENT
  // ✅ Badge notification mis à jour sans refresh
}
```

## DONNÉES VÉRIFIÉES
- ✅ Real-time activé sur les 2 tables (vérifié avec `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`)
- ✅ RLS policies permettent INSERT/SELECT sur les 2 tables
- ✅ Hook Admin appelle `.subscribe()` et reçoit status `"SUBSCRIBED"`
- ✅ Les notifications sont bien insérées dans `notifications` (visible dans Supabase Table Editor)
- ✅ `loadNotifications()` du hook Admin charge bien les notifications existantes
- ✅ Hook Admin est appelé avec UUID valide: `"82be903d-9600-4c53-9cd4-113bfaaac12e"`
- ✅ Console logs montrent "🎧 Subscribing to Admin notifications channel:" avec le nom du channel
- ✅ Console logs montrent "📡 [ADMIN] Notification channel status: SUBSCRIBED"
- ❌ Console logs ne montrent JAMAIS "🔔 [ADMIN] Real-time notification event:"

## DIFFÉRENCES CLÉS

| Aspect | Hook CLIENT (✅) | Hook ADMIN (❌) |
|--------|-----------------|----------------|
| Filter postgres_changes | `prospect_id=eq.${prospectId}` | **Aucun filter** |
| Channel name suffix | `Math.random()` | `Date.now()` |
| Subscribe callback | Non | Oui (logs status) |
| Real-time events | ✅ Reçus | ❌ Non reçus |

## RLS POLICIES (vérifié dans Supabase)

### Table `notifications` (Admin)
```sql
-- admins_insert_notifications
CREATE POLICY "admins_insert_notifications" ON notifications
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM prospects 
    WHERE prospects.id = notifications.prospect_id
  )
);

-- admins_select_notifications
CREATE POLICY "admins_select_notifications" ON notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM prospects 
    WHERE prospects.id = notifications.prospect_id 
    AND prospects.owner_id = auth.uid()
  )
);
```

### Table `client_notifications` (Client)
```sql
-- clients_select_own_notifications
CREATE POLICY "clients_select_own_notifications" ON client_notifications
FOR SELECT USING (
  prospect_id IN (
    SELECT id FROM prospects WHERE user_id = auth.uid()
  )
);
```

## HYPOTHÈSES

### 1. RLS Policy trop complexe pour Real-time
Le real-time Supabase ne supporte peut-être pas les policies avec `EXISTS` et sous-requêtes. La policy Client utilise `IN (SELECT)` qui pourrait être mieux supportée.

### 2. Filter obligatoire sans RLS simple
Le hook Client a un `filter: "prospect_id=eq.${prospectId}"` explicite. Sans filter, Supabase real-time pourrait ne pas savoir quelles lignes envoyer, même avec RLS.

### 3. Real-time ne respecte pas automatiquement RLS
Documentation Supabase dit que real-time respecte RLS, mais peut-être que dans notre cas, la policy SELECT avec JOIN n'est pas évaluée correctement par le système real-time.

### 4. Bug de channel persistence
Chaque changement de `userId` crée un nouveau channel. Peut-être que les anciens channels ne sont pas correctement détruits et bloquent les nouveaux.

## TESTS EFFECTUÉS
1. ✅ Vérifié real-time activé: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`
2. ✅ Ajouté logs exhaustifs dans hook Admin
3. ✅ Vérifié que `.subscribe()` retourne "SUBSCRIBED"
4. ✅ Testé INSERT manuel dans Supabase Dashboard → Hook Admin ne reçoit rien
5. ✅ Comparé avec hook Client qui fonctionne parfaitement
6. ❌ Ajout d'un filter explicite dans hook Admin (pas encore testé)

## QUESTION CLEF
**Pourquoi le real-time fonctionne avec `client_notifications` (filter explicite) mais pas avec `notifications` (RLS uniquement), alors que:**
- Les deux tables ont real-time activé
- Les deux hooks utilisent la même syntaxe `.channel().on().subscribe()`
- Les deux tables ont des RLS policies similaires
- L'INSERT réussit dans les deux cas

**Est-ce que le real-time Supabase requiert un filter explicite et ne peut pas se baser uniquement sur RLS?**

## SOLUTION POTENTIELLE À TESTER
Ajouter un filter explicite dans le hook Admin, même si RLS devrait suffire:

```javascript
const channel = supabase
  .channel(`notifications-${userId}-${Date.now()}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notifications',
    filter: `prospect_id=in.(SELECT id FROM prospects WHERE owner_id='${userId}')` // ⚠️ À tester
  }, (payload) => {
    // ...
  })
```

Ou simplifier avec un filter basique et laisser React filtrer côté client:
```javascript
filter: `created_at=gte.${new Date().toISOString()}` // Écouter seulement nouvelles notifs
```
