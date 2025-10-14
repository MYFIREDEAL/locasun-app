import React from 'react';
import { motion } from 'framer-motion';
import { Settings, User, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const handleProfileClick = () => {
    toast({
      title: "🚧 Cette fonctionnalité n'est pas encore implémentée—mais ne vous inquiétez pas ! Vous pouvez la demander dans votre prochaine requête ! 🚀"
    });
  };

  const handleSettingsClick = () => {
    toast({
      title: "🚧 Cette fonctionnalité n'est pas encore implémentée—mais ne vous inquiétez pas ! Vous pouvez la demander dans votre prochaine requête ! 🚀"
    });
  };

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white shadow-soft border-b border-gray-100 sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <motion.div whileHover={{ scale: 1.02 }}>
              <div className="w-10 h-10 gradient-green rounded-xl flex items-center justify-center shadow-card">
                <span className="text-white font-bold text-lg">E</span>
              </div>
            </motion.div>
            <span className="text-2xl font-bold text-gray-900">Evatime</span>
          </Link>

          <div className="hidden md:block">
            <h1 className="text-lg font-medium text-gray-900">
              Bonjour Jack 👋, bienvenue sur votre espace
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {isDashboard && (
                <Link to="/admin">
                    <Button variant="outline" className="rounded-full text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Accès Pro</span>
                    </Button>
                </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
              className="rounded-full hover:bg-gray-100"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleProfileClick}
              className="rounded-full hover:bg-gray-100"
            >
              <div className="w-8 h-8 gradient-blue rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;