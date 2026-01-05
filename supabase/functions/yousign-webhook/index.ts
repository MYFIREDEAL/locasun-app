import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role pour bypass RLS
    )

    const payload = await req.json()
    console.log('📨 Webhook Yousign received', payload)

    const eventType = payload.event_name
    const signatureRequestId = payload.signature_request?.id

    if (!signatureRequestId) {
      console.warn('⚠️ No signature_request.id in webhook')
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Gérer l'événement signature_request.done
    if (eventType === 'signature_request.done') {
      console.log('✅ Signature completed!', signatureRequestId)

      // 1. Récupérer la procédure dans notre BDD
      const { data: procedure, error: procedureError } = await supabaseClient
        .from('signature_procedures')
        .select('*')
        .eq('yousign_procedure_id', signatureRequestId)
        .single()

      if (procedureError || !procedure) {
        console.error('❌ Procedure not found', signatureRequestId)
        throw new Error(`Procédure introuvable: ${signatureRequestId}`)
      }

      console.log('📋 Procedure found', procedure)

      // 2. Télécharger le PDF signé depuis Yousign
      const yousignApiKey = Deno.env.get('YOUSIGN_API_KEY')
      if (!yousignApiKey) {
        throw new Error('YOUSIGN_API_KEY non configurée')
      }

      // Récupérer les documents de la signature request
      const documentsResponse = await fetch(
        `https://api.yousign.app/v3/signature_requests/${signatureRequestId}/documents`,
        {
          headers: {
            'Authorization': `Bearer ${yousignApiKey}`,
          },
        }
      )

      if (!documentsResponse.ok) {
        throw new Error(`Erreur récupération documents: ${documentsResponse.status}`)
      }

      const documentsData = await documentsResponse.json()
      const signedDocumentId = documentsData.data[0]?.id

      if (!signedDocumentId) {
        throw new Error('Aucun document trouvé dans la signature request')
      }

      console.log('📄 Document ID', signedDocumentId)

      // Télécharger le PDF signé
      const pdfResponse = await fetch(
        `https://api.yousign.app/v3/signature_requests/${signatureRequestId}/documents/${signedDocumentId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${yousignApiKey}`,
          },
        }
      )

      if (!pdfResponse.ok) {
        throw new Error(`Erreur téléchargement PDF: ${pdfResponse.status}`)
      }

      const pdfBlob = await pdfResponse.blob()
      const pdfArrayBuffer = await pdfBlob.arrayBuffer()
      console.log('📥 PDF downloaded', pdfArrayBuffer.byteLength, 'bytes')

      // 3. Uploader le PDF signé dans Supabase Storage
      const fileName = `contrat-signe-${procedure.project_type}-${Date.now()}.pdf`
      const storagePath = `${procedure.project_type}/${fileName}`

      const { error: uploadError } = await supabaseClient.storage
        .from('project-files')
        .upload(storagePath, pdfArrayBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('❌ Error uploading signed PDF', uploadError)
        throw uploadError
      }

      console.log('✅ Signed PDF uploaded to Storage', storagePath)

      // 4. Créer l'entrée dans project_files
      const { data: signedFile, error: fileError } = await supabaseClient
        .from('project_files')
        .insert({
          project_type: procedure.project_type,
          prospect_id: procedure.prospect_id,
          file_name: fileName,
          file_type: 'application/pdf',
          file_size: pdfArrayBuffer.byteLength,
          storage_path: storagePath,
          uploaded_by: null, // Système/Yousign
          field_label: 'Contrat signé (Yousign)',
        })
        .select()
        .single()

      if (fileError) {
        console.error('❌ Error creating file entry', fileError)
        throw fileError
      }

      console.log('✅ File entry created', signedFile)

      // 5. Mettre à jour la procédure de signature
      const { error: updateError } = await supabaseClient
        .from('signature_procedures')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signed_file_id: signedFile.id,
        })
        .eq('id', procedure.id)

      if (updateError) {
        console.error('❌ Error updating procedure', updateError)
        throw updateError
      }

      console.log('✅ Signature procedure updated to signed')

      // 6. Ajouter une entrée dans l'historique du projet
      const { error: historyError } = await supabaseClient
        .from('project_history')
        .insert({
          prospect_id: procedure.prospect_id,
          project_type: procedure.project_type,
          action_type: 'signature_completed',
          description: `Contrat signé via Yousign`,
          metadata: {
            procedure_id: signatureRequestId,
            signed_file_id: signedFile.id,
          },
        })

      if (historyError) {
        console.warn('⚠️ Error adding history entry', historyError)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Signature processed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Autres événements (refused, expired, etc.)
    if (eventType === 'signature_request.declined') {
      const { error } = await supabaseClient
        .from('signature_procedures')
        .update({ status: 'refused' })
        .eq('yousign_procedure_id', signatureRequestId)

      if (error) console.error('Error updating to refused', error)
    }

    if (eventType === 'signature_request.expired') {
      const { error } = await supabaseClient
        .from('signature_procedures')
        .update({ status: 'expired' })
        .eq('yousign_procedure_id', signatureRequestId)

      if (error) console.error('Error updating to expired', error)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
