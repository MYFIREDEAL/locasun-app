import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import ProjectDetails from '@/components/ProjectDetails';
import { useAppContext } from '@/App';

function ClientDashboardPage() {
  const { projectsData, currentUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState(null);
  const [displayedProjects, setDisplayedProjects] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      // Pas de client connecté → on ne peut pas afficher de projets
      setDisplayedProjects([]);
      return;
    }
    
    // ⚠️ IMPORTANT: Attendre que projectsData soit chargé depuis Supabase
    if (Object.keys(projectsData).length === 0) {
      setDisplayedProjects([]);
      return;
    }

    // 🔥 IMPORTANT: Utiliser currentUser.tags directement depuis Supabase (prospects.tags)
    // Pas de localStorage, la source de vérité est la base de données
    const clientTags = currentUser.tags || [];
    
    if (clientTags.length === 0) {
      // Client sans projets assignés
      setDisplayedProjects([]);
      return;
    }
    
    // Mapper les tags du client vers les objets de projet complets
    const projectsToDisplay = clientTags
      .map(tag => projectsData[tag])
      .filter(Boolean); // Filtrer les projets qui n'existent pas
    
    setDisplayedProjects(projectsToDisplay);

  }, [currentUser, projectsData, navigate]);

  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  // Ouvrir automatiquement un projet depuis une notification
  useEffect(() => {
    if (location.state?.openProjectType && projectsData[location.state.openProjectType]) {
      const project = projectsData[location.state.openProjectType];
      setSelectedProject(project);
      // Nettoyer le state pour éviter de réouvrir à chaque render
      navigate('/dashboard', { replace: true, state: {} });
    }
  }, [location.state, projectsData, navigate]);

  if (!currentUser) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Bienvenue !</h2>
            <p className="text-gray-600 mb-6">Connectez-vous pour voir vos projets.</p>
            <button 
                onClick={() => navigate('/')} 
                className="gradient-blue text-white font-bold py-2 px-4 rounded-lg"
            >
                Retour à l'accueil
            </button>
        </div>
    );
  }

  // Pas besoin de vérifier userProjects, on utilise directement currentUser.tags depuis Supabase

  return (
    <AnimatePresence mode="wait">
      {selectedProject ? (
        <ProjectDetails 
          key="details"
          project={selectedProject} 
          onBack={() => setSelectedProject(null)} 
        />
      ) : (
        <Dashboard 
          key="dashboard"
          projects={displayedProjects} 
          onProjectClick={handleProjectClick}
          onAddProject={() => navigate('/dashboard/offres')}
        />
      )}
    </AnimatePresence>
  );
}

export default ClientDashboardPage;