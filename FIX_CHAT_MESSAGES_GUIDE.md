# 🔧 Fix Chat Messages RLS - Guide d'Exécution

## ❌ Problème Actuel

```
[Error] Failed to load resource: the server responded with a status of 403 () (chat_messages, line 0)
[Error] ❌ Error adding chat message
```

**Cause :** Les RLS policies sur la table `chat_messages` sont trop restrictives. La policy actuelle `"Admins can manage chat"` ne permet aux admins d'envoyer des messages **QUE pour les prospects dont ils sont propriétaires** (`owner_id = auth.uid()`).

**Problème :** Un admin devrait pouvoir envoyer un message à **n'importe quel prospect**, pas seulement ceux qu'il possède.

---

## ✅ Solution

Remplacer la policy restrictive par 3 policies séparées :
1. **SELECT** : Admins peuvent voir tous les messages
2. **INSERT** : Admins peuvent envoyer des messages à tous les prospects
3. **UPDATE** : Admins peuvent marquer les messages comme lus

---

## 🚀 Étapes d'Exécution

### 1. Ouvrir Supabase Dashboard

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet **LOCASUN**
3. Cliquer sur **"SQL Editor"** dans le menu de gauche

### 2. Copier-Coller le Script SQL

Copier tout le contenu du fichier **`fix_chat_messages_rls.sql`** et le coller dans l'éditeur SQL.

### 3. Exécuter le Script

1. Cliquer sur le bouton **"Run"** (ou Cmd/Ctrl + Enter)
2. Attendre la confirmation : ✅ **"Success. No rows returned"**

### 4. Vérifier les Policies

Le script affiche automatiquement toutes les policies. Vous devriez voir :

```
policyname                           | cmd    | roles
-------------------------------------|--------|-------
Admins can view all chat messages    | SELECT | public
Admins can send chat messages        | INSERT | public
Admins can update chat messages      | UPDATE | public
Clients can view their own chat      | SELECT | public
Clients can send messages            | INSERT | public
```

### 5. Tester dans l'Application

1. Rafraîchir la page de l'application (F5)
2. Ouvrir un prospect en tant qu'admin
3. Envoyer un message dans le chat
4. ✅ **Vérifier** : Le message est bien envoyé sans erreur 403

---

## 🧪 Tests à Effectuer

### Test 1 : Admin envoie un message

```bash
# Terminal
npm run dev

# Navigateur
1. Login admin
2. Ouvrir un prospect (n'importe lequel, même pas le vôtre)
3. Envoyer un message dans le chat
4. ✅ Vérifier : Pas d'erreur 403
5. ✅ Vérifier : Message apparaît dans le chat
```

### Test 2 : Client envoie un message

```bash
# Navigateur (onglet privé)
1. Login client
2. Ouvrir le dashboard
3. Envoyer un message dans le chat d'un projet
4. ✅ Vérifier : Pas d'erreur 403
5. ✅ Vérifier : Message apparaît dans le chat
```

### Test 3 : Sync temps réel

```bash
# 2 navigateurs (ou onglets)
# Navigateur A : Admin
# Navigateur B : Client (même prospect)

1. Navigateur A (admin) : Envoyer un message
2. ✅ Vérifier : Message apparaît instantanément dans Navigateur B (client)

3. Navigateur B (client) : Répondre
4. ✅ Vérifier : Réponse apparaît instantanément dans Navigateur A (admin)
```

### Test 4 : RLS Sécurité

```bash
# Vérifier que les clients ne voient QUE leurs messages

1. Login Client A (prospect A)
2. ✅ Vérifier : Ne voit QUE les messages de ses projets

3. Login Client B (prospect B)
4. ✅ Vérifier : Ne voit PAS les messages du prospect A
```

---

## 🔍 Debugging

### Vérifier les policies dans Supabase

```sql
-- Lister toutes les policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'chat_messages';
```

### Tester manuellement dans SQL Editor

```sql
-- Test 1 : Insérer un message en tant qu'admin
INSERT INTO public.chat_messages (
  prospect_id,
  project_type,
  sender,
  text
) VALUES (
  'uuid-d-un-prospect',
  'ACC',
  'admin',
  'Test message from SQL'
);
-- ✅ Devrait réussir si vous êtes admin

-- Test 2 : Lire les messages
SELECT * FROM public.chat_messages
WHERE prospect_id = 'uuid-d-un-prospect'
ORDER BY created_at DESC
LIMIT 10;
-- ✅ Devrait afficher les messages si vous êtes admin ou propriétaire
```

---

## 📊 Avant / Après

### ❌ Avant (Policy Restrictive)

```sql
-- ANCIEN : Trop restrictif
CREATE POLICY "Admins can manage chat"
  ON public.chat_messages
  FOR ALL
  USING (
    prospect_id IN (
      SELECT id FROM public.prospects WHERE owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );
```

**Problème :** `owner_id = auth.uid()` → Seul le propriétaire du prospect peut envoyer des messages.

### ✅ Après (Policies Séparées)

```sql
-- NOUVEAU : Tous les admins peuvent envoyer des messages
CREATE POLICY "Admins can send chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() 
      AND role IN ('Global Admin', 'Manager', 'Commercial')
    ) AND
    sender IN ('admin', 'pro')
  );
```

**Avantage :** N'importe quel admin peut envoyer un message à n'importe quel prospect.

---

## 🎯 Résultat Attendu

Après avoir exécuté le script :

```
✅ Admins peuvent voir TOUS les messages
✅ Admins peuvent envoyer des messages à TOUS les prospects
✅ Admins peuvent marquer les messages comme lus
✅ Clients voient UNIQUEMENT leurs propres messages
✅ Clients peuvent envoyer des messages dans leurs projets
✅ RLS Security maintenue (clients isolés)
✅ Erreur 403 résolue
```

---

## 📝 Checklist

- [ ] Script SQL exécuté dans Supabase Dashboard
- [ ] 5 policies visibles dans pg_policies
- [ ] Application rafraîchie (F5)
- [ ] Test admin : Envoi message OK
- [ ] Test client : Envoi message OK
- [ ] Test sync temps réel : OK
- [ ] Console : Pas d'erreur 403
- [ ] Console : ✅ Message sent

---

## 🆘 Si Ça Ne Marche Toujours Pas

### Vérifier l'authentification

```javascript
// Dans useSupabaseChatMessages.js, ajouter temporairement :
console.log('🔐 Auth user:', (await supabase.auth.getUser()).data.user);
console.log('🔐 User role:', await supabase
  .from('users')
  .select('role')
  .eq('user_id', (await supabase.auth.getUser()).data.user.id)
  .single()
);
```

### Vérifier la table users

```sql
-- Vérifier que votre utilisateur existe dans la table users
SELECT * FROM public.users WHERE user_id = auth.uid();
-- ✅ Doit retourner 1 ligne avec votre rôle
```

### Réactiver RLS manuellement

```sql
-- Si RLS est désactivé par erreur
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
```

---

## 📞 Support

Si le problème persiste après avoir exécuté le script :

1. Vérifier que vous êtes bien connecté en tant qu'admin (pas client)
2. Vérifier que votre `user_id` existe dans la table `users`
3. Vérifier que votre `role` est bien 'Global Admin', 'Manager' ou 'Commercial'
4. Copier-coller les logs d'erreur complets

---

**Auteur :** GitHub Copilot  
**Date :** 15 novembre 2025  
**Status :** 🔧 **FIX READY**
