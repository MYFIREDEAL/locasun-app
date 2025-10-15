import React, { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '@/App';
import ProspectCard from '@/components/admin/ProspectCard';
import { motion } from 'framer-motion';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const CleanPipeline = () => {
  // État local pour la gestion du drag & drop
  const [activeId, setActiveId] = useState(null);
  const [draggedProspect, setDraggedProspect] = useState(null);

  // Récupération du contexte avec gestion d'erreur
  let contextData;
  try {
    contextData = useAppContext();
  } catch (error) {
    console.error('Erreur contexte:', error);
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Pipeline - Erreur de contexte</h2>
        <p className="text-red-600">Impossible de charger le contexte: {error.message}</p>
      </div>
    );
  }

  // Vérification de la disponibilité des données
  if (!contextData) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Pipeline - Chargement</h2>
        <p>Chargement des données...</p>
      </div>
    );
  }

  const { prospects = [], updateProspectStage, activeAdminUser } = contextData;

  // Organisation des prospects par étape
  const prospectsByStage = useMemo(() => {
    const stages = {
      'nouveau': prospects.filter(p => p.stage === 'nouveau'),
      'contact': prospects.filter(p => p.stage === 'contact'),
      'qualification': prospects.filter(p => p.stage === 'qualification'),
      'proposition': prospects.filter(p => p.stage === 'proposition'),
      'negociation': prospects.filter(p => p.stage === 'negociation'),
      'cloture': prospects.filter(p => p.stage === 'cloture'),
    };
    return stages;
  }, [prospects]);

  // Gestion du début du drag
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Trouver le prospect qui est dragué
    const prospect = prospects.find(p => p.id === active.id);
    setDraggedProspect(prospect);
  }, [prospects]);

  // Gestion de la fin du drag
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setDraggedProspect(null);
      return;
    }

    const prospectId = active.id;
    const newStage = over.id;

    // Mettre à jour l'étape du prospect si elle a changé
    const prospect = prospects.find(p => p.id === prospectId);
    if (prospect && prospect.stage !== newStage && updateProspectStage) {
      updateProspectStage(prospectId, newStage);
    }

    setActiveId(null);
    setDraggedProspect(null);
  }, [prospects, updateProspectStage]);

  // Configuration des étapes
  const stages = [
    { id: 'nouveau', title: 'Nouveaux', color: 'bg-blue-100 border-blue-300' },
    { id: 'contact', title: 'Premier Contact', color: 'bg-yellow-100 border-yellow-300' },
    { id: 'qualification', title: 'Qualification', color: 'bg-orange-100 border-orange-300' },
    { id: 'proposition', title: 'Proposition', color: 'bg-purple-100 border-purple-300' },
    { id: 'negociation', title: 'Négociation', color: 'bg-pink-100 border-pink-300' },
    { id: 'cloture', title: 'Clôture', color: 'bg-green-100 border-green-300' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Pipeline des Prospects</h2>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un prospect
        </Button>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              prospects={prospectsByStage[stage.id] || []}
              activeId={activeId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && draggedProspect ? (
            <div className="transform rotate-3 opacity-90">
              <ProspectCard prospect={draggedProspect} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Informations de debug */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p>Total prospects: {prospects.length}</p>
        <p>Utilisateur actif: {activeAdminUser?.name || 'Non défini'}</p>
        <p>Prospects par étape: {Object.entries(prospectsByStage).map(([stage, procs]) => 
          `${stage}: ${procs.length}`).join(', ')}
        </p>
      </div>
    </div>
  );
};

// Composant pour une colonne d'étape
const StageColumn = ({ stage, prospects, activeId }) => {
  const isDropZone = true;

  return (
    <div
      id={stage.id}
      className={`min-h-[400px] p-4 rounded-lg border-2 border-dashed ${stage.color} transition-colors`}
    >
      <h3 className="font-semibold text-center mb-4">{stage.title}</h3>
      <div className="space-y-3">
        <SortableContext items={prospects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {prospects.map((prospect) => (
            <motion.div
              key={prospect.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ProspectCard 
                prospect={prospect} 
                isActive={activeId === prospect.id}
                compact
              />
            </motion.div>
          ))}
        </SortableContext>
      </div>
      
      {prospects.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p>Aucun prospect</p>
        </div>
      )}
    </div>
  );
};

export default CleanPipeline;