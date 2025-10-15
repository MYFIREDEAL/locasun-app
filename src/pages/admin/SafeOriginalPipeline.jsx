import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/App';
import { slugify } from '@/lib/utils';

// Safe imports with fallbacks
let ProspectCard, ProspectDetailsAdmin, AddProspectModal, SearchableSelect;

try {
  ProspectCard = require('@/components/admin/ProspectCard').default;
} catch (e) {
  ProspectCard = ({ prospect, onClick }) => (
    <div className="bg-white p-4 rounded-lg shadow cursor-pointer" onClick={() => onClick(prospect)}>
      <h3 className="font-semibold">{prospect.name}</h3>
      <p className="text-sm text-gray-600">{prospect.email}</p>
    </div>
  );
}

try {
  ProspectDetailsAdmin = require('@/components/admin/ProspectDetailsAdmin').default;
} catch (e) {
  ProspectDetailsAdmin = ({ prospect, onBack }) => (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 text-blue-600">← Retour</button>
      <h1 className="text-2xl font-bold">{prospect.name}</h1>
      <p>{prospect.email}</p>
    </div>
  );
}

try {
  AddProspectModal = require('@/components/admin/AddProspectModal').default;
} catch (e) {
  AddProspectModal = ({ open, onOpenChange, onAddProspect }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full">
          <h2 className="text-lg font-bold mb-4">Ajouter un prospect</h2>
          <button onClick={() => onOpenChange(false)} className="px-4 py-2 bg-gray-500 text-white rounded">
            Fermer
          </button>
        </div>
      </div>
    );
  };
}

try {
  SearchableSelect = require('@/components/ui/SearchableSelect').default;
} catch (e) {
  SearchableSelect = ({ options, value, onSelect, placeholder }) => (
    <select 
      value={value} 
      onChange={(e) => onSelect(e.target.value)}
      className="w-full p-2 border rounded"
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

const Column = ({ column, onProspectClick }) => {
  return (
    <div className="bg-gray-100 rounded-xl p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 px-2 flex justify-between items-center">
        {column.name}
        <span className="text-sm font-medium bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
          {column.items.length}
        </span>
      </h2>
      <div className="space-y-4 overflow-y-auto flex-1">
        {column.items.map((item) => (
          <ProspectCard
            key={item.id}
            prospect={item}
            onClick={() => onProspectClick(item)}
          />
        ))}
      </div>
    </div>
  );
};

const SafeOriginalPipeline = () => {
  const { prospects, addProspect, updateProspect, users, projectsData, getProjectSteps, activeAdminUser } = useAppContext();
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

    const filteredProspects = visibleProspects.filter(prospect => 
      (selectedOwnerId === 'all' || prospect.ownerId === selectedOwnerId) && prospect.tags.includes(selectedProjectType)
    );

    filteredProspects.forEach(prospect => {
      const prospectSteps = getProjectSteps(prospect.id, selectedProjectType);
      const currentStep = prospectSteps.find(step => step.status === 'in_progress' || step.status === 'current');
      
      if (currentStep) {
        const columnKey = slugify(currentStep.name);
        if (newColumns[columnKey]) {
          newColumns[columnKey].items.push(prospect);
        }
      }
    });

    setColumns(newColumns);
  }, [prospects, selectedOwnerId, selectedProjectType, projectsData, getProjectSteps, activeAdminUser]);

  const updateQueryParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
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
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 overflow-x-auto pb-4">
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

export default SafeOriginalPipeline;
