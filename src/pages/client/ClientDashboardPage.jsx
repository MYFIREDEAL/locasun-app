import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import ProjectDetails from '@/components/ProjectDetails';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';

function ClientDashboardPage() {
  const { projectsData, currentUser, authLoading } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState(null);
  const [displayedProjects, setDisplayedProjects] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState({});

  // Charger les statuts des projets du client
  useEffect(() => {
    const loadProjectStatuses = async () => {
      if (!currentUser?.id || !currentUser?.tags || currentUser.tags.length === 0) return;
      
      const { data } = await supabase
        .from('project_infos')
        .select('project_type, status')
        .eq('prospect_id', currentUser.id)
        .in('project_type', currentUser.tags);
      
      if (data) {
        const statusMap = {};
        data.forEach(item => {
          statusMap[item.project_type] = item.status || 'actif';
        });
        setProjectStatuses(statusMap);
      }
    };
    
    loadProjectStatuses();
  }, [currentUser]);

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
    
    // 🔥 FILTRER: Ne montrer que les projets ACTIFS (pas abandonnés/archivés)
    const activeTags = clientTags.filter(tag => {
      const status = projectStatuses[tag];
      return !status || status === 'actif';
    });
    
    // Mapper les tags actifs vers les objets de projet complets
    const projectsToDisplay = activeTags
      .map(tag => projectsData[tag])
      .filter(Boolean); // Filtrer les projets qui n'existent pas
    
    setDisplayedProjects(projectsToDisplay);

  }, [currentUser, projectsData, projectStatuses, navigate]);

  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  // Ouvrir automatiquement un projet depuis une notification ou query param
  useEffect(() => {
    // 🔥 PRIORITÉ 1: Query param ?project=...
    const searchParams = new URLSearchParams(location.search);
    const projectParam = searchParams.get('project');
    
    if (projectParam && projectsData[projectParam]) {
      const project = projectsData[projectParam];
      setSelectedProject(project);
      // Nettoyer l'URL
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // 🔥 PRIORITÉ 2: location.state (notifications)
    if (location.state?.openProjectType && projectsData[location.state.openProjectType]) {
      const project = projectsData[location.state.openProjectType];
      setSelectedProject(project);
      // Nettoyer le state pour éviter de réouvrir à chaque render
      navigate('/dashboard', { replace: true, state: {} });
    }
  }, [location.search, location.state, projectsData, navigate]);

  // 🔥 Attendre que l'authentification se charge avant d'afficher "pas connecté"
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Chargement de votre espace...</p>
      </div>
    );
  }

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