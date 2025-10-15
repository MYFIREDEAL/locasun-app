import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProspectCard from '@/components/admin/ProspectCard';
import SafeProspectDetailsAdmin from '@/components/admin/SafeProspectDetailsAdmin';
import SafeAddProspectModal from '@/components/admin/SafeAddProspectModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/App';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { slugify } from '@/lib/utils';

const Column = ({ column, onProspectClick }) => {
  return (
    <div className="bg-gray-100 rounded-xl p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 px-2 flex justify-between items-center">
        {column.name}
        <span className="text-sm font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
          {column.items.length}
        </span>
      </h2>
      <div className="space-y-4 overflow-y-auto flex-1 no-scrollbar">
        <SortableContext items={column.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {column.items.map((item) => (
            <ProspectCard
              key={item.id}
              prospect={item}
              onClick={() => onProspectClick(item)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const FinalPipelineRestored = () => {
  // 🚨 ATTENTION: VOTRE PIPELINE ORIGINAL RESTAURÉ 🚨
  console.log('🔥 FINAL PIPELINE RESTORED - Version ' + new Date().toLocaleTimeString());
  
  // Gestion sécurisée du contexte
  let contextData = null;
  try {
    contextData = useAppContext();
  } catch (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-800 mb-2">❌ ERREUR CONTEXTE PIPELINE</h1>
          <p className="text-red-700 mb-4">Erreur: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!contextData) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-yellow-800 mb-2">⏳ CHARGEMENT PIPELINE...</h1>
          <p className="text-yellow-700">Récupération des données...</p>
        </div>
      </div>
    );
  }

  const { 
    prospects = [], 
    addProspect, 
    updateProspect, 
    users = {}, 
    projectsData = {}, 
    getProjectSteps, 
    activeAdminUser 
  } = contextData;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [columns, setColumns] = useState({});
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  
  const allowedUsers = useMemo(() => {
    if (!activeAdminUser) return [];
    if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
      return Object.values(users);
    }
    const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
    return Object.values(users).filter(u => allowedIds.includes(u.id));
  }, [activeAdminUser, users]);

  const userOptions = useMemo(() => [
    { value: 'all', label: 'Tous les utilisateurs' },
    ...allowedUsers.map(user => ({ value: user.id, label: user.name }))
  ], [allowedUsers]);

  const projectOptions = useMemo(() => 
    Object.entries(projectsData).map(([key, project]) => ({ value: key, label: project.title }))
  , [projectsData]);

  const selectedOwnerId = searchParams.get('owner') || activeAdminUser?.id;
  const selectedProjectType = searchParams.get('project') || (projectOptions.length > 0 ? projectOptions[0].value : '');
  const selectedProspectId = searchParams.get('prospect');

  const updateQueryParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    if (activeAdminUser && !allowedUsers.some(u => u.id === selectedOwnerId) && selectedOwnerId !== 'all') {
      updateQueryParam('owner', activeAdminUser.id);
    }
  }, [selectedOwnerId, allowedUsers, activeAdminUser]);

  useEffect(() => {
    const prospectFromParam = prospects.find(p => p.id === selectedProspectId);
    setSelectedProspect(prospectFromParam || null);
  }, [selectedProspectId, prospects]);

  useEffect(() => {
    if (!selectedProjectType || !projectsData[selectedProjectType]) {
      setColumns({});
      return;
    }

    const projectSteps = projectsData[selectedProjectType].steps;
    const newColumns = projectSteps.reduce((acc, step) => {
      acc[slugify(step.name)] = { name: step.name, items: [] };
      return acc;
    }, {});
    
    const visibleProspects = prospects.filter(prospect => {
        if (!activeAdminUser) return false;
        if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') return true;
        const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
        return allowedIds.includes(prospect.ownerId);
    });

    const filteredProspects = visibleProspects.filter(prospect => {
      const tags = Array.isArray(prospect.tags) ? prospect.tags : [];
      const matchesOwner = selectedOwnerId === 'all' || prospect.ownerId === selectedOwnerId;
      const matchesProject = !selectedProjectType || tags.includes(selectedProjectType);
      return matchesOwner && matchesProject;
    });

    filteredProspects.forEach(prospect => {
      const steps = getProjectSteps ? getProjectSteps(prospect.id, selectedProjectType) : [];
      const currentStep = steps.find(step => step.status === 'in_progress');
      const stepSlug = currentStep ? slugify(currentStep.name) : slugify(projectSteps[0]?.name || '');
      
      if (newColumns[stepSlug]) {
        newColumns[stepSlug].items.push(prospect);
      }
    });

    setColumns(newColumns);
  }, [prospects, selectedProjectType, selectedOwnerId, projectsData, activeAdminUser, allowedUsers, getProjectSteps]);

  const handleProspectClick = (prospect) => {
    setSelectedProspect(prospect);
    updateQueryParam('prospect', prospect.id);
  };

  const handleBack = () => {
    setSelectedProspect(null);
    updateQueryParam('prospect', null);
  };

  const handleAddProspect = (newProspectData) => {
    if (addProspect) {
      const prospect = {
        ...newProspectData,
        id: `prospect-${Date.now()}`,
        ownerId: activeAdminUser?.id || 'user-1',
        createdAt: new Date().toISOString()
      };
      addProspect(prospect);
    }
    setAddModalOpen(false);
  };

  const handleUpdateProspect = (updatedProspect) => {
    if (updateProspect) {
      updateProspect(updatedProspect);
    }
  };

  const handleDragEnd = (event) => {
    // TODO: Implémenter la logique de drag & drop si nécessaire
    console.log('Drag ended:', event);
  };

  return (
    <AnimatePresence mode="wait">
      {selectedProspect ? (
        <motion.div
          key="prospect-details"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <SafeProspectDetailsAdmin prospect={selectedProspect} onBack={handleBack} onUpdate={handleUpdateProspect} />
        </motion.div>
      ) : (
        <motion.div
          key="pipeline-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-full flex flex-col"
        >
          {/* Header avec filtres */}
          <div className="flex flex-col space-y-4 p-6 bg-white border-b">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🔥 Pipeline Original Restauré</h1>
                <p className="text-sm text-green-600">✅ Version finale - {new Date().toLocaleTimeString()}</p>
              </div>
              <Button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <Plus size={16} />
                Ajouter un prospect
              </Button>
            </div>
            
            <div className="flex space-x-4">
              <div className="w-64">
                <SearchableSelect
                  value={selectedProjectType}
                  onSelect={(value) => updateQueryParam('project', value)}
                  placeholder="Sélectionner un projet"
                  searchPlaceholder="Rechercher un projet..."
                  emptyText="Aucun projet"
                  options={projectOptions}
                />
              </div>
              <div className="w-64">
                <SearchableSelect
                  value={selectedOwnerId}
                  onSelect={(value) => updateQueryParam('owner', value)}
                  placeholder="Sélectionner un utilisateur"
                  searchPlaceholder="Rechercher un utilisateur..."
                  emptyText="Aucun utilisateur"
                  options={userOptions}
                />
              </div>
            </div>
          </div>

          {/* Pipeline Kanban */}
          <div className="flex-1 p-6">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="flex space-x-6 h-full overflow-x-auto">
                {Object.values(columns).map((column, index) => (
                  <motion.div
                    key={`${selectedProjectType}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-[300px] flex-shrink-0"
                  >
                    <Column column={column} onProspectClick={handleProspectClick} />
                  </motion.div>
                ))}
              </div>
            </DndContext>
          </div>
          
          <SafeAddProspectModal 
            open={isAddModalOpen} 
            onOpenChange={setAddModalOpen}
            onAddProspect={handleAddProspect}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FinalPipelineRestored;
