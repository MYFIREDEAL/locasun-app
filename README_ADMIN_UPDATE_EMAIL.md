# 📧 Changement d'email pour les utilisateurs (Admin)

## 🎯 Problème résolu
Les admins peuvent maintenant modifier l'email d'un utilisateur depuis `/admin/profil` > Gestion des utilisateurs > Modifier.

## 🔧 Installation requise

### 1️⃣ Déployer la fonction RPC dans Supabase

**Fichier** : `create_admin_update_user_email.sql`

**Étapes** :
1. Ouvrir le **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionner le projet **Locasun**
3. Aller dans **SQL Editor** (icône `</>` dans la barre latérale)
4. Cliquer sur **New Query**
5. Copier-coller le contenu de `create_admin_update_user_email.sql`
6. Cliquer sur **Run** (ou `Cmd+Enter`)

### 2️⃣ Vérifier la fonction

Exécuter cette requête dans le SQL Editor :

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'admin_update_user_email';
```

Si la fonction apparaît, c'est bon ! ✅

## 🔐 Sécurité

### Permissions
- ⚠️ **Seuls les Global Admin** peuvent utiliser cette fonction
- La fonction vérifie automatiquement le rôle de l'utilisateur connecté
- Si un Commercial ou Manager essaie, il aura : `Permission refusée`

### Ce qui est modifié
1. **`auth.users.email`** : Email de connexion (table système Supabase)
2. **`public.users.email`** : Email de profil (table applicative)
3. **`email_confirmed_at`** : Mis à NOW() (pas besoin de validation par lien)

## 💡 Utilisation

### Interface Admin
1. Se connecter en tant que **Global Admin**
2. Aller dans `/admin/profil`
3. Cliquer sur **Gestion des utilisateurs**
4. Cliquer sur **Modifier** pour un utilisateur
5. Changer l'email
6. Cliquer sur **Enregistrer**

### Toast affiché
```
✅ Email modifié !
L'email de connexion a été changé en nouvel@email.com.
L'utilisateur peut maintenant se connecter avec cette adresse.
```

## ⚠️ Limitations actuelles

### Mot de passe
Le mot de passe **n'est pas modifiable** depuis cette interface car :
- Nécessite la clé `service_role` (pas disponible frontend)
- Risque de sécurité si un admin peut changer les mots de passe

**Solution actuelle** : L'utilisateur utilise "Mot de passe oublié" depuis la page de connexion.

**Solution future** : Ajouter une fonction RPC `admin_reset_user_password` qui génère un lien temporaire.

## 🚀 Évolutions possibles

### Option 1 : Réinitialisation de mot de passe par admin
Créer une fonction qui envoie un email "Mot de passe oublié" à l'utilisateur :
```sql
CREATE FUNCTION admin_send_password_reset(target_email TEXT)
```

### Option 2 : Génération de mot de passe temporaire
Créer un mot de passe aléatoire + forcer le changement à la première connexion.

### Option 3 : Audit trail
Logger tous les changements d'email dans une table `user_email_changes` pour traçabilité.

---

**Créé le** : 12 décembre 2024  
**Version** : 1.0  
**Status** : ✅ Prêt pour production (après déploiement SQL)
