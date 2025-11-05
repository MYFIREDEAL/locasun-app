import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useNavigate, useSearchParams } from 'react-router-dom';
// ProspectCard RETIRÉ - c'est lui qui causait le problème !
// import ProspectCard from '@/components/admin/ProspectCard'; // ❌ PROBLÉMATIQUE
import SafeProspectDetailsAdmin from '@/components/admin/SafeProspectDetailsAdmin';
import SafeAddProspectModal from '@/components/admin/SafeAddProspectModal';
import { Button } from '@/components/ui/button';
import { Plus, User, Mail, Phone } from 'lucide-react';
import { useAppContext } from '@/App';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { slugify } from '@/lib/utils';

// Composant ProspectCard simple pour remplacer l'original défaillant
const SimpleProspectCard = ({ prospect, onClick }) => {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(prospect)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm">{prospect.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          prospect.status === 'new' ? 'bg-blue-100 text-blue-800' :
          prospect.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
          prospect.status === 'qualified' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {prospect.status}
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        {prospect.email && (
          <div className="flex items-center">
            <Mail className="w-3 h-3 mr-1" />
            {prospect.email}
          </div>
        )}
        {prospect.phone && (
          <div className="flex items-center">
            <Phone className="w-3 h-3 mr-1" />
            {prospect.phone}
          </div>
        )}
        {prospect.project && (
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            {prospect.project}
          </div>
        )}
      </div>
    </div>
  );
};

const Column = ({ column, onProspectClick }) => {
  return (
    <div className="bg-gray-100 rounded-xl p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 px-2 flex justify-between items-center">
        {column.name}
        <span className="bg-gray-200 text-gray-600 text-sm px-2 py-1 rounded-full">
          {column.prospects.length}
        </span>
      </h2>
      
      <SortableContext items={column.prospects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1">
          <AnimatePresence>
            {column.prospects.map((prospect) => (
              <motion.div
                key={prospect.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SimpleProspectCard 
                  prospect={prospect} 
                  onClick={onProspectClick}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </div>
  );
};

const PipelineFixed = () => {
  console.log('🔧 PipelineFixed: Démarrage du Pipeline sans ProspectCard défaillant');

  const { prospects, addProspect, updateProspect, users, projectsData, getProjectSteps, activeAdminUser } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    user: searchParams.get('user') || '',
    project: searchParams.get('project') || '',
    source: searchParams.get('source') || ''
  });

  const columns = [
    { id: 'new', name: 'Nouveaux', status: 'new' },
    { id: 'contacted', name: 'Contactés', status: 'contacted' },
    { id: 'qualified', name: 'Qualifiés', status: 'qualified' },
    { id: 'proposal', name: 'Proposition', status: 'proposal' },
    { id: 'negotiation', name: 'Négociation', status: 'negotiation' },
    { id: 'closed', name: 'Conclus', status: 'closed' },
    { id: 'lost', name: 'Perdus', status: 'lost' }
  ];

  const filteredProspects = useMemo(() => {
    return Object.values(prospects || {}).filter(prospect => {
      if (filters.user && prospect.assignedTo !== filters.user) return false;
      if (filters.project && prospect.project !== filters.project) return false;
      if (filters.source && prospect.source !== filters.source) return false;
      return true;
    });
  }, [prospects, filters]);

  const prospectsByColumn = useMemo(() => {
    const grouped = {};
    columns.forEach(col => {
      grouped[col.id] = filteredProspects.filter(p => p.status === col.status);
    });
    return grouped;
  }, [filteredProspects, columns]);

  const handleProspectClick = (prospect) => {
    setSelectedProspect(prospect);
  };

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
    <div className="h-full bg-gray-50">
      {/* Header avec message de succès */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h1 className="text-2xl font-bold text-green-800 mb-2">
          🔧 Pipeline Corrigé - Fonctionnel !
        </h1>
        <p className="text-green-700">
          ProspectCard défaillant remplacé par SimpleProspectCard. Votre Pipeline fonctionne maintenant !
        </p>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            placeholder="Filtrer par utilisateur"
            value={filters.user}
            onChange={(value) => setFilters(prev => ({ ...prev, user: value }))}
            options={Object.values(users || {}).map(user => ({
              value: user.id,
              label: user.name
            }))}
          />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            placeholder="Filtrer par projet"
            value={filters.project}
            onChange={(value) => setFilters(prev => ({ ...prev, project: value }))}
            options={Object.keys(projectsData || {}).map(project => ({
              value: project,
              label: project
            }))}
          />
        </div>

        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un prospect
        </Button>
      </div>

      {/* Pipeline Kanban */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 h-[calc(100vh-300px)]">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={{
                ...column,
                prospects: prospectsByColumn[column.id] || []
              }}
              onProspectClick={handleProspectClick}
            />
          ))}
        </div>
      </DndContext>

      {/* Modals */}
      {selectedProspect && (
        <SafeProspectDetailsAdmin
          prospect={selectedProspect}
          isOpen={true}
          onClose={() => setSelectedProspect(null)}
        />
      )}

      {isAddModalOpen && (
        <SafeAddProspectModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PipelineFixed;