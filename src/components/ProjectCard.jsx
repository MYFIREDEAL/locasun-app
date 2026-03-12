import React, { useMemo } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { useAppContext } from '@/App';
    import useWindowSize from '@/hooks/useWindowSize';

    const STATUS_COMPLETED = 'completed';

    const ProjectCard = ({ project, projectStepsStatus, onSelectProject, index }) => {
      const { currentUser, getProjectSteps, clientFormPanels } = useAppContext();
      const navigate = useNavigate();
      const { width } = useWindowSize();
      const isMobile = width < 768;
      
      // 🔥 PRIORITÉ: Recevoir projectStepsStatus en props (partagé par toutes les cartes via Dashboard)
      // Pas besoin d'appeler le hook ici, ça évite les subscriptions multiples
      
      // Récupérer les steps pour ce projet spécifique (useMemo pour forcer re-render)
      const steps = useMemo(() => {
        return (projectStepsStatus && projectStepsStatus[project.type]) 
          ? projectStepsStatus[project.type] 
          : (currentUser ? getProjectSteps(currentUser.id, project.type) : project.steps);
      }, [projectStepsStatus, project.type, currentUser, getProjectSteps]);
      
      const completedStepsCount = steps.filter(step => step.status === STATUS_COMPLETED).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;
      
      const currentStep = steps.find(step => step.status === 'in_progress') || steps.find(step => step.status === 'current') || steps.find(step => step.status === 'pending') || { name: 'Terminé' };
      
      const buttonText = progress > 0 ? "Continuer le projet 🚀" : "Démarrer le projet 🚀";

      // 📱 Mobile : détecter si une action est requise (formulaire pending/rejected côté client)
      const hasActionRequired = useMemo(() => {
        if (!currentUser || !clientFormPanels) return false;
        return clientFormPanels.some(
          panel => panel.prospectId === currentUser.id && 
                   panel.projectType === project.type &&
                   (panel.status === 'pending' || panel.status === 'rejected')
        );
      }, [currentUser, clientFormPanels, project.type]);

      return (
        <motion.div
          className="bg-white rounded-2xl shadow-card p-6 flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow duration-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          onClick={() => {
            if (isMobile && hasActionRequired) {
              navigate(`/dashboard/chat/${project.type}`);
            } else {
              onSelectProject(project);
            }
          }}
        >
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 ${project.color} rounded-xl flex items-center justify-center shadow-soft`}>
                <span className="text-2xl">{project.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">{project.title}</h3>
                <p className="text-sm text-gray-500">{currentStep.name}</p>
              </div>
              {/* Pastille "Action requise" */}
              {hasActionRequired && (
                <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full animate-pulse">
                  Action requise
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">Progression</span>
                <span className="font-bold text-green-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div
                  className="progress-bar h-2.5 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                />
              </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{completedStepsCount} / {totalSteps} étapes</span>
                </div>
            </div>
          </div>

          {/* Bouton desktop uniquement — sur mobile la carte entière est cliquable */}
          {!isMobile && (
          <div className="flex justify-end items-center mt-6">
            <Button
              onClick={() => onSelectProject(project)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-soft hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              {buttonText}
            </Button>
          </div>
          )}
        </motion.div>
      );
    };

    export default ProjectCard;