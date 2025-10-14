import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import ProjectDetails from '@/components/ProjectDetails';
import AddProjectModal from '@/components/AddProjectModal';
import { CheckCircle, RefreshCw, Pencil, Hourglass, HardHat } from 'lucide-react';
import { useAppContext } from '@/App';

const allProjectsData = {
  ACC: {
    id: 1, type: 'ACC', title: 'ACC (Consommateur)', icon: '🔌', color: 'gradient-blue', progress: 75, status: 'Installation',
    steps: [
      { name: 'Inscription', status: 'completed', icon: '✅' },
      { name: 'Étude', status: 'completed', icon: '📝' },
      { name: 'Contrat', status: 'completed', icon: '✍️' },
      { name: 'Installation', status: 'current', icon: '👷' },
      { name: 'Actif', status: 'pending', icon: '⚡️' },
    ]
  },
  Producteur: {
    id: 2, type: 'Producteur', title: 'Producteur', icon: '🌞', color: 'gradient-orange', progress: 50, status: 'Contrat',
    steps: [
      { name: 'Inscription', status: 'completed', icon: '✅' },
      { name: 'Étude', status: 'completed', icon: '📝' },
      { name: 'Contrat', status: 'current', icon: '✍️' },
      { name: 'Installation', status: 'pending', icon: '👷' },
      { name: 'Actif', status: 'pending', icon: '⚡️' },
    ]
  },
  Solaire: {
    id: 3, type: 'Solaire', title: 'Solaire Maison', icon: '🏠', color: 'gradient-green', progress: 100, status: 'Actif',
    steps: [
      { name: 'Inscription', status: 'completed', icon: '✅' },
      { name: 'Étude', status: 'completed', icon: '📝' },
      { name: 'Contrat', status: 'completed', icon: '✍️' },
      { name: 'Installation', status: 'completed', icon: '👷' },
      { name: 'Actif', status: 'completed', icon: '⚡️' },
    ]
  },
  Batterie: {
    id: 4, type: 'Batterie', title: 'Batterie', icon: '🔋', color: 'gradient-purple', progress: 25, status: 'Étude',
    steps: [
      { name: 'Inscription', status: 'completed', icon: '✅' },
      { name: 'Étude', status: 'current', icon: '📝' },
      { name: 'Contrat', status: 'pending', icon: '✍️' },
      { name: 'Installation', status: 'pending', icon: '👷' },
      { name: 'Actif', status: 'pending', icon: '⚡️' },
    ]
  },
  Investisseur: {
    id: 5, type: 'Investisseur', title: 'Investisseur', icon: '💰', color: 'gradient-teal', progress: 0, status: 'Inscription',
    steps: [
      { name: 'Inscription', status: 'current', icon: '✅' },
      { name: 'Analyse', status: 'pending', icon: '📝' },
      { name: 'Validation', status: 'pending', icon: '✍️' },
      { name: 'Investi', status: 'pending', icon: '⚡️' }
    ]
  }
};

function ClientDashboardPage() {
  const { userProjects } = useAppContext();
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [displayedProjects, setDisplayedProjects] = useState([]);

  useEffect(() => {
    if (!userProjects || userProjects.length === 0) {
      const storedProjects = localStorage.getItem('userProjects');
      if (!storedProjects || JSON.parse(storedProjects).length === 0) {
        const defaultProjects = ['ACC', 'Batterie'];
        localStorage.setItem('userProjects', JSON.stringify(defaultProjects));
        return;
      }
    }
    
    const projectsToDisplay = userProjects.map(pId => allProjectsData[pId]).filter(Boolean);
    setDisplayedProjects(projectsToDisplay);

  }, [userProjects, navigate]);

  if (!displayedProjects.length && userProjects.length > 0) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Chargement...</p></div>;
  }

  return (
    <>
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
            onProjectClick={setSelectedProject}
            onAddProject={() => setShowAddProject(true)}
          />
        )}
      </AnimatePresence>
      <AddProjectModal 
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
      />
    </>
  );
}

export default ClientDashboardPage;