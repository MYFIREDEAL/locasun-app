import React, { useMemo } from 'react';
    import { motion } from 'framer-motion';
    import { Plus, CheckCircle, Clock, User } from 'lucide-react';
    import ProjectCard from '@/components/ProjectCard';
    import { Button } from '@/components/ui/button';
    import { useAppContext } from '@/App';
    import { useSupabaseProjectStepsStatus } from '@/hooks/useSupabaseProjectStepsStatus';
    import useWindowSize from '@/hooks/useWindowSize';

    const Dashboard = ({ projects = [], onProjectClick, onAddProject }) => {
      const { currentUser, getProjectSteps } = useAppContext();
      const { width } = useWindowSize();
      const isMobile = width < 768;
      const totalProjects = projects.length;
      
      // 🔥 Charger les steps UNE SEULE FOIS au niveau Dashboard (pas dans chaque carte)
      const { projectStepsStatus } = useSupabaseProjectStepsStatus(currentUser?.id);
      
      // Calculer les compteurs terminé / en cours depuis les vraies données Supabase
      const { completedProjects, inProgressProjects } = useMemo(() => {
        let completed = 0;
        let inProgress = 0;
        projects.forEach(project => {
          const steps = (projectStepsStatus && projectStepsStatus[project.type])
            ? projectStepsStatus[project.type]
            : (currentUser ? getProjectSteps(currentUser.id, project.type) : project.steps);
          const total = steps.length;
          const done = steps.filter(s => s.status === 'completed').length;
          if (total > 0 && done === total) {
            completed++;
          } else {
            inProgress++;
          }
        });
        return { completedProjects: completed, inProgressProjects: inProgress };
      }, [projects, projectStepsStatus, currentUser, getProjectSteps]);

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Bonjour {currentUser?.name?.split(' ')[0] || 'Jack'} 👋</h1>
            {currentUser?.affiliateName && (
              <p className="text-sm text-gray-500 mt-2 flex items-center justify-center">
                <User className="w-4 h-4 mr-1.5" />
                Suivi par : <span className="font-medium ml-1">{currentUser.affiliateName}</span>
              </p>
            )}
          </div>

          {/* Mobile: bloc "Mes projets" avec compteurs */}
          {isMobile ? (
            <motion.div
              className="bg-white rounded-2xl shadow-card p-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Mes projets</h2>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  {completedProjects > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {completedProjects} terminé{completedProjects > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-blue-600">
                    <Clock className="h-3.5 w-3.5" />
                    {inProgressProjects} en cours
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
          <motion.div
            className="bg-white rounded-2xl shadow-card p-4 sm:p-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Mes projets</h2>
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-4 text-sm font-medium">
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    <span>{completedProjects} terminé{completedProjects > 1 ? 's' : ''}</span>
                  </span>
                  <span className="flex items-center text-blue-600">
                    <Clock className="h-4 w-4 mr-1.5" />
                    <span>{inProgressProjects} en cours</span>
                  </span>
                </div>
                <Button
                  onClick={onAddProject}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-soft hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Ajouter un projet</span>
                </Button>
              </div>
            </div>
          </motion.div>
          )}

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project, index) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    projectStepsStatus={projectStepsStatus}
                    onSelectProject={() => onProjectClick(project)} 
                    index={index}
                  />
              ))}
            </div>
          ) : (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center py-12 bg-gray-50 rounded-2xl">
                <h3 className="text-xl font-semibold text-gray-700">Aucun projet pour le moment.</h3>
                <p className="text-gray-500 mt-2">Commencez par ajouter votre premier projet !</p>
            </motion.div>
          )}

        </motion.div>
      );
    };

    export default Dashboard;