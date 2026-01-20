import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://evatime.fr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface CreateOrgRequest {
  companyName: string
  adminEmail: string
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { companyName, adminEmail }: CreateOrgRequest = await req.json()

    // Validation
    if (!companyName || !adminEmail) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!/\S+@\S+\.\S+/.test(adminEmail)) {
      return new Response(
        JSON.stringify({ error: 'Email invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Générer slug et domain
    const slug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)

    const domain = `${slug}.evatime.fr`

    console.log(`[Platform] Creating organization: ${companyName}, domain: ${domain}`)

    // Vérifier domaine unique
    const { data: existingDomain } = await supabaseAdmin
      .from('organization_domains')
      .select('id')
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      return new Response(
        JSON.stringify({ error: 'Ce domaine est déjà utilisé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Vérifier email unique
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(adminEmail)

    if (existingUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Cet email est déjà utilisé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    let organizationId: string | null = null

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
        console.error('[Platform] Error creating organization:', orgError)
        throw new Error('Erreur lors de la création de l\'organisation')
      }

      organizationId = organization.id
      console.log(`[Platform] Organization created: ${organizationId}`)

      // 2️⃣ Créer organization_settings
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
        console.error('[Platform] Error creating settings:', settingsError)
        throw new Error('Erreur lors de la création des paramètres')
      }

      // 3️⃣ Créer organization_domains
      const { error: domainError } = await supabaseAdmin
        .from('organization_domains')
        .insert({
          organization_id: organizationId,
          domain: domain,
          is_primary: true,
        })

      if (domainError) {
        console.error('[Platform] Error creating domain:', domainError)
        throw new Error('Erreur lors de la création du domaine')
      }

      // 4️⃣ Appeler l'Edge Function invite-user (pattern unique)
      // ✅ invite-user gère : auth.admin.inviteUserByEmail + public.users + redirectTo dynamique
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      
      const inviteResponse = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          email: adminEmail,
          name: companyName,
          role: 'Global Admin',
          organizationId: organizationId,
        }),
      })

      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json()
        console.error('[Platform] Error from invite-user:', errorData)
        throw new Error(errorData.error || 'Erreur lors de l\'invitation de l\'utilisateur')
      }

      const inviteResult = await inviteResponse.json()
      console.log(`[Platform] User invited via invite-user:`, inviteResult)

      // ✅ SUCCESS
      return new Response(
        JSON.stringify({
          success: true,
          organization_id: organizationId,
          message: 'Organisation créée. Email d\'invitation envoyé.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        }
      )

    } catch (error) {
      console.error('[Platform] Transaction failed, rolling back...', error)

      // 🔥 ROLLBACK (invite-user gère son propre rollback pour auth/users)
      if (organizationId) {
        console.log(`[Rollback] Deleting organization data for ${organizationId}`)

        await supabaseAdmin.from('users').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('organization_domains').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('organization_settings').delete().eq('organization_id', organizationId)
        await supabaseAdmin.from('organizations').delete().eq('id', organizationId)
      }

      throw error
    }

  } catch (error) {
    console.error('[Platform] Fatal error:', error)

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
