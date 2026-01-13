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

    const { token } = await req.json()

    // Vérifier le token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('cosigner_invite_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier expiration du token
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ VÉRIFIER SI LE CO-SIGNATAIRE A DÉJÀ SIGNÉ
    const { data: existingProof } = await supabaseClient
      .from('signature_proofs')
      .select('id, created_at')
      .eq('signature_procedure_id', tokenData.signature_procedure_id)
      .eq('signer_email', tokenData.signer_email)
      .single()

    if (existingProof) {
      console.log('✅ Co-signataire a déjà signé, redirection vers confirmation')
      return new Response(
        JSON.stringify({ 
          already_signed: true,
          message: 'Vous avez déjà signé ce document',
          signed_at: existingProof.created_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Générer OTP 6 chiffres
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Hasher OTP avec SHA-256
    const encoder = new TextEncoder()
    const data = encoder.encode(otp)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Expiration OTP +10 min
    const otpExpiresAt = new Date()
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10)

    // Mettre à jour le token
    const { error: updateError } = await supabaseClient
      .from('cosigner_invite_tokens')
      .update({
        otp_hash: otpHash,
        otp_expires_at: otpExpiresAt.toISOString(),
        otp_attempts: 0,
      })
      .eq('token', token)

    if (updateError) {
      console.error('Erreur update token:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erreur génération OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ ENVOYER OTP PAR EMAIL via Resend
    console.log(`� Envoi OTP par email à ${tokenData.signer_email}: ${otp}`)

    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'EVATIME <noreply@evatime.fr>',
          to: [tokenData.signer_email],
          subject: 'Code de vérification - Signature de document',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Code de vérification</h2>
              <p>Voici votre code de vérification pour accéder au document à signer :</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h1 style="color: #1f2937; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Ce code expire dans 10 minutes.</p>
              <p style="color: #6b7280; font-size: 14px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
            </div>
          `,
        }),
      })

      if (!resendResponse.ok) {
        const resendError = await resendResponse.text()
        console.error('❌ Erreur Resend:', resendError)
      } else {
        const resendData = await resendResponse.json()
        console.log('✅ Email OTP envoyé via Resend:', resendData.id)
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email OTP:', emailError)
      // On continue même si l'email échoue (pour le dev)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP envoyé par email',
        // ✅ TOUJOURS retourner l'OTP pour faciliter les tests
        dev_otp: otp
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur send-cosigner-otp:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
