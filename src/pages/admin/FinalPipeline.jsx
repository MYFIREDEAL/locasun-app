import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Filter, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/App';
import ProspectCard from '@/components/admin/ProspectCard';
import ProspectDetailsAdmin from '@/components/admin/ProspectDetailsAdmin';
import AddProspectModal from '@/components/admin/AddProspectModal';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const COLUMN_COLORS = [
  'bg-gray-100',
  'bg-blue-100',
  'bg-yellow-100',
  'bg-orange-100',
  'bg-purple-100',
  'bg-green-100',
  'bg-pink-100',
  'bg-indigo-100',
  'bg-teal-100',
  'bg-rose-100',
];

const humanizePipelineLabel = (label) => {
  if (!label) return '';
  return label
    .toLowerCase()
    .split(/[_\\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const normalizePipelineLabel = (label) => (label || '').toString().trim().toUpperCase();

const STAGE_COLOR_OVERRIDES = {
  MARKET: 'bg-blue-100',
  ETUDE: 'bg-yellow-100',
  OFFRE: 'bg-green-100',
  CONTRAT: 'bg-blue-100',
  'CONTRAT OK': 'bg-blue-100',
  'CLIENT ACTIF': 'bg-purple-100',
};

const DEFAULT_PIPELINE_STAGE_DEFINITIONS = [
  { id: 'lead', label: 'PROSPECTS', name: 'Prospects' },
  { id: 'contact', label: 'PREMIER CONTACT', name: 'Premier Contact' },
  { id: 'qualified', label: 'QUALIFIÉ', name: 'Qualifié' },
  { id: 'proposal', label: 'PROPOSITION', name: 'Proposition' },
  { id: 'negotiation', label: 'NÉGOCIATION', name: 'Négociation' },
  { id: 'closed', label: 'FERMÉ', name: 'Fermé' },
];

const FinalPipeline = () => {
  // Récupération du contexte avec gestion d'erreur
  const contextData = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // États locaux
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  
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
    projectsData = {}, 
    activeAdminUser,
    users = {},
    globalPipelineSteps = [],
    getProjectSteps,
  } = contextData;

  const stageDefinitions = useMemo(() => {
    if (Array.isArray(globalPipelineSteps) && globalPipelineSteps.length > 0) {
      return globalPipelineSteps.map((step, index) => {
        const normalizedLabel = normalizePipelineLabel(step.label);
        const assignedColor =
          step.color ||
          STAGE_COLOR_OVERRIDES[normalizedLabel] ||
          COLUMN_COLORS[index % COLUMN_COLORS.length];

        return {
          id: step.id,
          label: step.label,
          name: humanizePipelineLabel(step.label),
          color: assignedColor,
        };
      });
    }

    return DEFAULT_PIPELINE_STAGE_DEFINITIONS.map((stage, index) => {
      const normalizedLabel = normalizePipelineLabel(stage.label);
      const assignedColor =
        stage.color ||
        STAGE_COLOR_OVERRIDES[normalizedLabel] ||
        COLUMN_COLORS[index % COLUMN_COLORS.length];

      return {
        ...stage,
        color: assignedColor,
      };
    });
  }, [globalPipelineSteps]);

  // Liste des utilisateurs autorisés (même logique que l'Agenda)
  const allowedUsers = useMemo(() => {
    if (!activeAdminUser) return [];
    if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
      return Object.values(users);
    }
    const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
    return Object.values(users).filter(u => allowedIds.includes(u.id));
  }, [activeAdminUser, users]);

  const userOptions = useMemo(() => {
    const options = allowedUsers.map(user => ({ value: user.id, label: user.name }));
    // Ajouter "Tous les utilisateurs" seulement si accès à 2+ utilisateurs
    if (allowedUsers.length > 1) {
      return [{ value: 'all', label: 'Tous les utilisateurs' }, ...options];
    }
    return options;
  }, [allowedUsers]);

  // Initialiser selectedUserId
  useEffect(() => {
    if (activeAdminUser && selectedUserId === null) {
      // Si accès à plusieurs utilisateurs, mettre "all", sinon mettre l'utilisateur unique
      if (allowedUsers.length > 1) {
        setSelectedUserId('all');
      } else if (allowedUsers.length === 1) {
        setSelectedUserId(allowedUsers[0].id);
      }
    }
  }, [activeAdminUser, selectedUserId, allowedUsers]);

  const filteredProspects = useMemo(() => {
    // Filtrer d'abord par permissions (comme dans Contacts et Agenda)
    const visibleProspects = prospects.filter(prospect => {
      if (!activeAdminUser) return false;
      if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') return true;
      const allowedIds = [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
      return allowedIds.includes(prospect.ownerId);
    });

    // Filtrer par utilisateur sélectionné (sauf si "all")
    let filtered = visibleProspects;
    if (selectedUserId && selectedUserId !== 'all') {
      filtered = filtered.filter(prospect => prospect.ownerId === selectedUserId);
    }

    // Puis filtrer par "Mes prospects" si nécessaire
    if (filter === 'mine' && activeAdminUser?.id) {
      return filtered.filter((prospect) => prospect.ownerId === activeAdminUser.id);
    }
    return filtered;
  }, [prospects, filter, activeAdminUser, selectedUserId]);

  const { stagesWithCounts, prospectsByStage } = useMemo(() => {
    const stageBuckets = stageDefinitions.reduce((acc, stage) => {
      acc[stage.id] = [];
      return acc;
    }, {});

    const fallbackStageId = stageDefinitions[0]?.id || 'fallback-stage';
    const stageIdSet = new Set(stageDefinitions.map((stage) => stage.id));
    const normalizedStepsByLabel = new Map(
      stageDefinitions.map((stage) => [normalizePipelineLabel(stage.label), stage.id])
    );

    const determineProjectTypes = (prospect) => {
      const types = [];
      if (prospect.projectType && projectsData[prospect.projectType]) {
        types.push(prospect.projectType);
      }
      if (Array.isArray(prospect.tags)) {
        prospect.tags.forEach((tag) => {
          if (projectsData[tag] && !types.includes(tag)) {
            types.push(tag);
          }
        });
      }
      return types;
    };

    const resolveStageEntriesForProspect = (prospect) => {
      const entries = [];

      if (!globalPipelineSteps.length) {
        const legacyStageId = prospect.stage || fallbackStageId;
        const stageId = stageIdSet.has(legacyStageId) ? legacyStageId : fallbackStageId;
        entries.push({ stageId, prospect });
        return entries;
      }

      if (typeof getProjectSteps !== 'function') {
        entries.push({ stageId: fallbackStageId, prospect });
        return entries;
      }

      const projectTypes = determineProjectTypes(prospect);
      if (!projectTypes.length) {
        entries.push({ stageId: fallbackStageId, prospect });
        return entries;
      }

      projectTypes.forEach((projectType) => {
        const projectSteps = getProjectSteps(prospect.id, projectType) || [];
        const projectDefaultSteps = projectsData[projectType]?.steps || [];

        if (!projectSteps.length) {
          entries.push({ stageId: fallbackStageId, prospect, projectType });
          return;
        }

        const activeStep =
          projectSteps.find((step) => step.status === 'in_progress' || step.status === 'current') ||
          projectSteps.find((step) => step.status === 'pending') ||
          projectSteps[projectSteps.length - 1];

        if (!activeStep) {
          entries.push({ stageId: fallbackStageId, prospect, projectType });
          return;
        }

        const computeStageId = () => {
          if (activeStep.globalStepId && stageIdSet.has(activeStep.globalStepId)) {
            return activeStep.globalStepId;
          }

          if (activeStep.globalStepId) {
            const normalizedId = normalizePipelineLabel(activeStep.globalStepId);
            const mappedFromId = normalizedStepsByLabel.get(normalizedId);
            if (mappedFromId && stageIdSet.has(mappedFromId)) {
              return mappedFromId;
            }
          }

          const activeStepIndex = projectSteps.indexOf(activeStep);
          let defaultStepMatch = null;
          if (activeStepIndex >= 0 && projectDefaultSteps[activeStepIndex]) {
            defaultStepMatch = projectDefaultSteps[activeStepIndex];
          }
          if (!defaultStepMatch) {
            const normalizedStepName = normalizePipelineLabel(activeStep.name || activeStep.label);
            defaultStepMatch = projectDefaultSteps.find(
              (step) => normalizePipelineLabel(step.name || step.label) === normalizedStepName
            );
          }
          if (defaultStepMatch?.globalStepId && stageIdSet.has(defaultStepMatch.globalStepId)) {
            return defaultStepMatch.globalStepId;
          }
          if (defaultStepMatch?.globalStepId) {
            const normalizedDefaultId = normalizePipelineLabel(defaultStepMatch.globalStepId);
            const mappedFromDefaultId = normalizedStepsByLabel.get(normalizedDefaultId);
            if (mappedFromDefaultId && stageIdSet.has(mappedFromDefaultId)) {
              return mappedFromDefaultId;
            }
          }
          if (defaultStepMatch && (defaultStepMatch.label || defaultStepMatch.name)) {
            const normalizedDefaultLabel = normalizePipelineLabel(
              defaultStepMatch.label || defaultStepMatch.name
            );
            const mappedFromDefaultLabel = normalizedStepsByLabel.get(normalizedDefaultLabel);
            if (mappedFromDefaultLabel && stageIdSet.has(mappedFromDefaultLabel)) {
              return mappedFromDefaultLabel;
            }
          }

          const normalizedLabel = normalizePipelineLabel(activeStep.label || activeStep.name);
          const mappedFromLabel = normalizedStepsByLabel.get(normalizedLabel);
          if (mappedFromLabel && stageIdSet.has(mappedFromLabel)) {
            return mappedFromLabel;
          }

          return fallbackStageId;
        };

        const stageId = computeStageId();
        entries.push({ stageId, prospect, projectType, activeStep });
      });

      return entries;
    };

    filteredProspects.forEach((prospect) => {
      const stageEntries = resolveStageEntriesForProspect(prospect);
      stageEntries.forEach(({ stageId, projectType, activeStep }) => {
        if (!stageBuckets[stageId]) {
          stageBuckets[stageId] = [];
        }
        stageBuckets[stageId].push({ prospect, projectType, activeStep });
      });
    });

    const withCounts = stageDefinitions.map((stage) => ({
      ...stage,
      count: stageBuckets[stage.id]?.length || 0,
    }));

    return {
      stagesWithCounts: withCounts,
      prospectsByStage: stageBuckets,
    };
  }, [stageDefinitions, filteredProspects, globalPipelineSteps, getProjectSteps, projectsData]);

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

  const handleProspectClick = (prospect, projectType) => {
    setSelectedProspect(prospect);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('prospect', prospect.id);
    if (projectType) {
      newParams.set('project', projectType);
    } else {
      newParams.delete('project');
    }
    setSearchParams(newParams);
  };

  const handleBack = () => {
    setSelectedProspect(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('prospect');
    newParams.delete('project');
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
              <span>{filteredProspects.length} prospect{filteredProspects.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={userSearchOpen} className="w-[230px] justify-between">
                  <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{selectedUserId === 'all' ? 'Tous les utilisateurs' : (users[selectedUserId]?.name || "Utilisateur")}</span>
                  <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher..." />
                  <CommandList>
                    <CommandEmpty>Aucun utilisateur</CommandEmpty>
                    <CommandGroup>
                      {userOptions.map((user) => (
                        <CommandItem
                          key={user.value}
                          value={user.label}
                          onSelect={() => {
                            setSelectedUserId(user.value);
                            setUserSearchOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.value ? "opacity-100" : "opacity-0")} />
                          {user.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Prospect
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full overflow-x-auto pb-4">
          <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-4 h-full">
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
                {(prospectsByStage[stage.id] || []).map((entry, idx) => {
                  const { prospect, projectType, activeStep } = entry;
                  const key = `${prospect.id}-${projectType || 'default'}-${stage.id}-${idx}`;
                  const fallbackProjectLabel = prospect.projectType || (prospect.tags && prospect.tags[0]) || 'Projet';
                  const projectTitle = projectType && projectsData[projectType]?.title ? projectsData[projectType].title : fallbackProjectLabel;
                  const stepLabel = activeStep?.label || activeStep?.name || stage.name;
                  const projectColor = stage.color || 'bg-blue-100 text-blue-700';
                  const sortableId = `${prospect.id}-${projectType || projectTitle}-${stage.id}-${idx}`;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ProspectCard
                        prospect={{ ...prospect, _projectContext: { projectType: projectType || fallbackProjectLabel, projectTitle, stepLabel, projectColor } }}
                        onClick={() =>
                          handleProspectClick(
                            prospect,
                            projectType || prospect.projectType || (Array.isArray(prospect.tags) ? prospect.tags[0] : fallbackProjectLabel)
                          )
                        }
                        compact={true}
                        sortableId={sortableId}
                      />
                    </motion.div>
                  );
                })}
                
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
