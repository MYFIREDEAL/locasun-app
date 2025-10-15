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

// Version sécurisée de ProspectCard si l'original ne fonctionne pas
const SafeProspectCard = ({ prospect, onClick }) => {
  try {
    return <ProspectCard prospect={prospect} onClick={onClick} />;
  } catch (error) {
    console.error('ProspectCard error:', error);
    // Fallback simple en cas d'erreur
    return (
      <div 
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onClick(prospect)}
      >
        <h3 className="font-semibold text-gray-900">{prospect.name || 'Prospect'}</h3>
        <p className="text-sm text-gray-600">{prospect.email || ''}</p>
        {prospect.tags && prospect.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {prospect.tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{tag}</span>
            ))}
          </div>
        )}
      </div>
    );
  }
};

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
            <SafeProspectCard
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

const PipelineWorking = () => {
  const { prospects, addProspect, updateProspect, users, projectsData, getProjectSteps, activeAdminUser } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [columns, setColumns] = useState({});
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  
  const allowedUsers = useMemo(() => {
    if (!activeAdminUser) return [];
    
    const currentUser = Object.values(users || {}).find(user => user.id === activeAdminUser.id);
    if (!currentUser) return [];
    
    if (currentUser.role === 'super_admin') {
      return Object.values(users || {});
    } else if (currentUser.role === 'admin') {
      return Object.values(users || {}).filter(user => 
        user.role !== 'super_admin' && user.id === activeAdminUser.id
      );
    } else {
      return [currentUser];
    }
  }, [users, activeAdminUser]);

  const projectOptions = useMemo(() => {
    const projects = Object.keys(projectsData || {}).map(projectKey => ({
      value: projectKey,
      label: projectKey
    }));
    
    return [{ value: '', label: 'Tous les projets' }, ...projects];
  }, [projectsData]);

  const userOptions = useMemo(() => {
    const options = allowedUsers.map(user => ({
      value: user.id,
      label: user.name || 'Utilisateur sans nom'
    }));
    
    return [{ value: '', label: 'Tous les utilisateurs' }, ...options];
  }, [allowedUsers]);

  const selectedProjectType = searchParams.get('project') || '';
  const selectedOwner = searchParams.get('owner') || '';

  useEffect(() => {
    const prospectId = searchParams.get('prospect');
    const prospectFromParam = Object.values(prospects || {}).find(p => p.id === prospectId);
    setSelectedProspect(prospectFromParam || null);
  }, [searchParams, prospects]);

  const updateQueryParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== '') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleProspectClick = (prospect) => {
    updateQueryParam('prospect', prospect.id);
  };

  const handleBack = () => {
    updateQueryParam('prospect', null);
  };

  const handleAddProspect = (newProspect) => {
    addProspect({ ...newProspect, ownerId: activeAdminUser?.id || 'user-1' });
  };

  const handleUpdateProspect = (updatedProspect) => {
    updateProspect(updatedProspect);
    setSelectedProspect(updatedProspect);
  };

  useEffect(() => {
    if(activeAdminUser && !searchParams.get('owner')){
        updateQueryParam('owner', activeAdminUser.id);
    }
  }, [activeAdminUser]);

  const filteredProspects = useMemo(() => {
    return Object.values(prospects || {}).filter(prospect => {
      if (selectedProjectType && prospect.project !== selectedProjectType) return false;
      if (selectedOwner && prospect.ownerId !== selectedOwner) return false;
      return true;
    });
  }, [prospects, selectedProjectType, selectedOwner]);

  useEffect(() => {
    const statusColumns = {
      'new': { name: 'Nouveaux', items: [] },
      'contacted': { name: 'Contactés', items: [] },
      'qualified': { name: 'Qualifiés', items: [] },
      'proposal': { name: 'Proposition', items: [] },
      'negotiation': { name: 'Négociation', items: [] },
      'closed': { name: 'Conclus', items: [] },
      'lost': { name: 'Perdus', items: [] }
    };

    filteredProspects.forEach(prospect => {
      const status = prospect.status || 'new';
      if (statusColumns[status]) {
        statusColumns[status].items.push(prospect);
      }
    });

    setColumns(statusColumns);
  }, [filteredProspects]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const prospect = Object.values(prospects).find(p => p.id === active.id);
    const newStatus = over.id;

    if (prospect && prospect.status !== newStatus) {
      updateProspect(prospect.id, { ...prospect, status: newStatus });
    }
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
          <ProspectDetailsAdmin prospect={selectedProspect} onBack={handleBack} onUpdate={handleUpdateProspect} />
        </motion.div>
      ) : (
        <motion.div
          key="pipeline-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full flex flex-col h-full"
        >
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
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
                  value={selectedOwner}
                  onSelect={(value) => updateQueryParam('owner', value)}
                  placeholder="Choisir un utilisateur"
                  searchPlaceholder="Rechercher..."
                  emptyText="Aucun utilisateur."
                />
              </div>
            </div>
            <Button 
              onClick={() => setAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un prospect
            </Button>
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 h-[calc(100vh-200px)]">
              {Object.entries(columns).map(([status, column]) => (
                <Column 
                  key={status} 
                  column={column} 
                  onProspectClick={handleProspectClick} 
                />
              ))}
            </div>
          </DndContext>

          {isAddModalOpen && (
            <AddProspectModal
              isOpen={isAddModalOpen}
              onClose={() => setAddModalOpen(false)}
              onAdd={handleAddProspect}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PipelineWorking;