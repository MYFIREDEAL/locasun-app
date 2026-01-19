import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const ProLoginPage = () => {
  const navigate = useNavigate();
  const { setActiveAdminUser } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleProLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Connexion via Supabase Auth
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

      // Récupérer les données du user PRO depuis public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (userError || !userData) {
        logger.error('❌ Erreur détaillée:', userError);
        toast({
          title: "Erreur",
          description: `Compte professionnel introuvable. ${userError?.message || ''}`,
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Connexion PRO réussie
      toast({
        title: "Connexion réussie !",
        description: "Chargement de votre espace...",
        className: "bg-green-500 text-white",
      });
      
      // ✅ Transformer les données Supabase (snake_case → camelCase)
      const transformedUserData = {
        id: userData.id,
        userId: userData.user_id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        avatarUrl: userData.avatar_url,
        managerId: userData.manager_id,
        accessRights: userData.access_rights,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      };
      
      setActiveAdminUser(transformedUserData);
      
      // ✅ Activer l'écran de redirection (évite l'écran blanc)
      setIsRedirecting(true);
      
      // ⏱️ Délai optimal UX B2B (standard Notion/Slack: 1200ms)
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1200);
    } catch (error) {
      logger.error('Pro login error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la connexion.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/reset-password');
  };

  // ✅ ÉCRAN DE REDIRECTION (évite l'écran blanc post-login)
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
        >
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion réussie !</h2>
          <p className="text-gray-600 mb-2">Chargement de votre espace EVATIME...</p>
          <p className="text-sm text-gray-500">Vous allez être redirigé automatiquement.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center px-4">
      {/* Bouton retour */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
      >
        <span>←</span>
        <span>Retour à l'accueil</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo/Titre */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Espace Pro</h1>
          <p className="text-gray-600">Connectez-vous à votre compte professionnel</p>
        </div>

        {/* Carte de connexion */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleProLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 gradient-green text-white text-lg font-semibold"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        </div>

        {/* Lien vers espace client */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous êtes un client ?{' '}
            <button
              onClick={() => navigate('/client-access')}
              className="text-blue-600 hover:underline font-medium"
            >
              Accédez à votre espace client
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ProLoginPage;
