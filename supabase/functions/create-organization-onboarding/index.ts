import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OnboardingRequest {
  companyName: string
  adminEmail: string
  adminPassword: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase avec service role pour bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { companyName, adminEmail, adminPassword }: OnboardingRequest = await req.json()

    // Validation
    if (!companyName || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (adminPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 6 caractères' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Générer un slug unique à partir du nom de l'entreprise
    const slug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retirer accents
      .replace(/[^a-z0-9]+/g, '-') // Remplacer caractères spéciaux par -
      .replace(/^-+|-+$/g, '') // Retirer - au début/fin
      .substring(0, 50)

    // Générer automatiquement le domaine à partir du slug
    const domain = `${slug}.evatime.fr`

    console.log(`[Onboarding] Starting for company: ${companyName}, domain: ${domain}, slug: ${slug}`)

    // Vérifier que le domaine n'existe pas déjà
    const { data: existingDomain } = await supabaseAdmin
      .from('organization_domains')
      .select('id')
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      return new Response(
        JSON.stringify({ error: 'Ce domaine est déjà utilisé par une autre organisation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Vérifier que l'email admin n'existe pas déjà
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(adminEmail)
    
    if (existingUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Cet email est déjà utilisé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // 🔥 TRANSACTION START (simulation via rollback manuel si erreur)
    let organizationId: string | null = null
    let authUserId: string | null = null

    try {
      // 1️⃣ Créer l'organization
      const { data: organization, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: companyName,
          slug: slug,
        })
        .select('id')
        .single()

      if (orgError || !organization) {
        console.error('[Onboarding] Error creating organization:', orgError)
        throw new Error('Erreur lors de la création de l\'organisation')
      }

      organizationId = organization.id
      console.log(`[Onboarding] Organization created: ${organizationId}`)

      // 2️⃣ Créer organization_settings avec branding par défaut
      const { error: settingsError } = await supabaseAdmin
        .from('organization_settings')
        .insert({
          organization_id: organizationId,
          brand_name: companyName,
          logo_url: null,
          primary_color: '#3b82f6',
          secondary_color: '#1e40af',
        })

      if (settingsError) {
        console.error('[Onboarding] Error creating settings:', settingsError)
        throw new Error('Erreur lors de la création des paramètres')
      }

      console.log(`[Onboarding] Settings created for organization ${organizationId}`)

      // 3️⃣ Créer organization_domains (primary)
      const { error: domainError } = await supabaseAdmin
        .from('organization_domains')
        .insert({
          organization_id: organizationId,
          domain: domain,
          is_primary: true,
        })

      if (domainError) {
        console.error('[Onboarding] Error creating domain:', domainError)
        throw new Error('Erreur lors de la création du domaine')
      }

      console.log(`[Onboarding] Domain created: ${domain}`)

      // 4️⃣ Créer l'utilisateur admin via Auth Admin API
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Auto-confirmer l'email
      })

      if (authError || !authUser.user) {
        console.error('[Onboarding] Error creating auth user:', authError)
        throw new Error('Erreur lors de la création de l\'utilisateur')
      }

      authUserId = authUser.user.id
      console.log(`[Onboarding] Auth user created: ${authUserId}`)

      // 5️⃣ Créer l'entrée dans public.users avec role platform_admin
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          user_id: authUserId,
          email: adminEmail,
          first_name: companyName.split(' ')[0],
          last_name: companyName.split(' ').slice(1).join(' ') || 'Admin',
          role: 'Global Admin', // Rôle Global Admin pour l'organisation
          organization_id: organizationId,
        })

      if (userError) {
        console.error('[Onboarding] Error creating public user:', userError)
        throw new Error('Erreur lors de la création du profil utilisateur')
      }

      console.log(`[Onboarding] Public user created for ${adminEmail}`)

      // ✅ SUCCESS
      return new Response(
        JSON.stringify({
          success: true,
          organization_id: organizationId,
          message: 'Organisation créée avec succès',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        }
      )

    } catch (error) {
      console.error('[Onboarding] Transaction failed, rolling back...', error)

      // 🔥 ROLLBACK MANUEL
      if (authUserId) {
        console.log(`[Rollback] Deleting auth user ${authUserId}`)
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }

      if (organizationId) {
        console.log(`[Rollback] Deleting organization data for ${organizationId}`)
        
        // Supprimer dans l'ordre inverse (FK constraints)
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('organization_id', organizationId)

        await supabaseAdmin
          .from('organization_domains')
          .delete()
          .eq('organization_id', organizationId)

        await supabaseAdmin
          .from('organization_settings')
          .delete()
          .eq('organization_id', organizationId)

        await supabaseAdmin
          .from('organizations')
          .delete()
          .eq('id', organizationId)
      }

      throw error // Re-throw pour le catch externe
    }

  } catch (error) {
    console.error('[Onboarding] Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
