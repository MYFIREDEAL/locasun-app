import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Bot } from 'lucide-react';
import Chatbot from '@/components/Chatbot';

const navItems = [
  { name: 'Pipeline', path: '/admin/pipeline', icon: LayoutDashboard },
  { name: 'Contacts', path: '/admin/contacts', icon: Users },
  { name: 'Agenda', path: '/admin/agenda', icon: Calendar },
  { name: 'Charly', path: '/admin/charly', icon: Bot },
];

export const MobileNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors duration-200 ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'
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