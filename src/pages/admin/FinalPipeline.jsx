import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Users, Settings, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/App';
import ProspectCard from '@/components/admin/ProspectCard';
import ProspectDetailsAdmin from '@/components/admin/ProspectDetailsAdmin';
import AddProspectModal from '@/components/admin/AddProspectModal';
import { toast } from '@/components/ui/use-toast';

const FinalPipeline = () => {
  // Récupération du contexte avec gestion d'erreur
  const contextData = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // États locaux
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  
  if (!contextData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du pipeline...</p>
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
    activeAdminUser 
  } = contextData;

  // Colonnes du pipeline (étapes standard CRM)
  const pipelineStages = [
    { id: 'lead', name: 'Prospects', color: 'bg-gray-100', count: 0 },
    { id: 'contact', name: 'Premier Contact', color: 'bg-blue-100', count: 0 },
    { id: 'qualified', name: 'Qualifié', color: 'bg-yellow-100', count: 0 },
    { id: 'proposal', name: 'Proposition', color: 'bg-orange-100', count: 0 },
    { id: 'negotiation', name: 'Négociation', color: 'bg-purple-100', count: 0 },
    { id: 'closed', name: 'Fermé', color: 'bg-green-100', count: 0 }
  ];

  // Organiser les prospects par étape
  const prospectsByStage = useMemo(() => {
    const stages = {};
    pipelineStages.forEach(stage => {
      stages[stage.id] = [];
    });

    prospects.forEach(prospect => {
      const stage = prospect.stage || 'lead';
      if (stages[stage]) {
        stages[stage].push(prospect);
      } else {
        stages['lead'].push(prospect);
      }
    });

    return stages;
  }, [prospects]);

  // Mettre à jour les comptes
  const stagesWithCounts = pipelineStages.map(stage => ({
    ...stage,
    count: prospectsByStage[stage.id]?.length || 0
  }));

  useEffect(() => {
    const urlProspectId = searchParams.get('prospect');
    if (!urlProspectId) {
      if (selectedProspect !== null) {
        setSelectedProspect(null);
      }
      return;
    }

    const prospectFromList = prospects.find(p => p.id === urlProspectId) || null;
    if (prospectFromList?.id === selectedProspect?.id || (!prospectFromList && selectedProspect === null)) {
      return;
    }
    setSelectedProspect(prospectFromList);
  }, [searchParams, prospects, selectedProspect]);

  const handleProspectClick = (prospect) => {
    setSelectedProspect(prospect);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('prospect', prospect.id);
    setSearchParams(newParams);
  };

  const handleBack = () => {
    setSelectedProspect(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('prospect');
    setSearchParams(newParams);
  };

  const handleAddProspect = (newProspect) => {
    try {
      if (addProspect) {
        addProspect({
          ...newProspect,
          stage: 'lead',
          ownerId: activeAdminUser?.id || 'user-1',
          createdAt: new Date().toISOString()
        });
        toast({
          title: "Prospect ajouté",
          description: "Le nouveau prospect a été créé avec succès.",
        });
      }
      setIsAddModalOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le prospect.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProspect = (updatedProspect) => {
    try {
      if (updateProspect) {
        updateProspect(updatedProspect);
        setSelectedProspect(updatedProspect);
        toast({
          title: "Prospect mis à jour",
          description: "Les informations ont été sauvegardées.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le prospect.",
        variant: "destructive"
      });
    }
  };

  // Vue détail d'un prospect
  if (selectedProspect) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="h-full"
      >
        <ProspectDetailsAdmin 
          prospect={selectedProspect} 
          onBack={handleBack}
          onUpdate={handleUpdateProspect}
        />
      </motion.div>
    );
  }

  // Vue principale du pipeline
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Pipeline des Prospects</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{prospects.length} prospect{prospects.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter(filter === 'all' ? 'mine' : 'all')}
            >
              <Filter className="w-4 h-4 mr-2" />
              {filter === 'all' ? 'Tous' : 'Mes prospects'}
            </Button>
            
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Prospect
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 h-full">
          {stagesWithCounts.map((stage) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${stage.color} rounded-lg p-4 flex flex-col h-full min-h-[500px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{stage.name}</h3>
                <span className="bg-white bg-opacity-70 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                  {stage.count}
                </span>
              </div>

              {/* Prospects List */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {(prospectsByStage[stage.id] || []).map((prospect) => (
                  <motion.div
                    key={prospect.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProspectCard
                      prospect={prospect}
                      onClick={() => handleProspectClick(prospect)}
                      compact={true}
                    />
                  </motion.div>
                ))}
                
                {stage.count === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-16 h-16 bg-white bg-opacity-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm">Aucun prospect</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add Prospect Modal */}
      <AddProspectModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAddProspect={handleAddProspect}
      />

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 text-xs text-gray-600 border-t">
          <strong>Debug:</strong> {prospects.length} prospects | 
          Utilisateur: {activeAdminUser?.name || 'N/A'} | 
          Projets: {Object.keys(projectsData).length}
        </div>
      )}
    </div>
  );
};

export default FinalPipeline;
