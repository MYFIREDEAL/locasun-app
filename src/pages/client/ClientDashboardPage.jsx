import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import ProjectDetails from '@/components/ProjectDetails';
import { useAppContext } from '@/App';

function ClientDashboardPage() {
  const { userProjects, projectsData, currentUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState(null);
  const [displayedProjects, setDisplayedProjects] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      // If there's no logged in user, maybe redirect or show a login message.
      // For now, let's assume registration page sets a user.
      // If not, we should handle this case. Let's just show no projects for now.
       setDisplayedProjects([]);
       return;
    }

    if (!userProjects || userProjects.length === 0) {
      const storedProjects = localStorage.getItem('userProjects');
      if (!storedProjects || JSON.parse(storedProjects).length === 0) {
        const defaultProjects = ['ACC'];
        localStorage.setItem('userProjects', JSON.stringify(defaultProjects));
        // This will be picked up by the context in the next render cycle.
        return;
      }
    }
    
    const projectsToDisplay = userProjects.map(pId => projectsData[pId]).filter(Boolean);
    setDisplayedProjects(projectsToDisplay);

  }, [userProjects, projectsData, navigate, currentUser]);

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

  if (!displayedProjects.length && userProjects.length > 0) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Chargement...</p></div>;
  }

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