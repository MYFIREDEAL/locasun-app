# ✅ CHECKLIST POST-DÉPLOIEMENT - Sécurisation cosigner_invite_tokens

## 🎯 OBJECTIF
Valider que la sécurisation RLS de `cosigner_invite_tokens` fonctionne correctement.

---

## 📋 TESTS À EFFECTUER DANS SUPABASE SQL EDITOR

### ✅ TEST 1 : Vérifier RLS activé
```sql
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'cosigner_invite_tokens';
-- Résultat attendu: true
```

### ✅ TEST 2 : Lister les policies
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'cosigner_invite_tokens';
-- Résultat attendu: 1 policy "Admins can view org tokens" (SELECT)
```

### ✅ TEST 3 : Vérifier que RPC existe
```sql
SELECT proname, proargnames, prosecdef
FROM pg_proc
WHERE proname = 'get_cosigner_token_info';
-- Résultat attendu: 1 ligne, prosecdef = true (SECURITY DEFINER)
```

### ✅ TEST 4 : Tester RPC avec token valide
```sql
-- Remplacer 'YOUR_VALID_TOKEN' par un vrai token de test
SELECT * FROM get_cosigner_token_info('YOUR_VALID_TOKEN');
-- Résultat attendu: 1 ligne avec signature_procedure_id, signer_email, is_valid = true
```

### ✅ TEST 5 : Tester RPC avec token expiré
```sql
-- Remplacer 'YOUR_EXPIRED_TOKEN' par un token expiré
SELECT * FROM get_cosigner_token_info('YOUR_EXPIRED_TOKEN');
-- Résultat attendu: 1 ligne avec is_valid = false
```

### ✅ TEST 6 : Tester RPC avec token inexistant
```sql
SELECT * FROM get_cosigner_token_info('fake-token-12345');
-- Résultat attendu: 0 ligne (résultat vide, pas d'erreur)
```

### ✅ TEST 7 : Vérifier isolation admin (avec compte admin)
```sql
-- Se connecter en tant qu'admin d'une organisation
-- Puis exécuter (remplacer org_id par votre organization_id)
SELECT cit.*
FROM cosigner_invite_tokens cit
JOIN signature_procedures sp ON sp.id = cit.signature_procedure_id
JOIN prospects p ON p.id = sp.prospect_id
WHERE p.organization_id = 'YOUR_ORG_ID';
-- Résultat attendu: Tokens de votre org uniquement
```

### ✅ TEST 8 : Vérifier qu'accès direct public est bloqué
```sql
-- Exécuter via PostgREST (anon key) ou client Supabase non authentifié
-- const { data } = await supabase.from('cosigner_invite_tokens').select('*')
-- Résultat attendu: Aucune ligne retournée (RLS bloque)
```

---

## 🔧 TESTS À EFFECTUER DANS L'APPLICATION

### ✅ TEST 9 : Page CosignerSignaturePage avec token valide
1. Créer une procédure de signature avec co-signataire
2. Récupérer le lien d'invitation (avec token)
3. Ouvrir le lien dans un navigateur privé (non authentifié)
4. **Résultat attendu** :
   - ❌ ERREUR car le code frontend utilise encore SELECT direct
   - **Note** : Frontend devra être modifié pour utiliser RPC

### ✅ TEST 10 : Vérifier que Edge Function fonctionne
```bash
# Tester l'envoi d'OTP (Edge Function utilise SERVICE_ROLE)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-cosigner-otp \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_VALID_TOKEN"}'
# Résultat attendu: OTP envoyé (Edge Function bypass RLS avec SERVICE_ROLE)
```

### ✅ TEST 11 : Vérifier logs Supabase
1. Aller dans Supabase Dashboard → Database → Logs
2. Chercher erreurs liées à `cosigner_invite_tokens`
3. **Résultat attendu** : Aucune erreur RLS pour Edge Functions

---

## 🚨 POINTS D'ATTENTION

### ⚠️ FRONTEND PAS ENCORE ADAPTÉ
Le fichier `CosignerSignaturePage.jsx` utilise encore :
```javascript
const { data: tokenData } = await supabase
  .from('cosigner_invite_tokens')
  .select('signature_procedure_id, signer_email')
  .eq('token', token)
  .single();
```

**Ce code VA ÉCHOUER** après déploiement du SQL car :
- RLS bloque SELECT direct pour utilisateurs non authentifiés
- Il faut remplacer par appel RPC

### 📝 MODIFICATION FRONTEND REQUISE (PHASE 2)
```javascript
// AVANT (ne fonctionne plus)
const { data: tokenData } = await supabase
  .from('cosigner_invite_tokens')
  .select('signature_procedure_id, signer_email')
  .eq('token', token)
  .single();

// APRÈS (à implémenter)
const { data: tokenData, error } = await supabase
  .rpc('get_cosigner_token_info', { p_token: token });

if (!tokenData || tokenData.length === 0) {
  setError('Lien invalide');
  return;
}

const tokenInfo = tokenData[0]; // RPC retourne un tableau

if (!tokenInfo.is_valid) {
  setError('Ce lien a expiré');
  return;
}

// Utiliser tokenInfo.signature_procedure_id et tokenInfo.signer_email
```

---

## ✅ CRITÈRES DE VALIDATION

| Test | Statut | Notes |
|------|--------|-------|
| RLS activé | ☐ | |
| 1 seule policy SELECT | ☐ | |
| RPC existe | ☐ | |
| RPC token valide OK | ☐ | |
| RPC token expiré détecté | ☐ | |
| RPC token fake = vide | ☐ | |
| Admin voit sa org uniquement | ☐ | |
| Accès public direct bloqué | ☐ | |
| Edge Functions OK | ☐ | |
| Aucune erreur logs | ☐ | |

**Déploiement validé si : 10/10 tests passent ✅**

---

## 🛑 EN CAS D'ÉCHEC

**Ne pas déployer en production tant que :**
1. Frontend n'est pas adapté (risque de casser page signature)
2. Tests en environnement de dev pas concluants
3. ChatGPT/Jack n'ont pas validé

**Rollback si nécessaire :**
```sql
-- Réactiver l'ancienne policy (temporaire)
CREATE POLICY "Public can read own token" ON public.cosigner_invite_tokens
FOR SELECT USING (true);
```
