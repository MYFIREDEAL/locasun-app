# 📝 Workflow Signature Électronique EVATIME

## Vue d'ensemble

Système de signature électronique conforme **eIDAS (UE) n°910/2014 Article 26** permettant la signature multi-parties avec preuves juridiques, génération automatique de PDF signé avec certificat, et notifications complètes.

---

## 🏗️ Architecture

### Tables Database
- **`signature_procedures`** : Procédures de signature (statut, signataires, tokens)
- **`signature_proofs`** : Preuves juridiques de signature (IP, hash, timestamp)
- **`cosigner_invite_tokens`** : Tokens sécurisés pour co-signataires (OTP)
- **`project_files`** : Stockage fichiers (PDF original + PDF signé)

### Edge Functions (Deno/TypeScript)
- **`internal-signature`** : Créer les preuves de signature
- **`generate-signed-pdf`** : Générer PDF final avec page de certificat
- **`send-cosigner-invite`** : Envoyer invitations par email
- **`send-cosigner-otp`** : Générer et envoyer code OTP
- **`verify-cosigner-otp`** : Vérifier code OTP

### Pages Front-end (React)
- **`/admin/contacts/:id`** (`ProspectDetailsAdmin.jsx`) : Interface admin pour créer procédures
- **`/sign/:token`** (`SignaturePage.jsx`) : Page signature signataire principal (avec token)
- **`/sign/cosigner`** (`CosignerSignaturePage.jsx`) : Page signature co-signataire (avec OTP)

---

## 🔄 Workflow Complet

### 1️⃣ Création de la Procédure (Admin)

**Route** : `/admin/contacts/:prospectId`  
**Composant** : `ProspectDetailsAdmin.jsx`  
**Action** : Admin clique "Envoyer à signer" sur un fichier

#### Étapes :
```javascript
// 1. Générer access_token sécurisé + expiration (7 jours)
const accessToken = crypto.randomUUID()
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + 7)

// 2. Construire tableau signers
const signers = [
  {
    email: prospect.email,
    name: prospect.name,
    role: 'principal',  // ← Signataire principal
    status: 'pending',
    signed_at: null
  },
  ...cosigners.map(c => ({
    email: c.email,
    name: c.name,
    role: 'cosigner',  // ← Co-signataire
    status: 'pending',
    signed_at: null
  }))
]

// 3. INSERT signature_procedures
await supabase.from('signature_procedures').insert({
  prospect_id: prospectId,
  project_type: projectType,
  file_id: fileId,  // ← UUID du PDF original (project_files)
  access_token: accessToken,
  access_token_expires_at: expiresAt.toISOString(),
  status: 'pending',
  signers: signers,
  organization_id: activeAdminUser.organization_id,
  signer_name: prospect.name,
  signer_email: prospect.email
})
```

#### Edge Function appelée :
**`send-cosigner-invite`** (si co-signataires présents)
- Génère tokens sécurisés pour chaque co-signataire
- Stocke dans `cosigner_invite_tokens` (expire 48h)
- Envoie emails avec liens `/sign/cosigner?token=xxx`

---

### 2️⃣ Signature Signataire Principal

**Route** : `/sign/:token`  
**Composant** : `SignaturePage.jsx`  
**Accès** : Via email avec lien contenant `access_token`

#### Workflow page :
```javascript
// 1. Vérifier access_token
const { data: procedure } = await supabase
  .from('signature_procedures')
  .select('*, project_files!signature_procedures_file_id_fkey(*)')
  .eq('access_token', token)
  .single()

// 2. Vérifier si déjà signé (via signature_proofs)
const { data: existingProof } = await supabase
  .from('signature_proofs')
  .select('id, created_at')
  .eq('signature_procedure_id', procedureId)
  .eq('signer_email', procedure.signer_email)
  .maybeSingle()

if (existingProof) {
  setSigned(true) // ✅ Afficher page confirmation
  return
}

// 3. Afficher PDF avec bouton "Je signe"
const { data: urlData } = await supabase.storage
  .from('project-files')
  .createSignedUrl(procedure.project_files.storage_path, 3600)

setPdfUrl(urlData.signedUrl)
```

#### Au clic "Je signe" :
```javascript
// 1. Télécharger PDF et calculer hash SHA-256
const response = await fetch(pdfUrl)
const pdfBlob = await response.blob()
const arrayBuffer = await pdfBlob.arrayBuffer()
const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
const documentHash = Array.from(new Uint8Array(hashBuffer))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('')

// 2. Appeler Edge Function internal-signature
const { data: signData } = await supabase.functions.invoke('internal-signature', {
  body: {
    signature_procedure_id: procedureId,
    signer_email: procedure.signer_email,
    signer_user_id: null,  // Anonyme si pas connecté
    pdf_file_id: procedure.file_id,
    pdf_hash: documentHash
  }
})

// 3. Mettre à jour le tableau signers
const updatedSigners = procedure.signers.map(s => 
  s.role === 'principal' && s.email === procedure.signer_email
    ? { ...s, status: 'signed', signed_at: new Date().toISOString() }
    : s
)

// 4. Calculer globalStatus
const hasPendingSigners = updatedSigners.some(s => s.status === 'pending')
const globalStatus = hasPendingSigners ? 'partially_signed' : 'completed'

// 5. UPDATE signature_procedures
await supabase
  .from('signature_procedures')
  .update({
    status: globalStatus,
    signers: updatedSigners,
    signed_at: new Date().toISOString(),
    document_hash: documentHash,
    signature_metadata: { /* IP, device, consent, etc. */ }
  })
  .eq('id', procedureId)
  .eq('access_token', token)

// 6. Si completed → générer PDF signé
if (globalStatus === 'completed') {
  await supabase.functions.invoke('generate-signed-pdf', {
    body: { signature_procedure_id: procedureId }
  })
}
```

---

### 3️⃣ Signature Co-signataire

**Route** : `/sign/cosigner?token=xxx`  
**Composant** : `CosignerSignaturePage.jsx`  
**Accès** : Via email invitation avec token

#### Workflow OTP :
```javascript
// 1. Valider token invitation
const { data: tokenData } = await supabase
  .from('cosigner_invite_tokens')
  .select('*, signature_procedures(*)')
  .eq('token', token)
  .single()

// 2. Demander email
<input type="email" />

// 3. Envoyer OTP à l'email (Edge Function send-cosigner-otp)
await supabase.functions.invoke('send-cosigner-otp', {
  body: { 
    token: token,
    email: cosignerEmail 
  }
})
// → Génère code 6 chiffres, stocke dans cosigner_invite_tokens.otp_code

// 4. Vérifier OTP (Edge Function verify-cosigner-otp)
const { data } = await supabase.functions.invoke('verify-cosigner-otp', {
  body: { 
    token: token,
    otp_code: otpCode 
  }
})
// → Si OK, met used_at = now() et retourne procédure
```

#### Après validation OTP :
```javascript
// Même processus que signataire principal :
// 1. Afficher PDF
// 2. Calculer hash au clic "Je signe"
// 3. Appeler internal-signature
// 4. Mettre à jour signers array
// 5. Calculer globalStatus
// 6. UPDATE signature_procedures
// 7. Si completed → generate-signed-pdf
```

---

### 4️⃣ Edge Function : internal-signature

**Fichier** : `supabase/functions/internal-signature/index.ts`  
**Rôle** : Créer la preuve juridique de signature (conforme eIDAS)

```typescript
Deno.serve(async (req) => {
  const {
    signature_procedure_id,
    signer_email,
    signer_user_id,
    pdf_file_id,
    pdf_hash
  } = await req.json()

  // Extraire IP + User Agent
  const ipHeader = req.headers.get("x-forwarded-for") ?? "0.0.0.0"
  const ip = ipHeader.split(',')[0].trim()
  const userAgent = req.headers.get("user-agent") ?? "unknown"

  // INSERT signature_proofs (preuve juridique)
  await supabase.from("signature_proofs").insert({
    signature_procedure_id,
    signer_email,
    signer_user_id,
    ip_address: ip,           // ← Preuve IP
    user_agent: userAgent,    // ← Preuve device
    pdf_hash: pdf_hash,       // ← Hash SHA-256 du PDF
    pdf_file_id,
    method: "internal"
  })

  // ⚠️ NE MET PLUS À JOUR signature_procedures
  // Le front-end gère status et signed_file_id
  
  return new Response(JSON.stringify({ success: true }))
})
```

**Pourquoi ne plus updater la procédure ?**  
Avant, cette fonction mettait `status = 'signed'` et `signed_file_id = pdf_file_id`, ce qui :
- Écrasait le status calculé par le front-end
- Empêchait `generate-signed-pdf` de s'exécuter (car `signed_file_id` déjà rempli)

---

### 5️⃣ Edge Function : generate-signed-pdf

**Fichier** : `supabase/functions/generate-signed-pdf/index.ts`  
**Rôle** : Générer PDF final avec page de certificat eIDAS

**Déclenchement** : Appelé par le front-end quand `globalStatus === 'completed'`

#### Étapes :
```typescript
// 1. Vérifier que tous ont signé
if (procedure.status !== 'completed') {
  return { error: 'Procédure non complète' }
}

// 2. Vérifier si PDF déjà généré
if (procedure.signed_file_id) {
  return { message: 'PDF déjà généré', signed_file_id: procedure.signed_file_id }
}

// 3. Télécharger PDF original depuis Storage
const { data: pdfData } = await supabaseClient.storage
  .from('project-files')
  .download(procedure.project_files.storage_path)

// 4. Charger avec pdf-lib
const pdfDoc = await PDFDocument.load(pdfBytes)

// 5. Récupérer toutes les preuves de signature
const { data: proofs } = await supabaseClient
  .from('signature_proofs')
  .select('*')
  .eq('signature_procedure_id', signature_procedure_id)
  .order('created_at', { ascending: true })

// 6. Ajouter page de certificat (A4)
const signaturePage = pdfDoc.addPage([595.28, 841.89])
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

// Titre
signaturePage.drawText('CERTIFICAT DE SIGNATURE', { x: 50, y: 800, size: 18 })

// Pour chaque signataire
for (const signer of procedure.signers) {
  const proof = proofs.find(p => p.signer_email === signer.email)
  
  signaturePage.drawText(`• ${signer.name}`, { x: 70, y: yPosition })
  signaturePage.drawText(`  Rôle : ${signer.role === 'principal' ? 'Signataire principal' : 'Co-signataire'}`)
  signaturePage.drawText(`  Date : ${signer.signed_at}`)
  signaturePage.drawText(`  IP : ${proof.ip_address}`)
  signaturePage.drawText(`  Hash : ${proof.pdf_hash.substring(0, 16)}...`)
}

// Mentions légales eIDAS
signaturePage.drawText('Ce document a été signé électroniquement conformément au Règlement eIDAS (UE) n°910/2014.')

// 7. Sauvegarder PDF modifié
const signedPdfBytes = await pdfDoc.save()

// 8. Uploader vers Storage
const signedFileName = `${originalName}_signed_${timestamp}.pdf`
const signedStoragePath = `${prospect_id}/${project_type}/${signedFileName}`

await supabaseClient.storage
  .from('project-files')
  .upload(signedStoragePath, signedPdfBytes, { contentType: 'application/pdf' })

// 9. Créer entrée project_files
const { data: fileRecord } = await supabaseClient
  .from('project_files')
  .insert({
    prospect_id,
    project_type,
    file_name: signedFileName,
    file_type: 'application/pdf',
    file_size: signedPdfBytes.byteLength,
    storage_path: signedStoragePath,
    uploaded_by: null,
    field_label: 'Document signé'  // ← Permet filtrage côté client
  })
  .select()
  .single()

// 10. Mettre à jour signature_procedures avec signed_file_id
await supabaseClient
  .from('signature_procedures')
  .update({
    signed_file_id: fileRecord.id,  // ← Pointe vers le PDF SIGNÉ (pas l'original)
    locked: true
  })
  .eq('id', signature_procedure_id)

// 11. Envoyer emails à tous les signataires (via Resend API)
for (const signer of procedure.signers) {
  const downloadUrl = `${supabaseUrl}/storage/v1/object/public/project-files/${signedStoragePath}`
  
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}` },
    body: JSON.stringify({
      from: 'EVATIME <noreply@evatime.fr>',
      to: [signer.email],
      subject: '✓ Document signé - Téléchargez votre contrat',
      html: `<a href="${downloadUrl}">📄 Télécharger le contrat signé</a>`
    })
  })
}

// 12. Créer notifications admin
await supabaseClient.from('notifications').insert({
  user_id: admin.user_id,
  title: 'Document signé',
  message: `Le contrat pour ${procedure.signers[0].name} a été signé par toutes les parties.`,
  type: 'signature_completed'
})

// 13. Créer notification client
await supabaseClient.from('client_notifications').insert({
  prospect_id,
  project_type,
  title: 'Document signé',
  message: 'Votre contrat est disponible dans l\'onglet Fichiers.'
})

// 14. Message automatique chat
await supabaseClient.from('chat_messages').insert({
  prospect_id,
  project_type,
  sender: 'admin',
  text: '✅ Le contrat a été signé par toutes les parties.'
})
```

---

## 📊 Schéma de données

### signature_procedures
```sql
CREATE TABLE signature_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  project_type TEXT NOT NULL,
  file_id UUID NOT NULL REFERENCES project_files(id),        -- PDF original
  signed_file_id UUID REFERENCES project_files(id),          -- PDF signé généré
  status TEXT DEFAULT 'pending',                             -- pending | partially_signed | completed
  signers JSONB,                                             -- Array [{email, name, role, status, signed_at}]
  access_token TEXT,                                         -- Token signataire principal
  access_token_expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  document_hash TEXT,                                        -- SHA-256 du PDF original
  signature_metadata JSONB DEFAULT '{}',                     -- IP, device, consent, etc.
  locked BOOLEAN DEFAULT false,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### signature_proofs (Preuves juridiques)
```sql
CREATE TABLE signature_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_procedure_id UUID NOT NULL REFERENCES signature_procedures(id),
  signer_email TEXT NOT NULL,
  signer_user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,                                           -- IP du signataire
  user_agent TEXT,                                           -- Device info
  pdf_hash TEXT,                                             -- Hash SHA-256
  pdf_file_id UUID REFERENCES project_files(id),
  method TEXT DEFAULT 'internal',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### cosigner_invite_tokens (Tokens OTP)
```sql
CREATE TABLE cosigner_invite_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  signature_procedure_id UUID NOT NULL REFERENCES signature_procedures(id),
  signer_email TEXT NOT NULL,
  otp_code TEXT,                                             -- Code 6 chiffres
  otp_expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,                           -- Token expire 48h
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 Sécurité & Conformité

### eIDAS Regulation (UE) n°910/2014 Article 26
- ✅ Identité signataire (email + OTP pour co-signataires)
- ✅ Intégrité document (hash SHA-256)
- ✅ Horodatage fiable (timestamp PostgreSQL)
- ✅ Preuve IP + device (signature_proofs)
- ✅ Non-répudiation (certificat dans PDF)

### RLS Policies
```sql
-- Admin peut CRUD dans son organization
CREATE POLICY "Admin CRUD signature_procedures"
  ON signature_procedures FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid() 
      AND organization_id = signature_procedures.organization_id
      AND role IN ('Global Admin', 'Manager', 'Commercial')
  ));

-- Public peut SELECT avec token valide
CREATE POLICY "Public read with token"
  ON signature_procedures FOR SELECT
  TO anon, authenticated
  USING (true);

-- Client peut UPDATE pour signer
CREATE POLICY "Client can sign"
  ON signature_procedures FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM prospects 
    WHERE user_id = auth.uid() 
      AND id = signature_procedures.prospect_id
  ));
```

---

## 🧪 Tests & Debugging

### Tester le workflow complet
```bash
# 1. Admin crée procédure
# Dans ProspectDetailsAdmin → Fichiers → Clic "Envoyer à signer" sur un PDF

# 2. Copier lien signature principal depuis logs console
# https://evatime.fr/sign/XXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXX

# 3. Ouvrir en navigation privée → Signer

# 4. Copier lien co-signataire depuis email (ou logs)
# https://evatime.fr/sign/cosigner?token=YYYYYY-YYYY-YYYY-YYYY-YYYYYYYY

# 5. Entrer email → Recevoir OTP → Signer

# 6. Vérifier dans Supabase Dashboard :
# - signature_procedures.status = 'completed'
# - signature_procedures.signed_file_id pointe vers nouveau fichier
# - signature_proofs contient 2 entrées (principal + cosigner)
# - project_files contient fichier _signed_TIMESTAMP.pdf
```

### Logs Edge Functions
```bash
# Supabase Dashboard → Edge Functions → Logs
# Filtrer par fonction :
# - internal-signature
# - generate-signed-pdf
# - send-cosigner-otp
# - verify-cosigner-otp
```

### Requêtes SQL debug
```sql
-- Voir procédure complète
SELECT 
  sp.id,
  sp.status,
  sp.signers,
  sp.signed_file_id,
  pf_original.file_name AS original_file,
  pf_signed.file_name AS signed_file
FROM signature_procedures sp
LEFT JOIN project_files pf_original ON sp.file_id = pf_original.id
LEFT JOIN project_files pf_signed ON sp.signed_file_id = pf_signed.id
WHERE sp.id = 'PROCEDURE_ID';

-- Voir toutes les preuves
SELECT * FROM signature_proofs 
WHERE signature_procedure_id = 'PROCEDURE_ID'
ORDER BY created_at;

-- Voir tokens OTP
SELECT * FROM cosigner_invite_tokens
WHERE signature_procedure_id = 'PROCEDURE_ID';
```

---

## 🐛 Troubleshooting

### ❌ "PDF déjà généré" alors qu'aucun PDF signé
**Cause** : `signed_file_id` rempli prématurément (pointe vers PDF original au lieu de rester NULL)  
**Solution** : Vérifier que `internal-signature` NE met PAS à jour `signed_file_id`

### ❌ "Procédure non complète" dans generate-signed-pdf
**Cause** : `status !== 'completed'` (peut être 'signed' ou 'partially_signed')  
**Solution** : Vérifier que le front-end calcule bien `globalStatus = 'completed'` quand tous ont signé

### ❌ OTP invalide pour co-signataire
**Cause** : Email saisi différent de `cosigner_invite_tokens.signer_email`  
**Solution** : Case-insensitive comparison dans `verify-cosigner-otp`

### ❌ Page de certificat vide
**Cause** : `procedure.signers` array vide ou `signature_proofs` non trouvées  
**Solution** : Vérifier que front-end update correctement le tableau `signers`

---

## 📈 Améliorations futures

- [ ] Signature électronique qualifiée (QES) avec certificat numérique
- [ ] Support multi-documents (plusieurs PDF dans une procédure)
- [ ] Rappels automatiques pour signataires en attente
- [ ] Export preuves de signature en ZIP (conformité archivage)
- [ ] Signature manuscrite graphique (canvas HTML5)
- [ ] Intégration DocuSign / Adobe Sign en fallback

---

**Version** : 1.0.0  
**Date** : 14 janvier 2026  
**Auteur** : EVATIME Dev Team
