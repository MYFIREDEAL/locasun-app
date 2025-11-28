-- 🔥 DÉSACTIVER LA CONFIRMATION D'EMAIL POUR LES MAGIC LINKS
-- Exécuter dans Supabase SQL Editor

-- ============================================
-- MÉTHODE 1 : Confirmer tous les emails existants
-- ============================================
-- Confirmer automatiquement tous les comptes en attente
-- Note: confirmed_at est une colonne générée, on ne peut pas la modifier directement
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL
  AND email IS NOT NULL;

-- ============================================
-- MÉTHODE 2 : Modifier la table auth pour autoconfirm
-- ============================================
-- Cette modification fait que tous les nouveaux signups seront auto-confirmés
-- Note: Cela peut ne pas persister après un redémarrage Supabase

-- Créer une fonction trigger pour auto-confirmer les nouveaux users
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirmer l'email lors de la création du user
  -- Note: confirmed_at est une colonne générée, elle se mettra à jour automatiquement
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que tous les users sont confirmés
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Non confirmé'
    ELSE '✅ Confirmé'
  END as statut
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- TEST
-- ============================================
-- Pour tester, inscris un nouveau client et vérifie que :
-- 1. Il reçoit un Magic Link (pas un email de confirmation)
-- 2. email_confirmed_at est automatiquement rempli
-- 3. Il peut se connecter directement après avoir cliqué sur le Magic Link

-- ============================================
-- ROLLBACK (si besoin d'annuler)
-- ============================================
-- DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
-- DROP FUNCTION IF EXISTS public.auto_confirm_user();
