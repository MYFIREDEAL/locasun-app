import React, { useState } from 'react';
    import { NavLink, Link, useNavigate, useSearchParams } from 'react-router-dom';
    import { motion, AnimatePresence } from 'framer-motion';
    import { LayoutGrid, Calendar, Users, Settings, Bell, User, ArrowLeft, Bot, Menu, X, MessageSquare, Check, Users2 } from 'lucide-react';
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
    import { formatDistanceToNow } from 'date-fns';
    import { fr } from 'date-fns/locale';

    const navItems = [
      { name: 'Pipeline', path: '/admin/pipeline', icon: LayoutGrid },
      { name: 'Agenda', path: '/admin/agenda', icon: Calendar },
      { name: 'Contacts', path: '/admin/contacts', icon: Users },
      { name: 'Charly', path: '/admin/charly', icon: Bot },
    ];

    const AdminHeader = () => {
      const { width } = useWindowSize();
      const isMobile = width < 768;
      const [isMenuOpen, setIsMenuOpen] = useState(false);
      const { notifications, markNotificationAsRead, users, activeAdminUser, switchActiveAdminUser } = useAppContext();
      const navigate = useNavigate();
      const [searchParams, setSearchParams] = useSearchParams();

      const unreadNotifications = notifications.filter(n => !n.read);

      const handleNotificationClick = (notification) => {
        markNotificationAsRead(notification.id);
        // Redirige vers la pipeline avec le prospect et projet pour ouvrir directement la fiche détaillée avec le chat
        navigate(`/admin/pipeline?project=${notification.projectType}&prospect=${notification.prospectId}`);
      };

      const handleUserSwitch = (userId) => {
        switchActiveAdminUser(userId);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('owner', userId);
        setSearchParams(newParams, {replace: true});
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
                        <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-3 p-3 rounded-lg text-lg font-medium transition-colors text-gray-600 hover:bg-gray-50">
                            <ArrowLeft className="h-6 w-6" />
                            <span>Espace Client</span>
                        </Link>
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
                  <Link to="/admin" className="flex items-center space-x-3">
                    <div className="w-10 h-10 gradient-blue rounded-xl flex items-center justify-center shadow-card">
                      <span className="text-white font-bold text-lg">E</span>
                    </div>
                    <span className="hidden sm:block text-2xl font-bold text-gray-900">Evatime <span className="font-light text-blue-600">Pro</span></span>
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
                   {!isMobile && (
                      <div className="flex items-center gap-2">
                        <Link to="/dashboard">
                            <Button variant="outline" className="rounded-full text-green-600 border-green-200 hover:bg-green-50 flex items-center space-x-2">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Espace Client</span>
                            </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="rounded-full flex items-center space-x-2">
                                  <Users2 className="h-4 w-4 text-gray-600"/>
                                  <span>{activeAdminUser ? activeAdminUser.name : 'Changer d\'utilisateur'}</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuLabel>Changer d'utilisateur</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuRadioGroup value={activeAdminUser?.id} onValueChange={handleUserSwitch}>
                                  {Object.values(users).map(user => (
                                      <DropdownMenuRadioItem key={user.id} value={user.id} className="flex justify-between items-center">
                                          <span>{user.name}</span>
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{user.role}</span>
                                      </DropdownMenuRadioItem>
                                  ))}
                              </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                   )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-gray-100 relative"
                      >
                        <Bell className="h-5 w-5 text-gray-600" />
                        {unreadNotifications.length > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {unreadNotifications.length}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {unreadNotifications.length > 0 ? (
                        unreadNotifications.map(notif => (
                          <DropdownMenuItem key={notif.id} onClick={() => handleNotificationClick(notif)} className="cursor-pointer">
                            <div className="flex items-start space-x-3 py-2 w-full">
                              <div className="bg-blue-100 rounded-full p-2 relative">
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                                {notif.count > 1 && (
                                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                    {notif.count}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {notif.count > 1 
                                    ? `${notif.count} nouveaux messages de ${notif.prospectName}`
                                    : `Nouveau message de ${notif.prospectName}`
                                  }
                                </p>
                                <p className="text-xs text-gray-500">
                                  Projet: {notif.projectName}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: fr })}
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