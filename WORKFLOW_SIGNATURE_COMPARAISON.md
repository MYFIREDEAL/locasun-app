# 🔄 Comparaison Workflows Signature : Principal vs Co-signataire

## 📊 Tableau Comparatif

| Aspect | Signataire Principal | Co-signataire |
|--------|---------------------|---------------|
| **Route** | `/sign/:procedureId?token=xxx` | `/sign/cosigner?token=xxx` |
| **Composant** | `SignaturePage.jsx` | `CosignerSignaturePage.jsx` |
| **Token URL** | `access_token` (dans `signature_procedures`) | `token` (dans `cosigner_invite_tokens`) |
| **Authentification** | Aucune (accès direct) | OTP par email |
| **Table de vérification** | `signature_procedures.status` | `signature_procedures.signers[].status` |

---

## 🎯 SIGNATAIRE PRINCIPAL - Workflow Détaillé

### 1️⃣ Premier clic sur le lien
```
URL: /sign/abc-123?token=xyz-789

┌─────────────────────────────────────┐
│   SignaturePage.jsx (useEffect)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SELECT * FROM signature_procedures │
│  WHERE id = 'abc-123'               │
│  AND access_token = 'xyz-789'       │
└─────────────────────────────────────┘
              ↓
    proc.status === 'pending' ✅
              ↓
┌─────────────────────────────────────┐
│   Afficher le PDF + Bouton Signer   │
└─────────────────────────────────────┘
```

### 2️⃣ Signature
```
Utilisateur clique sur "Signer"
              ↓
┌─────────────────────────────────────┐
│   Calculer hash SHA-256 du PDF      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   INSERT INTO signature_proofs      │
│   (hash, email, procedure_id, ...)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   UPDATE signature_procedures       │
│   SET status = 'signed'             │
│   WHERE id = 'abc-123'              │
└─────────────────────────────────────┘
              ↓
        setSigned(true) ✅
              ↓
┌─────────────────────────────────────┐
│   Page: "✅ Signature enregistrée"  │
└─────────────────────────────────────┘
```

### 3️⃣ Reclic sur le lien (APRÈS signature)
```
URL: /sign/abc-123?token=xyz-789

┌─────────────────────────────────────┐
│   SignaturePage.jsx (useEffect)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SELECT * FROM signature_procedures │
│  WHERE id = 'abc-123'               │
│  AND access_token = 'xyz-789'       │
└─────────────────────────────────────┘
              ↓
    proc.status === 'signed' ✅
              ↓
        setSigned(true) ✅
              ↓
┌─────────────────────────────────────┐
│   Page: "✅ Signature enregistrée"  │
│   (IMMÉDIAT, pas de formulaire)     │
└─────────────────────────────────────┘
```

---

## 🎯 CO-SIGNATAIRE - Workflow Détaillé

### 1️⃣ Premier clic sur le lien
```
URL: /sign/cosigner?token=def-456

┌─────────────────────────────────────┐
│ CosignerSignaturePage.jsx (useEffect)│
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SELECT * FROM cosigner_invite_tokens│
│  WHERE token = 'def-456'            │
└─────────────────────────────────────┘
              ↓
    tokenData { procedure_id, email }
              ↓
┌─────────────────────────────────────┐
│  SELECT * FROM signature_procedures │
│  WHERE id = procedure_id            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Chercher dans proc.signers[]       │
│  WHERE email = tokenData.email      │
│  AND role = 'cosigner'              │
└─────────────────────────────────────┘
              ↓
    cosigner.status === 'pending' ✅
              ↓
┌─────────────────────────────────────┐
│   handleRequestOtp()                │
│   → Envoie OTP par email            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Formulaire: "Entrez le code OTP"  │
└─────────────────────────────────────┘
```

### 2️⃣ Validation OTP + Signature
```
Utilisateur entre le code OTP
              ↓
┌─────────────────────────────────────┐
│   verify-cosigner-otp (Edge Func)   │
│   Vérifie hash OTP                  │
└─────────────────────────────────────┘
              ↓
    OTP valide ✅
              ↓
┌─────────────────────────────────────┐
│   Afficher le PDF + Bouton Signer   │
└─────────────────────────────────────┘
              ↓
Utilisateur clique sur "Signer"
              ↓
┌─────────────────────────────────────┐
│   Calculer hash SHA-256 du PDF      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   INSERT INTO signature_proofs      │
│   (hash, email, procedure_id, ...)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   UPDATE signature_procedures       │
│   SET signers = [                   │
│     { email: 'cosigner@...', ...    │
│       status: 'signed',             │
│       signed_at: '2026-01-13...' }  │
│   ]                                 │
└─────────────────────────────────────┘
              ↓
        setSigned(true) ✅
              ↓
┌─────────────────────────────────────┐
│   Page: "✅ Signature enregistrée"  │
└─────────────────────────────────────┘
```

### 3️⃣ Reclic sur le lien (APRÈS signature) - ⭐ FIX APPLIQUÉ
```
URL: /sign/cosigner?token=def-456

┌─────────────────────────────────────┐
│ CosignerSignaturePage.jsx (useEffect)│
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  SELECT * FROM cosigner_invite_tokens│
│  WHERE token = 'def-456'            │
└─────────────────────────────────────┘
              ↓
    tokenData { procedure_id, email }
              ↓
┌─────────────────────────────────────┐
│  SELECT * FROM signature_procedures │
│  WHERE id = procedure_id            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Chercher dans proc.signers[]       │
│  WHERE email = tokenData.email      │
│  AND role = 'cosigner'              │
└─────────────────────────────────────┘
              ↓
    cosigner.status === 'signed' ✅
              ↓
        setSigned(true) ✅
        return; // ❌ NE PAS appeler handleRequestOtp()
              ↓
┌─────────────────────────────────────┐
│   Page: "✅ Signature enregistrée"  │
│   (IMMÉDIAT, pas de formulaire OTP) │
└─────────────────────────────────────┘
```

---

## ✅ Points de Vérification - Pas de Conflit

### 1. URLs Différentes
- **Principal** : `/sign/:procedureId?token=access_token`
- **Co-signataire** : `/sign/cosigner?token=invite_token`

→ ✅ **Pas de collision**, routes séparées

### 2. Tables de Token Différentes
- **Principal** : `signature_procedures.access_token`
- **Co-signataire** : `cosigner_invite_tokens.token`

→ ✅ **Pas de collision**, tokens différents

### 3. Méthode de Vérification
- **Principal** : `proc.status === 'signed'` (champ global)
- **Co-signataire** : `proc.signers[].status === 'signed'` (tableau JSON)

→ ✅ **Pas de collision**, champs différents

### 4. Logique de Détection "Déjà Signé"
**Principal** :
```javascript
if (proc.status === 'signed') {
  setSigned(true);
  return; // Ne charge pas le PDF
}
```

**Co-signataire** :
```javascript
const cosigner = proc.signers?.find(
  s => s.email === email && s.role === 'cosigner'
);
if (cosigner?.status === 'signed') {
  setSigned(true);
  return; // Ne demande pas l'OTP
}
```

→ ✅ **Même pattern**, adapté au contexte

---

## 🔐 Sécurité - RLS Policies

### Signataire Principal
```sql
-- Policy: Accès public avec access_token
CREATE POLICY "public_access_with_token"
ON signature_procedures
FOR SELECT
USING (access_token IS NOT NULL);
```

### Co-signataire
```sql
-- Policy: Accès via cosigner_invite_tokens
CREATE POLICY "cosigner_access"
ON signature_procedures
FOR SELECT
USING (
  id IN (
    SELECT signature_procedure_id 
    FROM cosigner_invite_tokens
  )
);
```

→ ✅ **Pas de conflit**, policies séparées

---

## 📝 Structure du Champ `signers` (JSONB)

```json
{
  "signers": [
    {
      "role": "principal",
      "email": "client@example.com",
      "name": "Jean Dupont",
      "status": "signed",
      "signed_at": "2026-01-13T10:30:00Z",
      "access_token": "xyz-789",
      "requires_auth": true
    },
    {
      "role": "cosigner",
      "email": "conjoint@example.com",
      "name": "Marie Dupont",
      "status": "signed",
      "signed_at": "2026-01-13T11:45:00Z",
      "access_token": "abc-123",
      "requires_auth": false
    }
  ]
}
```

---

## ✅ Conclusion - Pas de Conflit

| Critère | Conflit Possible ? | Raison |
|---------|-------------------|--------|
| Routes | ❌ NON | URLs différentes |
| Tokens | ❌ NON | Tables différentes |
| Champs BDD | ❌ NON | `status` (global) vs `signers[].status` (tableau) |
| Logique code | ❌ NON | Même pattern adapté |
| Sécurité RLS | ❌ NON | Policies séparées |
| Workflow utilisateur | ❌ NON | OTP uniquement pour co-signataires |

**Résultat** : ✅ **AUCUN CONFLIT** - Les deux workflows sont **totalement indépendants** et utilisent des mécanismes différents tout en partageant la même logique de détection "déjà signé".

---

## 🚀 Avantages du Fix

1. **Cohérence** : Co-signataire suit le même pattern que le principal
2. **Performance** : 1 requête au lieu de 2 (pas besoin de `signature_proofs`)
3. **Simplicité** : Pas de race condition React
4. **Maintenabilité** : Code facile à comprendre et déboguer
5. **Expérience utilisateur** : Pas d'email OTP inutile

**Date**: 2026-01-13  
**Status**: ✅ Fix validé, pas de conflit détecté
