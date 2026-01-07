# Déploiement de l'Edge Function internal-signature

## Option 1 : Via Supabase Dashboard (RECOMMANDÉ)

1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet
3. Va dans **Edge Functions** (dans le menu de gauche)
4. Clique sur **Create a new function**
5. Nom : `internal-signature`
6. Copie le code de `supabase/functions/internal-signature/index.ts`
7. Clique sur **Deploy function**

## Option 2 : Via CLI

```bash
# Se connecter à Supabase
npx supabase login

# Lier le projet local
npx supabase link --project-ref [TON_PROJECT_REF]

# Déployer la fonction
npx supabase functions deploy internal-signature --no-verify-jwt
```

## Test après déploiement

Une fois déployée, clique sur "Je signe le contrat" sur la page de signature.
Ça devrait :
1. Calculer le hash SHA-256 du PDF
2. Appeler l'Edge Function
3. Créer une ligne dans `signature_proofs`
4. Mettre à jour `signature_procedures.status = 'signed'`
5. Afficher "✅ Contrat signé avec succès"
6. Rediriger vers le dashboard client

## Vérification

Après signature, vérifie dans Supabase Dashboard :
- Table `signature_proofs` → nouvelle ligne avec le hash
- Table `signature_procedures` → status = 'signed', signed_at rempli
