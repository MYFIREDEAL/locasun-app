import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

export default function SignaturePage() {
  const { signatureProcedureId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

      // Récupérer la procédure
      logger.debug('Chargement procédure', { signatureProcedureId, token });
      
      // Spécifier la relation explicite pour éviter l'ambiguïté (file_id vs signed_file_id)
      const { data: proc, error: procError } = await supabase
        .from('signature_procedures')
        .select('*, project_files!signature_procedures_file_id_fkey(*)')
        .eq('id', signatureProcedureId)
        .eq('access_token', token)
        .single();

      logger.debug('Résultat requête', { proc, procError });

      if (procError || !proc) {
        logger.error('Erreur chargement procédure', procError);
        setError('Lien invalide ou expiré');
        setLoading(false);
        return;
      }

      // Vérifier expiration
      const expiresAt = new Date(proc.access_token_expires_at);
      if (expiresAt < new Date()) {
        setError('Lien expiré');
        setLoading(false);
        return;
      }

      // Vérifier status
      if (proc.status !== 'pending') {
        setError(`Signature déjà ${proc.status === 'signed' ? 'effectuée' : 'annulée'}`);
        setLoading(false);
        return;
      }

      setProcedure(proc);

      // Récupérer URL signée du PDF (bucket = "project-files" avec tiret, pas underscore)
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
    try {
      setSigning(true);

      // Télécharger le PDF pour calculer le hash
      const response = await fetch(pdfUrl);
      const pdfBlob = await response.blob();
      const arrayBuffer = await pdfBlob.arrayBuffer();

      // Calculer SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const pdfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      logger.debug('PDF hash calculé', { pdfHash });

      // Récupérer email du prospect
      const { data: prospect } = await supabase
        .from('prospects')
        .select('email, user_id')
        .eq('id', procedure.prospect_id)
        .single();

      // Appeler Edge Function internal-signature
      const { data, error } = await supabase.functions.invoke('internal-signature', {
        body: {
          signature_procedure_id: signatureProcedureId,
          signer_email: prospect?.email || '',
          signer_user_id: prospect?.user_id || null,
          pdf_file_id: procedure.file_id,
          pdf_hash: pdfHash,
        },
      });

      if (error) {
        logger.error('Erreur signature', error);
        setError('Erreur lors de la signature');
        setSigning(false);
        return;
      }

      setSigned(true);
      setSigning(false);
      
      // Redirection après 3 secondes
      setTimeout(() => {
        navigate('/client/dashboard');
      }, 3000);
    } catch (err) {
      logger.error('Erreur handleSign', err);
      setError('Erreur lors de la signature');
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ {error}</h1>
          <p className="text-gray-600 mb-6">Veuillez contacter votre conseiller.</p>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">✅ Contrat signé avec succès</h1>
          <p className="text-gray-600 mb-6">Vous allez être redirigé vers votre espace client...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Signature du contrat</h1>

          {/* Viewer PDF */}
          <div className="mb-6 border rounded-lg overflow-hidden" style={{ height: '600px' }}>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="Contrat à signer"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* Checkbox acceptation */}
          <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={setAccepted}
              className="mt-1"
            />
            <label htmlFor="accept" className="text-sm cursor-pointer">
              J'ai lu et j'accepte les termes du contrat. Je confirme que je souhaite signer ce document électroniquement.
            </label>
          </div>

          {/* Bouton signature */}
          <div className="flex justify-end">
            <Button
              onClick={handleSign}
              disabled={!accepted || signing}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {signing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                '✍️ Je signe le contrat'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
