import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [pdfUrl, setPdfUrl] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [otpRequested, setOtpRequested] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token manquant');
      return;
    }

    // Demander OTP automatiquement UNE SEULE FOIS
    if (!otpRequested) {
      handleRequestOtp();
      setOtpRequested(true);
    }
  }, [token, otpRequested]);

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

      // En dev, afficher l'OTP
      if (data?.dev_otp) {
        logger.debug('OTP DEV:', data.dev_otp);
        setError(`[DEV] Votre OTP: ${data.dev_otp}`);
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
          signer_email: procedure.signer_email,
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
          if (signer.email === procedure.signer_email && signer.role === 'cosigner') {
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
          email: procedure.signer_email, 
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Signature enregistrée !</h2>
          <p className="text-gray-600">Votre signature a été enregistrée avec succès.</p>
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
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Document à signer</h1>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden mb-6">
              <iframe
                src={pdfUrl}
                className="w-full h-[600px]"
                title="Document PDF"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSign}
                disabled={signing}
                className="bg-green-600 hover:bg-green-700"
              >
                {signing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signature en cours...
                  </>
                ) : (
                  'Signer le document'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CosignerSignaturePage;
