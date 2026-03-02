import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// Edge Function: generate-integration-key
// ============================================================================
// OBJECTIF: Générer une clé d'intégration sécurisée pour une organisation.
//           Seul un Global Admin authentifié peut appeler cette fonction.
//
// SÉCURITÉ:
//   - Auth via JWT Supabase (supabase.auth.getUser)
//   - Vérification rôle Global Admin dans public.users
//   - Désactivation de toutes les anciennes clés de l'org
//   - Clé brute retournée UNE SEULE FOIS, jamais stockée
//   - Seul le hash SHA-256 est persisté
//
// ENDPOINT: POST /functions/v1/generate-integration-key
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Hash SHA-256 d'une string
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Générer une string aléatoire de N caractères (hex)
 */
function generateRandomKey(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Réponse JSON standardisée
 */
function jsonResponse(body: Record<string, unknown>, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  // ── CORS preflight ──
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── POST uniquement ──
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Authentifier l'utilisateur via JWT
    // ══════════════════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'NOT_AUTHENTICATED', message: 'Connexion requise' }, 401)
    }

    // Client Supabase avec le JWT de l'utilisateur (anon key + auth header)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'NOT_AUTHENTICATED', message: 'Session invalide' }, 401)
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 2: Vérifier rôle Global Admin + récupérer organization_id
    // ══════════════════════════════════════════════════════════════
    // Utiliser service_role pour lire les users (pas de restriction RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('user_id, role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (userError || !userData) {
      return jsonResponse({ success: false, error: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' }, 403)
    }

    if (userData.role !== 'Global Admin') {
      return jsonResponse({ success: false, error: 'FORBIDDEN', message: 'Seul un Global Admin peut générer une clé' }, 403)
    }

    const organizationId = userData.organization_id
    if (!organizationId) {
      return jsonResponse({ success: false, error: 'NO_ORGANIZATION', message: 'Aucune organisation associée' }, 403)
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 3: Générer la clé brute
    // ══════════════════════════════════════════════════════════════
    const rawKey = `eva_live_${generateRandomKey(32)}`
    const keyHash = await sha256(rawKey)
    const keyPrefix = 'eva_live_'                    // Préfixe stable en DB (ne change jamais)
    const keyPreview = rawKey.slice(0, 16) + '...'   // Pour affichage UI uniquement

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 4: Désactiver toutes les anciennes clés de cette org
    // ══════════════════════════════════════════════════════════════
    const { error: deactivateError } = await supabaseAdmin
      .from('integration_keys')
      .update({ is_active: false })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (deactivateError) {
      console.error('⚠️ Erreur désactivation anciennes clés:', deactivateError.message)
      // On continue quand même — la nouvelle clé sera active
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 5: Insérer la nouvelle clé hashée
    // ══════════════════════════════════════════════════════════════
    const { error: insertError } = await supabaseAdmin
      .from('integration_keys')
      .insert({
        organization_id: organizationId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        label: 'Clé principale',
        permissions: ['webhook:create_prospect'],
        created_by: user.id,
        is_active: true,
      })

    if (insertError) {
      console.error('❌ Erreur insertion clé:', insertError.message)
      return jsonResponse({ success: false, error: 'INSERT_FAILED', message: 'Impossible de créer la clé' }, 500)
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 6: Retourner la clé brute (UNE SEULE FOIS)
    // ══════════════════════════════════════════════════════════════
    console.log(`✅ Clé générée pour org ${organizationId} par user ${user.id} — preview: ${keyPreview}`)

    return jsonResponse({
      success: true,
      key: rawKey,               // ⚠️ Clé brute — affichée une seule fois
      key_prefix: keyPrefix,     // Préfixe stable (eva_live_)
      key_preview: keyPreview,   // Pour affichage UI (eva_live_a3f2b1...)
      message: 'Clé générée avec succès. Conservez-la, elle ne sera plus affichée.',
    })

  } catch (err) {
    console.error('❌ Erreur inattendue:', err)
    return jsonResponse({ success: false, error: 'INTERNAL_ERROR', message: 'Erreur serveur' }, 500)
  }
})
