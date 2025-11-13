-- FIX URGENT: Éviter la récursion infinie avec une fonction SECURITY DEFINER

-- 1. Supprimer la policy qui cause la récursion
DROP POLICY IF EXISTS "Global Admin can manage all users" ON public.users;

-- 2. Créer une fonction qui vérifie le role SANS activer les RLS policies
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Exécute avec les droits du créateur (bypass RLS)
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users
    WHERE user_id = auth.uid() 
    AND role = 'Global Admin'
  );
$$;

-- 3. Recréer la policy en utilisant la fonction
CREATE POLICY "Global Admin can manage all users"
  ON public.users
  FOR ALL
  USING (public.is_global_admin());

-- 4. Grant EXECUTE sur la fonction
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;
