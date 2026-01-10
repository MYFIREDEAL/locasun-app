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

    // Récupérer la procédure
    const { data: procedure, error: procError } = await supabaseClient
      .from('signature_procedures')
      .select('id, signers, prospect_id')
      .eq('id', signature_procedure_id)
      .single()

    if (procError || !procedure) {
      return new Response(
        JSON.stringify({ error: 'Procédure non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les cosigners pending
    const pendingCosigners = (procedure.signers || []).filter(
      (s: any) => s.role === 'cosigner' && s.status === 'pending'
    )

    if (pendingCosigners.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun cosigner pending' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://evatime.fr'

    // Envoyer email à chaque cosigner
    for (const cosigner of pendingCosigners) {
      // Générer token sécurisé
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48) // 48h de validité

      // Stocker le token
      const { error: tokenError } = await supabaseClient
        .from('cosigner_invite_tokens')
        .insert({
          token,
          signature_procedure_id: procedure.id,
          signer_email: cosigner.email,
          expires_at: expiresAt.toISOString(),
        })

      if (tokenError) {
        console.error('Erreur création token:', tokenError)
        continue
      }

      // Envoyer email
      const signUrl = `${frontendUrl}/sign/cosigner?token=${token}`

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Invitation à signer un document</h2>
          <p>Bonjour,</p>
          <p>Vous êtes invité à signer un document contractuel.</p>
          <p>Pour accéder au document et le signer, cliquez sur le lien ci-dessous :</p>
          <a href="${signUrl}" 
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accéder au document
          </a>
          <p style="color: #6b7280; font-size: 14px;">
            Ce lien est valable 48 heures.<br>
            Si vous n'êtes pas concerné par cette demande, veuillez ignorer cet email.
          </p>
        </div>
      `

      // Utiliser Resend API
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      
      if (resendApiKey) {
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
          console.error('Erreur envoi email:', await resendResponse.text())
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: pendingCosigners.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur send-cosigner-invite:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
