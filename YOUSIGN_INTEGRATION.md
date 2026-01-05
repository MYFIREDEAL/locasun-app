# 📝 Intégration Yousign - Guide d'installation

## 🎯 Vue d'ensemble

Ce système permet de lancer des signatures électroniques via Yousign à partir de PDFs déjà générés et stockés dans Supabase Storage.

---

## 📋 Prérequis

1. **Compte Yousign** : Créer un compte sur https://yousign.com
2. **API Key Yousign** : Récupérer votre clé API dans les paramètres Yousign
3. **Webhook configuré** : Configurer l'URL webhook dans Yousign

---

## 🔧 Installation

### 1️⃣ Créer la table SQL

Exécuter le fichier SQL dans Supabase Dashboard → SQL Editor :
```
supabase/migrations/create_signature_procedures.sql
```

### 2️⃣ Déployer les Edge Functions

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
supabase login

# Link le projet
supabase link --project-ref <YOUR_PROJECT_ID>

# Déployer les fonctions
supabase functions deploy yousign-create-signature
supabase functions deploy yousign-webhook
```

### 3️⃣ Configurer les secrets

```bash
# API Key Yousign
supabase secrets set YOUSIGN_API_KEY=your_yousign_api_key_here
```

### 4️⃣ Configurer le webhook Yousign

Dans le dashboard Yousign :
1. Aller dans **Settings → Webhooks**
2. Ajouter une nouvelle URL webhook :
   ```
   https://<YOUR_PROJECT_ID>.supabase.co/functions/v1/yousign-webhook
   ```
3. Sélectionner les événements :
   - `signature_request.done`
   - `signature_request.declined`
   - `signature_request.expired`

### 5️⃣ Configurer le bucket Storage (si pas déjà fait)

Exécuter le script SQL :
```
setup_storage_bucket.sql
```

---

## 🚀 Utilisation

### Côté Admin

1. Aller dans **Projet → Fichiers**
2. Cliquer sur l'icône **🖊️ (PenTool)** à côté d'un PDF
3. La signature est créée automatiquement
4. Le client reçoit un email avec le lien de signature
5. Après signature, le PDF signé apparaît automatiquement dans les fichiers

### Workflow automatique (optionnel)

Le workflow `launch_signature` peut déclencher automatiquement la signature :
- Configurer l'action dans **Charly → Workflows**
- Associer un template de contrat
- La signature se lance automatiquement à l'étape configurée

---

## 📊 Données stockées

Table `signature_procedures` :
- `yousign_procedure_id` : ID Yousign
- `signature_link` : Lien envoyé au client
- `status` : pending, signed, refused, expired
- `signed_file_id` : Référence vers le PDF signé final

---

## 🔍 Debug

Vérifier les logs des Edge Functions :
```bash
supabase functions logs yousign-create-signature
supabase functions logs yousign-webhook
```

---

## ⚠️ Sécurité

- ✅ Bucket Storage **privé**
- ✅ URLs signées **temporaires** (24h pour Yousign, 1h pour visualisation)
- ✅ RLS activé sur toutes les tables
- ✅ Webhook Yousign vérifié (TODO : ajouter signature verification)

---

## 🎓 Variables disponibles

Dans le template de contrat, utiliser :
- `{{client_lastname}}` - Nom
- `{{client_firstname}}` - Prénom
- `{{client_email}}` - Email
- `{{client_phone}}` - Téléphone
- `{{client_address}}` - Adresse
- `{{client_city}}` - Ville
- `{{client_zip}}` - Code postal
- `{{signature_date}}` - Date du jour

---

## 📞 Support

En cas de problème :
1. Vérifier les logs des Edge Functions
2. Vérifier que l'API Key Yousign est valide
3. Vérifier que le webhook est bien configuré
4. Vérifier les permissions RLS
