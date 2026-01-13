# 🔧 FIX: Détection Co-signataire Déjà Signé

## 🐛 Problème Identifié

Quand un **co-signataire** clique sur son lien de signature après avoir **déjà signé**, le système :
- ❌ Lui redemande le code OTP
- ❌ Ne détecte pas qu'il a déjà signé
- ❌ Lui permet de "signer" à nouveau (comportement différent du signataire principal)

### Comportement Attendu (comme le signataire principal)
Quand un utilisateur qui a **déjà signé** reclique sur son lien :
- ✅ Il doit être **redirigé directement** vers la page de confirmation
- ✅ Message : "✅ Signature enregistrée !"
- ✅ Pas de demande d'OTP inutile

---

## ✅ Solution Implémentée

### 1. **Backend**: `send-cosigner-otp` (Edge Function)
**Fichier**: `supabase/functions/send-cosigner-otp/index.ts`

**Modification**: Vérifier `signature_proofs` AVANT d'envoyer l'OTP

```typescript
// ✅ VÉRIFIER SI LE CO-SIGNATAIRE A DÉJÀ SIGNÉ
const { data: existingProof } = await supabaseClient
  .from('signature_proofs')
  .select('id, created_at')
  .eq('signature_procedure_id', tokenData.signature_procedure_id)
  .eq('signer_email', tokenData.signer_email)
  .single()

if (existingProof) {
  console.log('✅ Co-signataire a déjà signé, redirection vers confirmation')
  return new Response(
    JSON.stringify({ 
      already_signed: true,
      message: 'Vous avez déjà signé ce document',
      signed_at: existingProof.created_at
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

**Logique**:
1. Vérifier si `signature_proofs` contient une entrée pour ce `signer_email` + `signature_procedure_id`
2. Si OUI → Retourner `{ already_signed: true }`
3. Si NON → Générer et envoyer l'OTP normalement

---

### 2. **Frontend**: `CosignerSignaturePage.jsx`
**Fichier**: `src/pages/CosignerSignaturePage.jsx`

#### 2.1. Gestion Réponse `already_signed` dans `handleRequestOtp`

```javascript
const { data, error: otpError } = await supabase.functions.invoke('send-cosigner-otp', {
  body: { token },
});

// ✅ Vérifier si le co-signataire a déjà signé
if (data?.already_signed) {
  logger.info('Co-signataire a déjà signé', { signedAt: data.signed_at });
  setSigned(true); // Afficher la page de confirmation
  setLoading(false);
  return;
}
```

#### 2.2. Vérification au Montage du Composant (useEffect)

```javascript
useEffect(() => {
  if (!token) {
    setError('Token manquant');
    return;
  }

  // ✅ Fonction pour vérifier si déjà signé avant de demander OTP
  const checkIfAlreadySigned = async () => {
    try {
      setLoading(true);
      
      // Récupérer les infos du token
      const { data: tokenData } = await supabase
        .from('cosigner_invite_tokens')
        .select('signature_procedure_id, signer_email')
        .eq('token', token)
        .single();

      if (tokenData) {
        // Vérifier si une preuve de signature existe déjà
        const { data: existingProof } = await supabase
          .from('signature_proofs')
          .select('id, created_at')
          .eq('signature_procedure_id', tokenData.signature_procedure_id)
          .eq('signer_email', tokenData.signer_email)
          .single();

        if (existingProof) {
          logger.info('Co-signataire a déjà signé, redirection vers confirmation');
          setSigned(true);
          setLoading(false);
          return;
        }
      }
      
      setLoading(false);
    } catch (err) {
      logger.error('Erreur vérification signature existante', err);
      setLoading(false);
    }
  };

  // Vérifier si déjà signé AVANT de demander l'OTP
  checkIfAlreadySigned().then(() => {
    // Si pas déjà signé, demander l'OTP...
  });
}, [token]);
```

**Logique**:
1. Au montage du composant, **vérifier directement** dans `signature_proofs`
2. Si trouvé → `setSigned(true)` → Afficher page de confirmation
3. Si non trouvé → Demander l'OTP normalement

---

## 🔍 Tests de Validation

### Scénario 1: Premier clic du co-signataire
1. Co-signataire clique sur son lien de signature
2. ✅ Code OTP envoyé par email
3. ✅ Formulaire de saisie OTP affiché

### Scénario 2: Co-signataire re-clique APRÈS avoir signé
1. Co-signataire a déjà signé (preuve dans `signature_proofs`)
2. Co-signataire reclique sur le lien
3. ✅ **Redirection immédiate** vers page de confirmation
4. ✅ Message : "✅ Signature enregistrée !"
5. ✅ **AUCUN** code OTP envoyé

### Scénario 3: Co-signataire a reçu OTP mais n'a pas encore signé
1. Co-signataire a reçu l'OTP
2. Co-signataire reclique sur le lien (avant de signer)
3. ✅ Nouvel OTP généré et envoyé
4. ✅ Formulaire de saisie OTP affiché

---

## 📊 Requêtes de Diagnostic

### Voir tous les co-signataires ayant signé
```sql
SELECT 
  cit.signer_email,
  sp.id AS procedure_id,
  sp.status AS procedure_status,
  sproof.created_at AS signed_at
FROM cosigner_invite_tokens cit
JOIN signature_procedures sp ON cit.signature_procedure_id = sp.id
JOIN signature_proofs sproof ON sproof.signature_procedure_id = sp.id 
  AND sproof.signer_email = cit.signer_email
ORDER BY sproof.created_at DESC;
```

### Trouver les doublons (si un co-signataire a signé plusieurs fois)
```sql
SELECT 
  signer_email,
  signature_procedure_id,
  COUNT(*) AS nombre_signatures
FROM signature_proofs
GROUP BY signer_email, signature_procedure_id
HAVING COUNT(*) > 1;
```

---

## 🚀 Déploiement

### 1. Déployer la fonction Edge
```bash
cd "/Users/jackluc/Desktop/LOCASUN  SUPABASE"
supabase functions deploy send-cosigner-otp
```

### 2. Tester en local (si besoin)
```bash
supabase functions serve send-cosigner-otp --env-file supabase/.env.local
```

### 3. Vérifier les logs
```bash
supabase functions logs send-cosigner-otp
```

---

## 🎯 Impact

| Aspect | Avant | Après |
|--------|-------|-------|
| **Co-signataire reclique (déjà signé)** | ❌ Redemande OTP | ✅ Page de confirmation |
| **Emails OTP inutiles** | ❌ Envoyés | ✅ Bloqués |
| **Expérience utilisateur** | ❌ Confuse | ✅ Cohérente avec signataire principal |
| **Vérifications backend** | ❌ Aucune | ✅ Vérification `signature_proofs` |

---

## 📝 Notes Techniques

- **Table clé**: `signature_proofs` (contient `signer_email` + `signature_procedure_id`)
- **Champ de liaison**: `cosigner_invite_tokens.signature_procedure_id`
- **Performance**: 1 requête SQL supplémentaire (index sur `signer_email` + `signature_procedure_id` recommandé)
- **Compatibilité**: Aucun impact sur les procédures existantes

---

## ✅ Checklist de Validation

- [x] Modification `send-cosigner-otp/index.ts`
- [x] Modification `CosignerSignaturePage.jsx`
- [x] Vérification au montage du composant
- [x] Gestion de la réponse `already_signed`
- [x] Fichier SQL de diagnostic créé
- [ ] Tests manuels (scénarios 1, 2, 3)
- [ ] Déploiement fonction Edge
- [ ] Validation en production

**Date**: 2026-01-13  
**Fix ID**: `COSIGN-ALREADY-SIGNED-DETECTION`
