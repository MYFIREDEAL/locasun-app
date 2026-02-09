-- 🔧 Fix: Ajouter colonne metadata à chat_messages pour le système de présence
-- Exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Vérifier
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' AND column_name = 'metadata';
