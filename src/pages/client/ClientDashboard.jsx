import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import ProjectDetails from '@/components/ProjectDetails';
import { CheckCircle, RefreshCw, Pencil, Hourglass, HardHat } from 'lucide-react';
import { useAppContext } from '@/App';

function ClientDashboardPage() {
  const { userProjects, projectsData } = useAppContext();
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState(null);
  const [displayedProjects, setDisplayedProjects] = useState([]);

  // 🔥 PHASE 4: userProjects provient de currentUser.tags (Supabase) - Plus de localStorage
  useEffect(() => {
    // userProjects est maintenant alimenté par currentUser.tags depuis App.jsx
    // Plus besoin de fallback localStorage
    
    const projectsToDisplay = userProjects.map(pId => projectsData[pId]).filter(Boolean);
    setDisplayedProjects(projectsToDisplay);

  }, [userProjects, navigate]);

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
          onProjectClick={setSelectedProject}
          onAddProject={() => navigate('/client/offres')}
        />
      )}
    </AnimatePresence>
  );
}

export default ClientDashboardPage;