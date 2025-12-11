import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { useNavigate } from 'react-router-dom';

const AddProjectModal = ({ isOpen, onClose }) => {
  const { addProject, userProjects, projectsData } = useAppContext();
  const navigate = useNavigate();

  const projectTypes = Object.values(projectsData)
    .filter(p => p.isPublic && !userProjects.includes(p.type))
    .map(p => ({
      type: p.type,
      title: p.clientTitle || p.title,
      icon: p.icon,
      color: p.color,
    }));

  const handleProjectTypeClick = async (projectType, projectTitle) => {
    const success = await addProject(projectType);
    if (success) {
      toast({
        title: "Projet ajouté avec succès ! ✅",
        description: `Le projet "${projectTitle}" est maintenant dans votre tableau de bord.`,
      });
      onClose();
      navigate('/dashboard');
    } else {
        toast({
            title: "Projet déjà existant",
            description: "Ce projet est déjà dans votre tableau de bord.",
            variant: "destructive"
        });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-2xl shadow-soft max-w-md w-full mx-4 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Ajouter un projet</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-gray-600 mb-4">Choisissez le type de projet à ajouter :</p>
              {projectTypes.length > 0 ? (
                projectTypes.map((project, index) => (
                  <motion.button
                    key={project.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleProjectTypeClick(project.type, project.title)}
                    className="w-full flex items-center space-x-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  >
                    <div className={`w-12 h-12 ${project.color} rounded-xl flex items-center justify-center shadow-card`}>
                      <span className="text-2xl">{project.icon}</span>
                    </div>
                    <div className="flex-grow text-left">
                      <span className="font-medium text-gray-900">{project.title}</span>
                    </div>
                  </motion.button>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Tous les projets disponibles ont déjà été ajoutés.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddProjectModal;