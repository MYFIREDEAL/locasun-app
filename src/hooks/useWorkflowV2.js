/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useWorkflowV2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook centralisé pour le Workflow V2 LIVE.
 * 
 * ⚠️  PHASE 1: READ_ONLY MODE
 *     - Lecture seule depuis Supabase
 *     - Aucune écriture DB
 *     - Aucune cascade
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚫 IMPORTS INTERDITS (voir workflowV2Config.js)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ❌ useWorkflowExecutor
 * ❌ useWorkflowActionTrigger  
 * ❌ completeStepAndProceed
 * ❌ executeContractSignatureAction
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect } from 'react';

// ✅ Imports autorisés (lecture seule)
import { useSupabaseProjectStepsStatus } from '@/hooks/useSupabaseProjectStepsStatus';
import { useSupabaseChatMessages } from '@/hooks/useSupabaseChatMessages';
import { useSupabaseClientFormPanels } from '@/hooks/useSupabaseClientFormPanels';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/App';

// ✅ Config V2
import {
  isReadOnlyMode,
  isMockProceed,
  isRoutingDisabled,
  logV2,
  guardWriteAction,
  safeProceed,
  safeNeedData,
  runSecurityChecks,
  FORBIDDEN_FUNCTIONS_READ_ONLY,
} from '@/lib/workflowV2Config';

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook centralisé pour Workflow V2
 * 
 * @param {string} prospectId - UUID du prospect
 * @param {string} projectType - Type de projet (ACC, Centrale, etc.)
 * @returns {Object} État et données du workflow
 */
export function useWorkflowV2(prospectId, projectType) {
  // ───────────────────────────────────────────────────────────────────────────
  // STATE LOCAL
  // ───────────────────────────────────────────────────────────────────────────
  
  // Module actif (index dans la liste des steps)
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  
  // State local pour les contrats/PDB (signature_procedures)
  const [signatureProcedures, setSignatureProcedures] = useState([]);
  const [signaturesLoading, setSignaturesLoading] = useState(false);
  
  // ───────────────────────────────────────────────────────────────────────────
  // DONNÉES DEPUIS SUPABASE (READ_ONLY)
  // ───────────────────────────────────────────────────────────────────────────
  
  // Steps du projet (depuis project_steps_status)
  const {
    projectStepsStatus,
    loading: stepsLoading,
    error: stepsError,
  } = useSupabaseProjectStepsStatus(prospectId, { enabled: !!prospectId });
  
  // Messages chat
  const {
    messages: chatMessages,
    loading: messagesLoading,
  } = useSupabaseChatMessages(prospectId, projectType);
  
  // Fichiers du projet (documents, PDB, etc.)
  const {
    files: projectFiles,
    loading: filesLoading,
  } = useSupabaseProjectFiles({
    projectType,
    prospectId,
    enabled: !!prospectId && !!projectType,
  });
  
  // Formulaires envoyés au client
  const { clientFormPanels } = useAppContext();
  
  // Données du prospect et projets depuis AppContext (déjà chargées)
  const { prospects, projectsData } = useAppContext();
  
  // ───────────────────────────────────────────────────────────────────────────
  // CHARGEMENT CONTRATS/PDB (signature_procedures) - READ_ONLY
  // ───────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (!prospectId || !projectType) return;
    
    const fetchSignatureProcedures = async () => {
      setSignaturesLoading(true);
      try {
        const { data, error } = await supabase
          .from('signature_procedures')
          .select('id, status, signer_name, created_at, signed_at, file_id, project_files!signature_procedures_file_id_fkey(id, file_name, storage_path)')
          .eq('prospect_id', prospectId)
          .eq('project_type', projectType)
          .order('created_at', { ascending: false });
        
        if (error) {
          logV2('Erreur chargement signature_procedures', { error: error.message });
        } else {
          logV2('Contrats/PDB chargés', { count: data?.length || 0 });
          setSignatureProcedures(data || []);
        }
      } catch (err) {
        logV2('Exception signature_procedures', { error: err.message });
      } finally {
        setSignaturesLoading(false);
      }
    };
    
    fetchSignatureProcedures();
  }, [prospectId, projectType]);
  
  // ───────────────────────────────────────────────────────────────────────────
  // DONNÉES DÉRIVÉES
  // ───────────────────────────────────────────────────────────────────────────
  
  // Prospect actuel
  const prospect = useMemo(() => {
    return prospects?.find(p => p.id === prospectId) || null;
  }, [prospects, prospectId]);
  
  // Template du projet (structure des étapes)
  const projectTemplate = useMemo(() => {
    return projectsData?.[projectType] || null;
  }, [projectsData, projectType]);
  
  // Steps du projet avec leur statut actuel
  const steps = useMemo(() => {
    // Debug: afficher les données brutes
    logV2('DEBUG projectStepsStatus', { 
      projectStepsStatus, 
      projectType,
      keys: projectStepsStatus ? Object.keys(projectStepsStatus) : [],
      stepsLoading,
      stepsError
    });
    
    // Priorité : données Supabase > template par défaut
    const supabaseSteps = projectStepsStatus?.[projectType];
    
    if (supabaseSteps && supabaseSteps.length > 0) {
      logV2('Steps depuis Supabase', { count: supabaseSteps.length });
      return supabaseSteps;
    }
    
    // Fallback sur le template
    if (projectTemplate?.steps) {
      logV2('Steps depuis template (fallback)', { count: projectTemplate.steps.length });
      return projectTemplate.steps;
    }
    
    logV2('Aucun step trouvé', { projectType, hasProjectStepsStatus: !!projectStepsStatus });
    return [];
  }, [projectStepsStatus, projectType, projectTemplate, stepsLoading, stepsError]);
  
  // Step actif
  const activeStep = useMemo(() => {
    return steps[activeStepIndex] || null;
  }, [steps, activeStepIndex]);
  
  // ID du step actif
  const activeStepId = useMemo(() => {
    return activeStep?.id || null;
  }, [activeStep]);
  
  // Index du step "in_progress" dans les données (pour initialisation)
  const currentStepIndex = useMemo(() => {
    const index = steps.findIndex(s => s.status === 'in_progress');
    return index !== -1 ? index : 0;
  }, [steps]);
  
  // Formulaires liés au step actif
  const activeStepForms = useMemo(() => {
    if (!clientFormPanels || !activeStep) return [];
    
    return clientFormPanels.filter(panel => 
      panel.prospectId === prospectId &&
      panel.projectType === projectType
      // Note: on pourrait filtrer par stepIndex si on avait cette info
    );
  }, [clientFormPanels, prospectId, projectType, activeStep]);
  
  // Messages liés au projet
  const projectMessages = useMemo(() => {
    return chatMessages || [];
  }, [chatMessages]);
  
  // ───────────────────────────────────────────────────────────────────────────
  // DOCUMENTS COMBINÉS (fichiers + contrats/PDB) - READ_ONLY
  // ───────────────────────────────────────────────────────────────────────────
  
  // Fichiers du projet formatés
  const formattedFiles = useMemo(() => {
    if (!projectFiles || projectFiles.length === 0) return [];
    
    return projectFiles.map(file => ({
      id: file.id,
      type: 'file',
      name: file.file_name || file.name || 'Document sans nom',
      url: file.storage_path ? `${supabase.storage.from('project-files').getPublicUrl(file.storage_path).data?.publicUrl}` : null,
      uploadedAt: file.created_at,
      category: file.field_label || file.category || 'Document',
    }));
  }, [projectFiles]);
  
  // Contrats/PDB formatés
  const formattedContracts = useMemo(() => {
    if (!signatureProcedures || signatureProcedures.length === 0) return [];
    
    return signatureProcedures.map(proc => ({
      id: proc.id,
      type: 'contract',
      name: proc.project_files?.file_name || `Contrat - ${proc.signer_name || 'Sans nom'}`,
      status: proc.status, // pending, signed, expired
      signerName: proc.signer_name,
      signedAt: proc.signed_at,
      uploadedAt: proc.created_at,
      category: 'Contrat/PDB',
    }));
  }, [signatureProcedures]);
  
  // Documents combinés (fichiers + contrats)
  const projectDocuments = useMemo(() => {
    const allDocs = [...formattedContracts, ...formattedFiles];
    // Trier par date décroissante
    return allDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }, [formattedFiles, formattedContracts]);
  
  // ───────────────────────────────────────────────────────────────────────────
  // INITIALISATION
  // ───────────────────────────────────────────────────────────────────────────
  
  // Initialiser sur le step "in_progress" au chargement
  useEffect(() => {
    if (!stepsLoading && steps.length > 0 && activeStepIndex === 0) {
      const inProgressIndex = steps.findIndex(s => s.status === 'in_progress');
      if (inProgressIndex !== -1 && inProgressIndex !== activeStepIndex) {
        logV2('Initialisation sur step in_progress', { index: inProgressIndex });
        setActiveStepIndex(inProgressIndex);
      }
    }
  }, [stepsLoading, steps, activeStepIndex]);
  
  // ───────────────────────────────────────────────────────────────────────────
  // ACTIONS (mock en phase 1)
  // ───────────────────────────────────────────────────────────────────────────
  
  /**
   * Naviguer vers un step (state local uniquement, pas d'effet DB)
   * ⚠️ Navigation visuelle seulement, pas de changement de statut
   */
  const navigateToStep = (index) => {
    // GARDE-FOU: Vérifier que ce n'est pas une navigation automatique
    const guardResult = guardWriteAction('navigateToStep', { 
      from: activeStepIndex, 
      to: index,
      isUserAction: true, // Navigation manuelle OK
    });
    
    // La navigation visuelle est toujours autorisée (pas d'écriture DB)
    if (index >= 0 && index < steps.length) {
      logV2('Navigation step (visuelle)', { from: activeStepIndex, to: index });
      setActiveStepIndex(index);
    }
  };
  
  /**
   * PROCEED - Phase 1 = mock uniquement
   * ⚠️ GARDE-FOU: Aucune écriture DB en READ_ONLY
   * @returns {Object} Résultat de l'action (mock)
   */
  const handleProceed = () => {
    const context = {
      stepId: activeStepId,
      stepName: activeStep?.name,
      stepStatus: activeStep?.status,
      prospectId,
      projectType,
      timestamp: new Date().toISOString(),
    };
    
    // ⚠️ GARDE-FOU: Utiliser safeProceed
    return safeProceed(() => {
      // Phase 2+: Action réelle ici
      // ❌ NE PAS IMPLÉMENTER TANT QUE READ_ONLY = true
      console.error('[V2 PROCEED] ⛔ Action réelle appelée mais non implémentée');
      return { success: false, message: 'Action non implémentée' };
    }, context);
  };
  
  /**
   * NEED_DATA - Phase 1 = mock uniquement
   * ⚠️ GARDE-FOU: Aucune écriture DB en READ_ONLY
   * @returns {Object} Résultat de l'action (mock)
   */
  const handleNeedData = () => {
    const context = {
      stepId: activeStepId,
      stepName: activeStep?.name,
      prospectId,
      projectType,
      timestamp: new Date().toISOString(),
    };
    
    // ⚠️ GARDE-FOU: Utiliser safeNeedData
    return safeNeedData(() => {
      // Phase 2+: Ouvrir panneau d'aide / base d'info
      console.error('[V2 NEED_DATA] ⛔ Action réelle appelée mais non implémentée');
      return { success: false, message: 'Action non implémentée' };
    }, context);
  };
  
  // ───────────────────────────────────────────────────────────────────────────
  // VÉRIFICATIONS DE SÉCURITÉ AU MOUNT
  // ───────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Exécuter les vérifications de sécurité une fois au mount
    runSecurityChecks();
    
    // Log des fonctions interdites (pour debug)
    if (import.meta.env.DEV) {
      logV2('Fonctions interdites en READ_ONLY', FORBIDDEN_FUNCTIONS_READ_ONLY);
    }
  }, []);
  
  // ───────────────────────────────────────────────────────────────────────────
  // LOADING / ERROR STATES
  // ───────────────────────────────────────────────────────────────────────────
  
  const loading = stepsLoading || messagesLoading || filesLoading || signaturesLoading;
  const error = stepsError || null;
  
  // ───────────────────────────────────────────────────────────────────────────
  // FLAG READ_ONLY HARDCODÉ (Phase 1)
  // ───────────────────────────────────────────────────────────────────────────
  
  const READ_ONLY = true; // ⚠️ HARDCODÉ ON - Aucune action d'écriture permise
  
  // ───────────────────────────────────────────────────────────────────────────
  // RETURN
  // ───────────────────────────────────────────────────────────────────────────
  
  return {
    // ─── Données ───
    prospect,
    projectTemplate,
    steps,
    activeStep,
    activeStepId,
    activeStepIndex,
    currentStepIndex, // Index du step "in_progress" dans les données
    
    // ─── Données liées au step ───
    activeStepForms,
    projectMessages,
    projectDocuments,      // 📁 Fichiers + Contrats/PDB combinés
    projectFiles,          // 📄 Fichiers seuls
    signatureProcedures,   // 📝 Contrats/PDB seuls
    
    // ─── États ───
    loading,
    error,
    
    // ─── Config ───
    isReadOnly: READ_ONLY, // ⚠️ Hardcodé ON
    isMockProceed: isMockProceed(),
    isRoutingDisabled: isRoutingDisabled(),
    
    // ─── Actions ───
    navigateToStep,
    setActiveStepIndex, // Alias direct
    handleProceed,
    handleNeedData,
  };
}

export default useWorkflowV2;
