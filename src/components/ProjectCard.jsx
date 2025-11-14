import React from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { useAppContext } from '@/App';
    import { useSupabaseProjectStepsStatus } from '@/hooks/useSupabaseProjectStepsStatus';

    const STATUS_COMPLETED = 'completed';

    const ProjectCard = ({ project, onSelectProject, index }) => {
      const { currentUser, getProjectSteps } = useAppContext();
      
      // 🔥 PRIORITÉ: Charger depuis Supabase
      const { steps: supabaseSteps } = useSupabaseProjectStepsStatus(currentUser?.id);
      
      // Récupérer les steps pour ce projet spécifique
      const steps = supabaseSteps[project.type] 
        ? supabaseSteps[project.type] 
        : (currentUser ? getProjectSteps(currentUser.id, project.type) : project.steps);
      
      console.log('🔍 [ProjectCard] Steps for', project.type, ':', {
        hasSupabaseSteps: !!supabaseSteps[project.type],
        steps
      });
      
      const completedStepsCount = steps.filter(step => step.status === STATUS_COMPLETED).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;
      
      const currentStep = steps.find(step => step.status === 'current') || steps.find(step => step.status === 'pending') || { name: 'Terminé' };
      
      const buttonText = progress > 0 ? "Continuer le projet 🚀" : "Démarrer le projet 🚀";

      return (
        <motion.div
          className="bg-white rounded-2xl shadow-card p-6 flex flex-col justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-12 h-12 ${project.color} rounded-xl flex items-center justify-center shadow-soft`}>
                <span className="text-2xl">{project.icon}</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{project.title}</h3>
                <p className="text-sm text-gray-500">{currentStep.name}</p>
              </div>
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

          <div className="flex justify-end items-center mt-6">
            <Button
              onClick={() => onSelectProject(project)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-soft hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              {buttonText}
            </Button>
          </div>
        </motion.div>
      );
    };

    export default ProjectCard;