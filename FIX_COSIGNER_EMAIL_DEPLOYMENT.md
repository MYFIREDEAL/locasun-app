# ✅ FIX : Email Invitation Co-signataire (EMAIL #1)

## 🎯 PROBLÈME RÉSOLU

L'Edge Function `send-cosigner-invite` existait mais **ne générait aucun log visible**.
→ Impossible de debugger pourquoi les emails n'étaient pas envoyés.

## 🔧 MODIFICATIONS APPORTÉES

### Fichier modifié : `supabase/functions/send-cosigner-invite/index.ts`

**Ajouts :**
- ✅ `console.log('🚀 send-cosigner-invite: Démarrage')` au début
- ✅ `console.log('📩 Procédure ID reçu:', signature_procedure_id)`
- ✅ `console.log('📋 Procédure récupérée:', { found: !!procedure, signersCount: ... })`
- ✅ `console.log('👥 Cosigners pending:', pendingCosigners.length, ...)`
- ✅ `console.log('⚠️ Aucun cosigner pending - arrêt')` si aucun cosigner
- ✅ `console.log('📧 Envoi emails aux cosigners...')`
- ✅ `console.log('📤 Traitement cosigner:', email)` pour chaque cosigner
- ✅ `console.log('✅ Token créé pour ...:', token)`
- ✅ `console.log('📮 Envoi email Resend à ...', email)`
- ✅ `console.log('✅ Email envoyé via Resend:', resendData)` OU `console.error('❌ ...')`
- ✅ `console.log('🎉 Traitement terminé - emails envoyés')`
- ✅ `console.error('❌ Erreur send-cosigner-invite:', error)` dans le catch

**Changement supplémentaire :**
- ✅ Cast `(error as Error).message` pour éviter erreur TypeScript `'error' is of type 'unknown'`

---

## 📤 DÉPLOIEMENT (À FAIRE PAR JACK)

### Option 1 : Via Supabase Dashboard (⭐ Recommandé)

1. **Aller sur** : https://supabase.com/dashboard
2. **Sélectionner** votre projet LOCASUN
3. **Aller dans** : Edge Functions (icône ⚡)
4. **Cliquer** sur `send-cosigner-invite` (ou "Create new function" si elle n'existe pas)
5. **Copier-coller** le contenu de `supabase/functions/send-cosigner-invite/index.ts`
6. **Cliquer** sur "Deploy"

### Option 2 : Via CLI Supabase (si installée)

```bash
# Dans le dossier racine du projet
cd "/Users/jackluc/Desktop/LOCASUN  SUPABASE"

# Déployer l'Edge Function
npx supabase functions deploy send-cosigner-invite

# OU si la CLI est installée globalement
supabase functions deploy send-cosigner-invite
```

---

## 🧪 VALIDATION ATTENDUE

Après déploiement, quand un admin **lance une signature avec co-signataires** :

### 1️⃣ Dans Supabase Dashboard → Edge Functions → Logs

Vous devriez voir :

```
🚀 send-cosigner-invite: Démarrage
📩 Procédure ID reçu: <uuid>
📋 Procédure récupérée: { found: true, signersCount: 2 }
👥 Cosigners pending: 1 ['cosigner@email.com']
📧 Envoi emails aux cosigners...
📤 Traitement cosigner: cosigner@email.com
✅ Token créé pour cosigner@email.com: abc12345...
📮 Envoi email Resend à cosigner@email.com
✅ Email envoyé via Resend: { id: 're_...' }
🎉 Traitement terminé - emails envoyés
```

### 2️⃣ Dans Resend Dashboard

- Aller sur : https://resend.com/emails
- Vérifier qu'un email **"Invitation à signer un document"** a été envoyé
- Destinataire : l'email du co-signataire
- Statut : **Sent** (ou Delivered si reçu)

### 3️⃣ Dans la boîte email du co-signataire

- Email reçu avec bouton **"Accéder au document"**
- Lien au format : `https://evatime.fr/sign/cosigner?token=<uuid>`

---

## 📍 POINT D'APPEL FRONTEND

L'appel à `send-cosigner-invite` est **DÉJÀ EN PLACE** dans :

**Fichier** : `src/components/admin/ProspectDetailsAdmin.jsx`  
**Lignes** : 722-732

```javascript
// 🔥 ENVOYER EMAIL AUX CO-SIGNATAIRES via Edge Function
if (cosigners.length > 0) {
  try {
    const { data: inviteResult, error: inviteError } = await supabase.functions.invoke('send-cosigner-invite', {
      body: { signature_procedure_id: signatureProcedure.id }
    });

    if (inviteError) {
      logger.error('❌ Erreur envoi invitations co-signataires', inviteError);
    } else {
      logger.info('✅ Invitations envoyées aux co-signataires', { sent: inviteResult?.sent || 0 });
    }
  } catch (err) {
    logger.error('❌ Erreur send-cosigner-invite', err);
  }
}
```

✅ **Aucune modification frontend n'est nécessaire** - le code appelle déjà l'Edge Function.

---

## 🚨 PRÉREQUIS VARIABLES D'ENVIRONNEMENT

L'Edge Function utilise ces variables Supabase :

- ✅ `SUPABASE_URL` (auto)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto)
- ⚠️ `FRONTEND_URL` (à configurer dans Supabase → Settings → Edge Functions → Secrets)
- ⚠️ `RESEND_API_KEY` (à configurer dans Supabase → Settings → Edge Functions → Secrets)

**Vérifier dans Supabase Dashboard** :
1. Settings → Edge Functions → Secrets
2. Ajouter si manquantes :
   - `FRONTEND_URL` = `https://evatime.fr`
   - `RESEND_API_KEY` = `re_...` (votre clé Resend)

---

## 📝 COMMIT

```bash
git add supabase/functions/send-cosigner-invite/index.ts
git add FIX_COSIGNER_EMAIL_DEPLOYMENT.md
git commit -m "fix: add console.log to send-cosigner-invite Edge Function for debugging"
git push
```

---

## 📸 CAPTURE LOG ATTENDUE

Après déploiement et test, capture écran de :

1. **Supabase → Edge Functions → send-cosigner-invite → Logs**  
   → Montrant les console.log exécutés

2. **Resend Dashboard → Emails**  
   → Montrant l'email "Invitation à signer" envoyé

3. **Boîte email du co-signataire**  
   → Email reçu avec lien `/sign/cosigner?token=...`

---

## ✅ CHECKLIST VALIDATION

- [ ] Edge Function déployée via Dashboard Supabase
- [ ] Variables `FRONTEND_URL` et `RESEND_API_KEY` configurées
- [ ] Test : Admin lance signature avec ≥1 co-signataire
- [ ] Logs Supabase affichent les console.log (🚀📩📋👥📧etc.)
- [ ] Email visible dans Resend Dashboard
- [ ] Email reçu par co-signataire avec bon lien

---

**Dev** : GitHub Copilot (VS Code)  
**PO** : Jack  
**Architecte** : ChatGPT  
**Équipe** : EVATIME 🚀
