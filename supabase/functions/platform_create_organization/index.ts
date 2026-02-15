import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://evatime.fr",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
}

interface CreateOrgRequest {
  companyName: string
  adminEmail: string
  adminName: string
  adminPhone?: string
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2")

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const body = await req.json() as CreateOrgRequest
    const { companyName, adminEmail, adminName, adminPhone } = body

    // 🔎 VALIDATIONS
    if (!companyName || !adminEmail || !adminName) {
      return new Response(
        JSON.stringify({ error: "Nom organisation, email et nom admin requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (!/^\S+@\S+\.\S+$/.test(adminEmail)) {
      return new Response(
        JSON.stringify({ error: "Email invalide" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // 🔧 SLUG + DOMAINE
    const slug = companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50)

    const domain = `${slug}.evatime.fr`

    // 🔎 DOMAINE UNIQUE
    const { data: existingDomain } = await supabaseAdmin
      .from("organization_domains")
      .select("id")
      .eq("domain", domain)
      .maybeSingle()

    if (existingDomain) {
      return new Response(
        JSON.stringify({ error: "Ce domaine est déjà utilisé" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    let organizationId: string | null = null
    let authUserId: string | null = null

    try {
      // 1️⃣ ORGANIZATION
      const { data: organization, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: companyName,
          slug: slug,
        })
        .select("id")
        .single()

      if (orgError || !organization) {
        throw orgError
      }

      organizationId = organization.id

      // 2️⃣ SETTINGS avec form_contact_config par défaut
      await supabaseAdmin.from("organization_settings").insert({
        organization_id: organizationId,
        display_name: companyName,
        logo_url: null,
        primary_color: "#3b82f6",
        secondary_color: "#1e40af",
        form_contact_config: [
          { id: "name", name: "Nom*", type: "text", placeholder: "Jean Dupont", required: true },
          { id: "companyName", name: "Société", type: "text", placeholder: "Nom de la société (optionnel)", required: false },
          { id: "email", name: "Email*", type: "email", placeholder: "jean.dupont@email.com", required: true },
          { id: "phone", name: "Téléphone", type: "number", placeholder: "06 12 34 56 78", required: false },
          { id: "address", name: "Adresse", type: "text", placeholder: "1 Rue de la Paix, 75004 Paris", required: false }
        ],
      })

      // 3️⃣ DOMAIN
      await supabaseAdmin.from("organization_domains").insert({
        organization_id: organizationId,
        domain: domain,
        is_primary: true,
      })

      // 4️⃣ INVITATION UTILISATEUR
      const BASE_DOMAIN = Deno.env.get("BASE_DOMAIN") || "evatime.fr"
      const redirectTo = `https://${slug}.${BASE_DOMAIN}/activate-account`

      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(adminEmail, {
          redirectTo,
        })

      if (inviteError || !inviteData?.user) {
        throw inviteError
      }

      authUserId = inviteData.user.id

      // 5️⃣ PROFIL PUBLIC — avec name et phone
      await supabaseAdmin.from("users").insert({
        user_id: authUserId,
        email: adminEmail,
        name: adminName,
        phone: adminPhone || null,
        role: "Global Admin",
        organization_id: organizationId,
      })

      // ✅ SUCCESS
      return new Response(
        JSON.stringify({
          success: true,
          organization_id: organizationId,
          message: "Organisation créée. Email d'invitation envoyé.",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    } catch (error) {
      // 🔥 ROLLBACK
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }

      if (organizationId) {
        await supabaseAdmin.from("users").delete().eq("organization_id", organizationId)
        await supabaseAdmin.from("organization_domains").delete().eq("organization_id", organizationId)
        await supabaseAdmin.from("organization_settings").delete().eq("organization_id", organizationId)
        await supabaseAdmin.from("organizations").delete().eq("id", organizationId)
      }

      throw error
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur interne",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
