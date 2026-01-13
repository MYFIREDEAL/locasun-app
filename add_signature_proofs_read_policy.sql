-- 🔓 Ajouter une policy de lecture publique sur signature_proofs
-- Permet à n'importe qui de lire les preuves de signature (pour vérifier "déjà signé")

CREATE POLICY "Allow public read on signature_proofs"
ON signature_proofs
FOR SELECT
TO anon, authenticated
USING (true);

-- ✅ Cette policy permet :
-- - Au signataire principal de vérifier s'il a déjà signé
-- - Au co-signataire de vérifier s'il a déjà signé
-- - Pas de risque : les preuves sont publiques (comme un registre)
