# 🔴 BUG CRITIQUE : Messages de signature bloqués (Erreur 400)

## 📋 Contexte
Lors de l'exécution de l'action workflow `launch_signature`, le système tente d'insérer un message dans le chat contenant le lien de signature électronique. Ce message **échoue avec une erreur 400**.

**Erreur console :**
```
vvzxvtiyybilkswslqfn.supabase.co/rest/v1/chat_messages:1  Failed to load resource: the server responded with a status of 400 ()
[17:57:33,535] ERROR Erreur envoi message chat signature Object
```

---

## 🔍 Analyse du problème

### 1. Code d'insertion du message (useWorkflowExecutor.js, ligne 267-276)
```javascript
const { error: chatError } = await supabase
  .from('chat_messages')
  .insert({
    prospect_id: prospectId,
    project_type: projectType,
    sender: 'pro',  // ✅ Valide (CHECK constraint accepte 'client', 'admin', 'pro')
    text: `<a href="${signatureUrl}" target="_blank" style="color: #10b981; font-weight: 600; text-decoration: underline;">👉 Signer mon contrat</a>`,
  });
```

**Données insérées :**
- ✅ `prospect_id` : UUID valide
- ✅ `project_type` : 'ACC', 'Centrale', etc.
- ✅ `sender` : 'pro' (valeur autorisée par CHECK constraint)
- ✅ `text` : Lien HTML de signature

---

### 2. Politiques RLS actuelles sur `chat_messages`

#### ✅ Politique SELECT pour admins/pros
```sql
CREATE POLICY "Users can view their prospects chat"
  ON public.chat_messages
  FOR ALL  -- ⚠️ SELECT, UPDATE, DELETE uniquement (pas INSERT!)
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );
```

#### ✅ Politique INSERT pour clients (fonctionne)
```sql
CREATE POLICY "Clients can send messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    ) AND
    sender = 'client'  -- ⚠️ Force sender = 'client'
  );
```

#### ❌ Politique INSERT pour admins/pros → **MANQUANTE !**
**Il n'existe AUCUNE politique INSERT permettant aux admins/pros d'insérer des messages.**

---

## 🎯 Cause racine
Quand `FOR ALL` est utilisé dans une politique RLS, il couvre **SELECT, UPDATE, DELETE** mais **PAS INSERT**.

PostgreSQL exige une politique **explicite `FOR INSERT`** pour autoriser les insertions.

**Résultat :**
1. ❌ Admin connecté (`auth.uid()` = UUID admin)
2. ❌ Tentative d'INSERT dans `chat_messages` avec `sender: 'pro'`
3. ❌ PostgreSQL vérifie les politiques INSERT → trouve uniquement la politique client (qui force `sender = 'client'`)
4. ❌ **Rejet de l'insertion → 400 Bad Request**

---

## ✅ Solution : Ajouter une politique INSERT pour admins/pros

### SQL à exécuter dans Supabase Dashboard (SQL Editor)
```sql
CREATE POLICY "Users can send messages to their prospects"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid()) AND
    sender IN ('admin', 'pro')
  );
```

### Explication de la politique
- **Condition 1** : `prospect_id IN (SELECT id FROM prospects WHERE owner_id = auth.uid())`
  - L'admin/pro ne peut envoyer un message que sur **ses propres prospects** (dont il est `owner_id`)
  
- **Condition 2** : `EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid())`
  - Vérifie que l'utilisateur existe dans la table `users` (= c'est un admin/pro, pas un client)
  
- **Condition 3** : `sender IN ('admin', 'pro')`
  - Autorise uniquement `sender: 'admin'` ou `sender: 'pro'` (pas 'client')

---

## 📊 Impact après correction

### Avant (situation actuelle)
- ❌ Admin clique sur robot pour envoyer message de signature
- ❌ Erreur 400 sur insertion
- ❌ Message jamais créé en base
- ❌ Client ne voit rien dans le chat

### Après (avec la politique)
- ✅ Admin clique sur robot pour envoyer message de signature
- ✅ Message inséré avec succès (sender: 'pro')
- ✅ Message stocké en base de données
- ✅ Client voit le message avec le lien cliquable dans son chat
- ✅ Client peut cliquer sur "👉 Signer mon contrat"
- ✅ Redirection vers `/signature/{id}?token={access_token}`

---

## 🔐 Sécurité
La politique garantit que :
- ✅ Seuls les admins/pros peuvent envoyer des messages avec `sender: 'admin'` ou `'pro'`
- ✅ Ils ne peuvent envoyer qu'aux prospects dont ils sont propriétaires (`owner_id`)
- ✅ Les clients continuent d'envoyer uniquement avec `sender: 'client'` (politique séparée)
- ✅ Pas de conflit entre les deux politiques INSERT (conditions mutuellement exclusives)

---

## 📝 Fichiers concernés
1. **src/hooks/useWorkflowExecutor.js** (ligne 267-276) : Code d'insertion du message
2. **supabase/schema.sql** (ligne 1181-1212) : Politiques RLS actuelles
3. **add_admin_chat_insert_policy.sql** : Fichier SQL de correction créé

---

## ✅ Prochaines étapes
1. Ouvrir Supabase Dashboard : https://supabase.com/dashboard/project/vvzxvtiyybilkswslqfn/editor
2. Aller dans SQL Editor
3. Copier-coller le SQL de la section "Solution"
4. Cliquer sur "Run"
5. Tester le workflow de signature
6. Commit le fichier `add_admin_chat_insert_policy.sql` pour traçabilité
