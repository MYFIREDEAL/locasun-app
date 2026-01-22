import React from 'react';
import { useLocation, Link } from 'react-router-dom';

/**
 * Barre de navigation horizontale pour les modules Configuration IA
 * Affiche les 5 modules avec le module actif mis en évidence
 */
const ModulesNavBar = () => {
  const location = useLocation();
  
  const modules = [
    { path: '/admin/workflows-charly', label: 'Workflows', icon: '🧩', color: 'bg-green-600 hover:bg-green-700' },
    { path: '/admin/projects-management', label: 'Projets', icon: '📁', color: 'bg-blue-600 hover:bg-blue-700' },
    { path: '/admin/forms-management', label: 'Formulaires', icon: '📝', color: 'bg-teal-600 hover:bg-teal-700' },
    { path: '/admin/contract-templates', label: 'Contrats', icon: '📄', color: 'bg-purple-600 hover:bg-purple-700' },
    { path: '/admin/project-display', label: 'Catalogue Client', icon: '🧱', color: 'bg-indigo-600 hover:bg-indigo-700' },
  ];

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {modules.map((module) => {
          const isActive = location.pathname === module.path;
          
          return (
            <Link
              key={module.path}
              to={module.path}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive 
                  ? `${module.color} text-white shadow-md ring-2 ring-offset-2 ring-gray-300` 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span>{module.icon}</span>
              <span>{module.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ModulesNavBar;
