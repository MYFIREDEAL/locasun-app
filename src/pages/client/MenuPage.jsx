import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Gift, Zap, ChevronRight, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';

const menuItems = [
  {
    label: 'Mon profil',
    icon: User,
    path: '/dashboard/profil',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Parrainage 🎁',
    icon: Gift,
    path: '/dashboard/parrainage',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Nos offres ⚡',
    icon: Zap,
    path: '/dashboard/offres',
    color: 'bg-green-50 text-green-600',
  },
];

const MenuPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  const handleLogout = () => {
    supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-8"
    >
      {/* User info */}
      <div className="text-center pt-2">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
          {currentUser?.name?.charAt(0) || '?'}
        </div>
        <h2 className="text-lg font-bold text-gray-900">{currentUser?.name || 'Client'}</h2>
        {currentUser?.email && (
          <p className="text-sm text-gray-500 mt-0.5">{currentUser.email}</p>
        )}
      </div>

      {/* Menu items */}
      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.path}
            onClick={() => navigate(item.path)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">{item.label}</span>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </motion.button>
        ))}
      </div>

      {/* Logout */}
      <motion.button
        onClick={handleLogout}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform text-red-500"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50">
          <LogOut className="h-5 w-5" />
        </div>
        <span className="flex-1 text-left font-medium">Se déconnecter</span>
      </motion.button>
    </motion.div>
  );
};

export default MenuPage;
