import { supabase } from "../lib/supabase";
import { useAppContext } from "../App";

export function useSafeSupabase() {
  const { session } = useAppContext();

  if (!session || !session.user) {
    console.warn(
      "%c🛑 EVATIME PARE-FEU ACTIVÉ",
      "color: #ff4444; font-weight: bold; font-size: 14px;"
    );
    console.warn("👉 Requête Supabase bloquée : utilisateur non authentifié.");
    console.warn("👉 Le RLS est protégé.");
    throw new Error("EVATIME_FIREWALL_BLOCKED");
  }

  return supabase;
}
