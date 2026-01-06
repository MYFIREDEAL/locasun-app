import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { signatureProcedureId, token } = await req.json()

    // Vérifier la procédure
    const { data: procedure, error: procError } = await supabaseClient
      .from('signature_procedures')
      .select('*, project_files(*)')
      .eq('id', signatureProcedureId)
      .eq('access_token', token)
      .single()

    if (procError || !procedure) {
      return new Response(
        JSON.stringify({ error: 'Procédure invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier expiration
    const expiresAt = new Date(procedure.access_token_expires_at)
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier status
    if (procedure.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Signature déjà traitée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Télécharger le PDF
    const { data: pdfData, error: downloadError } = await supabaseClient.storage
      .from('project_files')
      .download(procedure.project_files.storage_path)

    if (downloadError) {
      console.error('Erreur téléchargement PDF:', downloadError)
      return new Response(
        JSON.stringify({ error: 'Erreur téléchargement PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculer hash SHA-256
    const arrayBuffer = await pdfData.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Créer fichier signé (copie avec metadata)
    const signedFileName = procedure.project_files.name.replace('.pdf', '_signed.pdf')
    const signedPath = `${procedure.prospect_id}/${signedFileName}`

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('project_files')
      .upload(signedPath, pdfData, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Erreur upload PDF signé:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Erreur sauvegarde PDF signé' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Créer entrée project_files pour le PDF signé
    const { data: signedFile, error: fileError } = await supabaseClient
      .from('project_files')
      .insert({
        prospect_id: procedure.prospect_id,
        project_type: procedure.project_type,
        name: signedFileName,
        storage_path: signedPath,
        file_type: 'application/pdf',
        size: pdfData.size,
        field_label: 'Contrat signé',
      })
      .select()
      .single()

    if (fileError) {
      console.error('Erreur création project_files:', fileError)
      return new Response(
        JSON.stringify({ error: 'Erreur enregistrement fichier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour la procédure
    const { error: updateError } = await supabaseClient
      .from('signature_procedures')
      .update({
        status: 'signed',
        signed_file_id: signedFile.id,
        signature_hash: hashHex,
        signed_at: new Date().toISOString(),
      })
      .eq('id', signatureProcedureId)

    if (updateError) {
      console.error('Erreur update procédure:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erreur mise à jour procédure' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        signedFileId: signedFile.id,
        hash: hashHex,
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
