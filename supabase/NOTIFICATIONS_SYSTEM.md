# 🔔 Système de Notifications - Architecture Supabase Realtime

## 📋 Vue d'ensemble

Le système de notifications fonctionne **bidirectionnel** :
- 🔴 **Client → Commercial** : Quand un client envoie un message, le commercial reçoit une notification
- 🔵 **Commercial → Client** : Quand un commercial répond, le client reçoit une notification

**Fonctionnalité clé :** Les notifications sont **groupées par projet** avec un compteur qui s'incrémente.

---

## 🗄️ Structure des tables

### Table `notifications` (Pour les commerciaux/admins)

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT,
  prospect_name TEXT,  -- Nom du client (dénormalisé pour perf)
  project_name TEXT,   -- Nom du projet (dénormalisé)
  count INTEGER DEFAULT 1,  -- Nombre de messages non lus
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrainte unique recommandée :**
```sql
-- Empêcher les doublons pour (prospect_id, project_type, read=false)
CREATE UNIQUE INDEX unique_unread_notification 
ON public.notifications (prospect_id, project_type) 
WHERE read = FALSE;
```

---

### Table `client_notifications` (Pour les clients)

```sql
CREATE TABLE public.client_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  project_name TEXT,
  message TEXT,  -- Aperçu du dernier message (50 premiers caractères)
  count INTEGER DEFAULT 1,  -- Nombre de messages non lus
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Contrainte unique recommandée :**
```sql
-- Empêcher les doublons pour (prospect_id, project_type, read=false)
CREATE UNIQUE INDEX unique_unread_client_notification 
ON public.client_notifications (prospect_id, project_type) 
WHERE read = FALSE;
```

---

## 🔄 Workflow de création de notification

### Scénario 1 : Client envoie un message

```javascript
// Dans addChatMessage() - sender = 'client'
const prospect = prospects.find(p => p.id === prospectId);

// 1. Vérifier si notification existe déjà
const { data: existingNotif } = await supabase
  .from('notifications')
  .select('*')
  .eq('prospect_id', prospectId)
  .eq('project_type', projectType)
  .eq('read', false)
  .single();

if (existingNotif) {
  // 2a. Notification existe : INCRÉMENTER le compteur
  await supabase
    .from('notifications')
    .update({ 
      count: existingNotif.count + 1,
      created_at: new Date().toISOString()  // Remonter en haut de la liste
    })
    .eq('id', existingNotif.id);
} else {
  // 2b. Créer une nouvelle notification
  await supabase
    .from('notifications')
    .insert({
      prospect_id: prospectId,
      project_type: projectType,
      prospect_name: prospect.name,
      project_name: projectsData[projectType]?.title || projectType,
      count: 1,
      read: false
    });
}
```

---

### Scénario 2 : Commercial répond au client

```javascript
// Dans addChatMessage() - sender = 'pro' ou 'admin'

// 1. Vérifier si notification existe déjà
const { data: existingNotif } = await supabase
  .from('client_notifications')
  .select('*')
  .eq('prospect_id', prospectId)
  .eq('project_type', projectType)
  .eq('read', false)
  .single();

if (existingNotif) {
  // 2a. Notification existe : INCRÉMENTER + mettre à jour message
  await supabase
    .from('client_notifications')
    .update({ 
      count: existingNotif.count + 1,
      message: message.text?.substring(0, 50) || 'Nouveau message',
      created_at: new Date().toISOString()
    })
    .eq('id', existingNotif.id);
} else {
  // 2b. Créer une nouvelle notification
  await supabase
    .from('client_notifications')
    .insert({
      prospect_id: prospectId,
      project_type: projectType,
      project_name: projectsData[projectType]?.title || projectType,
      message: message.text?.substring(0, 50) || 'Nouveau message',
      count: 1,
      read: false
    });
}
```

---

## ⚡ Supabase Realtime - Souscriptions

### Pour les commerciaux (espace admin)

```javascript
// Écouter les nouvelles notifications en temps réel
const notificationSubscription = supabase
  .channel('admin-notifications')
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'notifications',
      // Filtrer par owner_id si commercial non-admin
      filter: `prospect_id=in.(${allowedProspectIds.join(',')})`
    },
    (payload) => {
      console.log('Nouvelle notification :', payload);
      
      if (payload.eventType === 'INSERT') {
        // Ajouter la notification à la liste
        setNotifications(prev => [payload.new, ...prev]);
        
        // Jouer un son
        playNotificationSound();
      }
      
      if (payload.eventType === 'UPDATE') {
        // Mettre à jour le compteur
        setNotifications(prev => 
          prev.map(n => n.id === payload.new.id ? payload.new : n)
        );
      }
    }
  )
  .subscribe();

// Nettoyer la souscription au démontage
return () => {
  supabase.removeChannel(notificationSubscription);
};
```

---

### Pour les clients (espace client)

```javascript
// Écouter les notifications pour ce client
const clientNotificationSubscription = supabase
  .channel('client-notifications')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'client_notifications',
      filter: `prospect_id=eq.${currentUser.id}`  // Uniquement ses notifs
    },
    (payload) => {
      console.log('Nouveau message du commercial :', payload);
      
      if (payload.eventType === 'INSERT') {
        setClientNotifications(prev => [payload.new, ...prev]);
        playNotificationSound();
      }
      
      if (payload.eventType === 'UPDATE') {
        setClientNotifications(prev =>
          prev.map(n => n.id === payload.new.id ? payload.new : n)
        );
      }
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(clientNotificationSubscription);
};
```

---

## 🎨 Affichage dans l'UI

### Badge de compteur (Header)

```javascript
// Compter les notifications non lues
const unreadCount = notifications.filter(n => !n.read).reduce((acc, n) => acc + n.count, 0);

// Afficher le badge
<div className="relative">
  <Bell className="h-6 w-6" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</div>
```

---

### Liste des notifications (Dropdown)

```javascript
<DropdownMenu>
  <DropdownMenuTrigger>
    <Bell />
    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
  </DropdownMenuTrigger>
  
  <DropdownMenuContent className="w-80">
    {notifications.filter(n => !n.read).map(notif => (
      <DropdownMenuItem
        key={notif.id}
        onClick={() => {
          // Marquer comme lu
          markNotificationAsRead(notif.id);
          
          // Naviguer vers la fiche client
          navigate(`/admin/contacts?prospect=${notif.prospect_id}&project=${notif.project_type}`);
        }}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="bg-blue-100 rounded-full p-2">
            <MessageCircle className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{notif.prospect_name}</p>
            <p className="text-sm text-gray-500">{notif.project_name}</p>
          </div>
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
            {notif.count}
          </span>
        </div>
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 🔐 Politiques RLS

### Notifications (commerciaux)

```sql
-- Commerciaux voient uniquement les notifications de leurs prospects
CREATE POLICY "Users can view their prospects notifications"
  ON public.notifications
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects 
      WHERE owner_id = auth.uid() 
         OR user_id = auth.uid()  -- Ou si c'est leur propre compte client
         OR owner_id IN (
           SELECT jsonb_array_elements_text(access_rights->'users')::UUID
           FROM public.users
           WHERE user_id = auth.uid()
         )
    )
  );

-- Commerciaux peuvent marquer leurs notifications comme lues
CREATE POLICY "Users can update their prospects notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    )
  );

-- Les notifications sont créées automatiquement par le système (pas de INSERT manuel)
```

---

### Client_notifications (clients)

```sql
-- Clients voient uniquement leurs propres notifications
CREATE POLICY "Clients can view their own notifications"
  ON public.client_notifications
  FOR SELECT
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- Clients peuvent marquer leurs notifications comme lues
CREATE POLICY "Clients can update their own notifications"
  ON public.client_notifications
  FOR UPDATE
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );
```

---

## 📊 Requêtes utiles

### Récupérer les notifications non lues avec détails

```sql
-- Pour les commerciaux
SELECT 
  n.id,
  n.prospect_name,
  n.project_name,
  n.count,
  n.created_at,
  p.email AS prospect_email,
  p.phone AS prospect_phone
FROM notifications n
JOIN prospects p ON n.prospect_id = p.id
WHERE n.read = FALSE
  AND p.owner_id = auth.uid()
ORDER BY n.created_at DESC;
```

---

### Statistiques de notifications

```sql
-- Nombre total de messages non lus par commercial
SELECT 
  u.name AS commercial_name,
  COUNT(DISTINCT n.id) AS nb_notifications,
  SUM(n.count) AS total_messages_non_lus
FROM users u
LEFT JOIN prospects p ON p.owner_id = u.id
LEFT JOIN notifications n ON n.prospect_id = p.id AND n.read = FALSE
GROUP BY u.id, u.name
ORDER BY total_messages_non_lus DESC;
```

---

## ✅ Checklist d'implémentation

### Backend (Supabase)
- [x] Table `notifications` créée
- [x] Table `client_notifications` créée
- [ ] Ajouter contraintes UNIQUE pour éviter doublons
- [ ] Créer trigger pour auto-delete notifications après X jours
- [ ] Politiques RLS configurées
- [ ] Index de performance créés

### Frontend
- [ ] Hook `useNotifications()` pour l'espace admin
- [ ] Hook `useClientNotifications()` pour l'espace client
- [ ] Composant `NotificationBell` avec badge
- [ ] Souscription Realtime dans `AdminLayout`
- [ ] Souscription Realtime dans `ClientLayout`
- [ ] Son de notification (optionnel)
- [ ] Fonction `markNotificationAsRead()`
- [ ] Navigation vers fiche client au clic

### Tests
- [ ] Tester notification client → commercial
- [ ] Tester notification commercial → client
- [ ] Tester incrémentation du compteur
- [ ] Tester marquage comme lu
- [ ] Tester Realtime multi-onglets
- [ ] Tester permissions RLS

---

## 🎯 Résumé

| Qui envoie | Qui reçoit | Table | Compteur | Temps réel |
|------------|------------|-------|----------|------------|
| **Client** | Commercial | `notifications` | ✅ count += 1 | ✅ Realtime |
| **Commercial** | Client | `client_notifications` | ✅ count += 1 | ✅ Realtime |

**Clé du système :** Les notifications sont **groupées** par `(prospect_id, project_type)` avec un compteur incrémental, évitant ainsi de spammer la liste avec des dizaines de notifications pour le même projet.

