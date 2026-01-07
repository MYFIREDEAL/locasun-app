import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'

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
      .select('*, project_files!signature_procedures_file_id_fkey(*)')
      .eq('id', signature_procedure_id)
      .single()

    if (procError || !procedure) {
      return new Response(
        JSON.stringify({ error: 'Procédure non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier que tous les signataires ont signé
    if (procedure.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Procédure non complète' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier si PDF déjà généré
    if (procedure.signed_file_id) {
      return new Response(
        JSON.stringify({ 
          message: 'PDF déjà généré',
          signed_file_id: procedure.signed_file_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer le PDF original
    const { data: pdfData, error: pdfError } = await supabaseClient.storage
      .from('project-files')
      .download(procedure.project_files.storage_path)

    if (pdfError || !pdfData) {
      return new Response(
        JSON.stringify({ error: 'PDF original non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Charger le PDF avec pdf-lib
    const pdfBytes = await pdfData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Récupérer les preuves de signature
    const { data: proofs, error: proofsError } = await supabaseClient
      .from('signature_proofs')
      .select('*')
      .eq('signature_procedure_id', signature_procedure_id)
      .order('created_at', { ascending: true })

    if (proofsError || !proofs || proofs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Preuves de signature non trouvées' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ajouter une page de signatures
    const signaturePage = pdfDoc.addPage([595.28, 841.89]) // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let yPosition = 800

    // Titre
    signaturePage.drawText('CERTIFICAT DE SIGNATURE', {
      x: 50,
      y: yPosition,
      size: 18,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    yPosition -= 40

    // Date de complétion
    signaturePage.drawText(`Procédure complétée le : ${new Date().toLocaleString('fr-FR')}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    })

    yPosition -= 30

    // Ligne de séparation
    signaturePage.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    })

    yPosition -= 30

    // Liste des signataires
    signaturePage.drawText('Signataires :', {
      x: 50,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    yPosition -= 25

    // Parcourir les signers et preuves
    for (const signer of procedure.signers || []) {
      if (signer.status !== 'signed') continue

      const proof = proofs.find(p => p.signer_email === signer.email)

      signaturePage.drawText(`• ${signer.name || signer.email}`, {
        x: 70,
        y: yPosition,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      })

      yPosition -= 18

      signaturePage.drawText(`  Rôle : ${signer.role === 'owner' ? 'Signataire principal' : 'Co-signataire'}`, {
        x: 90,
        y: yPosition,
        size: 9,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      })

      yPosition -= 15

      if (signer.signed_at) {
        const signedDate = new Date(signer.signed_at).toLocaleString('fr-FR')
        signaturePage.drawText(`  Date : ${signedDate}`, {
          x: 90,
          y: yPosition,
          size: 9,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        })

        yPosition -= 15
      }

      if (proof?.ip_address) {
        signaturePage.drawText(`  IP : ${proof.ip_address}`, {
          x: 90,
          y: yPosition,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        })

        yPosition -= 15
      }

      if (proof?.pdf_hash) {
        const hashShort = proof.pdf_hash.substring(0, 16) + '...'
        signaturePage.drawText(`  Hash : ${hashShort}`, {
          x: 90,
          y: yPosition,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        })

        yPosition -= 20
      }
    }

    yPosition -= 20

    // Mentions légales
    signaturePage.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    })

    yPosition -= 25

    signaturePage.drawText('Mentions légales :', {
      x: 50,
      y: yPosition,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    })

    yPosition -= 18

    const legalText = [
      'Ce document a été signé électroniquement conformément au Règlement eIDAS (UE) n°910/2014.',
      'Les signatures électroniques ont la même valeur juridique qu\'une signature manuscrite.',
      `Les preuves de signature (horodatage, adresses IP, empreintes numériques) sont conservées`,
      `de manière sécurisée et peuvent être fournies sur demande.`,
    ]

    for (const line of legalText) {
      signaturePage.drawText(line, {
        x: 50,
        y: yPosition,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      })
      yPosition -= 12
    }

    // Sauvegarder le PDF modifié
    const signedPdfBytes = await pdfDoc.save()

    // Uploader le PDF signé
    const timestamp = Date.now()
    const originalName = procedure.project_files.file_name.replace('.pdf', '')
    const signedFileName = `${originalName}_signed_${timestamp}.pdf`
    const signedStoragePath = `${procedure.prospect_id}/${procedure.project_type}/${signedFileName}`

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('project-files')
      .upload(signedStoragePath, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Erreur upload PDF signé:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Erreur upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Créer l'entrée dans project_files
    const { data: fileRecord, error: fileError } = await supabaseClient
      .from('project_files')
      .insert({
        prospect_id: procedure.prospect_id,
        project_type: procedure.project_type,
        file_name: signedFileName,
        file_type: 'application/pdf',
        file_size: signedPdfBytes.byteLength,
        storage_path: signedStoragePath,
        uploaded_by: null,
        field_label: 'Document signé',
      })
      .select()
      .single()

    if (fileError || !fileRecord) {
      console.error('Erreur création file record:', fileError)
      return new Response(
        JSON.stringify({ error: 'Erreur enregistrement fichier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mettre à jour la procédure avec signed_file_id
    const { error: updateError } = await supabaseClient
      .from('signature_procedures')
      .update({
        signed_file_id: fileRecord.id,
        locked: true,
      })
      .eq('id', signature_procedure_id)

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
        signed_file_id: fileRecord.id,
        file_name: signedFileName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur generate-signed-pdf:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
