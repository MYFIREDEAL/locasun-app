import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_OTP_ATTEMPTS = 3

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token, otp } = await req.json()

    // Récupérer le token
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

    // Vérifier si OTP expiré
    if (!tokenData.otp_expires_at || new Date(tokenData.otp_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'OTP expiré. Demandez un nouveau code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier nombre de tentatives
    if (tokenData.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Demandez un nouveau code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hasher OTP saisi
    const encoder = new TextEncoder()
    const data = encoder.encode(otp)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Vérifier OTP
    if (otpHash !== tokenData.otp_hash) {
      // Incrémenter tentatives
      await supabaseClient
        .from('cosigner_invite_tokens')
        .update({ otp_attempts: tokenData.otp_attempts + 1 })
        .eq('token', token)

      return new Response(
        JSON.stringify({ 
          error: 'Code incorrect',
          remaining_attempts: MAX_OTP_ATTEMPTS - (tokenData.otp_attempts + 1)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // OTP valide - Marquer comme utilisé
    await supabaseClient
      .from('cosigner_invite_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    // Récupérer la procédure de signature
    const { data: procedure, error: procError } = await supabaseClient
      .from('signature_procedures')
      .select('*')
      .eq('id', tokenData.signature_procedure_id)
      .single()

    if (procError || !procedure) {
      return new Response(
        JSON.stringify({ error: 'Procédure non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        procedure: {
          id: procedure.id,
          file_id: procedure.file_id,
          signer_email: tokenData.signer_email,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur verify-cosigner-otp:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
