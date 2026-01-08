import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { email, name, signatureUrl, clientName, projectType } = await req.json()

    if (!email || !signatureUrl) {
      return new Response(
        JSON.stringify({ error: 'Email et signatureUrl requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Template email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📝 Signature de document</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Bonjour <strong>${name || 'Co-signataire'}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Vous êtes invité(e) à co-signer un contrat <strong>${projectType || ''}</strong> 
            avec <strong>${clientName}</strong>.
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Pour accéder au document et apposer votre signature électronique, 
            cliquez sur le bouton ci-dessous :
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signatureUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              📄 Accéder au document
            </a>
          </div>
          
          <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #059669; font-weight: 600;">
              🔒 Signature sécurisée
            </p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
              Vous recevrez un code de vérification par email pour valider votre identité 
              avant de pouvoir signer le document.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
            <strong>Pourquoi ce lien est-il sécurisé ?</strong><br>
            • Un code OTP sera envoyé à votre adresse email<br>
            • Le lien est unique et personnel<br>
            • Toute signature est horodatée et traçable
          </p>
          
          <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
            Si vous n'êtes pas concerné par cette demande de signature, 
            veuillez ignorer cet email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 20px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} LOCASUN - MY FIRE DEAL
          </p>
        </div>
      </div>
    `

    // Utiliser Resend API pour envoyer l'email
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.warn('⚠️ RESEND_API_KEY non configurée, email non envoyé (mode dev)')
      return new Response(
        JSON.stringify({ 
          success: true, 
          dev_mode: true,
          message: 'Email non envoyé (RESEND_API_KEY manquante)',
          email,
          signatureUrl
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'LOCASUN <noreply@myfiredeal.com>',
        to: [email],
        subject: `📝 Co-signature requise - Contrat ${projectType || ''}`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('❌ Erreur Resend:', errorText)
      return new Response(
        JSON.stringify({ error: 'Erreur envoi email', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await resendResponse.json()
    console.log('✅ Email envoyé:', { email, emailId: result.id })

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur send-cosigner-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
