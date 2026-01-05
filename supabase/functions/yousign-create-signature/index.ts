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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Non authentifié')
    }

    const { fileId, prospectId, projectType } = await req.json()

    console.log('📝 Creating Yousign signature', { fileId, prospectId, projectType })

    // 1. Récupérer les infos du fichier
    const { data: file, error: fileError } = await supabaseClient
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      throw new Error(`Fichier introuvable: ${fileId}`)
    }

    // 2. Récupérer les infos du prospect
    const { data: prospect, error: prospectError } = await supabaseClient
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .single()

    if (prospectError || !prospect) {
      throw new Error(`Prospect introuvable: ${prospectId}`)
    }

    // 3. Générer une URL signée Supabase (24h pour Yousign)
    const { data: signedUrlData, error: urlError } = await supabaseClient.storage
      .from('project-files')
      .createSignedUrl(file.storage_path, 86400) // 24 heures

    if (urlError || !signedUrlData) {
      throw new Error(`Impossible de générer l'URL signée: ${urlError?.message}`)
    }

    console.log('✅ Signed URL generated', { url: signedUrlData.signedUrl })

    // 4. Créer la procédure Yousign
    const yousignApiKey = Deno.env.get('YOUSIGN_API_KEY')
    if (!yousignApiKey) {
      throw new Error('YOUSIGN_API_KEY non configurée')
    }

    // Préparer le nom du signataire
    const signerName = prospect.name || 'Client'
    const signerEmail = prospect.email

    if (!signerEmail) {
      throw new Error('Le prospect doit avoir un email pour signer')
    }

    // Créer la signature request Yousign v3
    const yousignResponse = await fetch('https://api.yousign.app/v3/signature_requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yousignApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Contrat ${projectType} - ${signerName}`,
        delivery_mode: 'email',
        timezone: 'Europe/Paris',
        email_custom_note: `Bonjour ${signerName},\n\nVeuillez signer votre contrat ${projectType} en cliquant sur le bouton ci-dessous.`,
        documents: [
          {
            nature: 'signable_document',
            parse_anchors: true,
            file: {
              content: signedUrlData.signedUrl, // URL signée Supabase
              type: 'url'
            }
          }
        ],
        signers: [
          {
            info: {
              first_name: signerName.split(' ')[0] || signerName,
              last_name: signerName.split(' ').slice(1).join(' ') || '',
              email: signerEmail,
              locale: 'fr',
            },
            signature_level: 'electronic_signature',
            signature_authentication_mode: 'no_otp',
          }
        ]
      }),
    })

    if (!yousignResponse.ok) {
      const errorText = await yousignResponse.text()
      console.error('❌ Yousign API error', errorText)
      throw new Error(`Erreur Yousign: ${yousignResponse.status} - ${errorText}`)
    }

    const yousignData = await yousignResponse.json()
    console.log('✅ Yousign procedure created', yousignData)

    // 5. Stocker dans la table signature_procedures
    const { data: procedure, error: procedureError } = await supabaseClient
      .from('signature_procedures')
      .insert({
        prospect_id: prospectId,
        project_type: projectType,
        file_id: fileId,
        yousign_procedure_id: yousignData.id,
        yousign_signer_id: yousignData.signers[0]?.id,
        signature_link: yousignData.signers[0]?.signature_link,
        status: 'pending',
      })
      .select()
      .single()

    if (procedureError) {
      console.error('❌ Error storing procedure', procedureError)
      throw procedureError
    }

    console.log('✅ Signature procedure stored', procedure)

    return new Response(
      JSON.stringify({
        success: true,
        procedure,
        signatureLink: yousignData.signers[0]?.signature_link,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
