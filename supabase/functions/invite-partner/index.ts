import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Edge Function: invite-partner
 * 
 * Invite un nouveau partenaire (technicien terrain)
 * 
 * FLUX:
 * 1. Admin appelle cette fonction (vérifié via JWT)
 * 2. Compte auth créé pour le partenaire
 * 3. Entrée public.partners créée avec user_id
 * 4. Partenaire reçoit email pour créer son mot de passe
 * 
 * SÉCURITÉ:
 * ✅ Seuls les admins (Global Admin, Manager) peuvent inviter
 * ✅ Le partenaire ne peut PAS s'inscrire seul
 * ✅ Multi-tenant strict via organization_id
 * ✅ Rollback automatique si échec partiel
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 invite-partner: Démarrage')
    
    // ========================================
    // 1️⃣ VÉRIFICATION APPELANT (Admin only)
    // ========================================
    
    // Récupérer le JWT de l'appelant
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé: Token manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client Supabase avec le token de l'appelant (pour vérifier ses droits)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Vérifier que l'appelant est un admin
    const { data: { user: callerAuth }, error: callerAuthError } = await supabaseClient.auth.getUser()
    
    if (callerAuthError || !callerAuth) {
      console.error('❌ Appelant non authentifié:', callerAuthError)
      return new Response(
        JSON.stringify({ error: 'Non autorisé: Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client Supabase ADMIN (pour créer le partenaire)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Vérifier que l'appelant est Global Admin ou Manager
    const { data: callerData, error: callerError } = await supabaseAdmin
      .from('users')
      .select('id, role, organization_id')
      .eq('user_id', callerAuth.id)
      .single()

    if (callerError || !callerData) {
      console.error('❌ Appelant non trouvé dans public.users:', callerError)
      return new Response(
        JSON.stringify({ error: 'Non autorisé: Utilisateur non admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['Global Admin', 'Manager'].includes(callerData.role)) {
      console.error('❌ Appelant n\'est pas admin:', callerData.role)
      return new Response(
        JSON.stringify({ error: 'Non autorisé: Seul un Global Admin peut inviter un partenaire' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Appelant vérifié:', callerData.role, 'org:', callerData.organization_id)

    // 📥 Payload modal (sécurisé selon prompt)
    const body = await req.json()

    const companyName = typeof body.companyName === 'string'
      ? body.companyName.trim()
      : ''

    const email = typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : ''

    const contactFirstName = typeof body.contactFirstName === 'string'
      ? body.contactFirstName.trim()
      : null

    const contactLastName = typeof body.contactLastName === 'string'
      ? body.contactLastName.trim()
      : null

    const phone = typeof body.phone === 'string'
      ? body.phone.trim()
      : null
    
    console.log('📩 invite-partner payload sanitized:', { companyName, email, contactFirstName, contactLastName, phone })

    if (!companyName || !email) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const organizationId = callerData.organization_id
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Compte non associé à une organisation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🔗 Récupération slug organisation (MULTI-TENANT)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('slug')
      .eq('id', organizationId)
      .single()

    if (orgError || !orgData?.slug) {
      return new Response(
        JSON.stringify({ error: 'Organisation non trouvée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ REDIRECT FINAL CORRECT (multi-tenant)
    const baseDomain = Deno.env.get('BASE_DOMAIN') || 'evatime.fr'
    const redirectUrl = `https://${orgData.slug}.${baseDomain}/partner/login`

    // � Invitation Supabase Auth (try/catch dédié)
    let authData
    try {
      const res = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectUrl,
        data: {
          user_type: 'partner',
          company_name: companyName,
          contact_first_name: contactFirstName,
          contact_last_name: contactLastName,
        },
      })
      authData = res.data
    } catch (inviteError) {
      console.error('Supabase invite error:', inviteError)
      return new Response(
        JSON.stringify({ error: 'Erreur invitation Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invitation échouée (auth)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // 🧱 Création partenaire
    const { data: partnerData, error: partnerError } = await supabaseAdmin
      .from('partners')
      .insert([{
        user_id: userId,
        organization_id: organizationId,
        company_name: companyName,
        contact_first_name: contactFirstName,
        contact_last_name: contactLastName,
        email,
        phone,
        active: true,
      }])
      .select()
      .single()

    if (partnerError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: `Erreur DB: ${partnerError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation partenaire envoyée',
        partner: {
          id: partnerData.id,
          userId: partnerData.user_id,
          companyName: partnerData.company_name,
          email: partnerData.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('invite-partner fatal error:', error)

    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
