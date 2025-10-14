import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, ShoppingBag, Folder, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid, end: true },
  { name: 'Offres', path: '/dashboard/offres', icon: ShoppingBag },
  { name: 'Docs', path: '/dashboard/documents', icon: Folder },
  { name: 'Profil', path: '/dashboard/profil', icon: User },
];

export const ClientMobileNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors duration-200 ${
                isActive ? 'text-green-600' : 'text-gray-500 hover:text-green-500'
              }`
            }
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};