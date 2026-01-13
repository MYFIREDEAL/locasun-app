import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Shield, CheckCircle2 } from 'lucide-react';
import { logger } from '@/lib/logger';

const CosignerSignaturePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [step, setStep] = useState('otp'); // 'otp' | 'pdf'
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [procedure, setProcedure] = useState(null);
  const [cosignerEmail, setCosignerEmail] = useState(''); // ✅ Email du co-signataire
  const [cosignerName, setCosignerName] = useState(''); // ✅ Nom du co-signataire
  const [pdfUrl, setPdfUrl] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token manquant');
      return;
    }

    // ✅ Charger la procédure et vérifier si déjà signé (comme SignaturePage.jsx)
    const loadProcedure = async () => {
      try {
        setLoading(true);
        
        // Récupérer les infos du token
        const { data: tokenData, error: tokenError } = await supabase
          .from('cosigner_invite_tokens')
          .select('signature_procedure_id, signer_email')
          .eq('token', token)
          .single();

        if (tokenError || !tokenData) {
          setError('Lien invalide');
          setLoading(false);
          return;
        }

        // Charger la procédure de signature
        const { data: proc, error: procError } = await supabase
          .from('signature_procedures')
          .select('*')
          .eq('id', tokenData.signature_procedure_id)
          .single();

        if (procError || !proc) {
          setError('Procédure de signature introuvable');
          setLoading(false);
          return;
        }

        setProcedure(proc);

        // ✅ Récupérer les infos du co-signataire depuis signers[]
        const cosigner = proc.signers?.find(
          s => s.email === tokenData.signer_email && s.role === 'cosigner'
        );

        // ✅ Stocker l'email et le nom du co-signataire
        setCosignerEmail(tokenData.signer_email);
        setCosignerName(cosigner?.name || tokenData.signer_email);

        // ✅ Vérifier si ce co-signataire a déjà signé (comme SignaturePage.jsx)
        if (cosigner?.status === 'signed') {
          logger.info('Co-signataire a déjà signé', { 
            email: tokenData.signer_email,
            signedAt: cosigner.signed_at 
          });
          setSigned(true); // ✅ Afficher directement la page de confirmation
          setLoading(false);
          return;
        }
        
        setLoading(false);

        // Si pas encore signé, demander l'OTP
        const otpKey = `otp_requested_${token}`;
        const alreadyRequested = localStorage.getItem(otpKey);

        if (!alreadyRequested) {
          handleRequestOtp();
          localStorage.setItem(otpKey, Date.now().toString());
          setTimeout(() => localStorage.removeItem(otpKey), 10 * 60 * 1000);
        }
      } catch (err) {
        logger.error('Erreur chargement procédure', err);
        setError('Erreur chargement');
        setLoading(false);
      }
    };

    loadProcedure();
  }, [token]);

  const handleRequestOtp = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: otpError } = await supabase.functions.invoke('send-cosigner-otp', {
        body: { token },
      });

      if (otpError) {
        setError(otpError.message || 'Erreur envoi OTP');
        return;
      }

      // ✅ Vérifier si le co-signataire a déjà signé
      if (data?.already_signed) {
        logger.info('Co-signataire a déjà signé', { signedAt: data.signed_at });
        setSigned(true); // Afficher la page de confirmation
        setLoading(false);
        return;
      }

      // ✅ Réinitialiser le compteur à 3 après envoi d'un nouveau code
      setRemainingAttempts(3);
      
      // ✅ Message de succès (sans afficher le code)
      setError(''); // Effacer les erreurs précédentes
      
      // En dev uniquement (localhost), afficher l'OTP
      if (data?.dev_otp && window.location.hostname === 'localhost') {
        logger.debug('OTP DEV:', data.dev_otp);
        console.log('🔐 [DEV ONLY] Votre OTP:', data.dev_otp);
      }
    } catch (err) {
      logger.error('Erreur requestOtp', err);
      setError('Erreur envoi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data, error: verifyError } = await supabase.functions.invoke('verify-cosigner-otp', {
        body: { token, otp },
      });

      if (verifyError || data?.error) {
        const errorMsg = data?.error || verifyError?.message || 'Code incorrect';
        setError(errorMsg);
        
        if (data?.remaining_attempts !== undefined) {
          setRemainingAttempts(data.remaining_attempts);
        }
        
        setLoading(false);
        return;
      }

      // OTP validé - Charger le PDF
      setProcedure(data.procedure);
      
      // ✅ Stocker l'email ET le nom du co-signataire depuis la réponse OTP
      setCosignerEmail(data.procedure.signer_email);
      setCosignerName(data.procedure.signer_name || data.procedure.signer_email);
      
      // Récupérer l'URL du PDF
      const { data: file } = await supabase
        .from('project_files')
        .select('storage_path')
        .eq('id', data.procedure.file_id)
        .single();

      if (file?.storage_path) {
        const { data: urlData } = await supabase.storage
          .from('project-files')
          .createSignedUrl(file.storage_path, 3600);
        
        if (urlData?.signedUrl) {
          setPdfUrl(urlData.signedUrl);
          setStep('pdf');
        }
      }
    } catch (err) {
      logger.error('Erreur verifyOtp', err);
      setError('Erreur vérification');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    try {
      setSigning(true);
      setError('');

      // Télécharger le PDF pour calculer le hash
      const response = await fetch(pdfUrl);
      const pdfBlob = await response.blob();
      const arrayBuffer = await pdfBlob.arrayBuffer();

      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const pdfHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      logger.debug('Cosigner signature - PDF hash calculé', { pdfHash });

      // 🔥 Appeler internal-signature pour créer la preuve légale
      const { data: signData, error: signError } = await supabase.functions.invoke('internal-signature', {
        body: {
          signature_procedure_id: procedure.id,
          signer_email: cosignerEmail, // ✅ Utiliser l'email du co-signataire stocké
          signer_user_id: null,
          pdf_file_id: procedure.file_id,
          pdf_hash: pdfHash,
        },
      });

      if (signError) {
        logger.error('Erreur signature cosigner', signError);
        setError('Erreur lors de la signature');
        setSigning(false);
        return;
      }

      logger.debug('Preuve de signature créée', signData);

      // 🔥 Marquer le cosigner comme signé
      const { data: procData } = await supabase
        .from('signature_procedures')
        .select('signers')
        .eq('id', procedure.id)
        .single();

      if (procData?.signers) {
        const updatedSigners = procData.signers.map(signer => {
          if (signer.email === cosignerEmail && signer.role === 'cosigner') { // ✅ Utiliser cosignerEmail
            return {
              ...signer,
              status: 'signed',
              signed_at: new Date().toISOString(),
            };
          }
          return signer;
        });

        // 🔥 Déterminer le status global
        const hasPendingSigners = updatedSigners.some(s => s.status === 'pending');
        const globalStatus = hasPendingSigners ? 'partially_signed' : 'completed';

        // 🔥 Mettre à jour la procédure
        await supabase
          .from('signature_procedures')
          .update({
            signers: updatedSigners,
            status: globalStatus,
          })
          .eq('id', procedure.id);

        logger.debug('Cosigner marqué signé', { 
          email: cosignerEmail, // ✅ Utiliser cosignerEmail
          globalStatus,
          allSigners: updatedSigners 
        });

        // 🔥 Si completed, générer le PDF signé final
        if (globalStatus === 'completed') {
          supabase.functions.invoke('generate-signed-pdf', {
            body: { signature_procedure_id: procedure.id },
          }).catch(err => {
            logger.error('Erreur génération PDF signé', err);
          });
        }
      }

      setSigned(true);
      setSigning(false);
    } catch (err) {
      logger.error('Erreur handleSign', err);
      setError('Erreur lors de la signature');
      setSigning(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Token manquant</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contrat signé !</h1>
          <p className="text-gray-600 mb-4">
            Votre signature électronique a été enregistrée avec succès.
          </p>
          {procedure && cosignerEmail && (
            <div className="text-sm text-gray-500 space-y-1 bg-gray-50 p-4 rounded-lg">
              <p><span className="font-semibold">Signataire:</span> {cosignerName}</p>
              <p><span className="font-semibold">Email:</span> {cosignerEmail}</p>
              <p><span className="font-semibold">Date:</span> {new Date().toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {step === 'otp' ? (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Vérification de sécurité</h1>
              <p className="text-gray-600 mt-2">
                Un code à 6 chiffres a été envoyé par email
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="otp">Code de vérification</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tentatives restantes: {remainingAttempts}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier le code'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleRequestOtp}
                disabled={loading}
              >
                Renvoyer un code
              </Button>
            </form>
          </div>
        ) : (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="bg-white rounded-t-lg shadow-lg p-6 border-b">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Signature électronique - Co-signataire</h1>
                <p className="text-gray-600">
                  Signataire: <span className="font-semibold">{procedure?.signer_email}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Document vérifié et sécurisé
                </p>
              </div>

              {/* PDF Viewer */}
              <div className="bg-white shadow-lg p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Document à signer</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

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
        )}
      </div>
    </div>
  );
};

export default CosignerSignaturePage;
