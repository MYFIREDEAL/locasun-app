import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Page d'accueil partenaire (placeholder)
 * Route: /partner
 * 
 * - Affiche un message de bienvenue
 * - Bouton de déconnexion
 * - Pas de logique métier (missions, etc.)
 */
const PartnerHomePage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté.",
      });
      
      navigate('/partner/login');
    } catch (error) {
      logger.error('Erreur lors de la déconnexion partenaire', { error: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Header */}
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-10 h-10 text-orange-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenue
          </h1>
          
          <p className="text-gray-500 mb-8">
            Vous êtes connecté à votre espace partenaire.
          </p>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>

          {/* Info */}
          <p className="text-xs text-gray-400 mt-8">
            L'interface missions sera bientôt disponible.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PartnerHomePage;
