import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ClientAccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectsData, authLoading, currentUser } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 REDIRECTION AUTO si déjà connecté
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

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

    if (!password || password.length < 6) {
      toast({
        title: "Mot de passe requis",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Connexion réussie !",
        description: "Redirection vers votre espace...",
        className: "bg-green-500 text-white",
      });

      // Redirection vers le dashboard client
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);

    } catch (error) {
      console.error('[ClientAccess] Login error:', error);
      
      let errorMessage = "Email ou mot de passe incorrect.";
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Email ou mot de passe incorrect. Veuillez réessayer.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Veuillez confirmer votre email avant de vous connecter.";
      }

      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader si les projets ne sont pas encore chargés
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Connexion Client</h1>
          <p className="text-gray-600">
            Connectez-vous avec votre email et mot de passe
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div>
            <Label htmlFor="email">Votre adresse email</Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="jean.dupont@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Bouton de connexion */}
          <Button
            type="submit"
            className="w-full gradient-blue text-white py-6 text-lg font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        {/* Liens navigation */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <button
              onClick={() => navigate('/inscription')}
              className="text-blue-600 font-medium hover:underline"
            >
              Créer un compte
            </button>
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:underline block mx-auto"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientAccessPage;
