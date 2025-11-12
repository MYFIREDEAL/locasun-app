-- 1. Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Users can insert their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own and authorized appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view shared appointments" ON public.appointments;

-- 2. Créer des politiques simples et permissives
CREATE POLICY "allow_all_insert_appointments"
ON public.appointments FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "allow_all_select_appointments"
ON public.appointments FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_all_update_appointments"
ON public.appointments FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_delete_appointments"
ON public.appointments FOR DELETE
TO public
USING (true);
