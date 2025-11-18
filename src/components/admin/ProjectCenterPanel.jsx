import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import ProjectTabs from './project-tabs/ProjectTabs';
import ProjectHistory from './project-tabs/ProjectHistory';

/**
 * Composant de la colonne centrale de la page projet
 * Structure:
 * 1. Chat (en haut) - passé en children
 * 2. Tabs (Notes / Activité / Fichiers)
 * 3. Historique (toujours visible en bas)
 */
const ProjectCenterPanel = ({ 
  children,  // Le ChatInterface
  prospectId, 
  projectType,
  currentStep,
  statusConfig 
}) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Bloc Chat (existant) */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        {currentStep && (
          <motion.div
            key={currentStep.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${statusConfig[currentStep.status]?.iconOnly || statusConfig.pending.iconOnly}`}>
                  {currentStep.icon}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{currentStep.name}</h2>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${statusConfig[currentStep.status]?.badge || statusConfig.pending.badge}`}>
                {statusConfig[currentStep.status]?.label || statusConfig.pending.label}
              </span>
            </div>

            {/* Chat Interface (children) */}
            {children}
          </motion.div>
        )}
        
        {!currentStep && !projectType && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet sélectionné</h3>
            <p className="text-gray-500">Sélectionnez un projet dans la liste ci-dessus pour voir le suivi détaillé.</p>
          </div>
        )}
      </div>

      {/* Nouveau bloc: Tabs + Historique */}
      {projectType && (
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-6">
          {/* Tabs: Notes / Activité / Fichiers */}
          <ProjectTabs 
            prospectId={prospectId} 
            projectType={projectType} 
          />

          {/* Séparateur */}
          <div className="border-t border-gray-200" />

          {/* Historique (toujours visible) */}
          <ProjectHistory 
            prospectId={prospectId} 
            projectType={projectType} 
          />
        </div>
      )}
    </div>
  );
};

export default ProjectCenterPanel;
