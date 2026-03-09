import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { ArrowLeft, Phone, Mail, MessageCircle, MapPin, FileText, Download, Edit, Save, X, Building, User, Send, Paperclip, Bot, Tag, GripVertical, Hash, Calendar, Check, Users, Trash2, Plus, ExternalLink, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AddActivityModal } from '@/pages/admin/Agenda';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { useUsers } from '@/contexts/UsersContext';
import { useSupabaseProjectStepsStatus } from '@/hooks/useSupabaseProjectStepsStatus';
import { useSupabaseChatMessages } from '@/hooks/useSupabaseChatMessages';
import { useSupabaseClientFormPanels } from '@/hooks/useSupabaseClientFormPanels';
import { useSupabaseProjectHistory } from '@/hooks/useSupabaseProjectHistory';
// 🔥 PR-3: useSupabaseAgenda supprimé - données centralisées dans AppContext
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import { useSupabasePartners } from '@/hooks/useSupabasePartners';
import { useWorkflowExecutor } from '@/hooks/useWorkflowExecutor';
import { useWorkflowActionTrigger } from '@/hooks/useWorkflowActionTrigger';
import { executeContractSignatureAction } from '@/lib/contractPdfGenerator';
import ProjectCenterPanel from './ProjectCenterPanel';

// 🔥 V2 Imports
import WorkflowV2RobotPanel from './workflow-v2/WorkflowV2RobotPanel';
import { useSupabaseWorkflowModuleTemplates } from '@/hooks/useSupabaseWorkflowModuleTemplates';
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getModuleActionConfig } from '@/lib/moduleAIConfig';

const STATUS_COMPLETED = 'completed';
const STATUS_CURRENT = 'in_progress';
const STATUS_PENDING = 'pending';
const statusConfig = {
  [STATUS_COMPLETED]: {
    label: 'Terminé',
    badge: 'bg-green-100 text-green-700',
    icon: 'bg-green-500 text-white shadow-soft',
    text: 'text-gray-900',
    iconOnly: 'bg-green-100 text-green-600'
  },
  [STATUS_CURRENT]: {
    label: 'En cours',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bg-blue-500 text-white shadow-soft ring-4 ring-blue-200',
    text: 'text-blue-900',
    iconOnly: 'bg-blue-100 text-blue-600'
  },
  [STATUS_PENDING]: {
    label: 'À venir',
    badge: 'bg-gray-100 text-gray-500',
    icon: 'bg-gray-100 text-gray-400',
    text: 'text-gray-500',
    iconOnly: 'bg-gray-200 text-gray-500'
  }
};

// ─────────────────────────────────────────────────────────────
// Helpers sous-étapes (même logique qu'une étape V1, mais imbriquée)
// ─────────────────────────────────────────────────────────────
const normalizeSubSteps = (step) => {
  if (!step || !Array.isArray(step.subSteps) || step.subSteps.length === 0) return step;
  
  const normalized = { ...step, subSteps: step.subSteps.map(s => ({
    ...s,
    status: s.status || STATUS_PENDING,
  })) };

  // 🔥 FIX BUG 1: Ne normaliser les sous-étapes QUE si l'étape parente est "in_progress"
  // Si l'étape est "pending", les sous-étapes restent "pending"
  if (step.status !== STATUS_CURRENT) {
    return normalized;
  }

  // Si aucune sous-étape en cours, activer la première pending
  const hasCurrent = normalized.subSteps.some(s => s.status === STATUS_CURRENT);
  if (!hasCurrent) {
    const firstPending = normalized.subSteps.findIndex(s => s.status === STATUS_PENDING);
    if (firstPending !== -1) {
      normalized.subSteps = normalized.subSteps.map((s, idx) => ({
        ...s,
        status: idx === firstPending ? STATUS_CURRENT : s.status,
      }));
    }
  }
  
  return normalized;
};

// Génère des sous-étapes à partir de la config V2 (actions) si aucune sous-étape n'est présente
const deriveSubStepsFromTemplate = (step, projectType, v2Templates) => {
  if (!step) return step;

  const moduleId = step.name
    ? step.name.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '')
    : null;

  const tplKey = moduleId ? `${projectType}:${moduleId}` : null;
  const tpl = tplKey && v2Templates ? v2Templates[tplKey] : null;
  const actions = tpl?.configJson?.actions;

  if (!actions || actions.length === 0) return step;

  // Si des sous-étapes existent déjà, on met à jour leurs noms à partir des objectifs
  if (Array.isArray(step.subSteps) && step.subSteps.length > 0) {
    const updatedSubSteps = step.subSteps.map((subStep, idx) => {
      const action = actions[idx];
      const objectiveName = action?.config?.objective?.trim();
      const derivedName = objectiveName
        || action?.title
        || action?.label;
      return {
        ...subStep,
        name: derivedName || subStep.name || `Action ${idx + 1}`,
      };
    });
    return { ...step, subSteps: updatedSubSteps };
  }

  // Sinon, on génère les sous-étapes à partir des actions
  const baseStatus = step.status || STATUS_PENDING;

  // 🔥 FIX BUG 1: Les sous-étapes doivent hériter du statut de l'étape parente
  // Si l'étape est "in_progress" → première sous-étape en "in_progress"
  // Si l'étape est "pending" → TOUTES les sous-étapes en "pending"
  // Si l'étape est "completed" → TOUTES les sous-étapes en "completed"
  const subSteps = actions.map((action, idx) => ({
    id: action.id || `v2-${moduleId}-action-${idx}`,
    name: (action.config?.objective && action.config.objective.trim())
      || action.title
      || action.label
      || `Action ${idx + 1}`,
    status: baseStatus === STATUS_COMPLETED
      ? STATUS_COMPLETED
      : baseStatus === STATUS_CURRENT && idx === 0
        ? STATUS_CURRENT
        : STATUS_PENDING,
  }));

  return {
    ...step,
    subSteps,
    status: baseStatus,
  };
};

const areAllSubStepsCompleted = (step) => {
  if (!step?.subSteps || step.subSteps.length === 0) return true;
  return step.subSteps.every(s => s.status === STATUS_COMPLETED);
};

const getActiveSubStepIndex = (step) => {
  if (!step?.subSteps || step.subSteps.length === 0) return -1;
  const currentIdx = step.subSteps.findIndex(s => s.status === STATUS_CURRENT);
  if (currentIdx !== -1) return currentIdx;
  return step.subSteps.findIndex(s => s.status === STATUS_PENDING);
};

const ChatForm = ({ form, prospectId, onFormSubmit }) => {
    const [formData, setFormData] = useState({});

    const handleInputChange = (fieldId, value) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = () => {
        onFormSubmit(prospectId, form.id, formData);
        toast({
            title: "Réponses enregistrées",
            description: `Les réponses au formulaire "${form.name}" ont été sauvegardées.`,
            className: "bg-green-500 text-white"
        });
    };

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">{form.name}</h4>
            {(form.fields || []).map(field => {
                // 🔥 Vérifier les conditions multiples d'affichage
                if (field.show_if_conditions && field.show_if_conditions.length > 0) {
                    const operator = field.condition_operator || 'AND';
                    const conditionResults = field.show_if_conditions.map(condition => {
                        const currentValue = formData[condition.field];
                        if (condition.equals === 'has_value') {
                            return !!currentValue && currentValue !== '';
                        }
                        return currentValue === condition.equals;
                    });
                    const shouldShow = operator === 'AND' 
                        ? conditionResults.every(result => result === true)
                        : conditionResults.some(result => result === true);
                    if (!shouldShow) return null;
                }
                
                // 🔥 Rétro-compatibilité show_if
                if (field.show_if) {
                    const conditionField = field.show_if.field;
                    const expectedValue = field.show_if.equals;
                    const currentValue = formData[conditionField];
                    
                    if (!currentValue || currentValue !== expectedValue) {
                        return null;
                    }
                }
                
                // 🔥 Ne pas afficher les champs qui sont dans un groupe répété
                const isInRepeatedGroup = (form.fields || []).some(f => 
                    f.is_repeater && (f.repeats_fields || []).includes(field.id)
                );
                
                if (isInRepeatedGroup) {
                    return null;
                }

                return (
                    <div key={field.id}>
                        <Label htmlFor={`${form.id}-${field.id}`}>{field.label}</Label>
                        <Input
                            id={`${form.id}-${field.id}`}
                            type={field.type}
                            value={typeof formData[field.id] === 'object' ? '' : (formData[field.id] || '')}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || ''}
                        />
                        
                        {/* 🔥 Afficher les champs répétés */}
                        {field.is_repeater && field.repeats_fields && field.repeats_fields.length > 0 && formData[field.id] && (
                            <div className="mt-4 space-y-4">
                                {Array.from({ length: parseInt(formData[field.id]) || 0 }, (_, repeatIndex) => {
                                    const fieldsToRepeat = (form.fields || []).filter(f => 
                                        field.repeats_fields.includes(f.id)
                                    );
                                    
                                    return (
                                        <div key={repeatIndex} className="p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-3">
                                            <h4 className="font-semibold text-green-800 text-sm">
                                                {field.label} #{repeatIndex + 1}
                                            </h4>
                                            
                                            {fieldsToRepeat.map(repeatedField => {
                                                const repeatedFieldKey = `${field.id}_repeat_${repeatIndex}_${repeatedField.id}`;
                                                const repeatedFieldValue = formData[repeatedFieldKey];
                                                
                                                return (
                                                    <div key={repeatedFieldKey}>
                                                        <Label htmlFor={`${form.id}-${repeatedFieldKey}`}>
                                                            {repeatedField.label}
                                                        </Label>
                                                        <Input
                                                            id={`${form.id}-${repeatedFieldKey}`}
                                                            type={repeatedField.type}
                                                            value={typeof repeatedFieldValue === 'object' ? '' : (repeatedFieldValue || '')}
                                                            onChange={(e) => handleInputChange(repeatedFieldKey, e.target.value)}
                                                            placeholder={repeatedField.placeholder || ''}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
            <Button onClick={handleSubmit} className="w-full">Soumettre</Button>
        </div>
    );
};

const ChatInterface = ({ prospectId, projectType, currentStepIndex, activeAdminUser, initialChannel }) => {
  const { addChatMessage, prompts, projectsData, forms, updateProspect, prospects, completeStepAndProceed, registerClientForm } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useUsers(); // 🔥 Cache global UsersContext
  // ✅ Utiliser le hook Supabase pour les messages chat avec real-time
  const { messages, loading: messagesLoading } = useSupabaseChatMessages(prospectId, projectType);
  // 🔥 Hook pour uploader les fichiers vers Supabase Storage
  // 🔥 MULTI-TENANT: Utilise organization_id de l'admin
  const { uploadFile, uploading } = useSupabaseProjectFiles({ 
    projectType, 
    prospectId,
    organizationId: activeAdminUser?.organization_id, // 🔥 MULTI-TENANT
    enabled: true 
  });
  // 🔥 Hook pour ajouter des événements dans l'historique du projet
  const { addProjectEvent } = useSupabaseProjectHistory({
    projectType: projectType || '',
    prospectId: prospectId,
    enabled: !!projectType && !!prospectId,
    activeAdminUser
  });
  // 🔥 Hook pour récupérer l'utilisateur courant
  const { user: currentUser } = useSupabaseUser();
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // 🔥 V2: State pour le panneau robot
  const [v2RobotPanelOpen, setV2RobotPanelOpen] = useState(false);
  
  // 🟠 Channel selector: admin peut répondre au client, partner ou interne
  // Si initialChannel='partner' ou 'internal' (depuis notif), on ouvre directement le bon onglet
  const [replyChannel, setReplyChannel] = useState(
    initialChannel === 'partner' ? 'partner' : initialChannel === 'internal' ? 'internal' : 'client'
  );

  // 🟠 Sélecteur de partenaire pour messages partner (isolation multi-partenaire)
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [partnerMissions, setPartnerMissions] = useState([]);
  const { organizationId } = useOrganization();
  const { partners: allPartners, loading: partnersLoading } = useSupabasePartners(
    organizationId || activeAdminUser?.organization_id
  );

  // � Charger les missions de ce prospect/projectType pour lister les partenaires concernés
  useEffect(() => {
    if (!prospectId || !projectType) return;
    const fetchPartnerMissions = async () => {
      try {
        const { data, error } = await supabase
          .from('missions')
          .select('id, partner_id, title, step_name, status, created_at')
          .eq('prospect_id', prospectId)
          .eq('project_type', projectType)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setPartnerMissions(data);
        }
      } catch (err) {
        logger.error('❌ Error loading partner missions for chat', err);
      }
    };
    fetchPartnerMissions();
  }, [prospectId, projectType]);

  // 🟠 Liste des partenaires — DÉPLACÉ après v2Templates pour pouvoir fusionner les 2 sources
  // (voir useMemo partnerOptions plus bas)

  // 🟠 Pré-sélectionner le partenaire — DÉPLACÉ aussi (voir useEffect plus bas)

  // 🔥 V2: Hook pour charger la config persistée
  const { templates: v2Templates, loading: v2TemplatesLoading } = useSupabaseWorkflowModuleTemplates(
    organizationId || activeAdminUser?.organization_id, 
    projectType
  );
  
  // 🔥 V2: Hook pour les formulaires et templates disponibles  
  const { forms: v2Forms, loading: v2FormsLoading } = useSupabaseForms(organizationId || activeAdminUser?.organization_id);
  const { templates: v2ContractTemplates, loading: v2ContractTemplatesLoading } = useSupabaseContractTemplates(organizationId || activeAdminUser?.organization_id);
  
  // 🔥 V2: Calculer le moduleId à partir de l'étape courante
  const currentStepData = projectsData[projectType]?.steps?.[currentStepIndex];
  const currentModuleId = useMemo(() => {
    if (!currentStepData?.name) return `step-${currentStepIndex}`;
    return currentStepData.name.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '');
  }, [currentStepData, currentStepIndex]);
  
  // 🔥 V2: Récupérer la config pour le module courant
  const currentModuleConfig = useMemo(() => {
    if (!v2Templates || !currentModuleId) return null;
    // v2Templates est indexé par projectType:moduleId (clé composite)
    const template = v2Templates[`${projectType}:${currentModuleId}`];
    return template?.configJson || null;
  }, [v2Templates, currentModuleId, projectType]);
  
  // 🔥 V2: Transformer les formulaires pour le panneau
  const v2AvailableForms = useMemo(() => {
    if (!v2Forms) return [];
    return Object.values(v2Forms).map(f => ({ 
      id: f.id, 
      name: f.name || f.title || 'Formulaire sans nom' 
    }));
  }, [v2Forms]);
  
  // 🔥 V2: Transformer les templates pour le panneau
  const v2AvailableTemplates = useMemo(() => {
    if (!v2ContractTemplates) return [];
    if (!Array.isArray(v2ContractTemplates)) {
      return Object.values(v2ContractTemplates).map(t => ({ id: t.id, name: t.name || 'Template sans nom' }));
    }
    return v2ContractTemplates.map(t => ({ id: t.id, name: t.name || 'Template sans nom' }));
  }, [v2ContractTemplates]);
  
  // 🔥 Trouver le prospect pour afficher son nom dans le chat
  const currentProspect = prospects.find(p => p.id === prospectId);

  // 🟠 Liste des partenaires : MISSIONS existantes + CONFIGURÉS dans Workflow V2
  const partnerOptions = useMemo(() => {
    if (!allPartners.length) return [];

    // Source 1: Partenaires ayant des missions sur ce prospect/projet
    const missionPartnerIds = [...new Set(partnerMissions.map(m => m.partner_id).filter(Boolean))];

    // Source 2: Partenaires configurés dans les templates V2 (même si mission pas encore créée)
    const v2PartnerIds = [];
    if (v2Templates) {
      Object.values(v2Templates).forEach(tpl => {
        const pid = tpl.configJson?.actionConfig?.partnerId;
        if (pid && tpl.configJson?.actionConfig?.targetAudience === 'PARTENAIRE') {
          v2PartnerIds.push(pid);
        }
      });
    }

    // Fusionner et dédupliquer
    const allPartnerIds = [...new Set([...missionPartnerIds, ...v2PartnerIds])];
    if (allPartnerIds.length === 0) return [];

    const currentStepName = projectsData[projectType]?.steps?.[currentStepIndex]?.name;

    return allPartnerIds.map(pid => {
      const partner = allPartners.find(p => p.id === pid);
      const missions = partnerMissions.filter(m => m.partner_id === pid);
      const hasMissions = missions.length > 0;
      const isV2Only = !hasMissions && v2PartnerIds.includes(pid);
      // Trouver si une mission est sur l'étape en cours (step actif)
      const hasActiveStep = missions.some(m =>
        m.step_name === currentStepName && (m.status === 'pending' || m.status === 'in_progress')
      );
      // Trouver si configuré V2 sur l'étape en cours
      const isV2CurrentStep = v2Templates && Object.values(v2Templates).some(tpl => 
        tpl.configJson?.actionConfig?.partnerId === pid &&
        tpl.configJson?.actionConfig?.targetAudience === 'PARTENAIRE' &&
        tpl.moduleId === (currentStepName || '').toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '')
      );
      return {
        id: pid,
        name: partner?.companyName || partner?.name || partner?.email || 'Partenaire inconnu',
        specialty: partner?.specialty || null,
        missionsCount: missions.length,
        hasActiveStep,
        isV2Only,
        isV2CurrentStep,
        lastMission: missions[0] || null,
      };
    }).sort((a, b) => {
      // Priorité : 1) mission étape active  2) config V2 étape courante  3) missions existantes  4) V2 seulement
      if (a.hasActiveStep && !b.hasActiveStep) return -1;
      if (!a.hasActiveStep && b.hasActiveStep) return 1;
      if (a.isV2CurrentStep && !b.isV2CurrentStep) return -1;
      if (!a.isV2CurrentStep && b.isV2CurrentStep) return 1;
      if (a.missionsCount > 0 && b.missionsCount === 0) return -1;
      if (a.missionsCount === 0 && b.missionsCount > 0) return 1;
      return 0;
    });
  }, [partnerMissions, allPartners, projectsData, projectType, currentStepIndex, v2Templates]);

  // 🟠 Pré-sélectionner le partenaire ayant une mission sur l'étape active (ou config V2)
  useEffect(() => {
    if (!selectedPartnerId && partnerOptions.length > 0) {
      const activePartner = partnerOptions.find(p => p.hasActiveStep || p.isV2CurrentStep);
      setSelectedPartnerId(activePartner ? activePartner.id : partnerOptions[0].id);
    }
  }, [partnerOptions, selectedPartnerId]);

  const availablePrompts = useMemo(() => {
    return Object.values(prompts).filter(prompt => {
      if (prompt.projectId !== projectType) return false;
      const stepConfig = prompt.stepsConfig?.[currentStepIndex];
      return stepConfig && stepConfig.actions && stepConfig.actions.length > 0;
    });
  }, [prompts, projectType, currentStepIndex]);
  
  // 🔥 Fonction pour envoyer la prochaine action du workflow (mémoïsée pour éviter re-renders)
  const sendNextAction = useCallback(async (completedActionId = null) => {
    logger.debug('🚀 Tentative envoi action suivante', { completedActionId });
    
    // ═══════════════════════════════════════════════════════════════════
    // TENTATIVE 1: Chaînage via prompt V1 (comportement existant)
    // ═══════════════════════════════════════════════════════════════════
    const currentPrompt = availablePrompts[0];
    if (currentPrompt) {
      const stepConfig = currentPrompt.stepsConfig?.[currentStepIndex];
      if (stepConfig?.actions?.length > 0) {
        const sortedActions = [...stepConfig.actions].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        if (completedActionId) {
          const completedIndex = sortedActions.findIndex(a => a.id === completedActionId);
          if (completedIndex !== -1 && completedIndex + 1 < sortedActions.length) {
            const nextAction = sortedActions[completedIndex + 1];
            logger.info('🎯 [V1] Action suivante trouvée', { completedActionId, nextActionId: nextAction.id });
            await handleSelectPrompt(currentPrompt, nextAction.id);
            return;
          } else {
            logger.info('🏁 [V1] Dernière action complétée', { completedActionId });
            return;
          }
        }
        
        await handleSelectPrompt(currentPrompt);
        return;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TENTATIVE 2: Chaînage via template V2 (MESSAGE, etc.)
    // ═══════════════════════════════════════════════════════════════════
    if (completedActionId && currentModuleConfig?.actions?.length >= 1) {
      const v2Actions = currentModuleConfig.actions;
      const completedIndex = v2Actions.findIndex((_, idx) => 
        `v2-${currentModuleId}-action-${idx}` === completedActionId
      );
      
      if (completedIndex !== -1 && completedIndex + 1 < v2Actions.length) {
        const nextIdx = completedIndex + 1;
        const nextAction = v2Actions[nextIdx];
        const nextActionConfig = nextAction.config || nextAction.actionConfig || {};
        
        logger.info('🎯 [V2] Action suivante trouvée via template', { 
          completedActionId, 
          nextIndex: nextIdx,
          nextActionType: nextActionConfig.actionType,
        });
        
        // 🔥 FIX: Mettre à jour les subSteps AVANT d'exécuter l'action suivante
        // Marquer la sous-étape complétée et activer la suivante
        try {
          const { data: stepsRow } = await supabase
            .from('project_steps_status')
            .select('steps')
            .eq('prospect_id', prospectId)
            .eq('project_type', projectType)
            .single();
          
          const fetchedSteps = stepsRow?.steps;
          if (fetchedSteps) {
            const stepIdx = fetchedSteps.findIndex(s => s.status === 'in_progress');
            if (stepIdx !== -1) {
              const updatedSteps = JSON.parse(JSON.stringify(fetchedSteps));
              
              // 🔥 FIX: Si les subSteps n'existent pas encore en Supabase, les créer 
              // à partir du template V2 (même logique que deriveSubStepsFromTemplate)
              if (!updatedSteps[stepIdx].subSteps || updatedSteps[stepIdx].subSteps.length === 0) {
                updatedSteps[stepIdx].subSteps = v2Actions.map((action, idx) => {
                  const actionCfg = action.config || action.actionConfig || {};
                  return {
                    id: `v2-${currentModuleId}-action-${idx}`,
                    name: actionCfg.objective?.trim() || action.title || action.label || `Action ${idx + 1}`,
                    status: idx === 0 ? STATUS_CURRENT : STATUS_PENDING,
                  };
                });
                logger.info('✅ [V2] SubSteps créées depuis template', {
                  count: updatedSteps[stepIdx].subSteps.length,
                });
              }
              
              const subSteps = updatedSteps[stepIdx].subSteps;
              
              // Trouver la sous-étape par action_id
              let subIdx = subSteps.findIndex(sub => sub.id === completedActionId);
              // Fallback: première in_progress
              if (subIdx === -1) {
                subIdx = subSteps.findIndex(sub => sub.status === STATUS_CURRENT);
              }
              
              if (subIdx !== -1) {
                subSteps[subIdx].status = STATUS_COMPLETED;
                // Activer la sous-étape suivante (qui correspond à nextIdx)
                if (nextIdx < subSteps.length && subSteps[nextIdx].status === STATUS_PENDING) {
                  subSteps[nextIdx].status = STATUS_CURRENT;
                }
                
                await supabase
                  .from('project_steps_status')
                  .update({ steps: updatedSteps })
                  .eq('prospect_id', prospectId)
                  .eq('project_type', projectType);
                
                logger.info('✅ [V2] SubSteps mis à jour', {
                  completedSubStep: subIdx,
                  activatedSubStep: nextIdx,
                });
              }
            }
          }
        } catch (subStepErr) {
          logger.error('⚠️ [V2] Erreur mise à jour subSteps (non bloquant)', { error: subStepErr.message });
        }
        
        // Importer dynamiquement les fonctions V2
        const { buildActionOrder } = await import('@/lib/actionOrderV2');
        const { executeActionOrder } = await import('@/lib/executeActionOrderV2');
        
        // Normaliser targetAudience
        const firstTarget = Array.isArray(nextActionConfig.targetAudience)
          ? nextActionConfig.targetAudience[0]
          : nextActionConfig.targetAudience;
        
        const order = buildActionOrder({
          moduleId: currentModuleId,
          moduleName: currentStepData?.name || currentModuleId,
          projectType,
          prospectId,
          actionIndex: nextIdx,
          actionConfig: {
            ...nextActionConfig,
            targetAudience: firstTarget || 'CLIENT',
            ...(nextActionConfig.actionType === 'MESSAGE' && {
              buttonLabels: currentModuleConfig.buttonLabels || {
                proceedLabel: 'Valider ✓',
                needDataLabel: "Besoin d'infos",
              },
            }),
          },
          message: '',
        });
        
        // Exécuter l'action suivante (non-simulation)
        const orderForExecution = {
          ...order,
          _meta: { ...order._meta, isSimulation: false },
        };
        
        const context = { organizationId: organizationId || activeAdminUser?.organization_id };
        const result = await executeActionOrder(orderForExecution, context);
        
        logger.info('🚀 [V2] Action suivante exécutée', { 
          success: result.success, 
          message: result.message,
        });
        return;
      } else {
        // 🔥 Dernière action complétée → compléter l'étape et passer à la suivante
        logger.info('🏁 [V2] Dernière action complétée → complétion étape', { 
          completedActionId,
          currentStepIndex,
          projectType,
        });
        
        try {
          // Récupérer les steps actuels depuis Supabase
          const { data: stepsData } = await supabase
            .from('project_steps_status')
            .select('steps')
            .eq('prospect_id', prospectId)
            .eq('project_type', projectType)
            .single();
          
          const currentSteps = stepsData?.steps;
          if (!currentSteps || currentSteps.length === 0) {
            logger.error('❌ [V2] Impossible de récupérer les steps pour complétion');
            return;
          }
          
          // 🔥 FIX: Marquer la dernière sous-étape comme complétée AVANT completeStepAndProceed
          const stepIdx = currentSteps.findIndex(s => s.status === 'in_progress');
          if (stepIdx !== -1) {
            const updatedSteps = JSON.parse(JSON.stringify(currentSteps));
            
            // 🔥 FIX: Créer les subSteps si absentes de Supabase
            if (!updatedSteps[stepIdx].subSteps || updatedSteps[stepIdx].subSteps.length === 0) {
              const v2Actions = currentModuleConfig.actions;
              updatedSteps[stepIdx].subSteps = v2Actions.map((action, idx) => {
                const actionCfg = action.config || action.actionConfig || {};
                return {
                  id: `v2-${currentModuleId}-action-${idx}`,
                  name: actionCfg.objective?.trim() || action.title || action.label || `Action ${idx + 1}`,
                  status: STATUS_PENDING,
                };
              });
            }
            
            const subSteps = updatedSteps[stepIdx].subSteps;
            
            // Marquer TOUTES les sous-étapes comme complétées (c'est la dernière action)
            subSteps.forEach(sub => { sub.status = STATUS_COMPLETED; });
            logger.info('✅ [V2] Toutes subSteps marquées completed', { count: subSteps.length });
            
            // Passer les steps mis à jour à completeStepAndProceed
            await completeStepAndProceed(prospectId, projectType, currentStepIndex, updatedSteps);
          } else {
            await completeStepAndProceed(prospectId, projectType, currentStepIndex, currentSteps);
          }
          logger.info('✅ [V2] Étape complétée avec succès');
        } catch (err) {
          logger.error('❌ [V2] Erreur complétion étape', { error: err.message });
        }
        return;
      }
    }
    
    logger.warn('Aucun prompt V1 ni actions V2 disponibles pour chaînage');
  }, [availablePrompts, currentStepIndex, currentModuleConfig, currentModuleId, currentStepData, projectType, prospectId, organizationId, activeAdminUser, completeStepAndProceed]);
  
  // 🔥 V2: Déterminer si des actions V2 existent pour le module courant
  const hasV2Actions = !!(currentModuleConfig?.actions?.length > 0);
  
  // 🔥 Hook pour déclencher automatiquement l'action suivante quand la précédente est complétée
  useWorkflowActionTrigger({
    prospectId,
    projectType,
    currentStepIndex,
    prompt: availablePrompts[0],
    hasV2Actions,
    sendNextAction,
  });
  
  useEffect(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [messages, replyChannel]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;

    try {
      let fileData = null;

      // 🔥 Si un fichier est attaché, l'uploader d'abord vers Supabase Storage
      if (attachedFile) {
        // Vérifier la taille (max 10 MB)
        const maxSize = 10 * 1024 * 1024; // 10 MB
        if (attachedFile.size > maxSize) {
          toast({
            title: '❌ Fichier trop volumineux',
            description: 'La taille maximale est de 10 MB.',
            variant: 'destructive',
          });
          return;
        }

        logger.debug('📤 Uploading file from admin chat', {
          name: attachedFile.name,
          size: attachedFile.size,
          type: attachedFile.type,
        });

        const { data: { user } } = await supabase.auth.getUser();
        const uploadedFile = await uploadFile({
          file: attachedFile,
          uploadedBy: user?.id,
        });

        if (uploadedFile) {
          fileData = {
            id: uploadedFile.id,
            name: uploadedFile.file_name,
            size: uploadedFile.file_size,
            type: uploadedFile.file_type,
            storagePath: uploadedFile.storage_path,
          };

          logger.debug('✅ File uploaded successfully', fileData);
        }
      }

      const message = {
        sender: 'pro',
        text: newMessage,
        file: fileData,
        channel: replyChannel,
        ...(replyChannel === 'internal' && {
          metadata: {
            sender_id: activeAdminUser?.user_id || null,
            sender_name: activeAdminUser?.name || 'Admin',
            target_user_id: targetUserId || null,
          }
        }),
        // 🟠 Multi-partenaire: inclure le partner_id quand on envoie sur le canal partenaire
        ...(replyChannel === 'partner' && selectedPartnerId && {
          partnerId: selectedPartnerId,
        }),
      };

      addChatMessage(prospectId, projectType, message);
      setNewMessage('');
      setAttachedFile(null);
      
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });

      if (fileData) {
        toast({
          title: '✅ Fichier envoyé',
          description: `${fileData.name} a été envoyé avec succès.`,
        });
      }
    } catch (error) {
      logger.error('❌ Error sending message with file', error);
      toast({
        title: '❌ Erreur',
        description: `Impossible d'envoyer le fichier : ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleFileClick = async (file) => {
    if (!file || !file.storagePath) {
      toast({
        title: "❌ Erreur",
        description: "Le fichier n'est pas disponible.",
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.debug('📥 Downloading file', { storagePath: file.storagePath });

      // Récupérer l'URL publique signée (valide 1 heure)
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storagePath, 3600); // 1 heure

      if (error) throw error;

      // Ouvrir le fichier dans un nouvel onglet
      window.open(data.signedUrl, '_blank');

      toast({
        title: '✅ Téléchargement',
        description: `${file.name} s'ouvre dans un nouvel onglet.`,
      });
    } catch (error) {
      logger.error('❌ Error downloading file', error);
      toast({
        title: '❌ Erreur',
        description: `Impossible de télécharger le fichier : ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleFormSubmit = (pId, formId, formData) => {
    const prospect = prospects.find(p => p.id === pId);
    if (!prospect) return;

    const updatedFormData = { ...(prospect.formData || {}), ...formData };
    updateProspect({ ...prospect, formData: updatedFormData });
    
    const message = {
        sender: 'client',
        text: `A complété le formulaire : ${forms[formId]?.name || 'Formulaire'}.`,
    };
    addChatMessage(pId, projectType, message);

    const usedPrompt = Object.values(prompts).find(pr => {
        if (pr.projectId !== projectType) return false;
        const stepConfig = pr.stepsConfig?.[currentStepIndex];
        if (stepConfig?.autoCompleteStep) {
            return stepConfig.actions?.some(action => action.type === 'show_form' && action.formId === formId);
        }
        return false;
    });
    
    if (usedPrompt) {
        // 🔥 MULTI-ACTIONS V2: Ne pas auto-compléter s'il reste des actions
        const v2ConfigActions = currentModuleConfig?.actions;
        if (v2ConfigActions && v2ConfigActions.length > 1) {
            logger.info('[V2] Multi-actions detected in handleFormSubmit, skipping auto-complete');
            toast({
                title: "✅ Formulaire reçu",
                description: "Il reste d'autres actions à compléter pour cette étape.",
                className: "bg-blue-500 text-white"
            });
            return;
        }
        
        completeStepAndProceed(prospectId, projectType, currentStepIndex);
        toast({
            title: "Étape terminée !",
            description: "L'étape a été automatiquement marquée comme terminée.",
            className: "bg-green-500 text-white"
        });
    }
  };

  const handleSelectPrompt = async (prompt, specificActionId = null) => {
    const stepConfig = prompt.stepsConfig?.[currentStepIndex];
    if (stepConfig && stepConfig.actions && stepConfig.actions.length > 0) {
      // ✅ Utiliser messages du hook Supabase
      const existingMessages = messages;
      
      // 🔥 Trier les actions par ordre
      const sortedActions = [...stepConfig.actions].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // 🔥 Déterminer quelle(s) action(s) exécuter
      let actionsToExecute = sortedActions;
      let skipAlreadySentCheck = false;
      
      if (specificActionId) {
        // Mode spécifique: exécuter UNE action précise (même si déjà envoyée)
        const specificAction = sortedActions.find(a => a.id === specificActionId);
        if (!specificAction) {
          logger.warn('Action spécifique introuvable', { specificActionId });
          return;
        }
        
        logger.info('🎯 Exécution action spécifique (forcée)', {
          actionId: specificActionId,
          actionType: specificAction.type
        });
        
        actionsToExecute = [specificAction];
        skipAlreadySentCheck = true; // Ne pas vérifier si déjà envoyée
      }
      
      // 🔥 Exécuter les actions
      for (const action of actionsToExecute) {
        // Vérifier si cette action a déjà été envoyée (sauf si mode spécifique)
        if (!skipAlreadySentCheck) {
          const actionAlreadySent = existingMessages.some(msg =>
            msg.promptId === prompt.id &&
            msg.stepIndex === currentStepIndex &&
            (
              (msg.text === action.message) ||
              (msg.formId === action.formId && action.type === 'show_form')
            )
          );
          
          if (actionAlreadySent) {
            // Cette action est déjà envoyée, passer à la suivante
            continue;
          }
        }
        
        // 🔥 Exécuter l'action
        // Envoyer le message si présent
        if (action.message) {
          const message = {
            sender: 'pro',
            text: action.message,
            promptId: prompt.id,
            stepIndex: currentStepIndex,
            actionId: action.id, // 🔥 Ajouter l'ID de l'action
          };
          addChatMessage(prospectId, projectType, message);
        }
        
        // Envoyer le formulaire si c'est une action show_form
        if (action.type === 'show_form' && action.formId) {
          const formMessage = {
            sender: 'pro',
            formId: action.formId,
            promptId: prompt.id,
            stepIndex: currentStepIndex,
            actionId: action.id, // 🔥 Ajouter l'ID de l'action
          };
          addChatMessage(prospectId, projectType, formMessage);
          
          // 🔥 Enregistrer le formulaire dans clientFormPanels pour le panneau latéral
          const stepName = projectsData[projectType]?.steps?.[currentStepIndex]?.name || 'Étape inconnue';
          try {
            const result = await registerClientForm({
              prospectId: prospectId,
              projectType: projectType,
              formId: action.formId,
              currentStepIndex: currentStepIndex,
              promptId: prompt.id,
              messageTimestamp: Date.now(),
              status: 'pending',
              stepName: stepName,
              actionId: action.id, // 🔥 Ajouter l'ID de l'action
            });

            if (!result.success) {
              logger.error('❌ Échec enregistrement formulaire:', result.error);
              toast({
                title: "Erreur",
                description: "Le formulaire n'a pas pu être enregistré.",
                variant: "destructive",
              });
            } else {
              // ✅ Ajouter événement dans project_history
              try {
                const formName = forms[action.formId]?.name || action.formId;
                await addProjectEvent({
                  prospectId: prospectId,
                  projectType: projectType,
                  title: "Formulaire envoyé",
                  description: `Le formulaire ${formName} a été envoyé à ${currentProspect?.name || 'le client'}.`,
                  createdBy: currentUser?.user_id || null,
                  createdByName: currentUser?.name || "Admin"
                });
              } catch (historyErr) {
                // Ne pas bloquer si l'événement échoue
                logger.error('⚠️ Erreur ajout événement historique:', historyErr);
              }
            }
          } catch (err) {
            logger.error('❌ Exception enregistrement formulaire:', err);
            toast({
              title: "Erreur",
              description: "Le formulaire n'a pas pu être enregistré.",
              variant: "destructive",
            });
          }
        }
        
        // 🔥 Gérer l'action start_signature (génération de contrat)
        if (action.type === 'start_signature' && action.templateId) {
          try {
            // 🔥 VALIDATION: activeAdminUser.organization_id requis
            if (!activeAdminUser?.organization_id) {
              throw new Error('activeAdminUser.organization_id manquant - Impossible de générer le contrat');
            }

            logger.info('🔥 Génération contrat via workflow séquentiel', {
              templateId: action.templateId,
              prospectId,
              projectType,
              organizationId: activeAdminUser.organization_id,
              formId: action.formId
            });

            // 🔥 Extraction directe des données du formulaire (contract-driven)
            const { data: prospectData, error: prospectError } = await supabase
              .from('prospects')
              .select('form_data')
              .eq('id', prospectId)
              .single();

            const specificFormData = prospectData?.form_data?.[projectType]?.[action.formId] || {};

            logger.info('📋 Données formulaire extraites', { 
              formId: action.formId,
              dataKeys: Object.keys(specificFormData)
            });

            toast({
              title: "📄 Génération du contrat...",
              description: "Création du PDF en cours",
              className: "bg-blue-500 text-white",
            });

            // Appeler la fonction de génération de contrat
            const result = await executeContractSignatureAction({
              templateId: action.templateId,
              projectType: projectType,
              prospectId: prospectId,
              formData: specificFormData, // 🔥 Injection directe sans transformation
              organizationId: activeAdminUser?.organization_id,
            });

            if (result.success) {
              const fileId = result.fileData.id;
              
              // 🔥 CRÉER LA PROCÉDURE DE SIGNATURE
              logger.debug('Création procédure de signature...', { fileId, prospectId, projectType });

              // Vérifier si une procédure existe déjà
              const { data: existingProcedure } = await supabase
                .from('signature_procedures')
                .select('*')
                .eq('file_id', fileId)
                .eq('prospect_id', prospectId)
                .eq('status', 'pending')
                .maybeSingle();

              let signatureProcedure = existingProcedure;

              if (!signatureProcedure) {
                // Créer nouvelle procédure
                const accessToken = crypto.randomUUID();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);

                // Construire le tableau signers
                const signers = [
                  {
                    role: 'principal',
                    name: currentProspect?.name || 'Client',
                    email: currentProspect?.email,
                    phone: currentProspect?.phone || null,
                    access_token: accessToken,
                    requires_auth: true,
                    status: 'pending',
                    signed_at: null,
                  },
                ];

                // 🔥 VALIDATION: organization_id requis par RLS
                if (!activeAdminUser?.organization_id) {
                  throw new Error('Organization ID manquant - Impossible de créer la procédure de signature');
                }

                // ✅ CALCULER signer_name et signer_email AVANT l'INSERT
                const signer_name =
                  typeof currentProspect?.name === 'string' && currentProspect.name.trim() !== ''
                    ? currentProspect.name
                    : currentProspect?.email?.split('@')[0] || 'Client';

                const signer_email = currentProspect?.email;

                const { data: newProcedure, error: procedureError } = await supabase
                  .from('signature_procedures')
                  .insert({
                    prospect_id: prospectId,
                    project_type: projectType,
                    file_id: fileId,
                    access_token: accessToken,
                    access_token_expires_at: expiresAt.toISOString(),
                    status: 'pending',
                    signers: signers,
                    organization_id: activeAdminUser.organization_id, // ✅ Depuis activeAdminUser
                    signer_name: signer_name, // ✅ Ajouté
                    signer_email: signer_email, // ✅ Ajouté
                  })
                  .select()
                  .single();

                if (procedureError) {
                  logger.error('Erreur création signature_procedures', procedureError);
                  throw procedureError;
                }

                signatureProcedure = newProcedure;
                logger.debug('Procédure de signature créée', { procedureId: signatureProcedure.id, signersCount: signers.length });
              }

              // 🔥 ENVOYER LE LIEN DANS LE CHAT (pour le client principal)
              const signatureUrl = `https://evatime.fr/signature/${signatureProcedure.id}?token=${signatureProcedure.access_token}`;
              
              // Vérifier si le message existe déjà
              const { data: existingMessage } = await supabase
                .from('chat_messages')
                .select('id')
                .eq('prospect_id', prospectId)
                .eq('project_type', projectType)
                .eq('sender', 'pro')
                .ilike('text', `%/signature/${signatureProcedure.id}%`)
                .maybeSingle();

              if (!existingMessage) {
                await supabase
                  .from('chat_messages')
                  .insert({
                    prospect_id: prospectId,
                    project_type: projectType,
                    sender: 'pro',
                    text: `<a href="${signatureUrl}" target="_blank" style="color: #10b981; font-weight: 600; text-decoration: underline;">👉 Signer mon contrat</a>`,
                    organization_id: activeAdminUser?.organization_id, // ✅ Depuis activeAdminUser
                    channel: 'client',
                  });
                
                logger.debug('Lien de signature envoyé dans le chat');
              }

              toast({
                title: "✅ Contrat généré !",
                description: "Le contrat a été créé et le lien de signature envoyé.",
                className: "bg-green-500 text-white",
              });

              // ✅ Ajouter événement dans project_history
              try {
                await addProjectEvent({
                  prospectId: prospectId,
                  projectType: projectType,
                  title: "Contrat généré",
                  description: `Le contrat a été généré et envoyé à ${currentProspect?.name || 'le client'}.`,
                  createdBy: currentUser?.user_id || null,
                  createdByName: currentUser?.name || "Admin"
                });
              } catch (historyErr) {
                logger.error('⚠️ Erreur ajout événement historique:', historyErr);
              }
            } else {
              throw new Error(result.error || 'Erreur inconnue');
            }
          } catch (err) {
            logger.error('❌ Exception génération contrat:', err);
            toast({
              title: "Erreur",
              description: `Impossible de générer le contrat: ${err.message}`,
              variant: "destructive",
            });
          }
        }
        
        // 🔥 Arrêter après avoir envoyé la première action non envoyée
        break;
      }
    }
    setPopoverOpen(false);
  };


  // Compteurs par channel
  const clientMessages = messages.filter(m => !m.channel || m.channel === 'client');
  const partnerMessages = messages.filter(m => m.channel === 'partner');
  // 🟠 Filtrer les messages partenaire par le partenaire sélectionné (isolation multi-partenaire)
  const filteredPartnerMessages = selectedPartnerId
    ? partnerMessages.filter(m => m.partnerId === selectedPartnerId)
    : partnerMessages;
  const internalMessages = messages.filter(m => m.channel === 'internal');
  const filteredMessages = replyChannel === 'partner' ? filteredPartnerMessages 
    : replyChannel === 'internal' ? internalMessages 
    : clientMessages;

  // 👥 Sélecteur de collègue pour messages internes
  // Ordre : 1) Owner du prospect  2) Manager du owner  3) Reste groupé par rôle
  const [targetUserId, setTargetUserId] = useState(null);
  const colleagueOptions = useMemo(() => {
    const allColleagues = (supabaseUsers || [])
      .filter(u => u.user_id !== activeAdminUser?.user_id) // Exclure soi-même
      .filter(u => u.role !== 'Partner'); // Exclure les partenaires (pas des collègues admin)

    const ownerId = currentProspect?.ownerId;
    const ownerUser = allColleagues.find(u => u.user_id === ownerId);
    const managerOfOwner = ownerUser?.manager_id 
      ? allColleagues.find(u => u.id === ownerUser.manager_id)  // manager_id référence users.id (PK)
      : null;

    // IDs déjà placés en priorité (owner + son manager)
    const priorityIds = new Set();
    if (ownerUser) priorityIds.add(ownerUser.user_id);
    if (managerOfOwner) priorityIds.add(managerOfOwner.user_id);

    // Reste groupé par rôle
    const roleOrder = { 'Global Admin': 0, 'Admin': 1, 'Manager': 2, 'Commercial': 3 };
    const rest = allColleagues
      .filter(u => !priorityIds.has(u.user_id))
      .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));

    // Construire la liste structurée
    const result = [];
    if (ownerUser) result.push({ ...ownerUser, tag: '👑 Owner' });
    if (managerOfOwner) result.push({ ...managerOfOwner, tag: '👤 Manager' });

    // Grouper le reste par rôle
    let currentRole = null;
    rest.forEach(u => {
      if (u.role !== currentRole) {
        currentRole = u.role;
        result.push({ isSeparator: true, role: currentRole });
      }
      result.push(u);
    });

    return result;
  }, [supabaseUsers, activeAdminUser, currentProspect?.ownerId]);

  // Initialiser le target sur l'owner du prospect (si différent de soi)
  useEffect(() => {
    if (!targetUserId && currentProspect?.ownerId) {
      const ownerIsMe = currentProspect.ownerId === activeAdminUser?.user_id;
      const firstSelectable = colleagueOptions.find(o => !o.isSeparator);
      if (ownerIsMe && firstSelectable) {
        setTargetUserId(firstSelectable.user_id);
      } else if (!ownerIsMe) {
        setTargetUserId(currentProspect.ownerId);
      }
    }
  }, [currentProspect?.ownerId, activeAdminUser?.user_id, colleagueOptions]);

  return (
    <div className="mt-6">
      {/* 🔥 Onglets Client / Partenaire / Interne — bien visibles en haut */}
      <div className="flex mb-3 rounded-xl overflow-hidden border-2 border-gray-200">
        <button
          onClick={() => setReplyChannel('client')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
            replyChannel === 'client'
              ? 'bg-blue-500 text-white shadow-inner'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          💬 Client
          {clientMessages.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              replyChannel === 'client' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
            }`}>{clientMessages.length}</span>
          )}
        </button>
        <button
          onClick={() => setReplyChannel('partner')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
            replyChannel === 'partner'
              ? 'bg-orange-500 text-white shadow-inner'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          🟠 Partenaire
          {filteredPartnerMessages.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              replyChannel === 'partner' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
            }`}>{filteredPartnerMessages.length}</span>
          )}
        </button>
        <button
          onClick={() => setReplyChannel('internal')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all ${
            replyChannel === 'internal'
              ? 'bg-purple-500 text-white shadow-inner'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          👥 Interne
          {internalMessages.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              replyChannel === 'internal' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
            }`}>{internalMessages.length}</span>
          )}
        </button>
      </div>

      {/* 👥 Sélecteur de collègue (visible uniquement en mode Interne) */}
      {replyChannel === 'internal' && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-sm text-purple-600 font-bold whitespace-nowrap">→ À :</span>
          <select
            value={targetUserId || ''}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="flex-1 text-sm border-2 border-purple-300 rounded-xl px-3 py-2.5 bg-purple-50 text-purple-900 font-semibold focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none appearance-none cursor-pointer shadow-sm"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237c3aed' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            {colleagueOptions.filter(o => !o.isSeparator).length === 0 && (
              <option value="">Aucun collègue disponible</option>
            )}
            {colleagueOptions.map((item, idx) => 
              item.isSeparator ? (
                <optgroup key={`sep-${idx}`} label={`── ${item.role} ──`} />
              ) : (
                <option key={item.user_id} value={item.user_id}>
                  {item.tag ? `${item.tag}  ·  ${item.name || item.email}` : (item.name || item.email)}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {/* 🟠 Sélecteur de partenaire (visible uniquement en mode Partenaire) */}
      {replyChannel === 'partner' && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-sm text-orange-600 font-bold whitespace-nowrap">🟠 À :</span>
          <select
            value={selectedPartnerId || ''}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            className="flex-1 text-sm border-2 border-orange-300 rounded-xl px-3 py-2.5 bg-orange-50 text-orange-900 font-semibold focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none appearance-none cursor-pointer shadow-sm"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ea580c' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            {partnerOptions.length === 0 && (
              <option value="">Aucun partenaire sur ce projet</option>
            )}
            {partnerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.hasActiveStep ? '⚡ ' : p.isV2CurrentStep ? '🔜 ' : ''}{p.name}{p.specialty ? ` · ${p.specialty}` : ''}{p.missionsCount > 0 ? ` (${p.missionsCount} mission${p.missionsCount > 1 ? 's' : ''})` : ' (configuré V2)'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-4 h-96 overflow-y-auto pr-2 mb-4 rounded-lg bg-gray-50 p-4 border">
        {filteredMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {replyChannel === 'partner' ? '🟠 Aucun message partenaire' 
              : replyChannel === 'internal' ? '👥 Aucun message interne'
              : '💬 Aucun message client'}
          </div>
        )}
        {filteredMessages.map((msg, index) => {
          const isAdmin = msg.sender === 'pro' || msg.sender === 'admin';
          const isPartner = msg.sender === 'partner';
          const isClient = msg.sender === 'client';
          const isInternal = msg.channel === 'internal';
          // Pour les messages internes: déterminer si c'est moi ou un collègue
          const isMyInternalMsg = isInternal && msg.metadata?.sender_id === activeAdminUser?.user_id;
          const isColleagueMsg = isInternal && !isMyInternalMsg;
          // Position: mes messages à droite, messages des autres à gauche
          const alignRight = isInternal ? isMyInternalMsg : isAdmin;
          return (
          <div key={index} className={`flex items-end gap-2 ${alignRight ? 'justify-end' : 'justify-start'}`}>
            {isClient && <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">{currentProspect?.name.charAt(0) || '?'}</div>}
            {isPartner && (() => {
              const partnerInfo = partnerOptions.find(p => p.id === msg.partnerId);
              const initial = partnerInfo ? partnerInfo.name.charAt(0).toUpperCase() : 'P';
              return <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center font-bold text-white text-xs" title={partnerInfo?.name || 'Partenaire'}>{initial}</div>;
            })()}
            {isColleagueMsg && <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center font-bold text-white text-xs">{(msg.metadata?.sender_name || '?').charAt(0).toUpperCase()}</div>}
            <div className={`max-w-xs lg:max-w-md rounded-2xl ${
              isInternal 
                ? (isMyInternalMsg 
                    ? 'bg-purple-500 text-white rounded-br-none p-2.5' 
                    : 'bg-purple-100 text-purple-900 rounded-bl-none p-3 border border-purple-200')
                : isAdmin ? 'bg-blue-500 text-white rounded-br-none p-2.5' 
                : isPartner ? 'bg-orange-100 text-orange-900 rounded-bl-none p-3 border border-orange-200' 
                : 'bg-gray-200 text-gray-800 rounded-bl-none p-3'
            }`}>
              {isInternal && msg.metadata?.sender_name && (
                <span className={`inline-block text-xs font-bold mb-1 ${isMyInternalMsg ? 'text-purple-200' : 'text-purple-600'}`}>
                  👥 {msg.metadata.sender_name}
                </span>
              )}
              {isPartner && (
                <span className="inline-block text-xs font-bold text-orange-600 mb-1">
                  🟠 {partnerOptions.find(p => p.id === msg.partnerId)?.name || 'Partenaire'}
                </span>
              )}
              {msg.channel === 'partner' && isAdmin && (
                <span className="inline-block text-xs font-bold text-orange-300 mb-1">→ Partenaire</span>
              )}
              {msg.text && (
                isAdmin && msg.text.includes('<a ') ? (
                  <p className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.text }} />
                ) : (
                  <p className="text-xs leading-relaxed">{msg.text}</p>
                )
              )}
              {msg.file && (
                <button 
                  onClick={() => handleFileClick(msg.file)} 
                  className="mt-2 flex items-center gap-2 text-xs bg-white/20 hover:bg-white/30 p-2 rounded-lg w-full text-left transition-colors"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{msg.file.name}</span>
                  <Download className="w-3 h-3 ml-auto flex-shrink-0" />
                </button>
              )}
              {msg.formId && forms[msg.formId] && (
                  <div className="mt-2 bg-white text-gray-800 p-3 rounded-lg">
                      <ChatForm 
                          form={forms[msg.formId]} 
                          prospectId={prospectId} 
                          onFormSubmit={handleFormSubmit} 
                      />
                  </div>
              )}
              <p className={`text-xs mt-1 ${isInternal ? (isMyInternalMsg ? 'text-purple-200' : 'text-purple-400') : isAdmin ? 'text-blue-200' : isPartner ? 'text-orange-400' : 'text-gray-500'}`}>
                {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: fr })}
              </p>
            </div>
            {isMyInternalMsg && <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-xs">{(activeAdminUser?.name || '?').charAt(0).toUpperCase()}</div>}
            {isAdmin && !isInternal && !msg.formId && <img src="https://horizons-cdn.hostinger.com/43725989-d002-4543-b65c-278701925e7e/4e3f809791e357819f31c585852d3a99.png" alt="Charly" className="w-8 h-8 rounded-full" />}
          </div>
        );})}
        <div ref={chatEndRef} />
      </div>
      {attachedFile && (
        <div className="mb-2 text-sm text-gray-600 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          <span>{attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} className="text-red-500">&times;</button>
        </div>
      )}
      <div className="relative">
        <Input
          placeholder={replyChannel === 'internal' ? '👥 Écrire en interne...' : replyChannel === 'partner' ? '🟠 Écrire au partenaire...' : '💬 Écrire au client...'}
          className={`pr-28 h-12 ${replyChannel === 'internal' ? 'border-purple-300 focus:ring-purple-400' : replyChannel === 'partner' ? 'border-orange-300 focus:ring-orange-400' : ''}`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          {/* 🔥 V2: Bouton robot ouvre le panneau V2 au lieu du Popover V1 */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setV2RobotPanelOpen(true)}
            title="Workflow V2 - Actions automatisées"
          >
            <Bot className="h-5 w-5 text-purple-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            <Paperclip className={`h-5 w-5 ${uploading ? 'text-gray-300' : 'text-gray-500'}`} />
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            disabled={uploading}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            className="bg-green-500 hover:bg-green-600 w-8 h-8"
            disabled={uploading}
          >
            {uploading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* 🔥 V2: Panneau robot workflow */}
      <WorkflowV2RobotPanel
        isOpen={v2RobotPanelOpen}
        onClose={() => setV2RobotPanelOpen(false)}
        prospectId={prospectId}
        projectType={projectType}
        moduleId={currentModuleId}
        moduleName={currentStepData?.name || `Étape ${currentStepIndex + 1}`}
        moduleConfig={currentModuleConfig}
        context={{
          organizationId: organizationId || activeAdminUser?.organization_id,
          adminUser: activeAdminUser,
        }}
        availableForms={v2AvailableForms}
        availableTemplates={v2AvailableTemplates}
      />
    </div>
  );
};

const ProjectTimeline = ({
  steps,
  onUpdateStatus,
  prompts,
  projectType,
  currentStepIndex,
  prospectId,
  completeStepAndProceed,
}) => {
  // ✅ FIX: Déplacer le return AVANT les hooks
  if (!steps) return null;
  
  const [checklistStates, setChecklistStates] = useState({});
  // 🔥 PR-3: Récupérer appointments depuis AppContext (source unique)
  const { activeAdminUser, appointments, updateAppointment } = useAppContext();
  
  // Récupérer le prompt pour ce projet
  const prompt = prompts ? Object.values(prompts).find(p => p.projectId === projectType) : null;
  const currentStepConfig = prompt?.stepsConfig?.[currentStepIndex];
  
  // Filtrer les tâches pour l'étape en cours
  const currentStepTasks = useMemo(() => {
    if (!steps[currentStepIndex]) return [];
    const stepName = steps[currentStepIndex].name;
    
    const filtered = appointments.filter(apt => 
      apt.type === 'task' &&
      apt.contactId === prospectId &&
      apt.projectId === projectType &&
      apt.step === stepName
    );
    
    // Debug
    if (filtered.length > 0) {
      logger.debug('🔍 Tâches filtrées pour cette étape:', {
        prospectId,
        projectType,
        stepName,
        totalAppointments: appointments.length,
        filteredTasks: filtered.length,
        tasks: filtered.map(t => ({
          id: t.id,
          title: t.title,
          contactId: t.contactId,
          projectId: t.projectId,
          step: t.step
        }))
      });
    }
    
    return filtered;
  }, [appointments, prospectId, projectType, currentStepIndex, steps]);
  
  // Gérer le clic sur une checkbox
  const handleCheckboxToggle = (actionId, itemId) => {
    setChecklistStates(prev => {
      const actionState = prev[actionId] || {};
      const newActionState = {
        ...actionState,
        [itemId]: !actionState[itemId]
      };
      
      const newState = {
        ...prev,
        [actionId]: newActionState
      };
      
      // Vérifier si tous les items sont cochés
      const action = currentStepConfig?.actions?.find(a => a.id === actionId);
      if (action && action.checklist) {
        const allChecked = action.checklist.every(item => newActionState[item.id]);
        
        // Si tous cochés + autoCompleteStep activé → passer à l'étape suivante
        if (allChecked && currentStepConfig?.autoCompleteStep) {
          logger.debug('All checklist items checked, auto-completing step', {
            prospectId,
            projectType,
            currentStepIndex
          });
          
          toast({
            title: '✅ Checklist complétée !',
            description: 'Passage automatique à l\'étape suivante...',
            className: 'bg-green-500 text-white',
          });
          
          // 🔥 FIX SOLUTION A: Passer projectSteps (depuis supabaseSteps) en paramètre
          // Garantit d'utiliser les vraies données Supabase au lieu du state global vide
          completeStepAndProceed(prospectId, projectType, currentStepIndex, steps);
        }
      }
      
      return newState;
    });
  };
  return <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" aria-hidden="true"></div>
          <div className="space-y-6">
            {steps.map((step, index) => {
        const config = statusConfig[step.status] || statusConfig[STATUS_PENDING];
        return <motion.div key={index} initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: index * 0.1
        }} className="flex items-start space-x-4 relative">
                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${config.iconOnly}`}>
                      {step.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h3 className={`font-medium ${config.text}`}>
                        {step.name}
                      </h3>
                      <div className="flex items-center gap-3">
                        {step.subSteps && step.subSteps.length > 0 && (
                          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                            {step.subSteps.filter(s => s.status === STATUS_COMPLETED).length}/{step.subSteps.length} sous-étapes
                          </span>
                        )}
                        <div className="relative" data-step-status-container>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs px-2.5 py-1 rounded-full mt-1 sm:mt-0 ${config.badge} hover:opacity-90`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const target = e.currentTarget;
                            const menu = target.nextElementSibling;
                            const root = target.closest('[data-step-status-container]');
                            if (!menu || !root) return;
                            root.parentElement?.querySelectorAll('[data-dropdown="step-status"]').forEach(el => {
                              if (el !== menu) {
                                el.classList.add('hidden');
                              }
                            });
                            menu.classList.toggle('hidden');
                          }}
                        >
                          {config.label}
                        </Button>
                        <div className="hidden absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg border border-gray-100 z-20 overflow-hidden" data-dropdown="step-status">
                          <button
                            className="w-full text-left text-xs px-3 py-2 hover:bg-blue-50 text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onUpdateStatus(index, STATUS_CURRENT);
                              e.currentTarget.parentElement?.classList.add('hidden');
                            }}
                          >
                            Mettre en cours
                          </button>
                          <button
                            className="w-full text-left text-xs px-3 py-2 hover:bg-green-50 text-green-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onUpdateStatus(index, STATUS_COMPLETED);
                              e.currentTarget.parentElement?.classList.add('hidden');
                            }}
                          >
                            Terminer
                          </button>
                          <button
                            className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onUpdateStatus(index, STATUS_PENDING);
                              e.currentTarget.parentElement?.classList.add('hidden');
                            }}
                          >
                            Marquer à venir
                          </button>
                        </div>
                      </div>
                      </div>
                    </div>

                    {/* Sous-étapes (même logique qu'une étape V1) */}
                    {step.subSteps && step.subSteps.length > 0 && (
                      <div className="mt-3 space-y-2 border border-gray-100 rounded-lg p-3 bg-gray-50">
                        {step.subSteps.map((sub, subIdx) => {
                          const subConfig = statusConfig[sub.status] || statusConfig[STATUS_PENDING];
                          return (
                            <div key={sub.id || subIdx} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full ${sub.status === STATUS_COMPLETED ? 'bg-green-500' : sub.status === STATUS_CURRENT ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]">{sub.name}</span>
                              </div>
                              <span className={`text-[11px] px-2 py-1 rounded-full ${subConfig.badge}`}>{subConfig.label}</span>
                            </div>
                          );
                        })}
                        {/* Bouton d'ajout de sous-étape supprimé (lecture seule) */}
                      </div>
                    )}

                    {/* Aucun bouton d'ajout si pas de sous-étapes (lecture seule) */}
                    
                    {/* 🔥 CHECKLIST: Afficher sous l'étape en cours si action sans client */}
                    {step.status === STATUS_CURRENT && index === currentStepIndex && currentStepConfig?.actions && (
                      <div className="mt-4 space-y-2">
                        {currentStepConfig.actions
                          .filter(action => action.hasClientAction === false && action.checklist && action.checklist.length > 0)
                          .map(action => {
                            const actionState = checklistStates[action.id] || {};
                            const totalItems = action.checklist.length;
                            const checkedItems = action.checklist.filter(item => actionState[item.id]).length;
                            const allChecked = checkedItems === totalItems;
                            
                            return (
                              <div key={action.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-purple-900">📋 Checklist à compléter</h4>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    allChecked 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {checkedItems}/{totalItems}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {action.checklist.map(item => {
                                    const isChecked = actionState[item.id] || false;
                                    return (
                                      <label 
                                        key={item.id} 
                                        className="flex items-start gap-3 cursor-pointer hover:bg-purple-100 rounded p-2 transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleCheckboxToggle(action.id, item.id)}
                                          className="mt-0.5 h-4 w-4 text-purple-600 rounded focus:ring-purple-500 focus:ring-2"
                                        />
                                        <p className={`text-sm flex-1 ${
                                          isChecked 
                                            ? 'text-purple-500 line-through' 
                                            : 'text-purple-800'
                                        }`}>
                                          {item.text}
                                        </p>
                                      </label>
                                    );
                                  })}
                                </div>
                                {currentStepConfig?.autoCompleteStep && (
                                  <p className="text-xs text-purple-600 mt-3 italic flex items-center gap-1">
                                    ⚡ Passage automatique à l'étape suivante quand tout est coché
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                    
                    {/* 🔥 TÂCHES: Afficher les tâches du commercial pour cette étape */}
                    {step.status === STATUS_CURRENT && index === currentStepIndex && currentStepTasks.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {currentStepTasks.map(task => {
                          const isDone = task.status === 'effectue';
                          const taskDate = task.startTime ? new Date(task.startTime) : null;
                          const isValidDate = taskDate && !isNaN(taskDate.getTime());
                          
                          const handleTaskToggle = async () => {
                            const newStatus = isDone ? 'pending' : 'effectue';
                            await updateAppointment(task.id, { status: newStatus });
                            toast({
                              title: isDone ? '🔄 Tâche réouverte' : '✅ Tâche terminée',
                              description: isDone ? 'La tâche a été remise en cours' : 'La tâche a été marquée comme terminée',
                              className: isDone ? 'bg-blue-500 text-white' : 'bg-green-500 text-white',
                            });
                          };
                          
                          return (
                            <label 
                              key={task.id}
                              className="bg-green-100 border-l-4 border-green-500 text-green-800 rounded-lg p-3 flex items-start gap-3 shadow-sm cursor-pointer hover:bg-green-200 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={handleTaskToggle}
                                className="mt-0.5 h-4 w-4 text-green-600 rounded focus:ring-green-500 focus:ring-2 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${isDone ? 'line-through text-gray-500' : ''} truncate flex-1`}>
                                    {task.title || 'Tâche'}
                                  </p>
                                  {isDone && <Check className="h-4 w-4 text-green-600 flex-shrink-0" />}
                                </div>
                                {isValidDate && (
                                  <p className="text-xs text-green-600 mt-1 truncate">
                                    📅 {format(taskDate, 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>;
      })}
          </div>
        </div>;
};

const ProspectForms = ({ prospect, projectType, supabaseSteps, v2Templates, onUpdate }) => {
    // 🔥 PR-3: Récupérer appointments depuis AppContext (source unique)
    const { forms, prompts, completeStepAndProceed, activeAdminUser, appointments, updateAppointment } = useAppContext();
    // 🔥 FIX: Passer prospect.id pour que le RPC filtre correctement (le RPC exige p_prospect_id)
    const { formPanels: clientFormPanels = [], loading, updateFormPanel } = useSupabaseClientFormPanels(prospect.id);
    // 🆕 Hook pour envoyer des messages dans le chat
    const { sendMessage } = useSupabaseChatMessages(prospect.id, projectType);
    const [editingPanelId, setEditingPanelId] = useState(null);
    const [editedData, setEditedData] = useState({});
    // 🆕 State pour la modal de rejet
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectingPanel, setRejectingPanel] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processedPanels, setProcessedPanels] = useState(new Set());

    // ✅ Filtrer les formulaires pour ce prospect et ce projet
    const relevantPanels = useMemo(() => {
        if (!clientFormPanels) return [];
        
        const filtered = clientFormPanels.filter(panel => 
            panel.prospectId === prospect.id && 
            panel.projectType === projectType &&
            panel.actionType !== 'message' // 🔥 FIX: Exclure les panels MESSAGE du compteur formulaires
        ).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        // 🔥 DEBUG: Log pour identifier le problème
        logger.debug('[ProspectForms] Filtering panels', {
            totalPanels: clientFormPanels.length,
            prospectId: prospect.id,
            projectType,
            filteredCount: filtered.length,
            samplePanel: clientFormPanels[0],
        });
        
        return filtered;
    }, [clientFormPanels, prospect.id, projectType]);

    // 🔥 AUTO-COMPLETE: Surveiller les nouveaux formulaires soumis et déclencher l'étape suivante
    useEffect(() => {
        if (!relevantPanels || relevantPanels.length === 0) return;

        relevantPanels.forEach(panel => {
            // Si déjà traité ou pas encore soumis, ignorer
            if (processedPanels.has(panel.panelId) || panel.status !== 'submitted') return;

            // 🔥 NOUVEAU: Ne traiter que les soumissions récentes (moins de 10 secondes)
            // Cela évite de re-déclencher l'auto-complete au rechargement de la page
            if (panel.lastSubmittedAt) {
                const submittedTime = new Date(panel.lastSubmittedAt).getTime();
                const now = Date.now();
                const timeSinceSubmission = now - submittedTime;
                
                if (timeSinceSubmission > 10000) { // Plus de 10 secondes
                    logger.debug('Form too old, skipping auto-complete', {
                        panelId: panel.panelId,
                        ageSeconds: Math.floor(timeSinceSubmission / 1000)
                    });
                    setProcessedPanels(prev => new Set([...prev, panel.panelId]));
                    return;
                }
            }

            logger.debug('New submitted form detected', {
                panelId: panel.panelId,
                formId: panel.formId,
                projectType: panel.projectType
            });

            logger.debug('Available prompts', {
                count: Object.keys(prompts).length
            });

            // Chercher le prompt associé
            let relatedPrompt = null;
            
            if (panel.promptId) {
                logger.debug('Searching by promptId', { promptId: panel.promptId });
                relatedPrompt = prompts[panel.promptId];
                logger.debug('Search result by ID', { found: !!relatedPrompt });
            }
            
            if (!relatedPrompt) {
                logger.debug('Searching by projectType + formId');
                relatedPrompt = Object.values(prompts).find((pr) => {
                    logger.debug('Testing prompt', { 
                        name: pr.name, 
                        projectId: pr.projectId,
                        target: panel.projectType 
                    });
                    if (pr.projectId !== panel.projectType) return false;
                    
                    const stepConfig = pr.stepsConfig?.[panel.currentStepIndex];
                    logger.debug('Step config', { hasConfig: !!stepConfig });
                    
                    const hasFormAction = stepConfig?.actions?.some(
                        (action) => action.type === 'show_form' && action.formId === panel.formId
                    );
                    logger.debug('Has form action', { hasFormAction });
                    
                    return hasFormAction;
                });
            }

            logger.debug('Prompt found', { 
                name: relatedPrompt?.name,
                autoComplete: relatedPrompt?.stepsConfig?.[panel.currentStepIndex]?.autoCompleteStep 
            });

            // 🔥 FILTRE: Auto-complétion seulement si verificationMode = 'none'
            if (relatedPrompt) {
                const stepConfig = relatedPrompt.stepsConfig?.[panel.currentStepIndex];
                
                // Trouver l'action correspondant au formulaire soumis
                const formAction = stepConfig?.actions?.find(
                    action => action.type === 'show_form' && action.formId === panel.formId
                );
                
                const verificationMode = formAction?.verificationMode || 'human';
                
                logger.debug('Checking auto-complete conditions', {
                    autoCompleteStep: stepConfig?.autoCompleteStep,
                    verificationMode: verificationMode
                });
                
                // Auto-complétion UNIQUEMENT si verificationMode = 'none'
                if (stepConfig?.autoCompleteStep && verificationMode === 'none') {
                    logger.debug('Triggering completeStepAndProceed (no verification needed)', { 
                        prospect: prospect.name 
                    });
                    
                    completeStepAndProceed(prospect.id, panel.projectType, panel.currentStepIndex);
                    
                    toast({
                        title: '✅ Étape terminée !',
                        description: `${prospect.name} a complété le formulaire. Passage automatique à l'étape suivante.`,
                        className: 'bg-green-500 text-white',
                    });
                } else if (verificationMode === 'human' || verificationMode === 'ai') {
                    logger.debug('Waiting for validation', { 
                        verificationMode,
                        message: 'Auto-complete will trigger after commercial validation'
                    });
                }
            }

            // Marquer comme traité pour éviter la boucle infinie
            setProcessedPanels(prev => new Set([...prev, panel.panelId]));
        });
    }, [relevantPanels, prompts, completeStepAndProceed, prospect.id, prospect.name, processedPanels]);

    if (relevantPanels.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-card p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Formulaires soumis</h2>
                    <span className="text-xs text-gray-500">0 formulaire</span>
                </div>
                <p className="text-sm text-gray-500">Aucun formulaire soumis pour ce projet.</p>
            </div>
        );
    }

    const handleEdit = (panel) => {
        setEditingPanelId(panel.panelId);
        
        // 🔥 FIX: prospect est maintenant editableProspect passé en prop
        const fullFormData = prospect.form_data || prospect.formData || {};
        const projectFormData = fullFormData[panel.projectType] || {};
        const formFields = projectFormData[panel.formId] || {};
        
        // Stocker aussi projectType et formId pour handleSave
        setEditedData({ 
            ...formFields,
            _meta: { projectType: panel.projectType, formId: panel.formId }
        });
    };

    const handleCancel = () => {
        setEditingPanelId(null);
        setEditedData({});
    };

    const handleSave = async () => {
        // 🔥 FIX: Reconstruire la structure correcte projectType > formId > fields
        const { _meta, ...fieldValues } = editedData;
        const { projectType, formId } = _meta || {};
        
        if (!projectType || !formId) {
            logger.error('❌ Métadonnées manquantes pour la sauvegarde');
            return;
        }
        
        // 🔥 FIX: prospect est maintenant editableProspect passé en prop
        const currentFormData = prospect.form_data || prospect.formData || {};
        const updatedFormData = {
            ...currentFormData,
            [projectType]: {
                ...(currentFormData[projectType] || {}),
                [formId]: fieldValues
            }
        };
        
        logger.debug('Updating form data', { projectType, formId });
        
        // Mettre à jour dans Supabase
        const { error } = await supabase
            .from('prospects')
            .update({ form_data: updatedFormData })
            .eq('id', prospect.id);

        if (error) {
            logger.error('❌ Erreur sauvegarde formulaire:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de sauvegarder les modifications.',
                variant: 'destructive',
            });
            return;
        }

        toast({
            title: '✅ Sauvegardé',
            description: 'Les modifications ont été enregistrées.',
            className: 'bg-green-500 text-white',
        });

        // 🔥 FIX: Appeler onUpdate pour mettre à jour editableProspect immédiatement
        if (onUpdate) {
            onUpdate({
                ...prospect,
                form_data: updatedFormData,
                formData: updatedFormData
            });
        }
        
        setEditingPanelId(null);
        setEditedData({});
    };

    const handleFieldChange = (fieldId, value) => {
        setEditedData(prev => ({ ...prev, [fieldId]: value }));
    };

    // 🆕 Helper pour récupérer l'action du prompt correspondant au panel
    const getActionForPanel = (panel) => {
        const prompt = Object.values(prompts).find(p => 
            p.id === panel.promptId || p.projectId === panel.projectType
        );
        
        const stepConfig = prompt?.stepsConfig?.[panel.currentStepIndex];
        return stepConfig?.actions?.find(a => a.formId === panel.formId);
    };

    // 🔥 NOUVEAU: Valider un formulaire
    const handleApprove = async (panel) => {
        try {
            // Mettre à jour le statut du panel
            await updateFormPanel(panel.panelId, { status: 'approved' });

            // 🔥 Récupérer l'action pour vérifier verificationMode
            const action = getActionForPanel(panel);
            const verificationMode = action?.verificationMode || 'human';
            
            logger.debug('🔍 Checking verification mode', {
                verificationMode,
                shouldSearchTask: verificationMode === 'human'
            });

            // 🔥 NOUVEAU: Trouver et mettre à jour la tâche correspondante (UNIQUEMENT si verificationMode='human')
            if (verificationMode === 'human') {
                logger.debug('🔍 Searching for related task', {
                    totalAppointments: appointments?.length || 0,
                    prospectId: prospect.id,
                    projectType: panel.projectType,
                    stepName: panel.stepName,
                    panel: panel
                });

            // Filtrer les tâches pour debug
            const allTasks = appointments?.filter(apt => apt.type === 'task') || [];
            const prospectTasks = allTasks.filter(apt => apt.contactId === prospect.id);
            
            logger.debug('🔍 Task filtering debug', {
                allTasks: allTasks.length,
                prospectTasks: prospectTasks.length,
                prospectTasksData: prospectTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    contactId: t.contactId,
                    projectId: t.projectId,
                    step: t.step,
                    status: t.status
                }))
            });

            // 🔍 Recherche détaillée avec logs de chaque critère
            logger.debug('🔍 Searching for task with criteria:', {
                searchCriteria: {
                    type: 'task',
                    contactId: prospect.id,
                    projectId: panel.projectType,
                    step: panel.stepName,
                    status: 'pending',
                    titleIncludes: 'Vérifier le formulaire'
                }
            });

            let relatedTask = appointments?.find(apt => {
                const checks = {
                    isTask: apt.type === 'task',
                    contactMatch: apt.contactId === prospect.id,
                    projectMatch: apt.projectId === panel.projectType,
                    stepMatch: apt.step === panel.stepName,
                    isPending: apt.status === 'pending',
                    titleMatch: apt.title?.includes('Vérifier le formulaire')
                };
                
                const allMatch = Object.values(checks).every(c => c);
                
                // 🔥 LOG DÉTAILLÉ pour debug
                if (!allMatch && apt.type === 'task' && apt.contactId === prospect.id) {
                    logger.warn('🔍 Task failed matching:', {
                        taskId: apt.id,
                        title: apt.title,
                        checks: checks,
                        COMPARISON: {
                            taskStep: `"${apt.step}"`,
                            panelStep: `"${panel.stepName}"`,
                            areEqual: apt.step === panel.stepName,
                            taskStepType: typeof apt.step,
                            panelStepType: typeof panel.stepName
                        },
                        taskData: {
                            contactId: apt.contactId,
                            projectId: apt.projectId,
                            step: apt.step,
                            status: apt.status
                        },
                        panelData: {
                            projectType: panel.projectType,
                            stepName: panel.stepName
                        }
                    });
                }
                
                return allMatch;
            });

            // 🔥 FALLBACK: Si pas trouvé avec step exact, chercher sans step
            if (!relatedTask) {
                logger.warn('⚠️ Task not found with exact step, trying fallback without step', {
                    panelStep: panel.stepName
                });
                
                relatedTask = appointments?.find(apt => 
                    apt.type === 'task' &&
                    apt.contactId === prospect.id &&
                    apt.projectId === panel.projectType &&
                    apt.status === 'pending' &&
                    apt.title?.includes('Vérifier le formulaire')
                );
                
                if (relatedTask) {
                    logger.info('✅ Found task via fallback (without step match)', {
                        taskId: relatedTask.id,
                        taskStep: relatedTask.step
                    });
                }
            }

            if (relatedTask) {
                logger.info('✅ Found verification task, marking as completed', {
                    taskId: relatedTask.id,
                    prospectId: prospect.id,
                    title: relatedTask.title
                });
                await updateAppointment(relatedTask.id, { status: 'effectue' });
                toast({
                    title: '✅ Tâche mise à jour',
                    description: 'La tâche de vérification a été marquée comme effectuée.',
                    className: 'bg-blue-500 text-white',
                });
            } else {
                logger.warn('⚠️ No related task found (even with fallback)', {
                    searchCriteria: {
                        type: 'task',
                        contactId: prospect.id,
                        projectId: panel.projectType,
                        step: panel.stepName,
                        status: 'pending',
                        titleContains: 'Vérifier le formulaire'
                    }
                });
            }
            } else {
                logger.debug('⏭️ Skipping task search (verificationMode !== human)', {
                    verificationMode
                });
            }

            // ═══════════════════════════════════════════════════════════════════
            // 🔥 V2: Vérifier completionTrigger depuis config V2 (Supabase ou in-memory)
            // ═══════════════════════════════════════════════════════════════════
            const currentSteps = supabaseSteps?.[panel.projectType];
            // 🔥 FIX: findIndex retourne -1 si pas trouvé, ?? ne catchera pas -1
            const foundIdx = currentSteps?.findIndex(s => s.status === 'in_progress');
            const currentStepIdx = (foundIdx != null && foundIdx >= 0) ? foundIdx : (panel.currentStepIndex || 0);
            const currentStepName = currentSteps?.[currentStepIdx]?.name;
            
            // Normaliser le moduleId comme dans ModuleConfigTab
            const moduleId = currentStepName 
              ? currentStepName.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '')
              : null;
            
            // 🔥 FIX: Utiliser panel.projectType (pas la prop projectType) pour la clé de lookup
            const templateKey = `${panel.projectType}:${moduleId}`;
            
            // Chercher la config V2 depuis Supabase (v2Templates passé en closure)
            // Note: v2Templates est accessible via le contexte parent
            const v2Template = moduleId && v2Templates ? v2Templates[templateKey] : null;
            const v2ActionConfig = v2Template?.configJson?.actionConfig;
            
            // 🔥 DEBUG: Log pour identifier le problème de lookup
            logger.debug('[V2] Template lookup', {
                panelProjectType: panel.projectType,
                propProjectType: projectType,
                currentStepName,
                moduleId,
                templateKey,
                v2TemplatesKeys: v2Templates ? Object.keys(v2Templates) : [],
                templateFound: !!v2Template,
            });
            
            // Fallback: utiliser config in-memory
            const memoryActionConfig = currentStepName ? getModuleActionConfig(currentStepName) : null;
            
            // Priorité: Supabase > In-memory
            const effectiveCompletionTrigger = v2ActionConfig?.completionTrigger || memoryActionConfig?.completionTrigger;
            
            // 🔥 MULTI-ACTIONS V2: Vérifier s'il reste d'autres actions à exécuter
            const v2Actions = v2Template?.configJson?.actions;
            const hasMultiActions = v2Actions && v2Actions.length > 1;
            let allActionsCompleted = true;
            
            if (hasMultiActions) {
                // Générer les action_id attendus pour chaque action
                const expectedActionIds = v2Actions.map((_, idx) => `v2-${moduleId}-action-${idx}`);
                
                // 🔥 FIX: Chercher TOUS les panels approved pour cette étape (avec ET sans action_id)
                const { data: allApprovedPanels } = await supabase
                    .from('client_form_panels')
                    .select('id, action_id, step_name, form_id, filled_by_role')
                    .eq('prospect_id', prospect.id)
                    .eq('project_type', panel.projectType)
                    .eq('status', 'approved');
                
                let approvedActionIds = new Set();
                
                // Étape 1: Ajouter les panels avec action_id valide
                (allApprovedPanels || []).forEach(p => {
                    if (p.action_id && expectedActionIds.includes(p.action_id)) {
                        approvedActionIds.add(p.action_id);
                    }
                });
                
                // Étape 2: Pour les panels SANS action_id mais de la même étape, 
                // les assigner séquentiellement aux action_ids non encore couverts
                const panelsWithoutActionId = (allApprovedPanels || []).filter(p => 
                    !p.action_id && 
                    (!p.step_name || p.step_name === currentStepName || p.step_name === moduleId)
                );
                
                if (panelsWithoutActionId.length > 0) {
                    // Trouver les action_ids pas encore couverts
                    const uncoveredIds = expectedActionIds.filter(id => !approvedActionIds.has(id));
                    panelsWithoutActionId.forEach((p, idx) => {
                        if (idx < uncoveredIds.length) {
                            approvedActionIds.add(uncoveredIds[idx]);
                        }
                    });
                    
                    logger.debug('[V2] Fallback: assigned panels without action_id', {
                        panelsWithoutActionId: panelsWithoutActionId.length,
                        uncoveredIds,
                        afterAssignment: [...approvedActionIds],
                    });
                }
                
                const totalApproved = approvedActionIds.size;
                allActionsCompleted = totalApproved >= v2Actions.length;
                
                logger.debug('[V2] Multi-actions check', {
                    totalActions: v2Actions.length,
                    expectedActionIds,
                    approvedActionIds: [...approvedActionIds],
                    panelsTotal: (allApprovedPanels || []).length,
                    panelsWithActionId: (allApprovedPanels || []).filter(p => p.action_id).length,
                    panelsWithoutActionId: panelsWithoutActionId.length,
                    allCompleted: allActionsCompleted,
                });
                
                if (!allActionsCompleted) {
                    logger.info('[V2] Multi-actions: still pending actions, NOT completing step', {
                        remaining: v2Actions.length - totalApproved,
                    });
                    toast({
                        title: '✅ Action validée',
                        description: `Action ${totalApproved}/${v2Actions.length} — il reste ${v2Actions.length - totalApproved} action(s) avant de terminer l'étape.`,
                        className: 'bg-blue-500 text-white',
                    });
                }
            }
            
            logger.debug('[V2] Checking completionTrigger for form approval', {
                stepName: currentStepName,
                moduleId,
                v2TemplateFound: !!v2Template,
                completionTrigger: effectiveCompletionTrigger,
                currentStepIdx,
                hasMultiActions,
                allActionsCompleted,
            });

            // V2: Déterminer si on doit passer à l'étape suivante
            // - Si multi-actions: on complète l'étape dès que TOUTES les actions sont approved,
            //   quel que soit le completionTrigger du module (qui est le trigger de la 1ère action)
            // - Si single-action: on complète si trigger === 'form_approved' ou pas de config explicite
            // 🔥 FIX: En multi-actions, le trigger module-level peut être 'button_click' (pour MESSAGE)
            //    mais la dernière action est un FORM approuvé par l'admin → doit quand même compléter
            const shouldCompleteStep = hasMultiActions
                ? allActionsCompleted  // Multi-actions: seul critère = toutes les actions terminées
                : (effectiveCompletionTrigger === 'form_approved' || !effectiveCompletionTrigger);
            
            // 🔥 FIX BUG 2: Mettre à jour la sous-étape correspondante AVANT de compléter l'étape
            // Trouver l'index de la sous-étape à partir de panel.action_id
            let updatedStepsForCompletion = currentSteps; // Par défaut, utiliser les steps actuels
            
            if (currentSteps && currentSteps[currentStepIdx]?.subSteps?.length > 0) {
                const currentStep = currentSteps[currentStepIdx];
                
                // 🔥 FIX: Trouver la sous-étape par action_id OU par fallback (première in_progress)
                let subStepIndex = -1;
                
                if (panel.action_id) {
                    subStepIndex = currentStep.subSteps.findIndex(sub => sub.id === panel.action_id);
                }
                
                // Fallback: si pas d'action_id ou pas trouvé, chercher la première sous-étape in_progress
                if (subStepIndex === -1) {
                    subStepIndex = currentStep.subSteps.findIndex(sub => sub.status === STATUS_CURRENT);
                    logger.debug('[V2] Substep fallback: using first in_progress', {
                        panelActionId: panel.action_id,
                        fallbackIndex: subStepIndex,
                    });
                }
                
                if (subStepIndex !== -1) {
                    logger.debug('[V2] Updating substep for approved action', {
                        actionId: panel.action_id,
                        subStepIndex,
                        subStepName: currentStep.subSteps[subStepIndex].name,
                        allActionsCompleted,
                    });
                    
                    // Marquer la sous-étape comme complétée
                    const updatedSteps = JSON.parse(JSON.stringify(currentSteps));
                    
                    // 🔥 FIX: D'abord, réinitialiser TOUTES les sous-étapes qui sont "in_progress"
                    // pour éviter d'avoir plusieurs sous-étapes en cours en même temps
                    updatedSteps[currentStepIdx].subSteps.forEach((sub, idx) => {
                        if (sub.status === STATUS_CURRENT && idx !== subStepIndex) {
                            sub.status = STATUS_COMPLETED; // Si elle était en cours, la marquer complétée
                        }
                    });
                    
                    // Maintenant marquer celle qu'on vient de valider comme complétée
                    updatedSteps[currentStepIdx].subSteps[subStepIndex].status = STATUS_COMPLETED;
                    
                    // Si ce n'est pas la dernière action, activer la suivante
                    if (!allActionsCompleted) {
                        // Chercher la prochaine sous-étape pending APRÈS celle qu'on vient de compléter
                        let nextPendingIndex = -1;
                        for (let i = subStepIndex + 1; i < updatedSteps[currentStepIdx].subSteps.length; i++) {
                            if (updatedSteps[currentStepIdx].subSteps[i].status === STATUS_PENDING) {
                                nextPendingIndex = i;
                                break;
                            }
                        }
                        
                        if (nextPendingIndex !== -1) {
                            updatedSteps[currentStepIdx].subSteps[nextPendingIndex].status = STATUS_CURRENT;
                            logger.debug('[V2] Activated next substep', {
                                completedIndex: subStepIndex,
                                nextIndex: nextPendingIndex,
                                nextName: updatedSteps[currentStepIdx].subSteps[nextPendingIndex].name,
                            });
                        }
                    }
                    
                    // Sauvegarder les steps mis à jour
                    await updateSupabaseSteps(panel.projectType, updatedSteps);
                    
                    // 🔥 IMPORTANT: Utiliser les steps mis à jour pour completeStepAndProceed
                    updatedStepsForCompletion = updatedSteps;
                    
                    logger.info('[V2] Substep updated successfully', {
                        completedSubStep: subStepIndex,
                        nextActivated: !allActionsCompleted,
                    });
                }
            }
            
            if (shouldCompleteStep && updatedStepsForCompletion) {
                logger.info('[V2] Form approved → completing step', {
                    prospectId: prospect.id,
                    projectType: panel.projectType,
                    currentStepIdx,
                    stepName: currentStepName,
                    trigger: effectiveCompletionTrigger || 'default_behavior',
                });
                
                await completeStepAndProceed(
                    prospect.id,
                    panel.projectType,
                    currentStepIdx,
                    updatedStepsForCompletion
                );
                
                toast({
                    title: '✅ Étape validée automatiquement',
                    description: `La validation du formulaire a déclenché le passage à l'étape suivante`,
                    className: 'bg-green-500 text-white',
                });
            } else {
                // ═══════════════════════════════════════════════════════════════════
                // V1 FALLBACK: Récupérer le prompt pour vérifier autoCompleteStep
                // ═══════════════════════════════════════════════════════════════════
                const prompt = Object.values(prompts).find(p => 
                    p.id === panel.promptId || p.projectId === panel.projectType
                );

                if (prompt) {
                    const stepConfig = prompt.stepsConfig?.[panel.currentStepIndex];
                    
                    // Si autoCompleteStep est activé, passer à l'étape suivante
                    if (stepConfig?.autoCompleteStep) {
                        logger.debug('[V1] Auto-completing step after validation (legacy)', {
                            prospect: prospect.id,
                            projectType: panel.projectType,
                            stepIndex: panel.currentStepIndex
                        });
                        
                        if (currentSteps) {
                            await completeStepAndProceed(
                                prospect.id,
                                panel.projectType,
                                panel.currentStepIndex,
                                currentSteps
                            );
                        } else {
                            logger.error('No steps found in supabaseSteps for projectType', { projectType: panel.projectType });
                        }
                    }
                }
            }

            // 🆕 ENVOYER MESSAGE AUTO dans le chat (UNIQUEMENT pour formulaires CLIENT, pas partenaire)
            const isPartnerForm = panel.filledByRole === 'partner';
            
            if (!isPartnerForm) {
                const approvalMessage = action?.approvalMessage || 'Merci ! Votre formulaire a été validé.';
                
                // 🔥 Vérifier qu'un message identique n'a pas déjà été envoyé récemment (< 2 secondes)
                const { data: recentMessages } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('prospect_id', prospect.id)
                    .eq('project_type', panel.projectType)
                    .eq('sender', 'admin')
                    .eq('text', approvalMessage)
                    .gte('created_at', new Date(Date.now() - 2000).toISOString())
                    .limit(1);
                
                if (!recentMessages || recentMessages.length === 0) {
                    await sendMessage({
                        sender: 'admin',
                        text: approvalMessage,
                        relatedMessageTimestamp: new Date().toISOString()
                    });
                } else {
                    logger.debug('Message de validation déjà envoyé récemment, skip');
                }
            } else {
                logger.debug('Formulaire partenaire validé — pas de message chat au client');
            }

            // 🔥 PARTENAIRE: Mettre à jour le statut de la mission liée → 'completed'
            if (isPartnerForm && panel.formId) {
                const { data: linkedMissions, error: missionErr } = await supabase
                    .from('missions')
                    .select('id, form_ids, status')
                    .eq('prospect_id', prospect.id)
                    .eq('status', 'submitted');
                
                if (!missionErr && linkedMissions?.length > 0) {
                    // Trouver la mission qui contient ce formId
                    const targetMission = linkedMissions.find(m => 
                        m.form_ids?.includes(panel.formId)
                    );
                    if (targetMission) {
                        const { error: updateErr } = await supabase
                            .from('missions')
                            .update({ status: 'completed', completed_at: new Date().toISOString() })
                            .eq('id', targetMission.id);
                        
                        if (updateErr) {
                            logger.error('❌ Erreur mise à jour mission → completed', updateErr);
                        } else {
                            logger.info('✅ Mission passée en completed', { missionId: targetMission.id });
                        }
                    }
                }
            }

            toast({
                title: '✅ Formulaire validé',
                description: isPartnerForm 
                    ? 'Le formulaire partenaire a été validé. Mission marquée comme complétée.' 
                    : 'Un message a été envoyé au client.',
                className: 'bg-green-500 text-white',
            });
        } catch (error) {
            logger.error('❌ Erreur validation formulaire:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de valider le formulaire.',
                variant: 'destructive',
            });
        }
    };

    // 🔥 NOUVEAU: Rejeter un formulaire
    const handleReject = async (customReason = '') => {
        if (!rejectingPanel) return;
        
        try {
            const panel = rejectingPanel;
            
            // ℹ️ Pas de suppression de fichiers au rejet : le rejet peut être pour un autre champ
            // Les fichiers sont supprimés uniquement quand le partenaire/client les remplace
            
            // 🔥 PARTENAIRE vs CLIENT: Déterminer le comportement selon qui a rempli
            const isPartnerForm = panel.filledByRole === 'partner';
            
            // Mettre à jour le statut du panel + raison (pour partenaire)
            await updateFormPanel(panel.panelId, { 
                status: 'rejected',
                rejectionReason: isPartnerForm ? customReason : null // Sauvegarder raison seulement pour partenaire
            });

            // 🔥 Récupérer l'action pour vérifier verificationMode
            const action = getActionForPanel(panel);
            const verificationMode = action?.verificationMode || 'human';
            
            logger.debug('🔍 Checking verification mode (reject)', {
                verificationMode,
                shouldSearchTask: verificationMode === 'human',
                isPartnerForm,
            });

            // 🔥 NOUVEAU: Trouver et mettre à jour la tâche correspondante (UNIQUEMENT si verificationMode='human')
            if (verificationMode === 'human') {
                logger.debug('🔍 Searching for related task (reject)', {
                    totalAppointments: appointments?.length || 0,
                    prospectId: prospect.id,
                    projectType: panel.projectType,
                    stepName: panel.stepName
                });

                // 🔍 Recherche détaillée avec logs de chaque critère
                logger.debug('🔍 Searching for task with criteria (REJECT):', {
                    searchCriteria: {
                        type: 'task',
                        contactId: prospect.id,
                        projectId: panel.projectType,
                        step: panel.stepName,
                        status: 'pending',
                        titleIncludes: 'Vérifier le formulaire'
                    }
                });

            let relatedTask = appointments?.find(apt => {
                const checks = {
                    isTask: apt.type === 'task',
                    contactMatch: apt.contactId === prospect.id,
                    projectMatch: apt.projectId === panel.projectType,
                    stepMatch: apt.step === panel.stepName,
                    isPending: apt.status === 'pending',
                    titleMatch: apt.title?.includes('Vérifier le formulaire')
                };
                
                const allMatch = Object.values(checks).every(c => c);
                
                // 🔥 LOG DÉTAILLÉ pour debug (REJECT)
                if (!allMatch && apt.type === 'task' && apt.contactId === prospect.id) {
                    logger.warn('🔍 Task failed matching (REJECT):', {
                        taskId: apt.id,
                        title: apt.title,
                        checks: checks,
                        COMPARISON: {
                            taskStep: `"${apt.step}"`,
                            panelStep: `"${panel.stepName}"`,
                            areEqual: apt.step === panel.stepName,
                            taskStepType: typeof apt.step,
                            panelStepType: typeof panel.stepName
                        },
                        taskData: {
                            contactId: apt.contactId,
                            projectId: apt.projectId,
                            step: apt.step,
                            status: apt.status
                        },
                        panelData: {
                            projectType: panel.projectType,
                            stepName: panel.stepName
                        }
                    });
                }
                
                return allMatch;
            });

            // 🔥 FALLBACK: Si pas trouvé avec step exact, chercher sans step (REJECT)
            if (!relatedTask) {
                logger.warn('⚠️ Task not found with exact step (reject), trying fallback', {
                    panelStep: panel.stepName
                });
                
                relatedTask = appointments?.find(apt => 
                    apt.type === 'task' &&
                    apt.contactId === prospect.id &&
                    apt.projectId === panel.projectType &&
                    apt.status === 'pending' &&
                    apt.title?.includes('Vérifier le formulaire')
                );
                
                if (relatedTask) {
                    logger.info('✅ Found task via fallback (reject, without step match)', {
                        taskId: relatedTask.id,
                        taskStep: relatedTask.step
                    });
                }
            }

            if (relatedTask) {
                logger.info('✅ Found verification task, marking as completed (rejected)', {
                    taskId: relatedTask.id,
                    prospectId: prospect.id,
                    title: relatedTask.title
                });
                await updateAppointment(relatedTask.id, { status: 'effectue' });
            }
            } else {
                logger.debug('⏭️ Skipping task search (reject, verificationMode !== human)', {
                    verificationMode
                });
            }

            // 🔥 CLIENT: Envoyer message dans le chat (PAS pour partenaire)
            if (!isPartnerForm) {
                const rejectionMessage = action?.rejectionMessage || 'Oups !! Votre formulaire a été rejeté pour la raison suivante :';
                const fullMessage = `${rejectionMessage}\n\n${customReason}`;
                
                await sendMessage({
                    sender: 'admin',
                    text: fullMessage,
                    relatedMessageTimestamp: new Date().toISOString()
                });

                toast({
                    title: '❌ Formulaire rejeté',
                    description: 'Un message a été envoyé au client.',
                    className: 'bg-red-500 text-white',
                });
            } else {
                // 🔥 PARTENAIRE: Remettre la mission en 'pending' → retourne dans onglet Missions
                if (panel.formId) {
                    const { data: linkedMissions } = await supabase
                        .from('missions')
                        .select('id, form_ids')
                        .eq('prospect_id', prospect.id)
                        .eq('status', 'submitted');
                    
                    const targetMission = linkedMissions?.find(m => m.form_ids?.includes(panel.formId));
                    if (targetMission) {
                        await supabase
                            .from('missions')
                            .update({ status: 'pending' })
                            .eq('id', targetMission.id);
                        logger.info('✅ Mission remise en pending (admin a refusé)', { missionId: targetMission.id });
                    }
                }

                toast({
                    title: '❌ Formulaire rejeté',
                    description: 'La mission est revenue dans l\'onglet Missions du partenaire.',
                    className: 'bg-red-500 text-white',
                });
            }

            // Fermer la modal
            setRejectModalOpen(false);
            setRejectingPanel(null);
            setRejectionReason('');
        } catch (error) {
            logger.error('❌ Erreur rejet formulaire:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de rejeter le formulaire.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Formulaires soumis</h2>
                <span className="text-xs text-gray-500">{relevantPanels.length} formulaire(s)</span>
            </div>
            <div className="space-y-4">
                {relevantPanels.map(panel => {
                    const formDefinition = forms[panel.formId];
                    
                    // 🔥 FIX: Pour les formulaires PARTENAIRE, lire form_data depuis le panel
                    // Car le partenaire ne peut pas UPDATE prospects.form_data (RLS)
                    let formData = {};
                    if (panel.filledByRole === 'partner' && panel.formData) {
                        // Formulaire partenaire → données dans panel.formData
                        formData = panel.formData;
                    } else {
                        // Formulaire client → données dans prospect.form_data
                        const fullFormData = prospect.form_data || prospect.formData || {};
                        const projectFormData = fullFormData[panel.projectType] || {};
                        formData = projectFormData[panel.formId] || {};
                    }
                    
                    if (!formDefinition) return null;

                    // 🔥 FIX: Fallback pour step_name - déduire depuis supabaseSteps si absent
                    const displayStepName = panel.stepName 
                        || supabaseSteps?.[panel.projectType]?.[panel.currentStepIndex]?.name
                        || null;

                    return (
                        <div key={panel.panelId} className="border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{formDefinition.name}</h3>
                                    {displayStepName && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Étape : {displayStepName}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                        panel.status === 'submitted' ? 'bg-green-100 text-green-700' :
                                        panel.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                        panel.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {panel.status === 'submitted' ? 'Envoyé' :
                                     panel.status === 'approved' ? 'Approuvé' :
                                     panel.status === 'rejected' ? 'Rejeté' :
                                     'En attente'}
                                </span>
                            </div>

                            {panel.status === 'submitted' && (
                                <div className="space-y-2">
                                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                        <p className="text-sm text-green-700">
                                            ✅ {panel.filledByRole === 'partner' ? 'Partenaire' : 'Client'} a soumis ce formulaire
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleApprove(panel)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <Check className="h-4 w-4 mr-1" />
                                            Valider
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => {
                                                setRejectingPanel(panel);
                                                setRejectModalOpen(true);
                                            }}
                                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            Rejeter
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* 🔥 Bandeau mission impossible / formulaire rejeté */}
                            {panel.status === 'rejected' && panel.rejectionReason && (
                                <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-3">
                                    <p className="text-sm font-semibold text-red-800">
                                        {panel.rejectionReason.startsWith('Mission impossible') 
                                            ? '⛔ Mission déclarée impossible par le partenaire' 
                                            : '❌ Formulaire rejeté'}
                                    </p>
                                    <p className="text-sm text-red-700 mt-1">
                                        {panel.rejectionReason.startsWith('Mission impossible — ') 
                                            ? panel.rejectionReason.replace('Mission impossible — ', '')
                                            : panel.rejectionReason}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                {(formDefinition.fields || []).map(field => {
                                    // 🔥 Vérifier les conditions multiples d'affichage
                                    if (field.show_if_conditions && field.show_if_conditions.length > 0) {
                                        const operator = field.condition_operator || 'AND';
                                        const conditionResults = field.show_if_conditions.map(condition => {
                                            const currentValue = formData[condition.field];
                                            if (condition.equals === 'has_value') {
                                                return !!currentValue && currentValue !== '';
                                            }
                                            return currentValue === condition.equals;
                                        });
                                        const shouldShow = operator === 'AND' 
                                            ? conditionResults.every(result => result === true)
                                            : conditionResults.some(result => result === true);
                                        if (!shouldShow) return null;
                                    }
                                    
                                    // 🔥 Rétro-compatibilité show_if
                                    if (field.show_if) {
                                        const conditionField = field.show_if.field;
                                        const expectedValue = field.show_if.equals;
                                        const currentValue = formData[conditionField];
                                        
                                        if (!currentValue || currentValue !== expectedValue) {
                                            return null;
                                        }
                                    }
                                    
                                    // 🔥 Ne pas afficher les champs répétés directement
                                    const isInRepeatedGroup = (formDefinition.fields || []).some(f => 
                                        f.is_repeater && (f.repeats_fields || []).includes(field.id)
                                    );
                                    
                                    if (isInRepeatedGroup) {
                                        return null;
                                    }

                                    const fieldValue = formData[field.id];
                                    const isFile = field.type === 'file' && typeof fieldValue === 'object' && fieldValue?.storagePath;
                                    
                                    return (
                                        <div key={field.id} className="space-y-1">
                                            <Label className="text-sm font-medium text-gray-600">{field.label}</Label>
                                            {editingPanelId === panel.panelId ? (
                                                isFile ? (
                                                    <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded-md">
                                                        <FileText className="inline h-4 w-4 mr-2" />
                                                        {fieldValue.name}
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            (Fichier non modifiable)
                                                        </span>
                                                    </div>
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        value={editedData[field.id] || ''}
                                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    >
                                                        <option value="">-- Sélectionner --</option>
                                                        {(field.options || []).map((option, idx) => (
                                                            <option key={idx} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        type={field.type || 'text'}
                                                        value={editedData[field.id] || ''}
                                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder || ''}
                                                    />
                                                )
                                            ) : (
                                                <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                                                    {isFile ? (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const { data, error } = await supabase.storage
                                                                        .from('project-files')
                                                                        .createSignedUrl(fieldValue.storagePath, 3600);
                                                                    if (error) throw error;
                                                                    window.open(data.signedUrl, '_blank');
                                                                } catch (err) {
                                                                    toast({
                                                                        title: '❌ Erreur',
                                                                        description: 'Impossible de télécharger le fichier.',
                                                                        variant: 'destructive',
                                                                    });
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                            <span>{fieldValue.name}</span>
                                                            <Download className="h-3 w-3" />
                                                        </button>
                                                    ) : (
                                                        typeof fieldValue === 'object' && fieldValue !== null
                                                            ? (fieldValue.name 
                                                                ? <span className="flex items-center gap-1"><FileText className="h-4 w-4 text-gray-400" /> {fieldValue.name}</span>
                                                                : <span className="text-gray-400 italic">Donnée non affichable</span>)
                                                            : (fieldValue || <span className="text-gray-400 italic">Non renseigné</span>)
                                                    )}
                                                </p>
                                            )}
                                            
                                            {/* 🔥 Afficher les champs répétés en mode lecture */}
                                            {field.is_repeater && field.repeats_fields && field.repeats_fields.length > 0 && fieldValue && (
                                                <div className="mt-4 space-y-3">
                                                    {Array.from({ length: parseInt(fieldValue) || 0 }, (_, repeatIndex) => {
                                                        const fieldsToRepeat = (formDefinition.fields || []).filter(f => 
                                                            field.repeats_fields.includes(f.id)
                                                        );
                                                        
                                                        return (
                                                            <div key={repeatIndex} className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                                                                <h4 className="font-semibold text-green-800 text-xs">
                                                                    {field.label} #{repeatIndex + 1}
                                                                </h4>
                                                                
                                                                {fieldsToRepeat.map(repeatedField => {
                                                                    const repeatedFieldKey = `${field.id}_repeat_${repeatIndex}_${repeatedField.id}`;
                                                                    const repeatedFieldValue = formData[repeatedFieldKey];
                                                                    const isRepeatedFile = repeatedField.type === 'file' && typeof repeatedFieldValue === 'object' && repeatedFieldValue?.storagePath;
                                                                    
                                                                    return (
                                                                        <div key={repeatedFieldKey} className="space-y-1">
                                                                            <Label className="text-xs font-medium text-gray-600">{repeatedField.label}</Label>
                                                                            <p className="text-sm text-gray-900 p-2 bg-white rounded-md min-h-[32px] flex items-center">
                                                                                {isRepeatedFile ? (
                                                                                    <button
                                                                                        onClick={async () => {
                                                                                            try {
                                                                                                const { data, error } = await supabase.storage
                                                                                                    .from('project-files')
                                                                                                    .createSignedUrl(repeatedFieldValue.storagePath, 3600);
                                                                                                if (error) throw error;
                                                                                                window.open(data.signedUrl, '_blank');
                                                                                            } catch (err) {
                                                                                                toast({
                                                                                                    title: '❌ Erreur',
                                                                                                    description: 'Impossible de télécharger le fichier.',
                                                                                                    variant: 'destructive',
                                                                                                });
                                                                                            }
                                                                                        }}
                                                                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline text-xs"
                                                                                    >
                                                                                        <FileText className="h-3 w-3" />
                                                                                        <span>{repeatedFieldValue.name}</span>
                                                                                        <Download className="h-3 w-3" />
                                                                                    </button>
                                                                                ) : (
                                                                                    typeof repeatedFieldValue === 'object' && repeatedFieldValue !== null
                                                                                        ? (repeatedFieldValue.name || <span className="text-gray-400 italic text-xs">Donnée non affichable</span>)
                                                                                        : (repeatedFieldValue || <span className="text-gray-400 italic text-xs">Non renseigné</span>)
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 💬 Commentaire optionnel du partenaire (après les champs) */}
                            {panel.filledByRole === 'partner' && formData.__partner_comment__ && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-2">
                                    <p className="text-xs font-semibold text-orange-700 mb-1">💬 Commentaire du partenaire</p>
                                    <p className="text-sm text-orange-900">{formData.__partner_comment__}</p>
                                </div>
                            )}

                            {/* Boutons d'action admin */}
                            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                                {editingPanelId === panel.panelId ? (
                                    <>
                                        <Button variant="outline" size="sm" onClick={handleCancel}>
                                            <X className="h-4 w-4 mr-1" />
                                            Annuler
                                        </Button>
                                        <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                                            <Save className="h-4 w-4 mr-1" />
                                            Sauvegarder
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(panel)}>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Modifier
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* 🆕 MODAL DE REJET */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Rejeter le formulaire</DialogTitle>
                        <DialogDescription>
                            Expliquez au client pourquoi le formulaire est rejeté
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        {rejectingPanel && (
                            <>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-red-700 font-medium">
                                        {getActionForPanel(rejectingPanel)?.rejectionMessage || 
                                         'Oups !! Votre formulaire a été rejeté pour la raison suivante :'}
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Raison du refus</Label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Ex: Le RIB n'est pas lisible, veuillez en fournir un nouveau"
                                        className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setRejectModalOpen(false);
                                setRejectingPanel(null);
                                setRejectionReason('');
                            }}
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={() => handleReject(rejectionReason)}
                            disabled={!rejectionReason.trim()}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Envoyer dans le chat
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// 🆕 Composant pour afficher les formulaires internes (audience='internal')
const InternalForms = ({ prospect, projectType, onUpdate }) => {
    const { forms } = useAppContext();
    const [editingFormId, setEditingFormId] = useState(null);
    const [formData, setFormData] = useState({});

    // Filtrer les formulaires internes pour ce type de projet
    const internalForms = useMemo(() => {
        return Object.values(forms).filter(form => 
            form.audience === 'internal' && 
            (form.projectIds || []).includes(projectType)
        );
    }, [forms, projectType]);

    // Charger les données existantes du prospect
    useEffect(() => {
        if (prospect && prospect.form_data) {
            const projectFormData = prospect.form_data[projectType] || {};
            setFormData(projectFormData);
        }
    }, [prospect, projectType]);

    const handleStartEdit = (formId) => {
        setEditingFormId(formId);
    };

    const handleCancelEdit = () => {
        setEditingFormId(null);
        // Recharger les données du prospect
        if (prospect && prospect.form_data) {
            const projectFormData = prospect.form_data[projectType] || {};
            setFormData(projectFormData);
        }
    };

    const handleFieldChange = (formId, fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            [formId]: {
                ...(prev[formId] || {}),
                [fieldId]: value
            }
        }));
    };

    const handleSave = async () => {
        try {
            // Construire la structure form_data complète
            const updatedFormData = {
                ...(prospect.form_data || {}),
                [projectType]: formData
            };

            // Mettre à jour le prospect
            const updatedProspect = {
                ...prospect,
                form_data: updatedFormData,
                formData: updatedFormData // Pour compatibilité
            };

            await onUpdate(updatedProspect);

            toast({
                title: '✅ Formulaire enregistré',
                description: 'Les données du formulaire interne ont été sauvegardées.',
                className: 'bg-green-500 text-white'
            });

            setEditingFormId(null);
        } catch (error) {
            logger.error('Erreur sauvegarde formulaire interne:', error);
            toast({
                title: '❌ Erreur',
                description: 'Impossible de sauvegarder le formulaire.',
                variant: 'destructive'
            });
        }
    };

    // 🔥 Ne pas masquer le bloc s'il est vide (règle métier)
    return (
        <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Formulaires internes</h2>
                <span className="text-xs text-gray-500">{internalForms.length} formulaire(s)</span>
            </div>
            
            {internalForms.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                    Aucun formulaire interne pour ce projet.
                    <br />
                    <span className="text-xs">Créez un formulaire avec "Interne (équipe)" dans Gestion des Formulaires.</span>
                </p>
            ) : (
                <div className="space-y-4">
                {internalForms.map(form => {
                    const currentFormData = formData[form.id] || {};
                    const isEditing = editingFormId === form.id;

                    return (
                        <div key={form.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{form.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Formulaire interne (équipe uniquement)
                                    </p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                    Interne
                                </span>
                            </div>

                            <div className="space-y-3 pt-2">
                                {(form.fields || []).map(field => {
                                    // 🔥 Vérifier les conditions multiples d'affichage
                                    if (field.show_if_conditions && field.show_if_conditions.length > 0) {
                                        const operator = field.condition_operator || 'AND';
                                        const conditionResults = field.show_if_conditions.map(condition => {
                                            const currentValue = currentFormData[condition.field];
                                            if (condition.equals === 'has_value') {
                                                return !!currentValue && currentValue !== '';
                                            }
                                            return currentValue === condition.equals;
                                        });
                                        const shouldShow = operator === 'AND' 
                                            ? conditionResults.every(result => result === true)
                                            : conditionResults.some(result => result === true);
                                        if (!shouldShow) return null;
                                    }
                                    
                                    // 🔥 Rétro-compatibilité show_if
                                    if (field.show_if) {
                                        const conditionField = field.show_if.field;
                                        const expectedValue = field.show_if.equals;
                                        const currentValue = currentFormData[conditionField];
                                        
                                        if (!currentValue || currentValue !== expectedValue) {
                                            return null;
                                        }
                                    }
                                    
                                    // 🔥 Ne pas afficher les champs répétés directement
                                    const isInRepeatedGroup = (form.fields || []).some(f => 
                                        f.is_repeater && (f.repeats_fields || []).includes(field.id)
                                    );
                                    
                                    if (isInRepeatedGroup) {
                                        return null;
                                    }

                                    const fieldValue = currentFormData[field.id] || '';

                                    return (
                                        <div key={field.id} className="space-y-1">
                                            <Label className="text-sm font-medium text-gray-600">
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </Label>
                                            {isEditing ? (
                                                field.type === 'textarea' ? (
                                                    <textarea
                                                        value={fieldValue}
                                                        onChange={(e) => handleFieldChange(form.id, field.id, e.target.value)}
                                                        placeholder={field.placeholder || ''}
                                                        className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        value={fieldValue}
                                                        onChange={(e) => handleFieldChange(form.id, field.id, e.target.value)}
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    >
                                                        <option value="">-- Sélectionner --</option>
                                                        {(field.options || []).map((option, idx) => (
                                                            <option key={idx} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        type={field.type || 'text'}
                                                        value={fieldValue}
                                                        onChange={(e) => handleFieldChange(form.id, field.id, e.target.value)}
                                                        placeholder={field.placeholder || ''}
                                                    />
                                                )
                                            ) : (
                                                <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                                                    {fieldValue || <span className="text-gray-400 italic">Non renseigné</span>}
                                                </p>
                                            )}
                                            
                                            {/* 🔥 Afficher les champs répétés */}
                                            {field.is_repeater && field.repeats_fields && field.repeats_fields.length > 0 && fieldValue && (
                                                <div className="mt-4 space-y-3">
                                                    {Array.from({ length: parseInt(fieldValue) || 0 }, (_, repeatIndex) => {
                                                        const fieldsToRepeat = (form.fields || []).filter(f => 
                                                            field.repeats_fields.includes(f.id)
                                                        );
                                                        
                                                        return (
                                                            <div key={repeatIndex} className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                                                                <h4 className="font-semibold text-green-800 text-xs">
                                                                    {field.label} #{repeatIndex + 1}
                                                                </h4>
                                                                
                                                                {fieldsToRepeat.map(repeatedField => {
                                                                    const repeatedFieldKey = `${field.id}_repeat_${repeatIndex}_${repeatedField.id}`;
                                                                    const repeatedFieldValue = currentFormData[repeatedFieldKey] || '';
                                                                    
                                                                    return (
                                                                        <div key={repeatedFieldKey} className="space-y-1">
                                                                            <Label className="text-xs font-medium text-gray-600">
                                                                                {repeatedField.label}
                                                                            </Label>
                                                                            {isEditing ? (
                                                                                repeatedField.type === 'textarea' ? (
                                                                                    <textarea
                                                                                        value={repeatedFieldValue}
                                                                                        onChange={(e) => handleFieldChange(form.id, repeatedFieldKey, e.target.value)}
                                                                                        placeholder={repeatedField.placeholder || ''}
                                                                                        className="w-full min-h-[60px] px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                                                                    />
                                                                                ) : repeatedField.type === 'select' ? (
                                                                                    <select
                                                                                        value={repeatedFieldValue}
                                                                                        onChange={(e) => handleFieldChange(form.id, repeatedFieldKey, e.target.value)}
                                                                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                                    >
                                                                                        <option value="">-- Sélectionner --</option>
                                                                                        {(repeatedField.options || []).map((option, idx) => (
                                                                                            <option key={idx} value={option}>
                                                                                                {option}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                ) : (
                                                                                    <Input
                                                                                        type={repeatedField.type || 'text'}
                                                                                        value={repeatedFieldValue}
                                                                                        onChange={(e) => handleFieldChange(form.id, repeatedFieldKey, e.target.value)}
                                                                                        placeholder={repeatedField.placeholder || ''}
                                                                                        className="text-sm h-8"
                                                                                    />
                                                                                )
                                                                            ) : (
                                                                                <p className="text-sm text-gray-900 p-2 bg-white rounded-md min-h-[32px] flex items-center">
                                                                                    {repeatedFieldValue || <span className="text-gray-400 italic text-xs">Non renseigné</span>}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Boutons d'action */}
                            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                                {isEditing ? (
                                    <>
                                        <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                            <X className="h-4 w-4 mr-1" />
                                            Annuler
                                        </Button>
                                        <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                                            <Save className="h-4 w-4 mr-1" />
                                            Sauvegarder
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => handleStartEdit(form.id)}>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Modifier
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
};

const getFieldIcon = (field) => {
  switch (field.type) {
    case 'email': return <Mail className="h-4 w-4 text-gray-400" />;
    case 'phone':
    case 'tel': return <Phone className="h-4 w-4 text-gray-400" />;
    default:
      if (field.id.includes('company')) return <Building className="h-4 w-4 text-gray-400" />;
      if (field.id.includes('address')) return <MapPin className="h-4 w-4 text-gray-400" />;
      if (field.id.includes('name')) return <User className="h-4 w-4 text-gray-400" />;
      return <GripVertical className="h-4 w-4 text-gray-400" />;
  }
};

const ProspectDetailsAdmin = ({
  prospect,
  onBack,
  onUpdate,
  onEditingChange
}) => {
  const { getProjectSteps, completeStepAndProceed, updateProjectSteps, markNotificationAsRead, projectsData, formContactConfig, currentUser, userProjects, setUserProjects, getProjectInfo, updateProjectInfo, activeAdminUser, prompts, notifications } = useAppContext();
  const { supabaseUserId } = useSupabaseUser(); // 🔥 Récupérer l'UUID Supabase réel
  const { users: supabaseUsers, loading: usersLoading } = useUsers(); // 🔥 Cache global UsersContext
  const { projectStepsStatus: supabaseSteps, updateProjectSteps: updateSupabaseSteps } = useSupabaseProjectStepsStatus(prospect.id); // 🔥 Real-time steps
  
  // 🔥 V2: Hook pour charger les configs workflow persistées
  const { organizationId } = useOrganization();
  const { templates: v2Templates } = useSupabaseWorkflowModuleTemplates(
    organizationId || activeAdminUser?.organization_id, 
    null // Charger tous les project_types pour avoir accès à toutes les configs
  );
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProject = searchParams.get('project') || prospect._selectedProjectType; // 🔥 Utiliser aussi _selectedProjectType depuis notification
  const notificationId = searchParams.get('notificationId');
  const initialChannel = searchParams.get('channel'); // 🟠 Auto-switch onglet chat si notif partenaire

  const [activeProjectTag, setActiveProjectTag] = useState(initialProject || (prospect.tags && prospect.tags.length > 0 ? prospect.tags[0] : null));
  
  // ✅ Hook TOUJOURS appelé (règle des Hooks React) mais désactivé si pas de projet
  const { addHistoryEvent, addProjectEvent } = useSupabaseProjectHistory({
    projectType: activeProjectTag || '', // ⚠️ Ne jamais passer null/undefined
    prospectId: prospect.id,
    enabled: !!activeProjectTag && !!prospect.id,
    activeAdminUser
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // 🔥 FIX: Utiliser useState au lieu de useRef pour déclencher les re-renders (pattern du chat)
  const [editableProspect, setEditableProspect] = useState(prospect);
  
  // 🔥 SYNCHRONISER editableProspect avec prospect (real-time updates)
  useEffect(() => {
    setEditableProspect(prospect);
  }, [prospect]);
  
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  const projectInfo = useMemo(() => {
    if (!activeProjectTag) return {};
    return getProjectInfo(prospect.id, activeProjectTag) || {};
  }, [activeProjectTag, getProjectInfo, prospect.id]);

  // 🔥 ÉTAPE 2: État du statut projet (actif/abandon/archive)
  const [projectStatus, setProjectStatus] = useState(projectInfo?.status || 'actif');
  
  // 🔥 ÉTAPE 5: État pour stocker les statuts de tous les projets
  const [allProjectStatuses, setAllProjectStatuses] = useState({});

  const savedAmount = projectInfo?.amount;
  const euroFormatter = useMemo(() => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }), []);
  const [projectAmountInput, setProjectAmountInput] = useState('');
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  // 🔥 Utiliser les utilisateurs Supabase pour le dropdown
  const userOptions = useMemo(() => [
    { value: 'unassigned', label: 'Non assigné' },
    ...supabaseUsers.map(user => ({ value: user.user_id, label: user.name }))
  ], [supabaseUsers]);

  // 🔥 PRIORITÉ: Steps depuis Supabase (real-time), sinon fallback sur getProjectSteps
  const projectSteps = useMemo(() => {
    if (!activeProjectTag) return [];
    
    // 🔥 FIX: Utiliser UNIQUEMENT supabaseSteps (real-time)
    // Ne JAMAIS fallback sur getProjectSteps qui utilise un state global vide
    if (supabaseSteps[activeProjectTag]) {
      return supabaseSteps[activeProjectTag]
        .map(step => deriveSubStepsFromTemplate(step, activeProjectTag, v2Templates))
        .map(normalizeSubSteps);
    }
    
    // Si pas de steps Supabase, retourner template avec première étape en in_progress
    const templateSteps = projectsData[activeProjectTag]?.steps;
    if (templateSteps && templateSteps.length > 0) {
      const initialSteps = JSON.parse(JSON.stringify(templateSteps));
      initialSteps[0].status = 'in_progress';
      return initialSteps
        .map(step => deriveSubStepsFromTemplate(step, activeProjectTag, v2Templates))
        .map(normalizeSubSteps);
    }
    
    return [];
  }, [activeProjectTag, supabaseSteps, projectsData, v2Templates]);

  const currentStepIndex = projectSteps.findIndex(step => step.status === STATUS_CURRENT);
  const currentStep = projectSteps[currentStepIndex] || projectSteps.find(s => s.status === STATUS_PENDING) || projectSteps[0];
  
  // ❌ DÉSACTIVÉ: Hook pour exécuter automatiquement les actions workflow
  // Maintenant tout passe par le système manuel séquentiel via handleSelectPrompt
  // useWorkflowExecutor({
  //   prospectId: prospect.id,
  //   projectType: activeProjectTag,
  //   currentSteps: projectSteps,
  // });

  useEffect(() => {
    if (notificationId) {
      markNotificationAsRead(parseInt(notificationId));
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('notificationId');
      setSearchParams(newParams, { replace: true });
    }
  }, [notificationId, markNotificationAsRead, setSearchParams, searchParams]);

  // 🔥 FIX: Ouvrir automatiquement le bon projet depuis les query params (notifications)
  useEffect(() => {
    const urlProjectType = searchParams.get('project');
    if (urlProjectType && urlProjectType !== activeProjectTag && prospect.tags?.includes(urlProjectType)) {
      logger.debug('Opening project from URL', { projectType: urlProjectType });
      setActiveProjectTag(urlProjectType);
    }
  }, [searchParams, prospect.tags]);

  // 🔥 AUTO-MARK: Marquer les notifications du prospect + projet comme lues à l'ouverture
  useEffect(() => {
    if (!prospect?.id || !activeProjectTag || !notifications || !markNotificationAsRead) return;

    const prospectNotifications = notifications.filter(
      notif => !notif.read && notif.prospectId === prospect.id && notif.projectType === activeProjectTag
    );

    if (prospectNotifications.length > 0) {
      prospectNotifications.forEach(notif => {
        markNotificationAsRead(notif.id);
      });
    }
  }, [prospect?.id, activeProjectTag, notifications, markNotificationAsRead]);

  // 🔥 FIX: Synchroniser le state quand la prop change (pattern du chat)
  useEffect(() => {
    logger.debug('Prospect prop changed', { name: prospect.name });
    setEditableProspect(prospect);
  }, [prospect]);

  useEffect(() => {
    // Ne mettre à jour l'input QUE si on n'est pas en train d'éditer
    if (isEditingAmount) return;
    
    if (savedAmount === undefined || savedAmount === null || savedAmount === '') {
      setProjectAmountInput('');
    } else {
      setProjectAmountInput(savedAmount.toString());
    }
  }, [savedAmount, isEditingAmount]);

  // 🔥 ÉTAPE 2: Charger le statut depuis projectInfo
  useEffect(() => {
    const loadProjectStatus = async () => {
      if (!activeProjectTag || !prospect.id) return;
      
      // Récupérer le statut depuis Supabase
      const { data, error } = await supabase
        .from('project_infos')
        .select('data')
        .eq('prospect_id', prospect.id)
        .eq('project_type', activeProjectTag)
        .maybeSingle();
      
      if (error) {
        logger.error('Erreur chargement project status:', error);
        setProjectStatus('actif');
      } else if (data?.data?.status) {
        setProjectStatus(data.data.status);
      } else {
        // Si aucune ligne n'existe, statut par défaut 'actif'
        setProjectStatus('actif');
      }
    };
    
    loadProjectStatus();
  }, [activeProjectTag, prospect.id]);

  // 🔥 ÉTAPE 5: Charger les statuts de tous les projets associés
  useEffect(() => {
    const loadAllProjectStatuses = async () => {
      if (!prospect.id || !prospect.tags || prospect.tags.length === 0) return;
      
      const { data, error } = await supabase
        .from('project_infos')
        .select('project_type, status')
        .eq('prospect_id', prospect.id)
        .in('project_type', prospect.tags);
      
      if (data) {
        const statusMap = {};
        data.forEach(item => {
          statusMap[item.project_type] = item.status || 'actif';
        });
        setAllProjectStatuses(statusMap);
      }
    };
    
    loadAllProjectStatuses();
  }, [prospect.id, prospect.tags]);

  // ✅ Notifier le parent quand le mode édition change (pour bloquer le real-time)
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isEditing);
    }
  }, [isEditing, onEditingChange]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔥 V2: Listener signature_procedures pour completionTrigger: 'signature'
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!prospect.id) return;

    const channel = supabase
      .channel(`signature-completion-${prospect.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signature_procedures',
          filter: `prospect_id=eq.${prospect.id}`,
        },
        async (payload) => {
          const { new: newRecord, old: oldRecord } = payload;
          
          // Déclencher uniquement quand status passe à 'signed'
          if (newRecord.status !== 'signed' || oldRecord?.status === 'signed') {
            return;
          }

          const projectType = newRecord.project_type;
          logger.info('[V2 Signature Listener] Signature completed', {
            procedureId: newRecord.id,
            projectType,
            prospectId: newRecord.prospect_id,
          });

          // Récupérer les steps pour ce projet
          const projectStepsForType = supabaseSteps?.[projectType];
          if (!projectStepsForType || projectStepsForType.length === 0) {
            logger.warn('[V2 Signature Listener] No steps found for project type', { projectType });
            return;
          }

          // Trouver le step courant (status = 'in_progress')
          const currentStepIdx = projectStepsForType.findIndex(s => s.status === 'in_progress');
          if (currentStepIdx === -1) {
            logger.warn('[V2 Signature Listener] No current step in_progress', { projectType });
            return;
          }

          const currentStepName = projectStepsForType[currentStepIdx]?.name;
          if (!currentStepName) {
            logger.warn('[V2 Signature Listener] Current step has no name', { currentStepIdx });
            return;
          }

          // Vérifier la config V2 pour ce module
          const moduleActionConfig = getModuleActionConfig(currentStepName);
          
          if (moduleActionConfig?.completionTrigger !== 'signature') {
            logger.debug('[V2 Signature Listener] completionTrigger is not "signature", skipping', {
              stepName: currentStepName,
              completionTrigger: moduleActionConfig?.completionTrigger || 'null',
            });
            return;
          }

          // ✅ Trigger completeStepAndProceed
          logger.info('[V2 Signature Listener] Triggering completeStepAndProceed', {
            prospectId: prospect.id,
            projectType,
            currentStepIdx,
            stepName: currentStepName,
          });

          try {
            await completeStepAndProceed(
              prospect.id,
              projectType,
              currentStepIdx,
              projectStepsForType
            );
            
            toast({
              title: '✅ Étape validée automatiquement',
              description: `La signature a déclenché la validation de "${currentStepName}"`,
              className: 'bg-green-500 text-white',
            });
          } catch (error) {
            logger.error('[V2 Signature Listener] Error completing step', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prospect.id, supabaseSteps, completeStepAndProceed]);

  // ❌ SUPPRIMÉ : Tous les systèmes de blocage de scroll causent plus de problèmes qu'ils n'en résolvent
  // Le vrai problème est le re-render trop fréquent du composant
  
  const handleProjectClick = (tag) => {
    setActiveProjectTag(tag);
    setSearchParams(
      (prev) => {
        prev.set('project', tag);
        return prev;
      },
      { replace: true }
    );
  };

  // 🔥 ÉTAPE 4: Fonction de changement de statut
  const handleChangeStatus = async (newStatus) => {
    if (!activeProjectTag || !prospect.id) return;
    
    const oldStatus = projectStatus;
    
    // Optimistic update
    setProjectStatus(newStatus);
    
    try {
      // Mettre à jour le statut dans project_infos
      const { error: updateError } = await supabase
        .from('project_infos')
        .upsert({
          prospect_id: prospect.id,
          project_type: activeProjectTag,
          status: newStatus,
          data: projectInfo?.data || {}
        }, {
          onConflict: 'prospect_id,project_type'
        });
      
      if (updateError) throw updateError;
      
      // Ajouter un événement dans l'historique
      const statusLabels = {
        'actif': 'réactivé',
        'abandon': 'abandonné',
        'archive': 'archivé'
      };
      
      // Insérer directement dans project_history
      const { error: historyError } = await supabase
        .from('project_history')
        .insert({
          prospect_id: prospect.id,
          project_type: activeProjectTag,
          event_type: 'status',
          description: `Projet ${statusLabels[newStatus] || newStatus}`,
          organization_id: activeAdminUser?.organization_id, // ✅ Depuis activeAdminUser
          metadata: {
            old_status: oldStatus,
            new_status: newStatus
          }
        });
      
      if (historyError) {
        logger.error('Erreur historique:', historyError);
      }
      
      // Mettre à jour projectInfo dans le context
      updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => ({
        ...prevInfo,
        status: newStatus
      }));
      
      // Mettre à jour allProjectStatuses pour les badges
      setAllProjectStatuses(prev => ({
        ...prev,
        [activeProjectTag]: newStatus
      }));
      
      toast({
        title: "✅ Statut mis à jour",
        description: `Le projet est maintenant "${statusLabels[newStatus]}".`,
        className: "bg-green-500 text-white"
      });
      
    } catch (error) {
      logger.error('Erreur lors du changement de statut:', error);
      setProjectStatus(oldStatus); // Rollback
      toast({
        title: "❌ Erreur",
        description: "Impossible de changer le statut du projet.",
        variant: "destructive"
      });
    }
  };

  const handleProjectAmountChange = (value) => {
    setProjectAmountInput(value);
  };

  const handleProjectAmountCommit = (rawValue) => {
    if (!activeProjectTag) return;
    const normalizedInput = rawValue.replace(',', '.').trim();

    if (normalizedInput === '') {
      updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => {
        if (!prevInfo.amount) {
          return prevInfo;
        }
        const nextInfo = { ...prevInfo };
        delete nextInfo.amount;
        return nextInfo;
      });
      setProjectAmountInput('');
      return;
    }

    const parsedValue = parseFloat(normalizedInput);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      setProjectAmountInput(savedAmount === undefined || savedAmount === null ? '' : savedAmount.toString());
      return;
    }

    const roundedValue = Math.round(parsedValue * 100) / 100;
    updateProjectInfo(prospect.id, activeProjectTag, (prevInfo = {}) => ({
      ...prevInfo,
      amount: roundedValue,
    }));
    setProjectAmountInput(roundedValue.toFixed(2));
  };

  const handleProjectAmountBlur = () => {
    handleProjectAmountCommit(projectAmountInput);
    setIsEditingAmount(false);
  };

  const handleProjectAmountKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleProjectAmountCommit(event.currentTarget.value);
      event.currentTarget.blur();
      setIsEditingAmount(false);
    }
  };

  const handleUpdateStatus = async (clickedIndex, newStatus) => {
    // Capturer l'étape avant modification pour l'historique
    const previousStep = projectSteps[clickedIndex];

    // Garde-fou sous-étapes : impossible de compléter l'étape si des sous-étapes restent
    if (newStatus === STATUS_COMPLETED && previousStep?.subSteps?.length > 0) {
      const allDone = areAllSubStepsCompleted(previousStep);
      if (!allDone) {
        toast({
          title: 'Sous-étapes en cours',
          description: 'Vous devez valider chaque sous-étape avant de terminer cette étape.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Remettre en cours une étape avec sous-étapes → réinitialiser la première en cours
    if (newStatus === STATUS_CURRENT && previousStep?.subSteps?.length > 0) {
      const newSteps = JSON.parse(JSON.stringify(projectSteps));
      const step = newSteps[clickedIndex];
      step.status = STATUS_CURRENT;
      step.subSteps = step.subSteps.map((s, idx) => ({
        ...s,
        status: idx === 0 ? STATUS_CURRENT : STATUS_PENDING,
      }));

      await updateSupabaseSteps(activeProjectTag, newSteps);

      if (addHistoryEvent) {
        await addHistoryEvent({
          event_type: "pipeline",
          title: "Étape relancée",
          description: `Sous-étapes réinitialisées pour « ${step.name} »`,
          metadata: {
            step_id: step?.id || null,
            step_name: step?.name || null,
            previous_status: previousStep?.status || null,
            new_status: STATUS_CURRENT,
            project_type: activeProjectTag,
          },
          createdBy: supabaseUserId,
          createdByName: activeAdminUser?.name || activeAdminUser?.email,
        });
      }
      return;
    }
    
    if (newStatus === STATUS_COMPLETED) {
      // Compléter et passer à l'étape suivante
      const newSteps = JSON.parse(JSON.stringify(projectSteps));
      newSteps[clickedIndex].status = 'completed';
      
      let nextStepIndex = clickedIndex + 1;
      if (nextStepIndex < newSteps.length) {
        newSteps[nextStepIndex].status = 'in_progress';
      }
      
      // Utiliser le hook Supabase (real-time)
      await updateSupabaseSteps(activeProjectTag, newSteps);
      
      // 🔥 AJOUTER UN ÉVÉNEMENT DANS L'HISTORIQUE
      if (addHistoryEvent) {
        const nextStep = nextStepIndex < newSteps.length ? newSteps[nextStepIndex] : null;
        await addHistoryEvent({
          event_type: "pipeline",
          title: "Étape du pipeline mise à jour",
          description: previousStep && nextStep
            ? `Étape « ${previousStep.name} » complétée → passage à « ${nextStep.name} »`
            : `Étape « ${previousStep.name} » complétée`,
          metadata: {
            previous_step_id: previousStep?.id || null,
            previous_step_name: previousStep?.name || null,
            previous_step_status: previousStep?.status || null,
            new_step_id: nextStep?.id || null,
            new_step_name: nextStep?.name || null,
            new_step_status: 'in_progress',
            project_type: activeProjectTag,
          },
          createdBy: supabaseUserId,
          createdByName: activeAdminUser?.name || activeAdminUser?.email,
        });
      }
      
      // 🔥 MISE À JOUR DU PIPELINE GLOBAL
      // Si l'étape suivante a un globalStepId, déplacer le prospect dans cette colonne
      if (nextStepIndex < newSteps.length && newSteps[nextStepIndex].globalStepId) {
        const globalStepId = newSteps[nextStepIndex].globalStepId;
        
        const updatedProspect = {
          ...prospect,
          status: globalStepId // Mettre à jour le status global du prospect
        };
        onUpdate(updatedProspect);
        
        toast({
          title: "📊 Pipeline mis à jour",
          description: "Le prospect a été déplacé dans le pipeline",
        });
      }
    } else {
      const updatedSteps = projectSteps.map((step, index) => {
        let status = step.status;
        if (index === clickedIndex) {
            status = newStatus;
        }
        return { ...step, status };
      });
      
      // Utiliser le hook Supabase (real-time)
      await updateSupabaseSteps(activeProjectTag, updatedSteps);
      
      // 🔥 AJOUTER UN ÉVÉNEMENT DANS L'HISTORIQUE
      if (addHistoryEvent) {
        const newStep = updatedSteps[clickedIndex];
        await addHistoryEvent({
          event_type: "pipeline",
          title: "Étape du pipeline mise à jour",
          description: `Étape « ${newStep.name} » passée de « ${previousStep.status === 'pending' ? 'À venir' : previousStep.status === 'in_progress' ? 'En cours' : 'Terminé'} » à « ${newStatus === 'pending' ? 'À venir' : newStatus === 'in_progress' ? 'En cours' : 'Terminé'} »`,
          metadata: {
            step_id: newStep?.id || null,
            step_name: newStep?.name || null,
            previous_status: previousStep?.status || null,
            new_status: newStatus,
            project_type: activeProjectTag,
          },
          createdBy: supabaseUserId,
          createdByName: activeAdminUser?.name || activeAdminUser?.email,
        });
      }
      
      // 🔥 MISE À JOUR DU PIPELINE GLOBAL si l'étape en cours a un globalStepId
      const currentStep = updatedSteps[clickedIndex];
      if (currentStep.globalStepId && newStatus === 'in_progress') {
        const updatedProspect = {
          ...prospect,
          status: currentStep.globalStepId
        };
        onUpdate(updatedProspect);
      }
    }
  };

  const handleAddProject = async (projectType) => {
    // 🔥 FIX: Utiliser editableProspect au lieu de prospect
    const currentTags = editableProspect.tags || [];
    if (!currentTags.includes(projectType)) {
      const updatedProspect = {
        ...editableProspect,
        tags: [...currentTags, projectType]
      };
      
      // 🔥 FIX: Mettre à jour le state local immédiatement
      setEditableProspect(updatedProspect);
      
      // Puis propager au parent
      onUpdate(updatedProspect);
      setActiveProjectTag(projectType);
      
      // 🔥 PHASE 4: Si ce prospect est le currentUser connecté, synchroniser avec userProjects
      if (currentUser && prospect.id === currentUser.id) {
        if (!userProjects.includes(projectType)) {
          const updatedUserProjects = [...userProjects, projectType];
          setUserProjects(updatedUserProjects);
          // 🔥 PHASE 4: localStorage.setItem('userProjects') supprimé - currentUser.tags est la source
        }
      }
      
      // 🔥 INITIALISER LES ÉTAPES DANS SUPABASE dès l'ajout du projet
      const defaultSteps = projectsData[projectType]?.steps;
      if (defaultSteps && defaultSteps.length > 0) {
        try {
          // Copier les steps et mettre la première en "in_progress"
          const initialSteps = JSON.parse(JSON.stringify(defaultSteps));
          initialSteps[0].status = 'in_progress';
          
          // Sauvegarder dans Supabase via le hook
          await updateSupabaseSteps(projectType, initialSteps);
          
          logger.debug('Steps initialized in Supabase', { projectType });
        } catch (error) {
          logger.error('Steps initialization error:', error);
        }
      }
      
      toast({
        title: "✅ Projet ajouté !",
        description: `Le projet ${projectsData[projectType]?.title} a été associé au prospect.`,
      });
    }
    setShowAddProjectModal(false);
  };

  const getAvailableProjects = () => {
    // 🔥 FIX: Utiliser editableProspect au lieu de prospect
    const currentTags = editableProspect.tags || [];
    return Object.values(projectsData)
      .filter(project => project.isPublic && !currentTags.includes(project.type));
  };

  const handleActionClick = async (action) => {
    switch (action) {
      case 'Appel':
        // 🔥 FIX: Utiliser editableProspect
        if (editableProspect.phone) window.location.href = `tel:${editableProspect.phone}`;
        break;
      case 'Mail':
        // 🔥 FIX: Utiliser editableProspect
        if (editableProspect.email) window.location.href = `mailto:${editableProspect.email}`;
        break;
      case 'WhatsApp':
        // 🔥 FIX: Utiliser editableProspect
        if (editableProspect.phone) {
          const phoneNumber = editableProspect.phone.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/${phoneNumber}`, '_blank');
        } else {
          toast({
            title: "Numéro de téléphone manquant",
            description: "Ce contact n'a pas de numéro de téléphone.",
            variant: "destructive",
          });
        }
        break;
      case 'GPS':
        if (prospect.address) {
          const encodedAddress = encodeURIComponent(prospect.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      case 'Invitation':
        // 🔥 Envoyer/Renvoyer magic link au prospect
        if (!editableProspect.email) {
          toast({
            title: "Email manquant",
            description: "Ce prospect n'a pas d'email.",
            variant: "destructive",
          });
          return;
        }
        try {
          const redirectUrl = `${window.location.origin}/dashboard`;
          const orgId = organizationId || activeAdminUser?.organization_id;
          console.log('[handleActionClick] 📧 Sending magic link to:', editableProspect.email, 'org:', orgId);
          
          const { error: magicLinkError } = await supabase.auth.signInWithOtp({
            email: editableProspect.email.trim(),
            options: {
              shouldCreateUser: true,
              emailRedirectTo: redirectUrl,
              data: {
                organization_id: orgId, // 🔥 Multi-tenant: passer l'org_id pour le trigger
              }
            }
          });

          if (magicLinkError) {
            console.error('[handleActionClick] ❌ Magic link error:', magicLinkError);
            toast({
              title: "❌ Erreur envoi invitation",
              description: magicLinkError.message,
              variant: "destructive",
            });
          } else {
            console.log('[handleActionClick] ✅ Magic link sent to:', editableProspect.email);
            toast({
              title: "✅ Invitation envoyée",
              description: `Magic link envoyé à ${editableProspect.email}`,
              className: "bg-green-500 text-white",
            });
          }
        } catch (err) {
          console.error('[handleActionClick] 💥 Exception:', err);
          toast({
            title: "❌ Erreur",
            description: err.message,
            variant: "destructive",
          });
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };
  
  // ✅ Gérer le passage en mode édition SANS scroll
  const handleStartEditing = () => {
    // Sauvegarder la position actuelle
    const currentScrollY = window.scrollY;
    
    // Passer en mode édition
    setIsEditing(true);
    
    // Restaurer la position après le re-render (double RAF pour Safari)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: currentScrollY, behavior: 'instant' });
      });
    });
  };
  
  const handleSave = () => {
    try {
      onUpdate(editableProspect);
      setIsEditing(false);
      toast({
        title: "✅ Prospect mis à jour",
        description: "Les informations du prospect ont été enregistrées."
      });
    } catch (err) {
      logger.error('❌ Erreur sauvegarde:', err);
      toast({
        title: "❌ Erreur",
        description: err.message,
        variant: "destructive"
      });
    }
  };
  const handleInputChange = (fieldId, value) => {
    // 🔥 FIX: Utiliser setState pour déclencher re-render (pattern du chat)
    setEditableProspect(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleOwnerChange = (ownerId) => {
    // 🔧 Convertir l'ID local en UUID Supabase si c'est l'utilisateur connecté
    let finalOwnerId = ownerId;
    
    if (ownerId === 'unassigned') {
      finalOwnerId = null;
    } else if (ownerId === 'user-1' && supabaseUserId) {
      // Si on essaie d'assigner à "user-1" (ID local), utiliser l'UUID Supabase réel
      finalOwnerId = supabaseUserId;
    }
    
    // 🔥 FIX: Utiliser setState pour déclencher re-render (pattern du chat)
    setEditableProspect(prev => ({
      ...prev,
      ownerId: finalOwnerId,
    }));
  };

  const activeProjectData = projectsData[activeProjectTag];
  // ✅ Désactiver COMPLÈTEMENT le scroll automatique du navigateur
  useEffect(() => {
    // Désactiver le scroll automatique vers les éléments focusés
    const style = document.createElement('style');
    style.id = 'disable-auto-scroll';
    style.textContent = `
      * {
        scroll-margin: 0 !important;
        scroll-padding: 0 !important;
      }
      input:focus, textarea:focus, select:focus {
        scroll-margin-block: 0 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('disable-auto-scroll');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <>
      <motion.div 
        initial={{
          opacity: 0,
          y: 20
        }} 
        animate={{
          opacity: 1,
          y: 0
        }} 
        className="space-y-6"
      >
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              {/* 🔥 FIX: Utiliser editableProspect pour affichage real-time */}
              <h1 className="text-2xl font-bold text-gray-900">{editableProspect.name}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_420px] gap-6 xl:gap-6 items-stretch">
            <div className="space-y-6">
               <div className="bg-white rounded-2xl shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Projets associés</h2>
                  <Button size="icon" className="rounded-full" onClick={() => setShowAddProjectModal(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* 🔥 FIX: Utiliser editableProspect.tags pour affichage real-time */}
                  {(editableProspect.tags || []).map(tag => {
                    const status = allProjectStatuses[tag] || 'actif';
                    return (
                      <button 
                        key={tag} 
                        onClick={() => handleProjectClick(tag)} 
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 flex items-center gap-2 ${
                          activeProjectTag === tag 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>{projectsData[tag]?.title || tag}</span>
                        {/* 🔥 ÉTAPE 5: Badge de statut */}
                        {status === 'abandon' && (
                          <span className={`text-xs font-medium ${
                            activeProjectTag === tag ? 'text-red-200' : 'text-red-600'
                          }`}>
                            (Abandonné)
                          </span>
                        )}
                        {status === 'archive' && (
                          <span className={`text-xs font-medium ${
                            activeProjectTag === tag ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            (Archivé)
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {/* 🔥 FIX: Utiliser editableProspect.tags pour affichage real-time */}
                  {(!editableProspect.tags || editableProspect.tags.length === 0) && (
                    <p className="text-gray-400 text-sm italic">Aucun projet associé</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
                <div className="flex flex-wrap justify-between gap-2 text-center">
                  {[{
              icon: Phone,
              label: 'Appel'
            }, {
              icon: Mail,
              label: 'Mail'
            }, {
              icon: MessageCircle,
              label: 'WhatsApp'
            }, {
              icon: MapPin,
              label: 'GPS'
            }, {
              icon: UserPlus,
              label: 'Invitation',
              highlight: !editableProspect.userId // 🔥 Mettre en évidence si pas encore invité
            }].map(({
              icon: Icon,
              label,
              highlight
            }) => <button key={label} onClick={() => handleActionClick(label)} className={`flex flex-col items-center space-x-1 transition-colors group ${highlight ? 'text-orange-600 hover:text-orange-700' : 'text-gray-600 hover:text-blue-600'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${highlight ? 'bg-orange-100 group-hover:bg-orange-200' : 'bg-gray-100 group-hover:bg-blue-100'}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium">{label}</span>
                    </button>)}
                </div>
              </div>

              {/* Bloc Activité en cours */}
              <ProspectActivities prospectId={prospect.id} projectType={activeProjectTag} />

              <ProspectForms 
                prospect={editableProspect} 
                projectType={activeProjectTag}
                supabaseSteps={supabaseSteps}
                v2Templates={v2Templates}
                onUpdate={(updated) => {
                  // 🔥 FIX: Mettre à jour editableProspect immédiatement
                  setEditableProspect(updated);
                  // Et aussi appeler onUpdate du parent pour Supabase
                  if (onUpdate) onUpdate(updated);
                }} 
              />

              {/* 🆕 Bloc Formulaires Internes (juste en dessous de "Formulaires soumis") */}
              <InternalForms
                prospect={editableProspect}
                projectType={activeProjectTag}
                onUpdate={(updated) => {
                  setEditableProspect(updated);
                  if (onUpdate) onUpdate(updated);
                }}
              />
              
              <div className="bg-white rounded-2xl shadow-card p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Informations Prospect</h2>
                    {isEditing ? <div className="flex items-center space-x-2">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
                      </div> : <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleStartEditing}><Edit className="h-4 w-4" /></Button>}
                 </div>
                <div className="space-y-3 text-sm">
                  {formContactConfig.map(field => (
                    <div key={field.id} className="flex items-start space-x-3">
                      {getFieldIcon(field)}
                      <div className="flex-1">
                        <Label htmlFor={field.id} className="text-xs text-gray-500">{field.name.replace('*', '')}</Label>
                        {isEditing ? (
                          <Input
                            id={field.id}
                            name={field.id}
                            type={field.type}
                            value={editableProspect[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="h-8 text-sm"
                            placeholder={field.placeholder}
                            autoFocus={false}
                          />
                        ) : (
                          <p className="text-gray-700">{editableProspect[field.id] || <span className="text-gray-400">Non renseigné</span>}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Suivi par</Label>
                      {isEditing ? (
                        <SearchableSelect
                          options={userOptions}
                          value={editableProspect.ownerId || 'unassigned'}
                          onSelect={handleOwnerChange}
                          placeholder="Sélectionner un utilisateur"
                          searchPlaceholder="Rechercher..."
                          emptyText="Aucun utilisateur trouvé."
                        />
                      ) : (
                        <p className="text-gray-700">
                          {supabaseUsers.find(u => u.user_id === editableProspect.ownerId)?.name || 'Non assigné'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 pt-3 border-t border-gray-100">
                    <Hash className="h-4 w-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                        <Label className="text-xs text-gray-500">ID Prospect</Label>
                        <p className="text-gray-700 text-xs font-mono">{prospect.id}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 pt-3 border-t border-gray-100">
                    <User className="h-4 w-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                        <Label className="text-xs text-gray-500">ID Utilisateur (owner)</Label>
                        <p className="text-gray-700 text-xs font-mono">{prospect.ownerId || 'Non assigné'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ProjectCenterPanel
              prospectId={prospect.id}
              projectType={activeProjectTag}
              currentStep={currentStep}
              statusConfig={statusConfig}
              activeAdminUser={activeAdminUser}
            >
              {activeProjectTag && (
                <ChatInterface 
                  prospectId={prospect.id} 
                  projectType={activeProjectTag} 
                  currentStepIndex={currentStepIndex !== -1 ? currentStepIndex : 0}
                  activeAdminUser={activeAdminUser}
                  initialChannel={initialChannel}
                />
              )}
            </ProjectCenterPanel>

            <div className="space-y-6 xl:max-w-[520px] w-full flex flex-col">
              {activeProjectTag && (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-lg p-6 border border-gray-200 relative">
                  <button
                    onClick={() => setIsEditingAmount(!isEditingAmount)}
                    className="absolute top-3 right-3 p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    title={isEditingAmount ? "Annuler" : "Modifier le montant"}
                  >
                    {isEditingAmount ? (
                      <X className="h-4 w-4 text-gray-600" />
                    ) : (
                      <Edit className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                  <p className="text-xs font-medium text-gray-500 mb-2 text-center">Montant du deal</p>
                  {isEditingAmount ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-gray-500">€</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={projectAmountInput}
                          onChange={(e) => handleProjectAmountChange(e.target.value)}
                          onKeyDown={handleProjectAmountKeyDown}
                          placeholder="0,00"
                          className="pl-7 text-xl font-bold text-center w-40 h-11"
                          autoFocus
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleProjectAmountBlur}
                        className="h-8"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-4xl font-bold text-gray-900 text-center">
                      {typeof savedAmount === 'number' ? euroFormatter.format(savedAmount) : '0,00 €'}
                    </p>
                  )}
                </div>
              )}
              <div className="bg-white rounded-2xl shadow-card p-6 flex-1">
                <div className="flex items-center justify-center mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Étapes du projet
                    </h2>
                    <span className="text-gray-400">:</span>
                    
                    {/* 🔥 ÉTAPE 3: Sélecteur de statut projet (style badge comme les étapes) */}
                    <Select value={projectStatus} onValueChange={handleChangeStatus}>
                      <SelectTrigger className={`w-auto h-auto text-sm px-3 py-1.5 rounded-full border-none shadow-none font-medium ${
                        projectStatus === 'actif' 
                          ? 'bg-green-100 text-green-700' 
                          : projectStatus === 'abandon'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-44">
                        <SelectItem value="actif" className="text-sm hover:bg-green-50 text-green-600">
                          Actif
                        </SelectItem>
                        <SelectItem value="abandon" className="text-sm hover:bg-red-50 text-red-600">
                          Abandonné
                        </SelectItem>
                        <SelectItem value="archive" className="text-sm hover:bg-gray-100 text-gray-600">
                          Archivé
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ProjectTimeline 
                  steps={projectSteps} 
                  onUpdateStatus={handleUpdateStatus} 
                  prompts={prompts}
                  projectType={activeProjectTag}
                  currentStepIndex={currentStepIndex}
                  prospectId={prospect.id}
                  completeStepAndProceed={completeStepAndProceed}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modal pour ajouter un projet */}
        <Dialog open={showAddProjectModal} onOpenChange={setShowAddProjectModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un projet</DialogTitle>
              <DialogDescription>
                Sélectionnez un projet à associer à ce prospect.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {getAvailableProjects().length > 0 ? (
                getAvailableProjects().map(project => (
                  <Button
                    key={project.type}
                    variant="outline"
                    onClick={() => handleAddProject(project.type)}
                    className="flex items-center justify-start space-x-3 h-auto p-4"
                  >
                    <span className="text-2xl">{project.icon}</span>
                    <span className="font-medium">{project.title}</span>
                  </Button>
                ))
              ) : (
                <p className="text-center text-gray-500 italic">
                  Tous les projets disponibles sont déjà associés à ce prospect.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
};

// Composant réutilisant les mêmes cartes et modal que l'Agenda
const ProspectActivities = ({ prospectId, projectType }) => {
  // 🔥 PR-3: Récupérer toutes les données agenda depuis AppContext (source unique)
  const { 
    activeAdminUser, 
    prospects, 
    projectsData,
    appointments: allAppointments,
    agendaLoading,
    updateAppointment, 
    deleteAppointment,
    addAppointment,
    addCall,
    addTask,
    updateCall,
    updateTask
  } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useUsers(); // 🔥 Cache global UsersContext
  const { supabaseUserId } = useSupabaseUser();
  
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedActivityType, setSelectedActivityType] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityModalData, setActivityModalData] = useState(null);

  // 🔥 Filtrer les activités pour ce prospect ET ce projet (futures uniquement)
  const prospectActivities = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0) return [];
    
    const now = new Date();
    
    // Filtrer par prospect ET projet ET statut actif uniquement
    const filtered = allAppointments.filter(apt => {
      // Vérifier que c'est le bon prospect
      if (apt.contactId !== prospectId) return false;
      
      // 🔥 Filtrer par projet actif
      if (projectType && apt.projectId !== projectType) return false;
      
      // 🔥 N'afficher QUE les activités actives (pending, prevu)
      const status = apt.status?.toLowerCase();
      if (status !== 'pending' && status !== 'prevu') {
        return false;
      }
      
      // Afficher si future OU si en retard (passée mais toujours pending)
      return true;
    });
    
    // Trier par date croissante (plus proche en premier)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      return dateA - dateB;
    });
  }, [allAppointments, prospectId, projectType]);

  const handleActivityClick = (activity, type) => {
    setSelectedEvent(activity);
  };

  const handleCloseModal = () => {
    setSelectedActivity(null);
    setSelectedActivityType(null);
    setSelectedEvent(null);
  };

  // 🔥 Fonction pour éditer une activité
  const handleEdit = (activityToEdit) => {
    setSelectedEvent(null); // Fermer le popup de détails
    setActivityModalData({ ...activityToEdit, type: activityToEdit.type });
    setShowAddActivity(true);
  };

  // 🔥 Affichage pendant le chargement
  if (agendaLoading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Activité en cours</h3>
        <p className="text-gray-400 italic">Chargement des activités...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow mt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            Activités à venir {projectType && `(${projectsData[projectType]?.title})`}
          </h3>
        </div>
        
        {prospectActivities.length === 0 ? (
          <p className="text-gray-400 italic">Aucune activité future planifiée pour ce projet.</p>
        ) : (
          <div className="space-y-3">
            {prospectActivities.map((activity) => {
              const startDate = new Date(activity.start);
              
              // Déterminer l'icône et la couleur selon le type
              const typeConfig = {
                'physical': { icon: Calendar, color: 'blue', label: '📍 RDV' },
                'virtual': { icon: Calendar, color: 'purple', label: '🎥 Visio' },
                'call': { icon: Phone, color: 'green', label: '📞 Appel' },
                'task': { icon: Check, color: 'yellow', label: '✅ Tâche' },
              };
              
              const config = typeConfig[activity.type] || typeConfig['physical'];
              const IconComponent = config.icon;
              
              // Configuration des badges de statut
              const statusBadgeStyles = {
                effectue: 'bg-green-500 text-white',
                annule: 'bg-red-500 text-white',
                reporte: 'bg-yellow-400 text-black',
                pending: 'bg-gray-200 text-gray-700',
              };
              
              const statusLabels = {
                effectue: 'Effectué',
                annule: 'Annulé',
                reporte: 'Reporté',
                pending: 'Prévu',
              };
              
              return (
                <div 
                  key={activity.id} 
                  onClick={() => handleActivityClick(activity, activity.type)}
                  className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 border-l-4 border-${config.color}-500 relative transition-all`}
                >
                  <div className="flex items-center justify-between overflow-hidden">
                    <div className="flex items-start space-x-3 flex-1 min-w-0 overflow-hidden">
                      <div className="flex-shrink-0">
                        <IconComponent className={`h-5 w-5 text-${config.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title || config.label}
                        </p>
                        {activity.notes && (
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {activity.notes}
                          </p>
                        )}
                        {activity.step && (
                          <span className="text-xs text-gray-500 mt-1 block truncate">
                            📍 {activity.step}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <span className={`text-xs font-semibold text-${config.color}-700 bg-${config.color}-100 px-2 py-1 rounded-full whitespace-nowrap`}>
                        {format(startDate, 'dd/MM')}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {format(startDate, 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Badge de statut - Ne pas afficher pour "Prévu" */}
                  {statusLabels[activity.status] && activity.status !== 'pending' && (
                    <span className={`absolute bottom-1 right-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusBadgeStyles[activity.status]}`}>
                      {statusLabels[activity.status]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal pour afficher les détails */}
      <EventDetailsPopup 
        event={selectedEvent}
        onClose={handleCloseModal}
        onReport={() => {}} // Pas de report depuis le prospect pour l'instant
        onEdit={handleEdit} // 🔥 Utiliser handleEdit pour permettre la modification
        prospects={prospects}
        supabaseUsers={supabaseUsers}
        updateAppointment={updateAppointment}
        deleteAppointment={deleteAppointment}
        projectsData={projectsData}
      />

      {/* 🔥 Modal pour ajouter/éditer une activité */}
      {showAddActivity && (
        <AddActivityModal
          open={showAddActivity}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setActivityModalData(null); // Reset les données quand on ferme
            }
            setShowAddActivity(isOpen);
          }}
          initialData={activityModalData || {
            contactId: prospectId,
            projectId: projectType,
          }}
          defaultAssignedUserId={supabaseUserId}
          addAppointment={addAppointment}
          addCall={addCall}
          addTask={addTask}
          updateAppointment={updateAppointment}
          updateCall={updateCall}
          updateTask={updateTask}
          prospects={prospects || []}
          users={supabaseUsers || []}
          projectsData={projectsData || {}}
        />
      )}

    </>
  );
};

// Copie exacte du composant EventDetailsPopup de l'Agenda pour les RDV
const EventDetailsPopup = ({ event, onClose, onReport, onEdit, prospects, supabaseUsers, updateAppointment, deleteAppointment, projectsData }) => {
  const [status, setStatus] = useState(event?.status || 'pending');

  useEffect(() => {
    if (event) {
      setStatus(event.status || 'pending');
    }
  }, [event]);

  // 🔥 Guard: Ne rien afficher si les données nécessaires ne sont pas chargées
  if (!event || !prospects || !supabaseUsers || !updateAppointment || !deleteAppointment || !projectsData) {
    return null;
  }

  const contact = prospects.find(p => p.id === event.contactId);
  // 🔥 Chercher par id OU user_id pour couvrir les deux cas
  const assignedUser = supabaseUsers.find(u => u.id === event.assignedUserId || u.user_id === event.assignedUserId) || (contact ? supabaseUsers.find(u => u.user_id === contact.ownerId) : null);

  // Fonction pour capitaliser la première lettre
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // 🔥 Fonction pour formater une date en toute sécurité
  const safeFormatDate = (dateValue, formatString, options = {}) => {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return format(date, formatString, options);
    } catch (error) {
      return 'Date invalide';
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    // 🔥 Appeler avec (id, updates) comme dans l'Agenda
    updateAppointment(event.id, { status: newStatus });
    
    setTimeout(() => {
      onClose();
      if (newStatus === 'reporte') {
        onReport(event);
      }
    }, 300);
  };

  const handleDelete = () => {
    deleteAppointment(event.id);
    toast({ title: "✅ RDV supprimé", description: "Le rendez-vous a été retiré de votre agenda." });
    onClose();
  };

  const handleActionClick = (action) => {
    if (!contact) {
      toast({ title: "Contact non trouvé", variant: "destructive" });
      return;
    }
    switch (action) {
      case 'Appel':
        if (contact.phone) window.location.href = `tel:${contact.phone}`;
        break;
      case 'Mail':
        if (contact.email) window.location.href = `mailto:${contact.email}`;
        break;
      case 'WhatsApp':
        if (contact.phone) {
          let phoneNumber = contact.phone.replace(/\D/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = `33${phoneNumber.substring(1)}`;
          }
          const prefilledMessage = encodeURIComponent("Bonjour");
          window.open(`https://wa.me/${phoneNumber}?text=${prefilledMessage}`, '_blank');
        }
        break;
      case 'GPS':
        if (contact.address) {
          const encodedAddress = encodeURIComponent(contact.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };

  const statusConfig = {
    pending: { color: 'bg-blue-500', label: 'Qualifier votre activité' },
    effectue: { color: 'bg-green-500', label: 'Effectué' },
    annule: { color: 'bg-red-500', label: 'Annulé' },
    reporte: { color: 'bg-yellow-500', label: 'Reporté' },
  };

  return (
    <Dialog open={!!event} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        {/* 🔥 Bouton fermer customisé - Plus gros et plus visible */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-colors z-10 group"
        >
          <X className="h-6 w-6 text-gray-600 group-hover:text-gray-900" />
        </button>

        <div className="p-6 space-y-4">
          {/* 🔥 Date/Heure en haut, centré et mis en évidence */}
          <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-lg font-semibold text-blue-900">
              {capitalizeFirstLetter(safeFormatDate(event.start, "eeee d MMMM", { locale: fr }))}
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {safeFormatDate(event.start, "HH:mm", { locale: fr })} - {safeFormatDate(event.end, "HH:mm", { locale: fr })}
            </p>
          </div>

          <DialogHeader className="p-0 text-left space-y-1">
            <DialogTitle className="text-xl font-bold text-gray-900">{event.summary}</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-start space-x-3 text-gray-600">
            <Users className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="font-medium">Participants</p>
              {contact && <p className="text-sm">{contact.name} (Client)</p>}
              {assignedUser && <p className="text-sm">{assignedUser.name} (Assigné)</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions rapides</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ icon: Phone, label: 'Appel' }, { icon: Mail, label: 'Mail' }, { icon: MessageCircle, label: 'WhatsApp' }, { icon: MapPin, label: 'GPS' }].map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => handleActionClick(label)} className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors group">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`p-4 text-white transition-colors ${statusConfig[status].color}`}>
          <Select onValueChange={handleStatusChange} value={status}>
            <SelectTrigger className="w-full bg-transparent border-none text-white text-lg font-semibold focus:ring-0 focus:ring-offset-0 h-auto p-0 text-center justify-center" iconClassName="h-8 w-8 opacity-100">
              <SelectValue placeholder="Qualifier votre activité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending" disabled>Qualifier votre activité</SelectItem>
              <SelectItem value="effectue">Effectué</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
              <SelectItem value="reporte">Reporté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Infos activité</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Projet</span>
              <span className="font-medium text-gray-800">{projectsData[event.projectId]?.title || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Étape</span>
              <span className="font-medium text-gray-800">{event.step || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Note</span>
              <span className="font-medium text-gray-800 text-right">{event.notes || 'Aucune'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interlocuteur</span>
              <span className="font-medium text-gray-800">{contact?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Voulez-vous vraiment supprimer ce RDV ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le rendez-vous sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button 
            className={
              event?.status && event.status !== 'pending' 
                ? "bg-gray-400 hover:bg-gray-500 text-gray-700" 
                : "bg-blue-600 hover:bg-blue-700"
            } 
            onClick={() => onEdit(event)}
          >
            Modifier l'activité
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



// ✅ Mémoïser le composant pour éviter les re-renders inutiles
// 🔥 FIX: Comparer aussi updatedAt pour détecter les changements de form_data en real-time
function arePropsEqual(prevProps, nextProps) {
  const prevP = prevProps.prospect;
  const nextP = nextProps.prospect;
  
  // Si pas de prospect, laisser React décider
  if (!prevP || !nextP) return false;
  
  // Re-render si changement d'id ou de timestamp d'update
  return (
    prevP.id === nextP.id &&
    (prevP.updatedAt || prevP.updated_at) === (nextP.updatedAt || nextP.updated_at)
  );
}

export default React.memo(ProspectDetailsAdmin, arePropsEqual);
