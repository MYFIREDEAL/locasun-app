import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Edge Function: invite-user
 * 
 * Invite un nouvel utilisateur admin/manager/commercial
 * L'utilisateur reçoit un email pour créer son mot de passe
 * et est redirigé vers /activate-account
 * 
 * ✅ Utilise admin.inviteUserByEmail (pas de mot de passe défini)
 * ✅ Crée l'entrée dans public.users
 * ✅ Redirection vers /activate-account
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 invite-user: Démarrage')
    
    // Créer client Supabase avec SERVICE_ROLE_KEY
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

    // Parser le body
    const { email, name, role, managerId, organizationId, accessRights, phone } = await req.json()
    
    console.log('📩 Données reçues:', { email, name, role, organizationId })

    // Validation
    if (!email || !name || !role || !organizationId) {
      console.error('❌ Champs manquants')
      return new Response(
        JSON.stringify({ error: 'Champs manquants: email, name, role, organizationId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🔍 Récupérer le slug de l'organisation pour construire l'URL dynamique
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('slug')
      .eq('id', organizationId)
      .single()

    if (orgError || !orgData?.slug) {
      console.error('❌ Organisation non trouvée:', orgError)
      return new Response(
        JSON.stringify({ error: 'Organisation non trouvée pour cet organizationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ URL de redirection DYNAMIQUE basée sur le slug de l'organisation
    // Format: https://{slug}.evatime.fr/activate-account
    const baseDomain = Deno.env.get('BASE_DOMAIN') || 'evatime.fr'
    const redirectUrl = `https://${orgData.slug}.${baseDomain}/activate-account`
    
    console.log('📧 Redirection configurée:', redirectUrl, '(org:', orgData.slug, ')')

    // 1️⃣ Inviter l'utilisateur via Supabase Auth Admin API
    // ✅ Aucun mot de passe défini - l'utilisateur le créera lui-même
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          name,
          role,
        },
        redirectTo: redirectUrl,
      }
    )

    if (authError) {
      console.error('❌ Erreur invitation auth:', authError)
      return new Response(
        JSON.stringify({ error: `Erreur Auth: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData || !authData.user) {
      console.error('❌ Pas de user retourné par Auth')
      return new Response(
        JSON.stringify({ error: 'Erreur: utilisateur non créé' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id
    console.log('✅ User auth créé:', userId)

    // 2️⃣ Créer l'entrée dans public.users
    const userRecord = {
      user_id: userId,
      name,
      email,
      role,
      manager_id: managerId || null,
      phone: phone || null,
      organization_id: organizationId,
      access_rights: accessRights || {
        modules: ['Pipeline', 'Agenda', 'Contacts'],
        users: []
      },
    }

    const { data: publicUserData, error: publicUserError } = await supabaseAdmin
      .from('users')
      .insert([userRecord])
      .select()
      .single()

    if (publicUserError) {
      console.error('❌ Erreur création public.users:', publicUserError)
      
      // Rollback: supprimer l'user auth créé
      await supabaseAdmin.auth.admin.deleteUser(userId)
      
      return new Response(
        JSON.stringify({ error: `Erreur DB: ${publicUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User public créé:', publicUserData.id)

    // 3️⃣ Retourner le succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation envoyée avec succès',
        user: {
          id: publicUserData.id,
          userId: publicUserData.user_id,
          name: publicUserData.name,
          email: publicUserData.email,
          role: publicUserData.role,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
