import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Briefcase, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Page de connexion pour les partenaires
 * Route: /partner/login
 * 
 * MODES:
 * 1. Login classique (pas de hash #access_token)
 * 2. Création de mot de passe (hash #access_token ou #type=invite/recovery)
 *    → Pattern identique à ActivateAccountPage (user pro)
 *    → Écoute onAuthStateChange pour l'événement SIGNED_IN
 *    → Puis appelle updateUser({ password })
 */
const PartnerLoginPage = () => {
  const navigate = useNavigate();

  // États login classique
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // États création mot de passe (mode invite)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  // États validation session invite
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [validatingSession, setValidatingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');

  // ✅ LOGIQUE CORRIGÉE : Le hash est souvent déjà consommé par App.jsx
  // On vérifie si une session existe ET si c'est un partenaire
  // Si oui et que le hash contenait un token OU si l'user n'a pas encore de mot de passe → mode création
  useEffect(() => {
    const hash = window.location.hash;
    const hasInviteToken = hash.includes('access_token') || hash.includes('type=invite') || hash.includes('type=recovery');

    logger.info('🔐 PartnerLoginPage - Vérification du flow invitation', {
      hash: hash ? hash.substring(0, 50) + '...' : '(vide)',
      hasInviteToken
    });

    // Fonction pour vérifier la session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        logger.info('✅ Session active trouvée', { 
          userId: session.user.id,
          email: session.user.email,
          // Supabase met recovery=true quand c'est un flow invite/recovery
          isRecovery: session.user?.recovery
        });
        
        // Vérifier si c'est un partenaire
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('email, company_name')
          .eq('user_id', session.user.id)
          .single();

        if (partnerData && !partnerError) {
          // C'est un partenaire avec une session active
          // Si le hash contenait un token OU si c'est un recovery → mode création mot de passe
          // Sinon, ils ont probablement déjà un mot de passe et veulent juste accéder
          
          // Vérifier si c'est une invitation récente (user créé < 1h)
          const createdAt = new Date(session.user.created_at);
          const now = new Date();
          const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
          const isRecentInvite = hoursSinceCreation < 24; // Moins de 24h
          
          logger.info('� Partenaire trouvé', { 
            email: partnerData.email,
            isRecentInvite,
            hoursSinceCreation: hoursSinceCreation.toFixed(1)
          });

          if (hasInviteToken || isRecentInvite) {
            // Mode création de mot de passe
            setIsInviteFlow(true);
            setPartnerEmail(partnerData.email);
            setSessionValid(true);
            setValidatingSession(false);
            return;
          }
        }
      }

      // Pas de session valide ou pas de partenaire → mode login classique
      if (hasInviteToken) {
        // On avait un hash mais pas de session → lien expiré
        logger.warn('⚠️ Hash présent mais pas de session valide');
        setIsInviteFlow(true);
        setSessionValid(false);
        setValidatingSession(false);
      } else {
        // Mode login classique
        setIsInviteFlow(false);
        setValidatingSession(false);
      }
    };

    // Attendre un petit délai pour que App.jsx ait le temps de parser le hash
    const timeoutId = setTimeout(checkSession, 500);

    // Écouter aussi les changements d'auth au cas où
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info('🔔 Auth event reçu:', { event, hasSession: !!session });

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
          // Re-vérifier la session
          checkSession();
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Handler création mot de passe
  const handleSetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    setSettingPassword(true);

    try {
      // Appel updateUser pour définir le mot de passe
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        logger.error('Erreur updateUser password', { error: error.message });
        toast({
          title: "Erreur",
          description: error.message || "Impossible de définir le mot de passe.",
          variant: "destructive",
        });
        return;
      }

      logger.info('Mot de passe partenaire défini avec succès');

      toast({
        title: "✅ Mot de passe créé !",
        description: "Bienvenue sur EVATIME.",
        className: "bg-green-500 text-white",
      });

      // Redirect vers l'espace partenaire
      navigate('/partner/missions');

    } catch (error) {
      logger.error('Erreur inattendue création mot de passe', { error: error.message });
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setSettingPassword(false);
    }
  };

  const handlePartnerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Connexion via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast({
          title: "Erreur de connexion",
          description: "Email ou mot de passe incorrect.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Vérifier que l'utilisateur est bien un partenaire
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, company_name, is_active')
        .eq('user_id', authData.user.id)
        .single();

      if (partnerError || !partnerData) {
        logger.warn('Tentative de connexion partenaire par un non-partenaire', {
          userId: authData.user.id,
          email,
        });
        
        // Logout immédiat
        await supabase.auth.signOut();
        
        toast({
          title: "Accès refusé",
          description: "Ce compte n'est pas un compte partenaire.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 3. Vérifier que le partenaire est actif
      if (!partnerData.is_active) {
        await supabase.auth.signOut();
        
        toast({
          title: "Compte désactivé",
          description: "Votre compte partenaire a été désactivé. Contactez l'administrateur.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 4. Connexion réussie
      logger.info('Connexion partenaire réussie', {
        partnerId: partnerData.id,
        companyName: partnerData.company_name,
      });

      toast({
        title: "Connexion réussie !",
        description: `Bienvenue ${partnerData.company_name}`,
        className: "bg-green-500 text-white",
      });

      // 5. Redirection vers l'espace partenaire
      navigate('/partner');

    } catch (error) {
      logger.error('Erreur inattendue lors de la connexion partenaire', { error: error.message });
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Mode invite : en cours de validation */}
          {isInviteFlow && validatingSession && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Validation de votre invitation...</p>
            </div>
          )}

          {/* Mode invite : session invalide */}
          {isInviteFlow && !validatingSession && !sessionValid && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Lien expiré</h1>
              <p className="text-gray-500 mb-6">
                Ce lien d'invitation n'est plus valide ou a déjà été utilisé.
              </p>
              <Button
                onClick={() => navigate('/partner/login')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Retour à la connexion
              </Button>
            </div>
          )}

          {/* Mode invite : session valide → formulaire création mot de passe */}
          {isInviteFlow && !validatingSession && sessionValid && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Créer votre mot de passe</h1>
                <p className="text-gray-500 mt-2">
                  Définissez un mot de passe pour accéder à votre espace
                </p>
                {partnerEmail && (
                  <p className="text-sm text-orange-600 mt-1">{partnerEmail}</p>
                )}
              </div>

              <form onSubmit={handleSetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={settingPassword}
                    className="h-12"
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={settingPassword}
                    className="h-12"
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={settingPassword}
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium"
                >
                  {settingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer mon mot de passe'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-8">
                Accès réservé aux partenaires agréés
              </p>
            </>
          )}

          {/* Mode login classique */}
          {!isInviteFlow && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Espace Partenaire</h1>
                <p className="text-gray-500 mt-2">Connectez-vous à votre compte</p>
              </div>

              <form onSubmit={handlePartnerLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="partenaire@entreprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-8">
                Accès réservé aux partenaires agréés
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PartnerLoginPage;
