import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User } from 'lucide-react';
import { useAppContext } from '@/App';

const navItems = [
  { name: 'Home', path: '/dashboard', icon: Home, end: true },
  { name: 'Chat', path: '/dashboard/chat', icon: MessageCircle },
  { name: 'Profil', path: '/dashboard/profil', icon: User },
];

const MobileBottomNav = () => {
  const { clientNotifications } = useAppContext();
  const location = useLocation();

  // Compteur notifs non lues pour la pastille Chat
  const unreadCount = clientNotifications.filter(n => !n.read).reduce((sum, n) => sum + (n.count || 1), 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 md:hidden safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          // Chat actif si on est sur /dashboard/chat ou /dashboard/chat/xxx
          const isChat = item.path === '/dashboard/chat';
          const isChatActive = isChat && location.pathname.startsWith('/dashboard/chat');

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              className={({ isActive }) => {
                const active = isActive || isChatActive;
                return `relative flex flex-col items-center justify-center space-y-0.5 w-full h-full transition-colors duration-200 ${
                  active ? 'text-blue-600' : 'text-gray-400'
                }`;
              }}
            >
              <div className="relative">
                <item.icon className="h-6 w-6" strokeWidth={1.8} />
                {/* Pastille rouge sur Chat si messages non lus */}
                {isChat && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
