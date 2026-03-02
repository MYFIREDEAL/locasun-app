import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// Edge Function: webhook-v1
// ============================================================================
// OBJECTIF: Webhook universel multi-tenant pour créer des prospects depuis
//           des services externes (Make, Zapier, API custom, etc.)
//
// AUTH: Bearer token → SHA-256 hash → lookup integration_keys → org_id
// SÉCURITÉ: service_role côté serveur uniquement, jamais exposé côté client
//
// ENDPOINT: POST /functions/v1/webhook-v1
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Hash SHA-256 d'une string (pour comparer le Bearer token au key_hash stocké)
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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

  // ── Méthode POST uniquement ──
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Seul POST est accepté' }, 405)
  }

  try {
    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 1: Authentification via Bearer token
    // ══════════════════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({
        success: false,
        error: 'MISSING_AUTH',
        message: 'Header Authorization: Bearer <integration_key> requis'
      }, 401)
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token || token.length < 20) {
      return jsonResponse({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token invalide ou trop court'
      }, 401)
    }

    // Créer client Supabase avec service_role (côté serveur uniquement)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Hash le token et lookup dans integration_keys
    const tokenHash = await sha256(token)

    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('integration_keys')
      .select('id, organization_id, permissions, is_active, expires_at, use_count')
      .eq('key_hash', tokenHash)
      .single()

    if (keyError || !keyData) {
      console.error('❌ Token non trouvé:', keyError?.message)
      return jsonResponse({
        success: false,
        error: 'INVALID_KEY',
        message: 'Clé d\'intégration invalide ou inexistante'
      }, 401)
    }

    // Vérifier que la clé est active
    if (!keyData.is_active) {
      return jsonResponse({
        success: false,
        error: 'KEY_DISABLED',
        message: 'Cette clé d\'intégration a été désactivée'
      }, 403)
    }

    // Vérifier l'expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return jsonResponse({
        success: false,
        error: 'KEY_EXPIRED',
        message: 'Cette clé d\'intégration a expiré'
      }, 403)
    }

    // Vérifier la permission
    const permissions: string[] = keyData.permissions || []
    if (!permissions.includes('webhook:create_prospect')) {
      return jsonResponse({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Cette clé n\'a pas la permission webhook:create_prospect'
      }, 403)
    }

    const organizationId: string = keyData.organization_id
    const integrationKeyId: string = keyData.id

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 2: Parser et valider le body
    // ══════════════════════════════════════════════════════════════
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({
        success: false,
        error: 'INVALID_JSON',
        message: 'Le body doit être un JSON valide'
      }, 400)
    }

    // Extraire les champs (supporte le contrat Make + format plat)
    const contact = (body.contact as Record<string, unknown>) || {}
    const project = (body.project as Record<string, unknown>) || {}

    const name = (contact.nom as string) || (body.nom as string) || (body.name as string)
    const email = (contact.email as string) || (body.email as string)
    const phone = (contact.telephone as string) || (body.telephone as string) || (body.phone as string) || null
    const company = (contact.entreprise as string) || (body.entreprise as string) || (body.company as string) || null
    const address = (contact.adresse as string) || (body.adresse as string) || (body.address as string) || ''

    // Type de projet
    const typeProjet = (body.type_projet as string) || (project.type as string) || null

    // Owner (optionnel)
    const ownerUserId = (body.owner_user_id as string) || (project.owner_user_id as string) || null
    const ownerEmail = (body.owner_email as string) || (project.owner_email as string) || null

    // Envoi magic link (optionnel)
    const sendMagicLink = (body.send_magic_link as boolean) || false

    // ── Validation champs obligatoires ──
    if (!name || !email) {
      return jsonResponse({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Les champs "nom" (ou "name") et "email" sont obligatoires',
        received_fields: Object.keys(body)
      }, 400)
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return jsonResponse({
        success: false,
        error: 'INVALID_EMAIL',
        message: `L'email "${email}" n'est pas valide`
      }, 400)
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 3: Résoudre l'owner
    // ══════════════════════════════════════════════════════════════
    let resolvedOwnerId: string | null = null

    if (ownerUserId) {
      // Vérifier que cet user appartient à l'org (la RPC le vérifiera aussi)
      resolvedOwnerId = ownerUserId
    } else if (ownerEmail) {
      // Lookup par email dans les users de cette org
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('email', ownerEmail)
        .eq('organization_id', organizationId)
        .single()

      if (userData?.user_id) {
        resolvedOwnerId = userData.user_id
      }
      // Si non trouvé → la RPC utilisera le fallback Global Admin
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 4: Construire les tags
    // ══════════════════════════════════════════════════════════════
    const tags: string[] = []
    if (typeProjet) {
      // Support virgule-séparée : "ACC,Centrale" → ['ACC', 'Centrale']
      const parts = typeProjet.split(',').map((t: string) => t.trim()).filter(Boolean)
      tags.push(...parts)
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 5: Appeler la RPC create_webhook_prospect
    // ══════════════════════════════════════════════════════════════
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('create_webhook_prospect', {
      p_organization_id: organizationId,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_company: company,
      p_address: address,
      p_tags: tags,
      p_owner_id: resolvedOwnerId,
      p_status: null,
      p_send_magic_link: sendMagicLink,
    })

    if (rpcError) {
      console.error('❌ RPC error:', rpcError.message)
      return jsonResponse({
        success: false,
        error: 'RPC_ERROR',
        message: rpcError.message
      }, 500)
    }

    // La RPC retourne du JSON avec success/error
    const result = rpcResult as Record<string, unknown>

    if (!result.success) {
      // Mapper les erreurs RPC vers des codes HTTP
      const errorMap: Record<string, number> = {
        'DUPLICATE_EMAIL': 409,
        'INVALID_PROJECT_TYPE': 400,
        'INVALID_OWNER': 400,
        'NO_GLOBAL_ADMIN': 500,
        'NO_PIPELINE_STEP': 500,
      }
      const httpStatus = errorMap[result.error as string] || 400

      return jsonResponse({
        success: false,
        error: result.error,
        message: result.message
      }, httpStatus)
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 6: (Optionnel) Envoyer Magic Link via signInWithOtp
    // ══════════════════════════════════════════════════════════════
    // Aligné à 100% avec RegistrationPage.jsx :
    // - signInWithOtp + shouldCreateUser: true
    // - Crée l'auth.user si inexistant
    // - Déclenche le trigger link_prospect_to_auth_user
    // - Envoie réellement l'email Magic Link via Supabase Auth
    let magicLinkSent = false

    if (sendMagicLink) {
      // Résoudre le domaine de l'org pour le redirect
      const { data: domainData } = await supabaseAdmin
        .from('organization_domains')
        .select('domain')
        .eq('organization_id', organizationId)
        .eq('is_primary', true)
        .single()

      const redirectDomain = domainData?.domain || 'evatime.fr'
      const redirectUrl = `https://${redirectDomain}/dashboard`

      const { error: magicLinkError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        }
      })

      if (magicLinkError) {
        console.warn('⚠️ Magic link échoué:', magicLinkError.message)
        // On ne fail PAS le webhook — le prospect est déjà créé
      } else {
        magicLinkSent = true
        console.log(`🔗 Magic link envoyé pour ${email} → redirect ${redirectUrl}`)
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 7: Mettre à jour last_used_at sur la clé
    // ══════════════════════════════════════════════════════════════
    await supabaseAdmin
      .from('integration_keys')
      .update({
        last_used_at: new Date().toISOString(),
        use_count: ((keyData as any).use_count || 0) + 1,
      })
      .eq('id', integrationKeyId)

    // ══════════════════════════════════════════════════════════════
    // ÉTAPE 8: Retour succès
    // ══════════════════════════════════════════════════════════════
    console.log(`✅ Prospect créé via webhook: ${result.prospect_id} (org: ${organizationId})`)

    return jsonResponse({
      success: true,
      prospect_id: result.prospect_id,
      owner_id: result.owner_id,
      owner_name: result.owner_name,
      organization_id: organizationId,
      tags,
      magic_link_sent: magicLinkSent,
    }, 201)

  } catch (err) {
    console.error('❌ Erreur inattendue webhook-v1:', err)
    return jsonResponse({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Erreur interne du serveur'
    }, 500)
  }
})
