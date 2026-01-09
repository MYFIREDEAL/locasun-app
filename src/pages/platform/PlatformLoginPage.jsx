import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Mail, Lock, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PlatformLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Vérifier si déjà connecté en tant que platform_admin
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setCheckingAuth(false);
          return;
        }

        // Vérifier le rôle
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!userError && userData?.role === 'platform_admin') {
          console.log('✅ [PlatformLogin] Déjà connecté en tant que platform_admin');
          navigate('/platform/organizations', { replace: true });
        } else {
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error('[PlatformLogin] Error checking auth:', err);
        setCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validation
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide.",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "Mot de passe requis",
        description: "Veuillez saisir votre mot de passe.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // 1. Authentification Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        console.error('[PlatformLogin] Auth error:', authError);
        toast({
          title: "Échec de connexion",
          description: authError.message === 'Invalid login credentials'
            ? "Email ou mot de passe incorrect."
            : authError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error('Aucun utilisateur retourné après connexion');
      }

      console.log('✅ [PlatformLogin] Auth réussie, vérification du rôle...');

      // 2. Vérifier présence dans public.users et role platform_admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, name')
        .eq('user_id', authData.user.id)
        .single();

      if (userError || !userData) {
        console.error('[PlatformLogin] User not found in public.users:', userError);
        
        // Déconnecter l'utilisateur
        await supabase.auth.signOut();
        
        toast({
          title: "Accès plateforme refusé",
          description: "Votre compte n'est pas autorisé à accéder à la plateforme EVATIME.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 3. Vérifier role === 'platform_admin'
      if (userData.role !== 'platform_admin') {
        console.error('[PlatformLogin] Access denied - role:', userData.role);
        
        // Déconnecter l'utilisateur
        await supabase.auth.signOut();
        
        toast({
          title: "Accès plateforme refusé",
          description: `Votre rôle (${userData.role}) n'est pas autorisé. Seuls les Platform Admin peuvent accéder.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 4. Succès - Redirection
      console.log('✅ [PlatformLogin] Platform admin vérifié, redirection...');
      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${userData.name || userData.email}`,
        className: "bg-green-500 text-white",
      });

      navigate('/platform/organizations', { replace: true });

    } catch (err) {
      console.error('[PlatformLogin] Exception:', err);
      toast({
        title: "Erreur",
        description: err.message || "Une erreur est survenue lors de la connexion.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-medium">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <Shield className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">EVATIME Platform</h1>
          <p className="text-gray-400">Accès réservé aux administrateurs plateforme</p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-white rounded-lg shadow-xl p-8"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Adresse email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@evatime.com"
                  className="pl-10 h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Se connecter
                </>
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Accès restreint aux utilisateurs avec le rôle{' '}
              <span className="font-mono font-semibold text-gray-700">platform_admin</span>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} EVATIME Platform - Tous droits réservés
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PlatformLoginPage;
