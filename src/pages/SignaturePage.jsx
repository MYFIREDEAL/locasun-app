import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Page de signature électronique avancée (AES) - Phase 2
 * Conforme eIDAS art. 26
 */
export default function SignaturePage() {
  const { signatureProcedureId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [procedure, setProcedure] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    loadSignatureProcedure();
  }, [signatureProcedureId, token]);

  const loadSignatureProcedure = async () => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier token
      if (!token) {
        setError('Token manquant');
        setLoading(false);
        return;
      }

      logger.debug('Chargement procédure', { signatureProcedureId, token });

      // Récupérer la procédure (RLS permet accès public avec token)
      const { data: proc, error: procError } = await supabase
        .from('signature_procedures')
        .select('*, project_files!signature_procedures_file_id_fkey(*)')
        .eq('id', signatureProcedureId)
        .eq('access_token', token)
        .single();

      if (procError || !proc) {
        logger.error('Erreur chargement procédure', procError);
        setError('Lien invalide ou expiré');
        setLoading(false);
        return;
      }

      // Vérifier expiration
      const expiresAt = new Date(proc.access_token_expires_at);
      if (expiresAt < new Date()) {
        setError('Lien expiré - Veuillez contacter votre conseiller');
        setLoading(false);
        return;
      }

      // Vérifier si refusée ou annulée
      if (proc.status === 'refused' || proc.status === 'cancelled') {
        setError(`Signature ${proc.status === 'refused' ? 'refusée' : 'annulée'}`);
        setLoading(false);
        return;
      }

      setProcedure(proc);

      // ✅ Vérifier si CE signataire principal a déjà signé (via signature_proofs)
      const { data: existingProof } = await supabase
        .from('signature_proofs')
        .select('id, created_at') // ✅ Utiliser created_at au lieu de signed_at
        .eq('signature_procedure_id', proc.id)
        .eq('signer_email', proc.signer_email) // Email du signataire principal
        .maybeSingle();

      if (existingProof) {
        logger.info('Signataire principal a déjà signé', { 
          email: proc.signer_email,
          signedAt: existingProof.created_at 
        });
        setSigned(true);
        setLoading(false);
        return;
      }

      logger.debug('📋 Procédure chargée', { 
        signer_name: proc.signer_name, 
        signer_email: proc.signer_email,
        status: proc.status 
      });

      // Récupérer URL signée du PDF
      const { data: urlData, error: urlError } = await supabase.storage
        .from('project-files')
        .createSignedUrl(proc.project_files.storage_path, 3600);

      if (urlError) {
        logger.error('Erreur création URL signée', urlError);
        setError('Impossible de charger le PDF');
        setLoading(false);
        return;
      }

      setPdfUrl(urlData.signedUrl);
      setLoading(false);
    } catch (err) {
      logger.error('Erreur chargement procédure', err);
      setError('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!accepted) {
      alert('Veuillez accepter les conditions avant de signer');
      return;
    }

    try {
      setSigning(true);

      // 1. Télécharger le PDF pour calculer le hash SHA-256
      logger.debug('Téléchargement PDF pour calcul hash...');
      const response = await fetch(pdfUrl);
      const pdfBlob = await response.blob();
      const arrayBuffer = await pdfBlob.arrayBuffer();

      // 2. Calculer SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      logger.debug('Hash SHA-256 calculé', { documentHash: documentHash.substring(0, 16) + '...' });

      // 3. Créer la preuve de signature via internal-signature
      const { data: signData, error: signError } = await supabase.functions.invoke('internal-signature', {
        body: {
          signature_procedure_id: signatureProcedureId,
          signer_email: procedure.signer_email,
          signer_user_id: null,
          pdf_file_id: procedure.file_id,
          pdf_hash: documentHash,
        },
      });

      if (signError) {
        logger.error('Erreur création preuve signature', signError);
        throw signError;
      }

      logger.debug('Preuve de signature créée', signData);

      // 4. Récupérer la procédure pour vérifier les signataires
      const { data: currentProc } = await supabase
        .from('signature_procedures')
        .select('signers')
        .eq('id', signatureProcedureId)
        .single();

      // 5. Mettre à jour signers[] avec le principal signé
      const updatedSigners = (currentProc?.signers || []).map(signer => {
        if (signer.email === procedure.signer_email && signer.role === 'principal') {
          return {
            ...signer,
            status: 'signed',
            signed_at: new Date().toISOString(),
          };
        }
        return signer;
      });

      // 6. Déterminer le status global
      const hasPendingSigners = updatedSigners.some(s => s.status === 'pending');
      const globalStatus = hasPendingSigners ? 'partially_signed' : 'completed';

      // 🔍 LOGS DE DEBUG
      logger.debug('📊 Analyse des signataires:', {
        totalSigners: updatedSigners.length,
        signedCount: updatedSigners.filter(s => s.status === 'signed').length,
        pendingCount: updatedSigners.filter(s => s.status === 'pending').length,
        hasPendingSigners,
        globalStatus,
        allSigners: updatedSigners
      });

      // 7. Capturer métadonnées de signature (AES)
      const signatureMetadata = {
        signed_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        consent_text: "En signant électroniquement ce document, je reconnais avoir lu et accepté l'intégralité des termes du contrat ci-joint. Je consens à l'utilisation de la signature électronique et reconnais qu'elle a la même valeur juridique qu'une signature manuscrite.",
        signature_method: 'AES_eIDAS_art26',
        document_hash_algorithm: 'SHA-256'
      };

      // 8. Mettre à jour la procédure de signature
      // 🔥 FIX: Merger signature_metadata au lieu d'écraser (préserve actionId, panelDbId de V2)
      const existingMetadata = procedure?.signature_metadata || {};
      const mergedMetadata = {
        ...existingMetadata,
        ...signatureMetadata,
      };

      const { data: updatedProc, error: updateError } = await supabase
        .from('signature_procedures')
        .update({
          status: globalStatus,
          signers: updatedSigners,
          signed_at: new Date().toISOString(),
          document_hash: documentHash,
          signature_metadata: mergedMetadata,
        })
        .eq('id', signatureProcedureId)
        .eq('access_token', token) // Sécurité: vérifier le token
        .select()
        .single();

      if (updateError) {
        logger.error('Erreur mise à jour signature', updateError);
        throw updateError;
      }

      logger.debug('Signature enregistrée avec succès', { 
        procedureId: signatureProcedureId,
        signer_name: updatedProc.signer_name,
        signer_email: updatedProc.signer_email,
        globalStatus,
        signed_at: updatedProc.signed_at
      });

      // 9. Si completed, générer le PDF signé final
      if (globalStatus === 'completed') {
        logger.debug('✅ Status = completed - Appel generate-signed-pdf', { procedure_id: signatureProcedureId });
        
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-signed-pdf', {
          body: { signature_procedure_id: signatureProcedureId },
        });

        if (pdfError) {
          logger.error('❌ Erreur génération PDF signé', pdfError);
        } else {
          logger.debug('✅ PDF signé généré avec succès', pdfData);
        }
      } else {
        logger.debug('⏸️ Status = partially_signed - Attente des co-signataires', { 
          globalStatus,
          pendingSigners: updatedSigners.filter(s => s.status === 'pending')
        });
      }

      // 10. Mettre à jour le state avec les données fraîches de la DB
      setProcedure(updatedProc);

      // 11. Succès
      setSigned(true);
      setSigning(false);

    } catch (err) {
      logger.error('Erreur signature', err);
      setError(`Erreur lors de la signature: ${err.message}`);
      setSigning(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Signed state
  if (signed && procedure) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contrat signé !</h1>
          <p className="text-gray-600 mb-4">
            Votre signature électronique a été enregistrée avec succès.
          </p>
          <div className="text-sm text-gray-500 space-y-1 bg-gray-50 p-4 rounded-lg">
            <p><span className="font-semibold">Signataire:</span> {procedure.signer_name}</p>
            <p><span className="font-semibold">Email:</span> {procedure.signer_email}</p>
            <p><span className="font-semibold">Date:</span> {new Date(procedure.signed_at).toLocaleString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </div>
    );
  }

  // Signature form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-lg p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Signature électronique</h1>
          <p className="text-gray-600">
            Signataire: <span className="font-semibold">{procedure?.signer_name}</span> ({procedure?.signer_email})
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Expire le: {new Date(procedure?.access_token_expires_at).toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white shadow-lg p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Document à signer</h2>
          <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Document PDF"
            />
          </div>
        </div>

        {/* Consent Section */}
        <div className="bg-white shadow-lg p-6 rounded-b-lg">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Consentement à la signature électronique</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              En signant électroniquement ce document, je reconnais avoir lu et accepté l'intégralité 
              des termes du contrat ci-joint. Je consens à l'utilisation de la signature électronique 
              conforme au règlement eIDAS (article 26) et reconnais qu'elle a la même valeur juridique 
              qu'une signature manuscrite.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Cette signature est horodatée et scellée par un hash cryptographique SHA-256 du document.
            </p>
          </div>

          {/* Checkbox */}
          <div className="flex items-start space-x-3 mb-6">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={setAccepted}
              className="mt-1"
            />
            <label htmlFor="accept" className="text-sm text-gray-700 cursor-pointer">
              J'ai lu et accepté les termes du contrat, et je consens à signer électroniquement ce document
            </label>
          </div>

          {/* Sign Button */}
          <Button
            onClick={handleSign}
            disabled={!accepted || signing}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-6 text-lg"
          >
            {signing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Signature en cours...
              </>
            ) : (
              <>
                ✍️ Signer le contrat
              </>
            )}
          </Button>

          {/* Legal Notice */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Signature électronique avancée (AES) conforme au règlement eIDAS (UE) n°910/2014 - Article 26
          </p>
        </div>
      </div>
    </div>
  );
}
