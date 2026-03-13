import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, Menu } from 'lucide-react';
import { useAppContext } from '@/App';

const navItems = [
  { name: 'Home', path: '/dashboard', icon: Home, end: true },
  { name: 'Chat', path: '/dashboard/chat', icon: MessageCircle },
  { name: 'Menu', path: '/dashboard/menu', icon: Menu },
];

const MobileBottomNav = () => {
  const { clientNotifications } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Compteur notifs non lues pour la pastille Chat
  const unreadCount = clientNotifications.filter(n => !n.read).reduce((sum, n) => sum + (n.count || 1), 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex justify-around items-center h-[88px]">
        {navItems.map((item) => {
          // Chat actif si on est sur /dashboard/chat ou /dashboard/chat/xxx
          const isChat = item.path === '/dashboard/chat';
          const isChatActive = isChat && location.pathname.startsWith('/dashboard/chat');

          // Menu actif si on est sur /dashboard/menu, /dashboard/profil, /dashboard/parrainage, /dashboard/offres
          const isMenu = item.path === '/dashboard/menu';
          const isMenuActive = isMenu && (
            location.pathname.startsWith('/dashboard/menu') ||
            location.pathname.startsWith('/dashboard/profil') ||
            location.pathname.startsWith('/dashboard/parrainage') ||
            location.pathname.startsWith('/dashboard/offres')
          );

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              state={item.end ? { resetProject: true } : undefined}
              onClick={item.end ? (e) => {
                // Si déjà sur /dashboard, NavLink ne re-navigue pas → forcer manuellement
                if (location.pathname === '/dashboard') {
                  e.preventDefault();
                  navigate('/dashboard', { state: { resetProject: true, ts: Date.now() } });
                }
              } : undefined}
              className={({ isActive }) => {
                const active = isActive || isChatActive || isMenuActive;
                return `relative flex flex-col items-center justify-center gap-1.5 w-full h-full transition-colors duration-200 ${
                  active ? 'text-blue-600' : 'text-gray-400'
                }`;
              }}
            >
              <div className="relative">
                <item.icon className="h-[26px] w-[26px]" strokeWidth={1.8} />
                {/* Pastille rouge sur Chat si messages non lus */}
                {isChat && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[20px] h-[20px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[13px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
