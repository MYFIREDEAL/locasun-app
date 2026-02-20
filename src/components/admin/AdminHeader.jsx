import React, { useState, useMemo } from 'react';
    import { NavLink, Link, useNavigate, useSearchParams } from 'react-router-dom';
    import { motion, AnimatePresence } from 'framer-motion';
    import { LayoutGrid, Calendar, Users, Settings, Bell, User, ArrowLeft, Bot, Menu, X, MessageSquare, Check, Users2, Globe, Sparkles } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger,
      DropdownMenuRadioGroup,
      DropdownMenuRadioItem,
    } from "@/components/ui/dropdown-menu";
    import { toast } from '@/components/ui/use-toast';
    import useWindowSize from '@/hooks/useWindowSize';
    import { useAppContext } from '@/App';
    import { useUsers } from '@/contexts/UsersContext';
    import { formatDistanceToNow } from 'date-fns';
    import { fr } from 'date-fns/locale';

// 🔥 Items de navigation - certains réservés aux admins (Global Admin, Admin, platform_admin)
const allNavItems = [
  { name: 'Pipeline', path: '/admin/pipeline', icon: LayoutGrid, adminOnly: false },
  { name: 'Agenda', path: '/admin/agenda', icon: Calendar, adminOnly: false },
  { name: 'Contacts', path: '/admin/contacts', icon: Users, adminOnly: false },
  { name: 'Charly AI', path: '/admin/charly', icon: Bot, adminOnly: false },
  { name: 'Workflow V2', path: '/admin/workflow-v2-config', icon: Sparkles, adminOnly: true },
  { name: 'Configuration IA', path: '/admin/configuration-ia', icon: Settings, adminOnly: true },
  { name: 'Landing Page', path: '/admin/landing-page', icon: Globe, adminOnly: true },
];    const AdminHeader = () => {
      const { width } = useWindowSize();
      const isMobile = width < 768;
      const [isMenuOpen, setIsMenuOpen] = useState(false);
      const { notifications, markNotificationAsRead, activeAdminUser, switchActiveAdminUser, brandName, logoUrl } = useAppContext();
      const { users: supabaseUsers, loading: usersLoading } = useUsers();
      const navigate = useNavigate();
      const [searchParams, setSearchParams] = useSearchParams();

      // 🔥 Filtrer les items de navigation selon le rôle
      const navItems = useMemo(() => {
        const isAdminRole = activeAdminUser?.role === 'Global Admin' || 
                           activeAdminUser?.role === 'Admin' || 
                           activeAdminUser?.role === 'platform_admin';
        
        return allNavItems.filter(item => !item.adminOnly || isAdminRole);
      }, [activeAdminUser?.role]);

      const unreadNotifications = notifications.filter(n => !n.read);

      // 🟢 REGROUPEMENT: Grouper les notifications par prospect + projet
      const groupedNotifications = React.useMemo(() => {
        const groups = {};
        
        unreadNotifications.forEach(notif => {
          // Séparer notifs client, partenaire et interne pour le même prospect+projet
          const isPartnerNotif = notif.projectName === '🟠 Message partenaire';
          const isInternalNotif = notif.projectName === '👥 Message interne';
          const key = `${notif.prospectId}-${notif.projectType}${isPartnerNotif ? '-partner' : isInternalNotif ? '-internal' : ''}`;
          
          if (!groups[key]) {
            groups[key] = {
              prospectId: notif.prospectId,
              prospectName: notif.prospectName,
              projectType: notif.projectType,
              projectName: notif.projectName,
              notifications: [],
              totalCount: 0,
              latestTimestamp: notif.timestamp
            };
          }
          
          groups[key].notifications.push(notif);
          groups[key].totalCount += (notif.count || 1);
          
          // Garder l'heure du message le plus récent
          if (new Date(notif.timestamp) > new Date(groups[key].latestTimestamp)) {
            groups[key].latestTimestamp = notif.timestamp;
          }
        });
        
        return Object.values(groups).sort((a, b) => 
          new Date(b.latestTimestamp) - new Date(a.latestTimestamp)
        );
      }, [unreadNotifications]);

      const handleNotificationClick = (group) => {
        // Marquer toutes les notifications du groupe comme lues
        group.notifications.forEach(notif => {
          markNotificationAsRead(notif.id);
        });
        
        // Redirige vers la pipeline avec le prospect et projet pour ouvrir directement la fiche détaillée avec le chat
        const isPartner = group.projectName === '🟠 Message partenaire';
        const isInternal = group.projectName === '👥 Message interne';
        const channelParam = isPartner ? '&channel=partner' : isInternal ? '&channel=internal' : '';
        navigate(`/admin/pipeline?project=${group.projectType}&prospect=${group.prospectId}${channelParam}`);
      };

      const handleUserSwitch = (userId) => {
        // Récupérer l'objet user complet depuis Supabase (chercher par id ou user_id)
        const userObject = supabaseUsers.find(u => u.id === userId || u.user_id === userId);
        if (userObject) {
          switchActiveAdminUser(userObject);
          const newParams = new URLSearchParams(searchParams);
          newParams.set('owner', userId);
          setSearchParams(newParams, {replace: true});
        }
      }
      
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
                  <span className="font-bold text-xl">Menu Pro</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>
                <nav className="flex flex-col space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
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
                        <Link to="/admin/parametres" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-3 p-3 rounded-lg text-lg font-medium transition-colors text-gray-600 hover:bg-gray-50">
                            <Settings className="h-6 w-6" />
                            <span>Paramètres</span>
                        </Link>
                    </div>
                </nav>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      );

      return (
        <>
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-100"
          >
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  <Link to="/admin" className="flex items-center">
                    <span className="text-2xl font-bold text-gray-900">{brandName || 'Admin'} <span className="font-light text-blue-600">Pro</span></span>
                  </Link>
                </div>

                <nav className="hidden md:flex items-center space-x-2 bg-gray-100 p-1 rounded-full">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.path}
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

                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-gray-100 relative"
                      >
                        <Bell className="h-5 w-5 text-gray-600" />
                        {groupedNotifications.length > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {groupedNotifications.reduce((sum, g) => sum + g.totalCount, 0)}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {groupedNotifications.length > 0 ? (
                        groupedNotifications.map((group, index) => (
                          <DropdownMenuItem key={`${group.prospectId}-${group.projectType}-${index}`} onClick={() => handleNotificationClick(group)} className="cursor-pointer">
                            <div className="flex items-start space-x-3 py-2 w-full">
                              {group.projectName === '� Message interne' ? (
                                <div className="bg-purple-100 rounded-full p-2">
                                  <MessageSquare className="h-4 w-4 text-purple-600" />
                                </div>
                              ) : group.projectName === '�🟠 Message partenaire' ? (
                                <div className="bg-orange-100 rounded-full p-2">
                                  <MessageSquare className="h-4 w-4 text-orange-600" />
                                </div>
                              ) : (
                                <div className="bg-blue-100 rounded-full p-2">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {group.projectName === '👥 Message interne'
                                    ? (group.totalCount > 1 
                                        ? `👥 ${group.totalCount} messages internes · ${group.prospectName}`
                                        : `👥 Message interne · ${group.prospectName}`)
                                    : group.projectName === '🟠 Message partenaire'
                                    ? (group.totalCount > 1 
                                        ? `🟠 ${group.totalCount} messages partenaire · ${group.prospectName}`
                                        : `🟠 Message partenaire · ${group.prospectName}`)
                                    : (group.totalCount > 1 
                                        ? `${group.totalCount} nouveaux messages de ${group.prospectName}`
                                        : `Nouveau message de ${group.prospectName}`)
                                  }
                                </p>
                                <p className="text-xs text-gray-500">
                                  Projet: {group.projectType}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(group.latestTimestamp).toLocaleTimeString('fr-FR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          <div className="text-center text-sm text-gray-500 py-4">
                            Aucune nouvelle notification
                          </div>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link to="/admin/profil">
                    <div className="w-8 h-8 gradient-green rounded-full flex items-center justify-center cursor-pointer">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </Link>
                   {isMobile && (
                    <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)} className="rounded-full hover:bg-gray-100">
                      <Menu className="h-6 w-6" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {isMobile && <MobileMenu />}
          </motion.header>
        </>
      );
    };

    export default AdminHeader;