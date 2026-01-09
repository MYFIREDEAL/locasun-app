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

      // Vérifier status
      if (proc.status === 'signed') {
        setProcedure(proc);
        setSigned(true);
        setLoading(false);
        return;
      }

      if (proc.status !== 'pending') {
        setError(`Signature ${proc.status === 'refused' ? 'refusée' : 'annulée'}`);
        setLoading(false);
        return;
      }

      setProcedure(proc);

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

      // 3. Capturer métadonnées de signature (AES)
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

      // 4. Mettre à jour la procédure de signature
      // ⚠️ CRITIQUE: Réécrire explicitement signer_name et signer_email pour l'UI
      const { error: updateError } = await supabase
        .from('signature_procedures')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          document_hash: documentHash,
          signature_metadata: signatureMetadata,
          signer_name: procedure.signer_name,  // Réécrire explicitement
          signer_email: procedure.signer_email // Réécrire explicitement
        })
        .eq('id', signatureProcedureId)
        .eq('access_token', token); // Sécurité: vérifier le token

      if (updateError) {
        logger.error('Erreur mise à jour signature', updateError);
        throw updateError;
      }

      logger.debug('Signature enregistrée avec succès', { procedureId: signatureProcedureId });

      // 5. Recharger la procédure pour avoir les données à jour (source de vérité)
      const { data: updatedProc, error: reloadError } = await supabase
        .from('signature_procedures')
        .select('*')
        .eq('id', signatureProcedureId)
        .single();

      if (reloadError) {
        logger.error('Erreur rechargement procédure', reloadError);
      } else {
        logger.debug('📋 Procédure rechargée après signature', {
          signer_name: updatedProc.signer_name,
          signer_email: updatedProc.signer_email,
          signed_at: updatedProc.signed_at
        });
        setProcedure(updatedProc); // Mettre à jour avec les vraies données DB
      }

      // 6. Succès
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
