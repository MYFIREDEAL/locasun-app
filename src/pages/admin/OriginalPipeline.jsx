import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProspectCard from '@/components/admin/ProspectCard';
import ProspectDetailsAdmin from '@/components/admin/ProspectDetailsAdmin';
import AddProspectModal from '@/components/admin/AddProspectModal';
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
          {column.items?.length || 0}
        </span>
      </h2>
      <div className="space-y-4 overflow-y-auto flex-1 no-scrollbar">
        <SortableContext items={(column.items || []).map(i => i.id)} strategy={verticalListSortingStrategy}>
          {(column.items || []).map((item) => (
            <ProspectCard
              key={item.id}
              prospect={item}
              onClick={() => onProspectClick && onProspectClick(item)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const OriginalPipeline = () => {
  // Récupération sécurisée du contexte
  let contextData;
  try {
    contextData = useAppContext();
  } catch (error) {
    console.error('Erreur contexte Pipeline:', error);
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Pipeline - Erreur</h2>
        <p className="text-red-600">Impossible de charger le contexte: {error.message}</p>
      </div>
    );
  }

  if (!contextData) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Pipeline - Chargement</h2>
        <p>Chargement des données...</p>
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

    try {
      const projectSteps = projectsData[selectedProjectType].steps || [];
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

      const filteredProspects = visibleProspects.filter(prospect => 
        (selectedOwnerId === 'all' || prospect.ownerId === selectedOwnerId) && 
        (prospect.tags || []).includes(selectedProjectType)
      );

      filteredProspects.forEach(prospect => {
        try {
          if (getProjectSteps) {
            const prospectSteps = getProjectSteps(prospect.id, selectedProjectType);
            const currentStep = prospectSteps.find(step => step.status === 'in_progress' || step.status === 'current');
            
            if (currentStep) {
              const columnKey = slugify(currentStep.name);
              if (newColumns[columnKey]) {
                newColumns[columnKey].items.push(prospect);
              }
            }
          }
        } catch (stepError) {
          console.error('Erreur lors du traitement des étapes pour le prospect:', prospect.id, stepError);
        }
      });

      setColumns(newColumns);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des colonnes:', error);
      setColumns({});
    }
  }, [prospects, selectedOwnerId, selectedProjectType, projectsData, getProjectSteps, activeAdminUser]);

  const updateQueryParam = (key, value) => {
    try {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      setSearchParams(newParams);
    } catch (error) {
      console.error('Erreur mise à jour URL:', error);
    }
  };

  const handleProspectClick = (prospect) => {
    updateQueryParam('prospect', prospect.id);
  };

  const handleBack = () => {
    updateQueryParam('prospect', null);
  };

  const handleAddProspect = (newProspect) => {
    if (addProspect) {
      addProspect({ ...newProspect, ownerId: activeAdminUser?.id || 'user-1' });
    }
  };

  const handleUpdateProspect = (updatedProspect) => {
    if (updateProspect) {
      updateProspect(updatedProspect);
      setSelectedProspect(updatedProspect);
    }
  };

  useEffect(() => {
    if(activeAdminUser && !searchParams.get('owner')){
        updateQueryParam('owner', activeAdminUser.id);
    }
  }, [activeAdminUser]);

  useEffect(() => {
    if(projectOptions.length > 0 && !searchParams.get('project')){
        updateQueryParam('project', projectOptions[0].value);
    }
  }, [projectOptions]);

  // Affichage de debug si aucune donnée
  if (Object.keys(projectsData).length === 0) {
    return (
      <div className="p-6 h-full flex flex-col bg-white">
        <h2 className="text-2xl font-bold mb-4">Pipeline des Prospects</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>Aucun projet configuré. Veuillez configurer des projets dans les données.</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p>Prospects: {prospects.length}</p>
          <p>Utilisateurs: {Object.keys(users).length}</p>
          <p>Projets: {Object.keys(projectsData).length}</p>
          <p>Utilisateur actif: {activeAdminUser?.name || 'Non défini'}</p>
          {prospects.length > 0 && (
            <div className="mt-2">
              <p>Exemple de prospect:</p>
              <pre className="text-xs bg-white p-2 rounded">{JSON.stringify(prospects[0], null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {selectedProspect ? (
        <motion.div
          key="prospect-details"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <ProspectDetailsAdmin 
            prospect={selectedProspect} 
            onBack={handleBack}
            onUpdate={handleUpdateProspect}
          />
        </motion.div>
      ) : (
        <motion.div 
          key="pipeline-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full flex flex-col bg-white"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-200 gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Pipeline des Prospects</h1>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="w-56">
                  <SearchableSelect
                    options={projectOptions}
                    value={selectedProjectType}
                    onSelect={(value) => updateQueryParam('project', value)}
                    placeholder="Choisir un projet"
                    searchPlaceholder="Rechercher..."
                    emptyText="Aucun projet."
                  />
                </div>
                <div className="w-56">
                  <SearchableSelect
                    options={userOptions}
                    value={selectedOwnerId}
                    onSelect={(value) => updateQueryParam('owner', value)}
                    placeholder="Filtrer par utilisateur"
                    searchPlaceholder="Rechercher..."
                    emptyText="Aucun utilisateur."
                  />
                </div>
              </div>
              <Button onClick={() => setAddModalOpen(true)} className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Nouveau Prospect
              </Button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 overflow-x-auto pb-4 p-6">
            <DndContext collisionDetection={closestCenter}>
              {Object.entries(columns).map(([columnId, column], index) => (
                <motion.div
                  key={columnId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="w-[300px] flex-shrink-0"
                >
                  <Column column={column} onProspectClick={handleProspectClick} />
                </motion.div>
              ))}
            </DndContext>
          </div>
          <AddProspectModal 
            open={isAddModalOpen} 
            onOpenChange={setAddModalOpen}
            onAddProspect={handleAddProspect}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OriginalPipeline;