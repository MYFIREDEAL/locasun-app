import React, { useState } from 'react';
import { useAppContext } from '../../App';
import { Button } from '../../components/ui/button';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { Plus, Calendar, MessageCircle, Phone, Mail } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

// Composant ProspectCard sécurisé - version historique simplifiée
const SafeHistoricalProspectCard = ({ prospect, onSelectProspect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prospect?.id || Math.random() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Gestion sécurisée des données
  const safeName = prospect?.name || prospect?.nom || 'Prospect sans nom';
  const safeEmail = prospect?.email || '';
  const safePhone = prospect?.telephone || prospect?.phone || '';
  const safeTags = Array.isArray(prospect?.tags) ? prospect.tags : [];
  const safeStatus = prospect?.statut || prospect?.status || 'Nouveau';

  const handleCardClick = () => {
    if (onSelectProspect && prospect) {
      onSelectProspect(prospect);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-gray-900 text-sm">{safeName}</h3>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
            {safeStatus}
          </span>
        </div>
        
        {safeEmail && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Mail className="w-3 h-3" />
            <span className="truncate">{safeEmail}</span>
          </div>
        )}
        
        {safePhone && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Phone className="w-3 h-3" />
            <span>{safePhone}</span>
          </div>
        )}
        
        {safeTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {safeTags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
            {safeTags.length > 3 && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">
                +{safeTags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Composant principal Pipeline - version historique restaurée
export default function PipelineHistoriqueRestore() {
  const { prospects = [], addProspect, updateProspect } = useAppContext();
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({
    statut: '',
    tags: '',
    dateDebut: '',
    dateFin: ''
  });

  // Configuration des capteurs pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Statuts de pipeline
  const statuts = ['Nouveau', 'Contact', 'Qualifié', 'Proposition', 'Négociation', 'Gagné', 'Perdu'];

  // Filtrage des prospects
  const filteredProspects = prospects.filter(prospect => {
    if (!prospect) return false;
    
    let matches = true;
    
    if (filters.statut && prospect.statut !== filters.statut) {
      matches = false;
    }
    
    if (filters.tags && (!prospect.tags || !prospect.tags.includes(filters.tags))) {
      matches = false;
    }
    
    return matches;
  });

  // Gestion du drag & drop
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const activeProspect = prospects.find(p => p.id === active.id);
    if (!activeProspect) return;
    
    // Mise à jour du statut si déplacé vers une nouvelle colonne
    if (over.id !== activeProspect.statut) {
      const updatedProspect = { ...activeProspect, statut: over.id };
      updateProspect && updateProspect(updatedProspect);
    }
  };

  // Navigation vers les détails du prospect
  const handleSelectProspect = (prospect) => {
    setSelectedProspect(prospect);
  };

  // Retour à la vue pipeline
  const handleBackToPipeline = () => {
    setSelectedProspect(null);
  };

  // Si un prospect est sélectionné, afficher la vue détail
  if (selectedProspect) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button
            onClick={handleBackToPipeline}
            variant="outline"
            className="mb-4"
          >
            ← Retour au Pipeline
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Détails du prospect
          </h1>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedProspect.name || selectedProspect.nom || 'Prospect'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Informations générales</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {selectedProspect.email || 'Non renseigné'}</p>
                <p><strong>Téléphone:</strong> {selectedProspect.telephone || selectedProspect.phone || 'Non renseigné'}</p>
                <p><strong>Statut:</strong> {selectedProspect.statut || selectedProspect.status || 'Nouveau'}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {(selectedProspect.tags || []).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
                {(!selectedProspect.tags || selectedProspect.tags.length === 0) && (
                  <span className="text-gray-500 text-sm">Aucun tag</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-medium mb-2">Actions</h3>
            <div className="flex gap-2">
              <Button size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contacter
              </Button>
              <Button size="sm" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Planifier RDV
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue pipeline principale
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Commercial</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Prospect
        </Button>
      </div>

      {/* Filtres */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <SearchableSelect
          options={statuts.map(s => ({ value: s, label: s }))}
          value={filters.statut}
          onChange={(value) => setFilters(prev => ({ ...prev, statut: value }))}
          placeholder="Filtrer par statut"
        />
        
        <SearchableSelect
          options={[
            { value: 'VIP', label: 'VIP' },
            { value: 'Urgent', label: 'Urgent' },
            { value: 'Chaud', label: 'Chaud' }
          ]}
          value={filters.tags}
          onChange={(value) => setFilters(prev => ({ ...prev, tags: value }))}
          placeholder="Filtrer par tag"
        />
        
        <Button
          variant="outline"
          onClick={() => setFilters({ statut: '', tags: '', dateDebut: '', dateFin: '' })}
        >
          Réinitialiser
        </Button>
      </div>

      {/* Pipeline Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {statuts.map((statut) => {
            const prospects_statut = filteredProspects.filter(p => p.statut === statut);
            
            return (
              <div key={statut} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">{statut}</h3>
                  <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {prospects_statut.length}
                  </span>
                </div>
                
                <SortableContext
                  items={prospects_statut.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 min-h-[200px]">
                    <AnimatePresence>
                      {prospects_statut.map((prospect) => (
                        <SafeHistoricalProspectCard
                          key={prospect.id}
                          prospect={prospect}
                          onSelectProspect={handleSelectProspect}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}