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
    console.log('🚀 send-cosigner-invite: Démarrage')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { signature_procedure_id } = await req.json()
    console.log('📩 Procédure ID reçu:', signature_procedure_id)

    // Récupérer la procédure
    const { data: procedure, error: procError } = await supabaseClient
      .from('signature_procedures')
      .select('id, signers, prospect_id')
      .eq('id', signature_procedure_id)
      .single()

    console.log('📋 Procédure récupérée:', { found: !!procedure, signersCount: procedure?.signers?.length })

    if (procError || !procedure) {
      console.error('❌ Procédure non trouvée:', procError)
      return new Response(
        JSON.stringify({ error: 'Procédure non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les cosigners pending
    const pendingCosigners = (procedure.signers || []).filter(
      (s: any) => s.role === 'cosigner' && s.status === 'pending'
    )

    console.log('👥 Cosigners pending:', pendingCosigners.length, pendingCosigners.map((c: any) => c.email))

    if (pendingCosigners.length === 0) {
      console.log('⚠️ Aucun cosigner pending - arrêt')
      return new Response(
        JSON.stringify({ message: 'Aucun cosigner pending' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://evatime.fr'

    console.log('📧 Envoi emails aux cosigners...')

    // Envoyer email à chaque cosigner
    for (const cosigner of pendingCosigners) {
      console.log(`📤 Traitement cosigner: ${cosigner.email}`)
      
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
        console.error('❌ Erreur création token:', tokenError)
        continue
      }

      console.log(`✅ Token créé pour ${cosigner.email}:`, token.substring(0, 8) + '...')

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
      
      console.log(`📮 Envoi email Resend à ${cosigner.email}`)
      
      if (resendApiKey) {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'EVATIME <noreply@evatime.fr>',
            to: [cosigner.email],
            subject: 'Invitation à signer un document',
            html: emailHtml,
          }),
        })

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text()
          console.error('❌ Erreur envoi email Resend:', errorText)
        } else {
          const resendData = await resendResponse.json()
          console.log(`✅ Email envoyé via Resend:`, resendData)
        }
      } else {
        console.warn('⚠️ RESEND_API_KEY manquante - email non envoyé')
      }
    }

    console.log('🎉 Traitement terminé - emails envoyés')

    return new Response(
      JSON.stringify({ success: true, sent: pendingCosigners.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Erreur send-cosigner-invite:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
