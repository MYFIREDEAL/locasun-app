import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Briefcase } from 'lucide-react';
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
 * - Auth via supabase.auth.signInWithPassword
 * - Vérifie que l'utilisateur existe dans `partners`
 * - Aucune inscription possible
 */
const PartnerLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Espace Partenaire</h1>
            <p className="text-gray-500 mt-2">Connectez-vous à votre compte</p>
          </div>

          {/* Formulaire */}
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

          {/* Footer */}
          <p className="text-center text-sm text-gray-400 mt-8">
            Accès réservé aux partenaires agréés
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PartnerLoginPage;
