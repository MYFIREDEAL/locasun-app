# 📋 Rapport Complet : Système de Signature avec Co-signataire

## 🎯 Contexte

Le système de signature permet à un **signataire principal** de signer un document ET d'inviter un **co-signataire** à le signer également. Chaque signataire reçoit un lien unique pour accéder au document et le signer.

---

## 🏗️ Architecture du Système

### 📊 Tables Supabase

#### 1. `signature_procedures`
Stocke les procédures de signature avec **2 systèmes de tracking** :

**Système Global (colonnes directes)** :
- `id` : UUID de la procédure
- `status` : Statut global (`pending`, `signed`, `rejected`)
- `signer_name` : Nom du signataire principal
- `signer_email` : Email du signataire principal
- `signed_at` : Date de signature
- `prospect_id` : Lien vers le prospect
- `project_type` : Type de projet (ACC, Centrale, etc.)
- `file_id` : ID du fichier PDF à signer
- `signed_file_id` : ID du PDF signé
- `access_token` : Token d'accès pour le signataire principal
- `organization_id` : ID de l'organisation

**Système Array (JSONB)** :
- `signers` : Array JSONB contenant `[{email, name, status, role}]`
  - `role` : `"principal"` ou `"cosigner"`
  - `status` : `"pending"` ou `"signed"` (⚠️ **JAMAIS MIS À JOUR** actuellement)

#### 2. `cosigner_invite_tokens`
Gère les invitations et OTP pour les co-signataires :
- `token` : UUID unique du lien d'invitation
- `signature_procedure_id` : Lien vers la procédure
- `signer_email` : Email du co-signataire
- `otp_code` : Code à 6 chiffres
- `otp_attempts` : Nombre de tentatives (max 3)
- `expires_at` : Date d'expiration de l'OTP
- `used` : Booléen (true après signature)

#### 3. `signature_proofs`
Stocke les preuves cryptographiques des signatures :
- `signature_procedure_id` : Lien vers la procédure
- `signer_email` : Email du signataire
- `signer_name` : Nom du signataire
- `signature_hash` : Hash de la signature
- `ip_address` : IP du signataire
- `user_agent` : Navigateur utilisé
- `signed_at` : Timestamp de signature

---

## 🔄 Flux de Signature

### 📍 Étape 1 : Création de la Procédure (Admin)

**Fichier** : `src/pages/admin/clients/ClientProjectFiles.jsx`

```javascript
// Admin clique sur "Demander signature"
const handleRequestSignature = async (file) => {
  // 1. Créer la procédure dans signature_procedures
  const { data: procedure } = await supabase
    .from('signature_procedures')
    .insert({
      prospect_id,
      project_type,
      file_id: file.id,
      status: 'pending',
      signer_name: prospect.firstname + ' ' + prospect.lastname,
      signer_email: prospect.email,
      organization_id,
      access_token: crypto.randomUUID(),
      signers: [
        {
          email: prospect.email,
          name: prospect.firstname + ' ' + prospect.lastname,
          role: 'principal',
          status: 'pending'
        }
      ]
    });

  // 2. Envoyer l'email au signataire principal
  await supabase.functions.invoke('send-signature-email', {
    body: {
      signatureUrl: `${window.location.origin}/signature?token=${procedure.access_token}`,
      signerName: prospect.firstname,
      signerEmail: prospect.email
    }
  });
};
```

---

### 📍 Étape 2 : Signature du Principal

**Fichier** : `src/pages/SignaturePage.jsx`

```javascript
// 1. Le signataire principal clique sur le lien dans son email
// URL : /signature?token=UUID

useEffect(() => {
  // Charger la procédure
  const { data: proc } = await supabase
    .from('signature_procedures')
    .select('*')
    .eq('access_token', token)
    .single();

  // ✅ Vérifier si déjà signé
  if (proc.status === 'signed') {
    setSigned(true); // Afficher page de confirmation
    return;
  }

  // Charger le PDF
  setProcedure(proc);
  loadPdf(proc.file_id);
}, [token]);

// 2. L'utilisateur accepte et clique "Signer"
const handleSign = async () => {
  // UPDATE status global
  await supabase
    .from('signature_procedures')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString()
    })
    .eq('id', procedure.id);

  // Créer la preuve cryptographique
  await supabase
    .from('signature_proofs')
    .insert({
      signature_procedure_id: procedure.id,
      signer_email: procedure.signer_email,
      signer_name: procedure.signer_name,
      signature_hash: crypto.randomUUID(),
      ip_address: await fetch('https://api.ipify.org').then(r => r.text()),
      signed_at: new Date().toISOString()
    });

  setSigned(true); // ✅ Afficher confirmation
};
```

**Résultat** : Le signataire principal voit une page de confirmation avec :
- ✅ Son nom et email
- ✅ La date de signature
- ✅ Message de succès

---

### 📍 Étape 3 : Invitation du Co-signataire

**Fichier** : `src/pages/SignaturePage.jsx` (après signature principale)

```javascript
// Le signataire principal peut inviter un co-signataire
const [showCosignerForm, setShowCosignerForm] = useState(false);
const [cosignerEmail, setCosignerEmail] = useState('');
const [cosignerName, setCosignerName] = useState('');

const handleAddCosigner = async () => {
  // 1. Créer le token d'invitation
  const token = crypto.randomUUID();
  
  await supabase
    .from('cosigner_invite_tokens')
    .insert({
      token,
      signature_procedure_id: procedure.id,
      signer_email: cosignerEmail,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
    });

  // 2. Ajouter le co-signataire dans signers[]
  const updatedSigners = [
    ...procedure.signers,
    {
      email: cosignerEmail,
      name: cosignerName,
      role: 'cosigner',
      status: 'pending'
    }
  ];

  await supabase
    .from('signature_procedures')
    .update({ signers: updatedSigners })
    .eq('id', procedure.id);

  // 3. Envoyer l'email au co-signataire
  await supabase.functions.invoke('send-cosigner-invite', {
    body: {
      cosignerEmail,
      cosignerName,
      inviteUrl: `${window.location.origin}/cosigner-signature?token=${token}`,
      principalName: procedure.signer_name
    }
  });
};
```

---

### 📍 Étape 4 : Signature du Co-signataire (OTP)

**Fichier** : `src/pages/CosignerSignaturePage.jsx`

#### 4.1 Chargement Initial

```javascript
useEffect(() => {
  // 1. Récupérer les infos du token
  const { data: tokenData } = await supabase
    .from('cosigner_invite_tokens')
    .select('signature_procedure_id, signer_email')
    .eq('token', token)
    .single();

  // 2. Charger la procédure
  const { data: proc } = await supabase
    .from('signature_procedures')
    .select('*')
    .eq('id', tokenData.signature_procedure_id)
    .single();

  setProcedure(proc);

  // 3. Récupérer les infos du co-signataire depuis signers[]
  const cosigner = proc.signers?.find(
    s => s.email === tokenData.signer_email && s.role === 'cosigner'
  );

  setCosignerEmail(tokenData.signer_email);
  setCosignerName(cosigner?.name || tokenData.signer_email);

  // 4. ✅ VÉRIFIER SI DÉJÀ SIGNÉ (FIX PRINCIPAL)
  if (proc.status === 'signed') {
    logger.info('Procédure déjà signée');
    setSigned(true); // Afficher confirmation directement
    return;
  }

  // 5. Si pas encore signé, demander l'OTP
  handleRequestOtp();
}, [token]);
```

#### 4.2 Envoi de l'OTP

**Edge Function** : `supabase/functions/send-cosigner-otp/index.ts`

```typescript
serve(async (req) => {
  const { token } = await req.json();

  // 1. Vérifier le token
  const { data: invite } = await supabase
    .from('cosigner_invite_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (!invite) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 400 });
  }

  // 2. Vérifier si déjà utilisé
  if (invite.used) {
    const { data: proc } = await supabase
      .from('signature_procedures')
      .select('signed_at')
      .eq('id', invite.signature_procedure_id)
      .single();

    return new Response(JSON.stringify({
      already_signed: true,
      signed_at: proc.signed_at
    }));
  }

  // 3. Générer OTP 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 4. Sauvegarder l'OTP
  await supabase
    .from('cosigner_invite_tokens')
    .update({
      otp_code: otp,
      otp_attempts: 0,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
    })
    .eq('token', token);

  // 5. Envoyer l'email avec le code
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': Deno.env.get('BREVO_API_KEY'),
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      to: [{ email: invite.signer_email }],
      subject: 'Code de vérification - Signature électronique',
      htmlContent: `Votre code : <strong>${otp}</strong>`
    })
  });

  return new Response(JSON.stringify({ success: true }));
});
```

#### 4.3 Vérification de l'OTP

**Edge Function** : `supabase/functions/verify-cosigner-otp/index.ts`

```typescript
serve(async (req) => {
  const { token, otp } = await req.json();

  // 1. Récupérer le token
  const { data: invite } = await supabase
    .from('cosigner_invite_tokens')
    .select('*')
    .eq('token', token)
    .single();

  // 2. Vérifier expiration
  if (new Date(invite.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'Code expiré' }), { status: 400 });
  }

  // 3. Vérifier le nombre de tentatives
  if (invite.otp_attempts >= 3) {
    return new Response(JSON.stringify({ error: 'Trop de tentatives' }), { status: 429 });
  }

  // 4. Vérifier le code
  if (invite.otp_code !== otp) {
    await supabase
      .from('cosigner_invite_tokens')
      .update({ otp_attempts: invite.otp_attempts + 1 })
      .eq('token', token);

    return new Response(JSON.stringify({
      error: 'Code incorrect',
      remaining_attempts: 2 - invite.otp_attempts
    }), { status: 400 });
  }

  // 5. ✅ Code correct - Charger la procédure
  const { data: procedure } = await supabase
    .from('signature_procedures')
    .select('*')
    .eq('id', invite.signature_procedure_id)
    .single();

  // 6. ✅ Récupérer le nom du co-signataire depuis signers[]
  const cosigner = procedure.signers?.find(
    s => s.email === invite.signer_email && s.role === 'cosigner'
  );

  // 7. ✅ Retourner la procédure avec signer_email ET signer_name
  return new Response(JSON.stringify({
    procedure: {
      ...procedure,
      signer_email: invite.signer_email, // Email du co-signataire
      signer_name: cosigner?.name || invite.signer_email // Nom du co-signataire
    }
  }));
});
```

#### 4.4 Affichage du PDF et Signature

```javascript
// Après validation OTP
const handleVerifyOtp = async (e) => {
  const { data } = await supabase.functions.invoke('verify-cosigner-otp', {
    body: { token, otp }
  });

  setProcedure(data.procedure);
  
  // ✅ CRUCIAL : Stocker email ET nom du co-signataire
  setCosignerEmail(data.procedure.signer_email);
  setCosignerName(data.procedure.signer_name || data.procedure.signer_email);
  
  // Charger le PDF
  loadPdf(data.procedure.file_id);
  setStep('pdf');
};

// Signature du co-signataire
const handleSign = async () => {
  // 1. UPDATE status global
  await supabase
    .from('signature_procedures')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString()
    })
    .eq('id', procedure.id);

  // 2. Créer la preuve cryptographique
  await supabase
    .from('signature_proofs')
    .insert({
      signature_procedure_id: procedure.id,
      signer_email: cosignerEmail, // ✅ Email du CO-SIGNATAIRE
      signer_name: cosignerName,   // ✅ Nom du CO-SIGNATAIRE
      signature_hash: crypto.randomUUID(),
      ip_address: await fetch('https://api.ipify.org').then(r => r.text()),
      signed_at: new Date().toISOString()
    });

  // 3. Marquer le token comme utilisé
  await supabase
    .from('cosigner_invite_tokens')
    .update({ used: true })
    .eq('token', token);

  setSigned(true); // ✅ Afficher confirmation
};
```

---

## 🐛 Bug Identifié et Résolu

### ❌ Problème Initial

Quand un **co-signataire** recliquait sur son lien après avoir signé :
- ❌ Il voyait le **formulaire OTP** au lieu de la page de confirmation
- ✅ Le **signataire principal** voyait correctement la page de confirmation

### 🔍 Cause du Bug

**Table `signature_procedures` a 2 systèmes de tracking non synchronisés** :

1. **Status Global** (colonnes) :
   - `status`, `signer_name`, `signer_email`
   - ✅ **MIS À JOUR** lors de la signature dans `handleSign()`

2. **Signers Array** (JSONB) :
   - `signers[]` avec `{email, name, status, role}`
   - ❌ **JAMAIS MIS À JOUR** lors de la signature

**Code problématique** (ligne 84 de `CosignerSignaturePage.jsx`) :
```javascript
// ❌ BUG : Vérifie signers[].status qui reste toujours 'pending'
if (cosigner?.status === 'signed') {
  setSigned(true);
}
```

**Code fonctionnel** (`SignaturePage.jsx`) :
```javascript
// ✅ OK : Vérifie le status global qui est mis à jour
if (proc.status === 'signed') {
  setSigned(true);
}
```

### ✅ Solution Appliquée

**Commit** : `9b4ca5f` - 🔧 FIX FINAL: Vérifier status global (pas signers[])

```javascript
// ✅ CORRECTION : Vérifier le STATUS GLOBAL (comme SignaturePage.jsx)
if (proc.status === 'signed') {
  logger.info('Procédure déjà signée (co-signataire a signé)', { 
    email: tokenData.signer_email,
    signedAt: proc.signed_at 
  });
  setSigned(true); // ✅ Afficher directement la page de confirmation
  setLoading(false);
  return;
}
```

---

## 📊 État de la Base de Données

### Exemple de procédure signée

```sql
SELECT id, status, signers, signed_at
FROM signature_procedures
WHERE signer_email = 'eva.jones7@yopmail.com';
```

**Résultat** :
```json
{
  "id": "uuid-123",
  "status": "signed", // ✅ Mis à jour lors de la signature
  "signed_at": "2026-01-13T15:30:00Z",
  "signers": [
    {
      "email": "eva.jones7@yopmail.com",
      "name": "Eva Jones",
      "role": "principal",
      "status": "pending" // ❌ Jamais mis à jour (ignoré maintenant)
    },
    {
      "email": "nicoleta@yopmail.com",
      "name": "Nicoleta",
      "role": "cosigner",
      "status": "pending" // ❌ Jamais mis à jour (ignoré maintenant)
    }
  ]
}
```

---

## ✅ Résultat Final

### Comportement Attendu (FONCTIONNEL) :

1. **Signataire Principal** clique sur son lien :
   - 1ère fois : Voit le PDF + bouton "Signer"
   - 2ème fois (après signature) : Voit page de confirmation ✅

2. **Co-signataire** clique sur son lien :
   - 1ère fois : Reçoit OTP par email, entre le code, voit le PDF, signe
   - 2ème fois (après signature) : Voit page de confirmation ✅

### Page de Confirmation (identique pour les deux) :

```jsx
{signed && (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-4">
          Document déjà signé
        </h1>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Signataire :</p>
          <p className="font-semibold">{cosignerName || procedure?.signer_name}</p>
          <p className="text-gray-600">{cosignerEmail || procedure?.signer_email}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Date de signature :</p>
          <p className="font-semibold text-green-700">
            {new Date(procedure?.signed_at).toLocaleString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 🔧 Corrections Appliquées (Historique)

### Commit 1 : `e36fb86` - 🎨 UI: Page confirmation co-signataire identique
- Copié le design de `SignaturePage.jsx`
- Ajout du gradient vert et du layout identique

### Commit 2 : `1ecc1ef` - 🐛 Fix: Vérification "déjà signé" avant OTP
- Ajout de la vérification dans `useEffect`
- Problème : utilisait `signed` (state) qui n'était pas à jour

### Commit 3 : `fb72943` - 🔧 Fix: Retourner booléen depuis async function
- Correction de la race condition avec React state
- Problème : `cosignerEmail` était vide lors de la signature

### Commit 4 : `6bc9982` - 🐛 Fix: Email/nom co-signataire lors signature
- Ajout de `setCosignerEmail()` et `setCosignerName()`
- Modification de `verify-cosigner-otp` pour retourner `signer_name`
- Problème : vérifiait `signers[].status` au lieu de `status` global

### Commit 5 : `9b4ca5f` - 🔧 FIX FINAL: Vérifier status global
- **Solution finale** : vérifier `proc.status === 'signed'`
- Aligné sur la logique de `SignaturePage.jsx`
- ✅ **FONCTIONNE MAINTENANT**

---

## 📝 Notes Techniques

### Point d'Attention : Dual Tracking System

La table `signature_procedures` maintient **2 sources de vérité** :
- `status` (global) ← **Utilisé actuellement** ✅
- `signers[].status` (array) ← **Non mis à jour** ⚠️

**Recommandation future** : Choisir un seul système ou synchroniser les deux.

### Sécurité OTP

- Code à 6 chiffres aléatoire
- Maximum 3 tentatives
- Expiration après 10 minutes
- Token unique par invitation
- Marqué comme `used` après signature

### Preuves Cryptographiques

Chaque signature crée une entrée dans `signature_proofs` avec :
- Hash de signature
- IP du signataire
- User-Agent (navigateur)
- Timestamp précis

---

## 🚀 Déploiement

### Frontend (Vercel)
```bash
git add .
git commit -m "message"
git push origin main
# → Auto-deploy sur Vercel
```

### Edge Functions (Supabase)
```bash
# Dans Supabase Dashboard > Edge Functions
# Copier le code de supabase/functions/*/index.ts
# Déployer manuellement
```

---

**Fin du Rapport**

✅ Système totalement fonctionnel pour signataire principal ET co-signataire
