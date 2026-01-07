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

    // Envoyer OTP par SMS (simulation avec console.log)
    console.log(`📱 SMS OTP pour ${tokenData.signer_email}: ${otp}`)

    // TODO: Intégrer vraie API SMS (Twilio, etc.)
    // const smsResponse = await fetch('https://api.sms-provider.com/send', {
    //   method: 'POST',
    //   headers: { 'Authorization': 'Bearer XXX' },
    //   body: JSON.stringify({
    //     to: tokenData.signer_phone,
    //     message: `Votre code de vérification: ${otp}`
    //   })
    // })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP envoyé',
        // TEMPORAIRE pour dev uniquement
        dev_otp: Deno.env.get('ENVIRONMENT') === 'development' ? otp : undefined
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
