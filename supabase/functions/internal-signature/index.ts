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

    const { signature_procedure_id, signer_email, signer_user_id, pdf_file_id, pdf_hash } = await req.json()

    // Créer la preuve de signature
    const { data: proof, error: proofError } = await supabaseClient
      .from('signature_proofs')
      .insert({
        signature_procedure_id,
        signer_email,
        signer_user_id,
        pdf_file_id,
        pdf_hash,
      })
      .select()
      .single()

    if (proofError) {
      console.error('Erreur création signature_proofs:', proofError)
      return new Response(
        JSON.stringify({ error: 'Erreur création preuve' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ NE PAS mettre à jour la procédure ici
    // Le front-end gère le status via le tableau signers
    // Cette fonction crée SEULEMENT la preuve de signature

    return new Response(
      JSON.stringify({ 
        success: true,
        proof_id: proof.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur internal-signature:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
