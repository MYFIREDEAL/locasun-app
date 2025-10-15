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

const LoadingPipeline = () => (
  <div className="p-8">
    <div className="bg-white rounded-lg shadow p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-lg p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                {[1, 2].map(j => (
                  <div key={j} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

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
        <SortableContext items={column.items?.map(i => i.id) || []} strategy={verticalListSortingStrategy}>
          {column.items?.map((item) => (
            <ProspectCard
              key={item.id}
              prospect={item}
              onClick={() => onProspectClick(item)}
            />
          )) || null}
        </SortableContext>
      </div>
    </div>
  );
};

const FixedPipeline = () => {
  // Récupération sécurisée du contexte
  let contextData;
  try {
    contextData = useAppContext();
  } catch (error) {
    console.error('Erreur contexte Pipeline:', error);
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Erreur de contexte</h2>
          <p className="text-red-600">Le contexte de l'application n'est pas disponible.</p>
        </div>
      </div>
    );
  }

  // Vérification que le contexte contient les données nécessaires
  if (!contextData) {
    return <LoadingPipeline />;
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
    if (activeAdminUser.role === 'SuperAdmin') {
      return Object.values(users);
    }
    return [activeAdminUser];
  }, [activeAdminUser, users]);

  const selectedUserId = searchParams.get('user') || activeAdminUser?.id;
  const selectedUser = allowedUsers.find(u => u.id === selectedUserId) || allowedUsers[0];

  const filteredProspects = useMemo(() => {
    if (!prospects) return [];
    return prospects.filter(prospect => {
      if (!selectedUser) return false;
      return prospect.ownerId === selectedUser.id;
    });
  }, [prospects, selectedUser]);

  const columnConfig = [
    { id: 'lead', name: 'Nouveaux Contacts', status: 'lead' },
    { id: 'qualified', name: 'Qualifiés', status: 'qualified' },
    { id: 'proposal', name: 'Devis envoyés', status: 'proposal' },
    { id: 'negotiation', name: 'En négociation', status: 'negotiation' },
    { id: 'converted', name: 'Conclus', status: 'converted' }
  ];

  useEffect(() => {
    const newColumns = {};
    columnConfig.forEach(col => {
      newColumns[col.id] = {
        ...col,
        items: filteredProspects.filter(p => p.status === col.status)
      };
    });
    setColumns(newColumns);
  }, [filteredProspects]);

  const handleProspectClick = (prospect) => {
    setSelectedProspect(prospect);
  };

  const handleUserChange = (userId) => {
    setSearchParams({ user: userId });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || !updateProspect) return;

    const activeProspect = filteredProspects.find(p => p.id === active.id);
    if (!activeProspect) return;

    const newStatus = over.id;
    const validStatuses = columnConfig.map(c => c.status);
    
    if (validStatuses.includes(newStatus) && activeProspect.status !== newStatus) {
      updateProspect(activeProspect.id, { status: newStatus });
    }
  };

  const handleAddProspect = (prospectData) => {
    if (addProspect && selectedUser) {
      addProspect({
        ...prospectData,
        ownerId: selectedUser.id,
        status: 'lead'
      });
    }
  };

  // Affichage de chargement si les données ne sont pas prêtes
  if (!prospects || !selectedUser) {
    return <LoadingPipeline />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
          {allowedUsers.length > 1 && (
            <SearchableSelect
              options={allowedUsers.map(user => ({
                value: user.id,
                label: user.name || user.email
              }))}
              value={selectedUser.id}
              onValueChange={handleUserChange}
              placeholder="Sélectionner un utilisateur"
              className="min-w-[200px]"
            />
          )}
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center space-x-2 gradient-green hover:opacity-90"
        >
          <Plus size={20} />
          <span>Ajouter un prospect</span>
        </Button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 h-[calc(100vh-250px)]">
          {Object.values(columns).map((column) => (
            <Column
              key={column.id}
              column={column}
              onProspectClick={handleProspectClick}
            />
          ))}
        </div>
      </DndContext>

      <AnimatePresence>
        {selectedProspect && (
          <ProspectDetailsAdmin
            prospect={selectedProspect}
            onClose={() => setSelectedProspect(null)}
            users={users}
            projectsData={projectsData}
            getProjectSteps={getProjectSteps}
          />
        )}
      </AnimatePresence>

      <AddProspectModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddProspect={handleAddProspect}
      />
    </div>
  );
};

export default FixedPipeline;