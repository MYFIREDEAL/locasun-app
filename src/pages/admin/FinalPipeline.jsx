import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Filter, ChevronDown, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/App';
import { logger } from '@/lib/logger';
import ProspectCard from '@/components/admin/ProspectCard';
import SkeletonCard from '@/components/admin/SkeletonCard';
import ProspectDetailsAdmin from '@/components/admin/ProspectDetailsAdmin';
import SafeAddProspectModal from '@/components/admin/SafeAddProspectModal';
import ModuleBoundary from '@/components/ModuleBoundary';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUsers } from '@/contexts/UsersContext';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
// 🔥 PR-3: useSupabaseProspects supprimé - données centralisées dans AppContext
import { useOrganization } from '@/contexts/OrganizationContext';

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
  const { organizationId } = useOrganization();
  
  // 🔥 TOUS LES HOOKS DOIVENT ÊTRE AVANT LES EARLY RETURNS (Rules of Hooks)
  // États locaux
  const [selectedProspectId, setSelectedProspectId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const lastProcessedUrl = useRef(null);
  const [isEditingProspect, setIsEditingProspect] = useState(false);

  // 🔥 HOOKS DÉPLACÉS ICI (avant les early returns)
  const { users: supabaseUsers, loading: usersLoading } = useUsers();
  const { authUserId } = useSupabaseUser();
  
  // 🔥 PR-3: addProspect récupéré depuis AppContext (source unique)
  const addSupabaseProspectDirect = contextData?.addProspect;

  // ❌ SUPPRIMÉ : Canal real-time spécifique (duplication inutile)
  // Ancien code causait le bug : selectedProspect était un state local qui ne se synchronisait jamais
  /* useEffect(() => {
    if (!selectedProspectId) return;

    logger.debug('[FinalPipeline] Setting up real-time channel', { prospectId: selectedProspect.id });

    const channel = supabase
      .channel(`pipeline-prospect-detail-${selectedProspect.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'prospects',
        filter: `id=eq.${selectedProspect.id}`
      }, (payload) => {
        logger.debug('[FinalPipeline] Real-time UPDATE received', { prospectId: payload.new?.id });
        
        // Transformation Supabase → App (snake_case → camelCase)
        const transformedData = {
          id: payload.new.id,
          name: payload.new.name,
          email: payload.new.email,
          phone: payload.new.phone,
          address: payload.new.address,
          company: payload.new.company_name,
          tags: payload.new.tags || [],
          ownerId: payload.new.owner_id,
          status: payload.new.status,
          hasAppointment: payload.new.has_appointment,
          affiliateName: payload.new.affiliate_name,
          formData: payload.new.form_data || {},
          createdAt: payload.new.created_at,
          updatedAt: payload.new.updated_at,
        };

        // Pas besoin de setSelectedProspect - le useMemo le fait automatiquement
        logger.debug('[FinalPipeline] selectedProspect updated via context');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProspectId]); */
  // 🔥 isEditingProspect déplacé en haut avec les autres états
  
  // 🔥 Extraire les données du contexte (avec valeurs par défaut si null)
  const { 
    prospects: supabaseProspects = [],
    prospectsLoading = true,
    allProjectSteps = {},
    allStepsLoading = true,
    updateProspect: updateSupabaseProspect = async () => {},
    projectsData = {}, 
    activeAdminUser = null,
    users = {},
    globalPipelineSteps = [],
    pipelineLoading = true,
    getProjectSteps = () => [],
    adminReady = false, // 🔥 PR-5 FIX: Ajouter adminReady pour gater les skeletons
  } = contextData || {};

  // 🔥 TOUS LES HOOKS useMemo DOIVENT ÊTRE ICI (avant tout return conditionnel)
  // Transformer le array Supabase en objet { user_id: userObject }
  const usersFromSupabase = useMemo(() => {
    return supabaseUsers.reduce((acc, user) => {
      acc[user.user_id] = {
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        managerId: user.manager_id,
        accessRights: user.access_rights,
      };
      return acc;
    }, {});
  }, [supabaseUsers]);

  // Utiliser les prospects Supabase
  const prospects = supabaseProspects;
  const updateProspect = updateSupabaseProspect;

  // 🔥 FIX SIMPLE: Calcul direct sans useMemo pour éviter problèmes de référence
  const selectedProspect = supabaseProspects?.find(p => p.id === selectedProspectId) || null;

  // 🔥 Construire les colonnes à partir des globalPipelineSteps depuis Supabase
  const stageDefinitions = useMemo(() => {
    if (!globalPipelineSteps || globalPipelineSteps.length === 0) {
      return DEFAULT_PIPELINE_STAGE_DEFINITIONS;
    }
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
  }, [globalPipelineSteps]);

  // Liste des utilisateurs autorisés (même logique que l'Agenda)
  const allowedUsers = useMemo(() => {
    if (!activeAdminUser) return [];
    if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') {
      return Object.values(usersFromSupabase);
    }
    // 🔥 FIX: Utiliser access_rights (snake_case) depuis Supabase
    const accessRights = activeAdminUser.access_rights || activeAdminUser.accessRights;
    const allowedUserIds = [activeAdminUser.user_id, ...(accessRights?.users || [])];
    return Object.values(usersFromSupabase).filter(u => allowedUserIds.includes(u.user_id));
  }, [activeAdminUser, usersFromSupabase]);

  const userOptions = useMemo(() => {
    // 🔥 prospects.owner_id référence users.user_id (auth UUID), pas users.id
    const options = allowedUsers.map(user => ({ value: user.user_id, label: user.name }));
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
        // 🔥 prospects.owner_id référence users.user_id (auth UUID)
        setSelectedUserId(allowedUsers[0].user_id);
      }
    }
  }, [activeAdminUser, selectedUserId, allowedUsers]);

  // Fermer le menu des tags quand on clique à l'extérieur
  useEffect(() => {
    if (!isTagMenuOpen) return;

    const handleClickOutside = (event) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setTagMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTagMenuOpen]);

  // Liste des tags disponibles
  const tagOptions = useMemo(() => {
    const prospectTags = new Set();
    prospects.forEach(prospect => {
      (prospect.tags || []).forEach(tag => prospectTags.add(tag));
    });
    return Array.from(prospectTags);
  }, [prospects]);

  const tagFilterLabel = selectedTags.length === 0 
    ? 'Tags' 
    : selectedTags.length === 1 
      ? (projectsData[selectedTags[0]]?.title || selectedTags[0])
      : `${selectedTags.length} tags`;

  const filteredProspects = useMemo(() => {
    // Filtrer d'abord par permissions (comme dans Contacts et Agenda)
    const visibleProspects = prospects.filter(prospect => {
      if (!activeAdminUser) return false;
      if (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') return true;
      // 🔥 FIX: Utiliser access_rights (snake_case) depuis Supabase
      const accessRights = activeAdminUser.access_rights || activeAdminUser.accessRights;
      const allowedUserIds = [activeAdminUser.user_id, ...(accessRights?.users || [])];
      return allowedUserIds.includes(prospect.ownerId);
    });

    logger.debug('[FinalPipeline] Prospects count', { total: prospects.length, visible: visibleProspects.length });

    // Filtrer par tags (si au moins un tag sélectionné)
    let filtered = visibleProspects;
    if (selectedTags.length > 0) {
      filtered = filtered.filter(prospect => {
        const prospectTags = prospect.tags || [];
        // Le prospect doit avoir au moins un des tags sélectionnés
        return selectedTags.some(tag => prospectTags.includes(tag));
      });
    }

    // Filtrer par utilisateur sélectionné (sauf si "all")
    if (selectedUserId && selectedUserId !== 'all') {
      filtered = filtered.filter(prospect => prospect.ownerId === selectedUserId);
    }

    // Filtrer par recherche (nom, email, ville)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prospect => 
        (prospect.name || '').toLowerCase().includes(query) ||
        (prospect.email || '').toLowerCase().includes(query) ||
        (prospect.city || '').toLowerCase().includes(query) ||
        (prospect.phone || '').toLowerCase().includes(query)
      );
    }

    // Puis filtrer par "Mes prospects" si nécessaire
    if (filter === 'mine' && authUserId) {
      // 🔥 prospects.owner_id référence users.user_id (auth UUID)
      return filtered.filter((prospect) => prospect.ownerId === authUserId);
    }
    return filtered;
  }, [prospects, filter, authUserId, selectedUserId, selectedTags, searchQuery]);

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
        // 🔥 PRIORITÉ: Charger depuis Supabase, sinon fallback sur getProjectSteps
        const supabaseKey = `${prospect.id}-${projectType}`;
        const projectSteps = allProjectSteps[supabaseKey] || (typeof getProjectSteps === 'function' ? getProjectSteps(prospect.id, projectType) : []) || [];
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
    const urlProjectType = searchParams.get('project');
    const currentUrl = `${urlProspectId}-${urlProjectType}`;
    
    // Si on a déjà traité cette URL, ne rien faire
    if (lastProcessedUrl.current === currentUrl) {
      return;
    }
    
    if (!urlProspectId) {
      if (selectedProspectId !== null) {
        setSelectedProspectId(null);
        lastProcessedUrl.current = null;
      }
      return;
    }

    const prospectFromList = prospects.find(p => p.id === urlProspectId) || null;
    
    if (prospectFromList) {
      // On stocke juste l'ID - le useMemo dérivera automatiquement selectedProspect
      setSelectedProspectId(urlProspectId);
      lastProcessedUrl.current = currentUrl; // 🔥 Marquer cette URL comme traitée
    }
  }, [searchParams, prospects]);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleProspectClick = (prospect, projectType) => {
    setSelectedProspectId(prospect.id);
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
    setSelectedProspectId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('prospect');
    newParams.delete('project');
    setSearchParams(newParams);
  };

  const handleAddProspect = async (newProspectData) => {
    try {
      // Guard: vérifier que addProspect est disponible
      if (!addSupabaseProspectDirect) {
        console.error('[handleAddProspect] addProspect is undefined');
        throw new Error('Fonction addProspect non disponible');
      }
      
      // Utiliser le step_id de la première colonne du pipeline (position 0)
      const firstStepId = globalPipelineSteps[0]?.step_id || globalPipelineSteps[0]?.id;
      
      console.log('[handleAddProspect] calling addProspect', {
        name: newProspectData.name,
        email: newProspectData.email,
        status: firstStepId,
        ownerId: activeAdminUser?.user_id
      });
      
      // PR-4.1: Appel direct, erreurs non masquées
      const createdProspect = await addSupabaseProspectDirect({ 
        ...newProspectData, 
        status: firstStepId,
        ownerId: activeAdminUser?.user_id
      });
      
      console.log('[handleAddProspect] result', createdProspect);
      
      // Fermer modal SEULEMENT si création réussie
      if (!createdProspect?.id) {
        throw new Error('Prospect non créé - résultat vide');
      }

      // 🔥 INITIALISER LES ÉTAPES DE CHAQUE PROJET avec première étape "in_progress"
      if (createdProspect && newProspectData.tags && newProspectData.tags.length > 0) {
        for (const projectType of newProspectData.tags) {
          const defaultSteps = projectsData[projectType]?.steps;
          if (defaultSteps && defaultSteps.length > 0) {
            try {
              const initialSteps = JSON.parse(JSON.stringify(defaultSteps));
              initialSteps[0].status = 'in_progress'; // Première étape active
              
              // 🔥 VALIDATION: organization_id requis par RLS
              if (!organizationId) {
                throw new Error('Organization ID manquant - Impossible de créer les steps projet');
              }
              
              const { error: stepsError } = await supabase
                .from('project_steps_status')
                .upsert({
                  prospect_id: createdProspect.id,
                  project_type: projectType,
                  steps: initialSteps,
                  organization_id: organizationId, // ✅ Ajouté pour multi-tenant RLS
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'prospect_id,project_type'
                });
              
              if (stepsError) {
                logger.error('Erreur initialisation steps', { projectType, error: stepsError });
              } else {
                logger.debug('Steps initialized for project', { projectType, prospectId: createdProspect.id });
              }
            } catch (err) {
              logger.error('Erreur initialisation steps', { projectType, error: err });
            }
          }
        }
      }

      // 🔥 PR-4.2: Envoyer invitation client si demandé
      if (newProspectData.sendInvitation && createdProspect.email) {
        try {
          const redirectUrl = `${window.location.origin}/dashboard`;
          
          const { error: magicLinkError } = await supabase.auth.signInWithOtp({
            email: createdProspect.email.trim(),
            options: {
              shouldCreateUser: true,
              emailRedirectTo: redirectUrl,
            }
          });

          if (magicLinkError) {
            console.error('[handleAddProspect] invitation error', magicLinkError);
            toast({
              title: "Prospect créé",
              description: `⚠️ Invitation non envoyée: ${magicLinkError.message}`,
              variant: "warning",
            });
          } else {
            console.log('[handleAddProspect] invitation sent to', createdProspect.email);
            toast({
              title: "✅ Prospect créé",
              description: `Invitation envoyée à ${createdProspect.email}`,
              className: "bg-green-500 text-white",
            });
          }
        } catch (inviteErr) {
          console.error('[handleAddProspect] invitation exception', inviteErr);
          // Ne pas bloquer la création, juste avertir
          toast({
            title: "Prospect créé",
            description: `⚠️ Erreur envoi invitation: ${inviteErr.message}`,
            variant: "warning",
          });
        }
      }

      setIsAddModalOpen(false);
    } catch (error) {
      console.error('❌ handleAddProspect error', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le prospect.",
        variant: "destructive"
      });
      // 🔥 NE PAS fermer la modal en cas d'erreur
    }
  };

  const handleUpdateProspect = (updatedProspect) => {
    try {
      if (updateProspect) {
        updateProspect(updatedProspect);
        // 🔥 Pas besoin de setSelectedProspect - le useMemo le met à jour automatiquement
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
  // 🔥 FIX: Attendre que prospect ET ses données soient chargés pour éviter React #310
  if (selectedProspect && selectedProspect.id) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="h-full"
      >
        <ModuleBoundary name="Fiche Prospect">
          <ProspectDetailsAdmin 
            prospect={selectedProspect} 
            onBack={handleBack}
            onUpdate={handleUpdateProspect}
            onEditingChange={setIsEditingProspect}
          />
        </ModuleBoundary>
      </motion.div>
    );
  }

  // Note: Chargement géré par App.jsx via authLoading, pas besoin de check ici

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
            <div ref={tagMenuRef} className="relative inline-block text-left">
              <Button
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => setTagMenuOpen(prev => !prev)}
              >
                <span>{tagFilterLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {isTagMenuOpen && (
                <div className="absolute z-50 mt-1 w-44 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="py-1">
                    {tagOptions.map(tag => (
                      <label
                        key={tag}
                        className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => handleTagToggle(tag)}
                          className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{projectsData[tag]?.title || tag}</span>
                      </label>
                    ))}
                    {selectedTags.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => setSelectedTags([])}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Effacer la sélection
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={userSearchOpen} className="w-[230px] justify-between">
                  <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{selectedUserId === 'all' ? 'Tous les utilisateurs' : (usersFromSupabase[selectedUserId]?.name || "Utilisateur")}</span>
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
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un prospect..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            
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
                  {/* 🎯 Calculer le count en tenant compte du filtre tags */}
                  {(prospectsByStage[stage.id] || []).filter(entry => {
                    if (selectedTags.length === 0) return true;
                    const { projectType } = entry;
                    return selectedTags.some(tag => 
                      tag.toUpperCase() === (projectType || '').toUpperCase()
                    );
                  }).length}
                </span>
              </div>

              {/* Prospects List */}
              <div className={`flex-1 space-y-3 overflow-y-auto transition-all duration-300 ${
                (!adminReady || prospectsLoading || allStepsLoading) 
                  ? 'blur-sm opacity-50 pointer-events-none' 
                  : ''
              }`}>
                {/* 🔥 PR-5: Blur effect pendant le chargement au lieu de skeletons */}
                  <>
                    {(prospectsByStage[stage.id] || [])
                      .filter(entry => {
                        // 🎯 Filtrer par tags sélectionnés au niveau de la CARTE (projectType)
                        if (selectedTags.length === 0) return true;
                        const { projectType } = entry;
                        return selectedTags.some(tag => 
                          tag.toUpperCase() === (projectType || '').toUpperCase()
                        );
                      })
                      .map((entry, idx) => {
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
                            projectsData={projectsData}
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
                  </>
              </div>
            </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Prospect Modal */}
      <SafeAddProspectModal
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
