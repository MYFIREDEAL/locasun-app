import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Gift, Zap, Bell, ChevronRight, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOrganization } from '@/contexts/OrganizationContext';

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
  const { organizationId } = useOrganization();
  const [toggling, setToggling] = useState(false);

  const { isSupported, permission, isSubscribed, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications({
    prospectId: currentUser?.id,
    organizationId,
  });

  const handleToggleNotifications = async () => {
    if (toggling || pushLoading) return;
    setToggling(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setToggling(false);
    }
  };

  // Statut affiché pour les notifications
  const notifBlocked = permission === 'denied';
  const notifLabel = notifBlocked
    ? 'Bloquées (voir Réglages)'
    : isSubscribed
      ? 'Activées'
      : 'Désactivées';

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

      {/* 🔔 Notifications toggle */}
      {isSupported && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: menuItems.length * 0.08 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <button
            onClick={notifBlocked ? undefined : handleToggleNotifications}
            disabled={toggling || pushLoading || notifBlocked}
            className="w-full flex items-center gap-4 disabled:opacity-60"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSubscribed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium text-gray-900">Notifications</span>
              <p className={`text-xs mt-0.5 ${isSubscribed ? 'text-green-600' : notifBlocked ? 'text-red-500' : 'text-gray-400'}`}>
                {notifLabel}
              </p>
            </div>
            {/* Toggle switch */}
            {!notifBlocked && (
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isSubscribed ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isSubscribed ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            )}
          </button>
          {notifBlocked && (
            <p className="text-xs text-gray-400 mt-2 pl-14">
              Allez dans Réglages → Notifications pour réautoriser.
            </p>
          )}
        </motion.div>
      )}

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
