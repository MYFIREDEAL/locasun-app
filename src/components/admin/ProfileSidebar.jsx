import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Users, UserCheck, LogOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';

const ProfileSidebar = ({ isOpen, onClose }) => {
  const [activeView, setActiveView] = useState('menu');
  const { setCurrentUser } = useAppContext();

  const handleLogout = async () => {
    try {
      // 1. Sign out de Supabase
      await supabase.auth.signOut();
      
      // 2. Clear state
      setCurrentUser(null);
      
      // 3. Forcer un hard refresh pour reset tous les hooks
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter. Rechargez la page.",
        variant: "destructive"
      });
    }
  };

  const handleFeatureClick = (featureName) => {
    toast({
      title: `🚧 ${featureName}`,
      description: "Cette fonctionnalité n'est pas encore implémentée. Demandez-la dans votre prochain prompt ! 🚀",
    });
  };

  const menuItems = [
    { name: 'Infos personnelles', icon: User, view: 'personal' },
    { name: 'Gestion utilisateurs', icon: Users, feature: 'Gestion utilisateurs' },
    { name: 'Gestion clients', icon: UserCheck, feature: 'Gestion clients' },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'personal':
        return <PersonalInfosView onBack={() => setActiveView('menu')} />;
      default:
        return <MenuView onMenuItemClick={setActiveView} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-background shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  {activeView !== 'menu' && (
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => setActiveView('menu')}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <h2 className="text-xl font-semibold">
                    {activeView === 'personal' ? 'Infos personnelles' : 'Profil'}
                  </h2>
                </motion.div>
              </AnimatePresence>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-grow p-6 overflow-y-auto">
              {renderContent()}
            </div>

            <div className="p-6 border-t">
              <Button variant="destructive" className="w-full bg-red-600 hover:bg-red-700" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const MenuView = ({ onMenuItemClick }) => {
  const menuItems = [
    { name: 'Infos personnelles', icon: User, view: 'personal' },
    { name: 'Gestion utilisateurs', icon: Users, feature: 'Gestion utilisateurs' },
    { name: 'Gestion clients', icon: UserCheck, feature: 'Gestion clients' },
  ];

  const handleFeatureClick = (featureName) => {
    toast({
      title: `🚧 ${featureName}`,
      description: "Cette fonctionnalité n'est pas encore implémentée. Demandez-la dans votre prochain prompt ! 🚀",
    });
  };

  return (
    <nav className="flex flex-col space-y-2">
      {menuItems.map((item) => (
        <button
          key={item.name}
          onClick={() => item.view ? onMenuItemClick(item.view) : handleFeatureClick(item.feature)}
          className="flex items-center space-x-3 p-3 rounded-lg text-base font-medium transition-colors text-gray-700 hover:bg-gray-100 w-full text-left"
        >
          <item.icon className="h-5 w-5 text-gray-500" />
          <span>{item.name}</span>
        </button>
      ))}
    </nav>
  );
};

const PersonalInfosView = () => {
  const handleFeatureClick = (featureName) => {
    toast({
      title: `🚧 ${featureName}`,
      description: "Cette fonctionnalité n'est pas encore implémentée. Demandez-la dans votre prochain prompt ! 🚀",
    });
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-3 border-b">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <InfoRow label="Nom" value="LUC" />
        <InfoRow label="Prénom" value="Jack" />
        <InfoRow label="Rôle" value="Admin (tous les droits)" />
        <InfoRow label="Mail" value="jack.luc@icloud.com" />
      </div>
      <div className="space-y-3">
        <Button className="w-full" onClick={() => handleFeatureClick('Changer le mot de passe')}>
          Changer le mot de passe
        </Button>
        <Button variant="link" className="w-full" onClick={() => handleFeatureClick('Mot de passe oublié')}>
          Mot de passe oublié ?
        </Button>
      </div>
    </div>
  );
};

export default ProfileSidebar;