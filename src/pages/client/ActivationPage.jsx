import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/App';
import { toast } from '@/components/ui/use-toast';

const ActivationPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAppContext();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Activation de votre compte...');

  useEffect(() => {
    const activateAccount = async () => {
      try {
        // 1) PARSER LE FRAGMENT : Supabase v2 envoie le token dans le hash (#access_token=...)
        const hash = window.location.hash;
        
        if (!hash || hash.length === 0) {
          console.warn('⚠️ Aucun fragment trouvé dans l\'URL');
          setStatus('error');
          setMessage('Lien invalide. Veuillez demander un nouveau lien d\'invitation.');
          return;
        }

        const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
        const hashParams = new URLSearchParams(cleaned);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!accessToken) {
          logger.error('❌ Pas d\'access_token dans le fragment');
          setStatus('error');
          setMessage('Lien invalide ou expiré. Veuillez demander un nouveau lien.');
          return;
        }

        // 2) ÉTABLIR LA SESSION avec supabase.auth.setSession (v2)
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          logger.error('❌ Erreur setSession:', sessionError);
          setStatus('error');
          setMessage('Erreur lors de la connexion. Le lien a peut-être expiré.');
          return;
        }

        // 3) NETTOYER L'URL pour enlever le fragment
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        const user = sessionData.user;

        if (!user) {
          setStatus('error');
          setMessage('Erreur: utilisateur non trouvé après authentification.');
          return;
        }

        // Chercher le prospect avec cet email (qui n'a pas encore de user_id)
        const { data: prospects, error: prospectError } = await supabase
          .from('prospects')
          .select('*')
          .eq('email', user.email)
          .is('user_id', null); // Chercher seulement ceux sans user_id

        if (prospectError) {
          logger.error('Erreur recherche prospect:', prospectError);
          throw prospectError;
        }

        if (!prospects || prospects.length === 0) {
          // Aucun prospect trouve avec cet email
          // Peut-etre que l'utilisateur s'est deja active ou n'existe pas
          // Verifier s'il existe deja avec user_id
          const { data: existingProspect, error: existingError } = await supabase
            .from('prospects')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (existingProspect) {
            // Le prospect est deja active, on le connecte directement
            const clientData = {
              id: existingProspect.id,
              userId: existingProspect.user_id,
              name: existingProspect.name,
              email: existingProspect.email,
              phone: existingProspect.phone,
              company: existingProspect.company_name,
              address: existingProspect.address,
              tags: existingProspect.tags || [],
              status: existingProspect.status,
              ownerId: existingProspect.owner_id,
              hasAppointment: existingProspect.has_appointment,
            };
            
            setCurrentUser(clientData);
            setStatus('success');
            setMessage('Connexion reussie !');
            
            setTimeout(() => {
              navigate('/dashboard');
            }, 1500);
            return;
          }

          // Vraiment aucun prospect trouve
          setStatus('error');
          setMessage('Aucun compte trouve avec cet email. Contactez votre conseiller.');
          return;
        }

        // On a trouve un prospect sans user_id, on le lie
        const prospect = prospects[0];

        // Mettre a jour le prospect avec le user_id
        const { data: updatedProspect, error: updateError } = await supabase
          .from('prospects')
          .update({ user_id: user.id })
          .eq('id', prospect.id)
          .select()
          .single();

        if (updateError) {
          logger.error('Erreur mise a jour prospect:', updateError);
          throw updateError;
        }

        // Creer l'objet client pour le contexte
        const clientData = {
          id: updatedProspect.id,
          userId: updatedProspect.user_id,
          name: updatedProspect.name,
          email: updatedProspect.email,
          phone: updatedProspect.phone,
          company: updatedProspect.company_name,
          address: updatedProspect.address,
          tags: updatedProspect.tags || [],
          status: updatedProspect.status,
          ownerId: updatedProspect.owner_id,
          hasAppointment: updatedProspect.has_appointment,
        };

        setCurrentUser(clientData);
        setStatus('success');
        setMessage('Compte active avec succes ! Redirection...');

        toast({
          title: "Bienvenue !",
          description: "Votre compte a ete active avec succes.",
          className: "bg-green-500 text-white",
        });

        // Rediriger vers le dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);

      } catch (error) {
        logger.error('Erreur activation:', error);
        setStatus('error');
        setMessage('Une erreur est survenue. Veuillez reessayer.');
      }
    };

    activateAccount();
  }, [navigate, setCurrentUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Activation en cours...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Activation reussie !</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur d'activation</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Retour a l'accueil
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ActivationPage;
