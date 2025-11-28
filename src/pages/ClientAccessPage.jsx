import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { Mail, User, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ClientAccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectsData, authLoading } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // 🔥 Pré-remplir l'email si on vient de l'inscription
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      toast({
        title: "📧 Presque terminé !",
        description: "Cliquez sur 'Recevoir le lien' pour accéder à votre espace.",
        className: "bg-blue-500 text-white",
      });
    }
  }, [location.state]);

  // Projets publics dynamiques (comme dans RegistrationPage)
  const projectOptions = useMemo(() => {
    if (!projectsData || Object.keys(projectsData).length === 0) {
      return [];
    }
    return Object.values(projectsData)
      .filter(p => p && p.isPublic)
      .map(p => ({
        id: p.type,
        label: p.clientTitle || p.title,
        icon: p.icon || '📋',
        color: p.color
      }));
  }, [projectsData]);

  const handleProjectToggle = (projectId) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSendMagicLink = async (e) => {
    e.preventDefault();

    // Validation email uniquement
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // 1) Vérifier si un prospect existe avec cet email
      const { data: existingProspect, error: checkError } = await supabase
        .from('prospects')
        .select('*')
        .eq('email', email.trim())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingProspect) {
        toast({
          title: "Compte introuvable",
          description: "Aucun compte client trouvé avec cet email. Veuillez vous inscrire d'abord.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2) Envoyer le Magic Link (sans confirmation d'email)
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/#/dashboard`,
          shouldCreateUser: false, // Ne pas créer de user (il existe déjà)
        }
      });

      if (magicLinkError) {
        throw magicLinkError;
      }

      setEmailSent(true);
      toast({
        title: "✅ Email envoyé !",
        description: "Consultez votre boîte mail pour accéder à votre espace.",
        className: "bg-green-500 text-white",
      });

    } catch (error) {
      console.error('Error sending magic link:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le lien. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Afficher un loader si les projets ne sont pas encore chargés
  if (authLoading || !projectsData || Object.keys(projectsData).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="mb-6">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Email envoyé !</h2>
          <p className="text-gray-600 mb-6">
            Nous vous avons envoyé un lien sécurisé à <strong>{email}</strong>.
            <br />
            <br />
            Cliquez sur le lien dans l'email pour accéder à votre espace client.
          </p>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full"
          >
            Retour à l'accueil
          </Button>
        </motion.div>
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
            Recevez un lien sécurisé pour accéder à votre espace
          </p>
        </div>

        <form onSubmit={handleSendMagicLink} className="space-y-6">
          {/* Email uniquement */}
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
              />
            </div>
          </div>

          {/* Boutons sociaux (désactivés) */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Ou continuer avec</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Apple
              </Button>
            </div>
            <p className="text-xs text-center text-gray-500">
              Connexion sociale bientôt disponible
            </p>
          </div>

          {/* Bouton Magic Link */}
          <Button
            type="submit"
            className="w-full gradient-blue text-white py-6 text-lg font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              'Recevoir mon lien sécurisé'
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Un lien unique vous sera envoyé par email pour accéder à votre espace en toute sécurité.
          </p>
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
