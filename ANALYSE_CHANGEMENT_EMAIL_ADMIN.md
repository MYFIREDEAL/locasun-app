# 🔍 Analyse : Changement d'email pour un utilisateur Admin (ex: Elodie Vinet)

## 📋 Contexte
Elodie Vinet (Commercial) veut changer son email depuis `/admin/profil` > Informations personnelles.

## 🔄 Flux actuel

### 1️⃣ Interface utilisateur
**Fichier** : `src/pages/admin/ProfilePage.jsx`
```jsx
// Ligne 2254
<Input 
  id="email" 
  name="email" 
  type="email" 
  value={userInfo.email} 
  onChange={handleUserInfoChange} 
/>

// Ligne 1662-1672
const handleUserInfoChange = e => {
  const { name, value } = e.target;
  setUserInfo(prev => ({
    ...prev,
    [name]: value
  }));
};

// Ligne 1673-1693 : Sauvegarde des modifications
const handleSaveChanges = async () => {
  if(!activeAdminUser) return;
  
  try {
    const currentUser = supabaseUsers.find(u => 
      u.id === activeAdminUser.id || 
      u.user_id === activeAdminUser.user_id
    );
    
    if (!currentUser) {
      throw new Error('Utilisateur non trouvé');
    }
    
    // ⚠️ Met à jour uniquement public.users, PAS auth.users
    await updateUser(currentUser.id, userInfo);
  } catch (err) {
    logger.error('Erreur sauvegarde modifications', { error: err.message });
    toast({
      title: "Erreur",
      description: "Impossible de sauvegarder les modifications.",
      variant: "destructive",
    });
  }
};
```

### 2️⃣ Hook Supabase
**Fichier** : `src/hooks/useSupabaseUsersCRUD.js`
```javascript
// Ligne 199-290
const updateUser = async (userIdOrPk, updates) => {
  try {
    const isUUID = typeof userIdOrPk === 'string' && userIdOrPk.includes('-');
    const idField = isUUID ? 'user_id' : 'id';
    const idValue = userIdOrPk;
    
    // Préparer les données pour Supabase (snake_case)
    const dbUpdates = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email; // ⚠️ Modifie public.users seulement
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    // ... autres champs
    
    dbUpdates.updated_at = new Date().toISOString();

    // ⚠️ UPDATE normal sur public.users uniquement
    const result = await supabase
      .from('users')
      .update(dbUpdates)
      .eq(idField, idValue)
      .select();
    
    data = result.data;
    updateError = result.error;

    if (updateError) throw updateError;

    toast({
      title: "Succès !",
      description: "Utilisateur modifié avec succès.",
      className: "bg-green-500 text-white",
    });

    return updatedUser;
  } catch (err) {
    // ...
  }
};
```

### 3️⃣ Politiques RLS
**Fichier** : `supabase/schema.sql` (ligne 859-863)
```sql
-- Users PRO peuvent modifier leurs propres informations personnelles
-- Champs modifiables depuis /admin/profil > Informations personnelles : name, email, phone
-- Champs PROTÉGÉS (non modifiables) : role, manager_id, access_rights
-- Le mot de passe se change via Supabase Auth (supabase.auth.updateUser)
CREATE POLICY "Users can update their own info"
  ON public.users
  FOR UPDATE
  USING (user_id = auth.uid());
```

✅ **La politique RLS autorise** Elodie à modifier sa propre ligne dans `public.users`

## ⚠️ PROBLÈME IDENTIFIÉ

### Architecture Supabase Auth
Supabase utilise **deux tables distinctes** :

1. **`auth.users`** (table système, gérée par Supabase Auth)
   - Contient l'email d'authentification
   - Utilisé pour la connexion
   - **Ne peut PAS être modifié directement avec SQL**
   - Nécessite `supabase.auth.updateUser({ email: newEmail })`

2. **`public.users`** (table applicative, gérée par nous)
   - Contient les informations de profil
   - Lié à `auth.users` par la colonne `user_id` (FK vers `auth.users.id`)
   - **Peut être modifié avec RLS**

### 🔴 Ce qui se passe actuellement

Si Elodie change son email de `elodie.vinet@example.com` → `elodie.nouveau@example.com` :

1. ✅ `public.users.email` est mis à jour → `elodie.nouveau@example.com`
2. ❌ `auth.users.email` reste inchangé → `elodie.vinet@example.com`

**Conséquences** :
- ✅ L'email affiché dans le profil change
- ❌ Elodie continue de se connecter avec l'ancien email
- ❌ Les Magic Links sont envoyés à l'ancien email
- ❌ Désynchronisation entre `auth.users` et `public.users`

## 🎯 SOLUTION REQUISE

### Option 1 : Bloquer la modification d'email (recommandé pour la V1)
**Avantages** :
- Évite les complications
- Pas de risque de désynchronisation
- Simple à implémenter

**Implémentation** :
```jsx
// ProfilePage.jsx - Rendre le champ email disabled
<Input 
  id="email" 
  name="email" 
  type="email" 
  value={userInfo.email} 
  disabled // ⬅️ Bloquer la modification
  className="bg-gray-100 cursor-not-allowed"
/>
```

Ajouter un message :
```jsx
<p className="text-xs text-gray-500 mt-1">
  ⚠️ Pour changer votre email de connexion, contactez un Global Admin
</p>
```

### Option 2 : Synchroniser avec auth.users (complet mais complexe)
**Avantages** :
- Permet vraiment de changer l'email
- Utilisateur autonome

**Inconvénients** :
- Nécessite vérification email (Supabase envoie un lien de confirmation)
- Peut déconnecter l'utilisateur pendant le changement
- Risque de perte d'accès si l'email est invalide

**Implémentation** :
```javascript
// useSupabaseUsersCRUD.js
const updateUser = async (userIdOrPk, updates) => {
  try {
    // ... code existant ...
    
    // 🔥 Si l'email change, mettre à jour auth.users aussi
    if (updates.email !== undefined) {
      const { data: authUser, error: authError } = await supabase.auth.updateUser({
        email: updates.email
      });
      
      if (authError) {
        throw new Error('Impossible de changer l\'email de connexion. Vérifiez que l\'email est valide.');
      }
      
      // ⚠️ Supabase envoie un email de confirmation automatiquement
      // L'utilisateur doit cliquer sur le lien pour valider
      toast({
        title: "Email de confirmation envoyé",
        description: `Un lien de confirmation a été envoyé à ${updates.email}. Cliquez dessus pour finaliser le changement.`,
        duration: 10000,
      });
    }
    
    // Ensuite mettre à jour public.users
    const result = await supabase
      .from('users')
      .update(dbUpdates)
      .eq(idField, idValue)
      .select();
    
    // ...
  } catch (err) {
    // ...
  }
};
```

### Option 3 : Fonction admin pour changer l'email (intermédiaire)
**Avantages** :
- Seul le Global Admin peut changer les emails
- Contrôle centralisé
- Pas de risque de perte d'accès

**Implémentation** :
1. Ajouter une fonction RPC côté Supabase (SQL)
2. Créer un bouton "Gérer les emails" dans la section Équipe (Global Admin only)
3. Formulaire modal pour changer l'email d'un membre

## 📊 Recommandation

**Pour l'instant** : **Option 1** (bloquer la modification)
- Plus sûr
- Évite les problèmes de support ("je ne peux plus me connecter")
- Permet de prioriser d'autres features

**Évolution future** : **Option 3** (fonction admin)
- Quand le besoin se fait vraiment sentir
- Après avoir testé le workflow de changement d'email
- Documentation claire du processus

## 🚀 Actions immédiates

1. [ ] Désactiver le champ email dans ProfilePage.jsx
2. [ ] Ajouter un tooltip explicatif
3. [ ] Documenter le processus pour les Global Admin (comment changer un email manuellement via Supabase Dashboard)

---

**Créé le** : 12 décembre 2024
**Contexte** : Question utilisateur sur le changement d'email pour Elodie Vinet (Commercial)
