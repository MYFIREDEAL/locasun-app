import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useAppContext } from '@/App';

/**
 * Page d'activation de compte pour utilisateurs invités (admin/commercial/manager)
 * L'utilisateur définit son mot de passe après avoir reçu l'email d'invitation
 */
const ActivateAccountPage = () => {
  const navigate = useNavigate();
  const { setActiveAdminUser } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingSession, setValidatingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // ✅ LOGIQUE CORRECTE : Vérifier uniquement la session existante
  useEffect(() => {
    const checkSession = async () => {
      try {
        logger.info('🔐 Vérification de la session Supabase...');

        // Supabase a déjà créé la session automatiquement via inviteUserByEmail
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          logger.error('❌ Pas de session active:', error);
          setSessionValid(false);
          setValidatingSession(false);
          return;
        }

        const user = session.user;

        if (!user || !user.email) {
          logger.error('❌ Pas d\'utilisateur dans la session');
          setSessionValid(false);
          setValidatingSession(false);
          return;
        }

        // Vérifier que l'utilisateur existe dans la table users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, name')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData) {
          logger.error('❌ Utilisateur non trouvé dans table users:', userError);
          setSessionValid(false);
          setValidatingSession(false);
          return;
        }

        // ✅ Session valide et utilisateur trouvé
        logger.info('✅ Session valide pour:', userData.email);
        setUserEmail(userData.email);
        setSessionValid(true);
        setValidatingSession(false);

      } catch (error) {
        logger.error('❌ Erreur vérification session:', error);
        setSessionValid(false);
        setValidatingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleActivateAccount = async (e) => {
    e.preventDefault();

    // Validation
    if (!password || !confirmPassword) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Mots de passe différents",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      logger.info('🔐 Mise à jour du mot de passe...');

      // ✅ Mettre à jour le mot de passe (la session existe déjà)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        logger.error('❌ Erreur updateUser:', updateError);
        toast({
          title: "Erreur",
          description: "Impossible de définir le mot de passe. Veuillez réessayer.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const user = updateData.user;

      if (!user) {
        toast({
          title: "Erreur",
          description: "Erreur lors de la mise à jour du compte.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Récupérer les données complètes de l'utilisateur depuis la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        logger.error('❌ Erreur récupération données user:', userError);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les informations du compte.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Succès !
      toast({
        title: "Compte activé !",
        description: "Votre mot de passe a été défini. Connexion en cours...",
        className: "bg-green-500 text-white",
      });

      // Transformer les données Supabase (snake_case → camelCase)
      const transformedUserData = {
        id: userData.id,
        userId: userData.user_id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        avatarUrl: userData.avatar_url,
        managerId: userData.manager_id,
        organizationId: userData.organization_id,
        accessRights: userData.access_rights,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      };

      setActiveAdminUser(transformedUserData);

      // Redirection vers l'espace admin
      setTimeout(() => {
        window.location.href = '/admin/pipeline';
      }, 1000);

    } catch (error) {
      logger.error('Erreur activation compte:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Écran de chargement pendant la vérification de la session
  if (validatingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
        >
          <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vérification...</h2>
          <p className="text-gray-600">Veuillez patienter</p>
        </motion.div>
      </div>
    );
  }

  // Écran d'erreur si pas de session valide
  if (!sessionValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
        >
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide ou expiré</h2>
          <p className="text-gray-600 mb-6">
            Ce lien d'activation n'est plus valide. Veuillez contacter votre administrateur pour recevoir une nouvelle invitation.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Retour à la connexion
          </Button>
        </motion.div>
      </div>
    );
  }

  // Formulaire d'activation du compte
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Activation de votre compte
          </h1>
          <p className="text-gray-600">
            Bienvenue ! Définissez votre mot de passe pour activer votre compte professionnel.
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-2">
              Compte : <strong>{userEmail}</strong>
            </p>
          )}
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleActivateAccount} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 caractères"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Retapez votre mot de passe"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Indicateur de force du mot de passe */}
            {password && (
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Force du mot de passe :</p>
                <div className="flex gap-1">
                  <div className={`h-1 flex-1 rounded ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <div className={`h-1 flex-1 rounded ${password.length >= 10 && /[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-200'}`} />
                </div>
                <p className="text-xs text-gray-500">
                  {password.length < 6 && 'Minimum 6 caractères requis'}
                  {password.length >= 6 && password.length < 8 && 'Acceptable'}
                  {password.length >= 8 && password.length < 10 && 'Bon'}
                  {password.length >= 10 && /[A-Z]/.test(password) && 'Excellent'}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white text-lg font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Activation en cours...
                </>
              ) : (
                'Activer mon compte'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Un problème ?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline font-medium"
            >
              Retour à la connexion
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ActivateAccountPage;
