import React from 'react';
import { useLocation, Link } from 'react-router-dom';

/**
 * Barre de navigation horizontale pour les modules Configuration IA
 * Affiche les 5 modules avec le module actif mis en évidence
 */
const ModulesNavBar = ({ activeModule }) => {
  const location = useLocation();
  
  const modules = [
    { id: 'workflows', path: '/admin/workflows-charly', label: 'Workflows', icon: '�', color: 'bg-green-600 hover:bg-green-700', activeColor: 'bg-green-600' },
    { id: 'projets', path: '/admin/projects-management', label: 'Projets', icon: '📁', color: 'bg-blue-600 hover:bg-blue-700', activeColor: 'bg-blue-600' },
    { id: 'formulaires', path: '/admin/forms-management', label: 'Formulaires', icon: '📝', color: 'bg-teal-600 hover:bg-teal-700', activeColor: 'bg-teal-600' },
    { id: 'contrats', path: '/admin/contract-templates', label: 'Contrats', icon: '📄', color: 'bg-purple-600 hover:bg-purple-700', activeColor: 'bg-purple-600' },
    { id: 'catalogue', path: '/admin/project-display', label: 'Catalogue Client', icon: '🧱', color: 'bg-indigo-600 hover:bg-indigo-700', activeColor: 'bg-indigo-600' },
  ];

  return (
    <div className="px-6 pt-4 pb-2">
      <div className="flex items-center justify-center gap-3">
        {modules.map((module) => {
          const isActive = activeModule === module.id || location.pathname === module.path;
          
          return (
            <Link
              key={module.path}
              to={module.path}
              className={`
                flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-semibold transition-all duration-200
                ${isActive 
                  ? `${module.activeColor} text-white shadow-lg scale-105` 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:scale-102'
                }
              `}
            >
              <span className="text-lg">{module.icon}</span>
              <span>{module.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ModulesNavBar;
