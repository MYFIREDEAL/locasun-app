import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { signature_procedure_id } = await req.json()

    // Vérifier RESEND_API_KEY OBLIGATOIRE
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY non configurée')
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les co-signataires depuis signature_cosigners
    const { data: cosigners, error: cosignersError } = await supabaseClient
      .from('signature_cosigners')
      .select('email, access_token')
      .eq('signature_procedure_id', signature_procedure_id)
      .eq('status', 'pending')

    if (cosignersError) {
      console.error('Erreur récupération cosigners:', cosignersError)
      return new Response(
        JSON.stringify({ error: 'Erreur récupération co-signataires' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!cosigners || cosigners.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun co-signataire en attente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://evatime.fr'
    let emailsSent = 0

    // Envoyer email à chaque co-signataire
    for (const cosigner of cosigners) {
      // Construire le lien de signature
      const signUrl = `${frontendUrl}/sign/cosigner?token=${cosigner.access_token}`

      const emailHtml = `
        <p>Vous avez été invité à signer un document.</p>
        <p>
          <a href="${signUrl}">
            Signer le document
          </a>
        </p>
      `

      // Envoi via Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'LOCASUN <noreply@locasun.fr>',
          to: [cosigner.email],
          subject: 'Invitation à signer un document',
          html: emailHtml,
        }),
      })

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        console.error(`❌ Erreur envoi email à ${cosigner.email}:`, errorText)
      } else {
        console.log(`✅ Email envoyé à ${cosigner.email}`)
        emailsSent++
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: emailsSent }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Erreur send-cosigner-invite:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
