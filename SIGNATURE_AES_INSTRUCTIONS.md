# Migration Signature AES - Instructions pour Jack

## 📋 ÉTAPE OBLIGATOIRE AVANT DE TESTER

### 1. Exécuter le script SQL dans Supabase Dashboard

1. Aller sur https://supabase.com/dashboard
2. Sélectionner le projet LOCASUN
3. Aller dans **SQL Editor**
4. Créer une nouvelle query
5. Copier-coller le contenu complet de `migrate_signature_procedures_to_aes.sql`
6. Cliquer sur **RUN** (bouton vert)

### 2. Vérifier que la migration a réussi

Dans l'onglet **Table Editor**, vérifier que la table `signature_procedures` a bien :

#### Nouvelles colonnes :
- ✅ `organization_id` (UUID, NOT NULL)
- ✅ `signer_name` (TEXT)
- ✅ `signer_email` (TEXT)
- ✅ `document_hash` (TEXT)
- ✅ `access_token` (TEXT, UNIQUE)
- ✅ `token_expires_at` (TIMESTAMPTZ)
- ✅ `signature_metadata` (JSONB)
- ✅ `pdf_signed_hash` (TEXT)

#### Colonnes modifiées :
- ✅ `yousign_procedure_id` → maintenant **NULLABLE** (NULL si signature maison)

---

## 🔄 WORKFLOW APRÈS MIGRATION

### Ce qui se passe quand un admin génère un contrat :

1. **Génération du PDF** (comme avant)
   - Upload dans `project_files`
   - Toast "✅ Contrat généré !"

2. **Calcul du hash SHA-256** (NOUVEAU)
   - Hash du PDF original pour preuve d'intégrité

3. **Création procédure de signature** (NOUVEAU)
   - Insert dans `signature_procedures` avec :
     - `organization_id` du prospect
     - Hash du document
     - Token sécurisé unique
     - Expiration = +7 jours

4. **Envoi du lien dans le chat** (NOUVEAU)
   - Message avec bouton "✍️ Signer mon contrat"
   - Lien : `/signature/{procedure_id}?token={secure_token}`
   - Visible uniquement par le client

---

## 🧪 COMMENT TESTER

### Test 1 : Génération de contrat

1. Aller sur un prospect dans le pipeline
2. Avancer à une étape qui déclenche "start_signature"
3. Vérifier dans la console :
   ```
   ✅ Hash SHA-256 calculé
   ✅ Procédure de signature créée
   ✅ Lien envoyé dans le chat
   ```

### Test 2 : Vérifier la DB

Dans Supabase **Table Editor** > `signature_procedures` :

```sql
SELECT 
  id,
  prospect_id,
  signer_email,
  document_hash,
  access_token,
  token_expires_at,
  status
FROM signature_procedures
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;
```

Tu devrais voir :
- ✅ `document_hash` rempli (64 caractères hexadécimaux)
- ✅ `access_token` unique (format UUID)
- ✅ `status` = 'pending'
- ✅ `token_expires_at` = aujourd'hui +7 jours

### Test 3 : Vérifier le chat

1. Se connecter en tant que **client** (prospect)
2. Voir le message avec le bouton "✍️ Signer mon contrat"
3. ⚠️ **NE PAS CLIQUER** (la page `/signature/:id` n'est pas encore développée)

---

## 🔐 SÉCURITÉ

### Ce qui est en place :

- ✅ Token unique par procédure (crypto.randomUUID())
- ✅ Expiration automatique (7 jours)
- ✅ Hash SHA-256 du document original (preuve d'intégrité)
- ✅ RLS : admins voient seulement leur organization
- ✅ RLS : clients voient seulement leurs propres procédures

### Ce qui reste à faire (Phase 2) :

- ⏳ Page `/signature/:id` pour afficher le PDF et capturer la signature
- ⏳ Validation côté serveur du token expiré
- ⏳ Capture des métadonnées (IP, user-agent, timestamp)
- ⏳ Génération du PDF signé avec tampon horodaté

---

## 📊 DONNÉES STOCKÉES POUR PREUVE JURIDIQUE

Chaque procédure stocke :

1. **Document original** :
   - Hash SHA-256 (preuve que le document n'a pas changé)

2. **Signataire** :
   - Nom, email

3. **Procédure** :
   - Date de création
   - Date d'expiration du lien
   - Status (pending/signed/refused/expired)

4. **Signature** (après signature) :
   - Timestamp exact
   - Adresse IP
   - User-agent (navigateur/appareil)
   - Hash du PDF signé

---

## ⚠️ RAPPEL IMPORTANT

Cette signature est **AVANCÉE** (pas qualifiée).

**Conforme pour** :
- ✅ Contrats B2C standards
- ✅ Devis commerciaux
- ✅ Bons de commande

**NON conforme pour** :
- ❌ Actes notariés
- ❌ Contrats immobiliers
- ❌ Documents nécessitant signature qualifiée (eIDAS)

---

## 🚀 PROCHAINE ÉTAPE (Phase 2)

Développer la page `/signature/:id` avec :

1. Vérification du token
2. Affichage du PDF dans un viewer
3. Case à cocher "J'accepte les termes"
4. Bouton "Signer"
5. Capture métadonnées (IP, timestamp, user-agent)
6. Update `signature_procedures` : status='signed', signature_metadata={...}
7. Notification admin : "✅ Contrat signé par {client}"

---

**Questions ?** Ping moi dans le chat EVATIME. 🚀
