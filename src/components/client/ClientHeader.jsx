import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Folder, User, BarChart3, ShoppingBag, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useWindowSize from '@/hooks/useWindowSize';

const navItems = [
  { name: 'Tableau de bord', path: '/dashboard', icon: LayoutGrid, end: true },
  { name: 'Offres & Produits', path: '/dashboard/offres', icon: ShoppingBag },
  { name: 'Documents', path: '/dashboard/documents', icon: Folder },
];

const ClientHeader = () => {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clientLogo, setClientLogo] = useState('');
  const navigate = useNavigate();

  // Charger le logo personnalisé depuis localStorage
  useEffect(() => {
    const storedLogo = localStorage.getItem('clientLogo');
    if (storedLogo) {
      setClientLogo(storedLogo);
    }
  }, []);

  const handleProfileClick = () => {
    navigate('/dashboard/profil');
  };

  const MobileMenu = () => (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-xl">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex flex-col space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        end={item.end}
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                        `flex items-center space-x-3 p-3 rounded-lg text-lg font-medium transition-colors ${
                            isActive
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`
                        }
                    >
                        <item.icon className="h-6 w-6" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
                <div className="pt-4 mt-4 border-t">
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-3 p-3 rounded-lg text-lg font-medium transition-colors text-gray-600 hover:bg-gray-50">
                        <BarChart3 className="h-6 w-6" />
                        <span>Accès Pro</span>
                    </Link>
                </div>
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <header className="bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center">
              {clientLogo && clientLogo.startsWith('data:video/mp4') ? (
                <video
                  src={clientLogo}
                  className="h-14 w-auto object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  style={{ display: 'block', background: 'transparent' }}
                />
              ) : clientLogo ? (
                <img 
                  src={clientLogo} 
                  alt="Logo"
                  className="h-14 w-auto object-contain"
                />
              ) : (
                <img 
                  src="/locasun-logo.svg" 
                  alt="Locasun"
                  className="h-14 w-auto object-contain"
                />
              )}
            </Link>
          </div>

          {!isMobile && (
            <nav className="flex items-center space-x-2 bg-gray-100 p-1 rounded-full">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex items-center space-x-2">
             {!isMobile && (
              <Link to="/admin">
                <Button variant="outline" className="rounded-full text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Accès Pro</span>
                </Button>
              </Link>
            )}
             <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-gray-100"
                onClick={handleProfileClick}
              >
                <div className="w-8 h-8 gradient-blue rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </Button>

            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)} className="rounded-full hover:bg-gray-100">
                <Menu className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {isMobile && <MobileMenu />}
    </header>
  );
};

export default ClientHeader;