/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKFLOW V2 ROBOT PANEL - Panneau décision V2 depuis le chat
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Affiché quand l'admin clique sur 🤖 dans le chat.
 * Affiche la décision V2 basée sur la config persistée.
 * 
 * ⚠️ AUCUNE IA - L'humain écrit le message manuellement
 * ⚠️ V2 = décision, V1 = exécution
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Eye, 
  X, 
  FileText, 
  PenTool,
  User,
  Briefcase,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronRight,
  Copy,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

// V2 libs
import { buildActionOrder, formatActionOrderSummary } from '@/lib/actionOrderV2';
import { executeActionOrder } from '@/lib/executeActionOrderV2';
import { isExecutionFromV2Enabled } from '@/lib/workflowV2Config';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_ICONS = {
  CLIENT: User,
  COMMERCIAL: Briefcase,
  PARTENAIRE: Users,
};

const TARGET_LABELS = {
  CLIENT: 'Client',
  COMMERCIAL: 'Commercial',
  PARTENAIRE: 'Partenaire',
};

const ACTION_TYPE_ICONS = {
  FORM: FileText,
  SIGNATURE: PenTool,
};

const ACTION_TYPE_LABELS = {
  FORM: 'Formulaire',
  SIGNATURE: 'Signature',
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Panneau affichant la décision V2 pour le bouton 🤖 du chat
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si le panneau est ouvert
 * @param {Function} props.onClose - Callback fermeture
 * @param {string} props.prospectId - UUID du prospect
 * @param {string} props.projectType - Type de projet (ACC, Centrale, etc.)
 * @param {string} props.moduleId - ID du module/étape courante
 * @param {string} props.moduleName - Nom lisible du module
 * @param {Object} props.moduleConfig - Config V2 persistée pour ce module
 * @param {Object} props.context - Contexte d'exécution { organizationId, adminUser }
 * @param {Object[]} props.availableForms - Liste des formulaires { id, name }
 * @param {Object[]} props.availableTemplates - Liste des templates { id, name }
 */
const WorkflowV2RobotPanel = ({
  isOpen,
  onClose,
  prospectId,
  projectType,
  moduleId,
  moduleName,
  moduleConfig,
  context = {},
  availableForms = [],
  availableTemplates = [],
}) => {
  // State
  const [generatedOrder, setGeneratedOrder] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [showJson, setShowJson] = useState(false);

  // Feature flag check
  const executionEnabled = isExecutionFromV2Enabled();

  // ─────────────────────────────────────────────────────────────────────────
  // MULTI-ACTIONS SUPPORT
  // ─────────────────────────────────────────────────────────────────────────
  
  // Résoudre les actions[] depuis la config persistée
  const configActions = useMemo(() => {
    if (!moduleConfig) return [];
    if (moduleConfig.actions && moduleConfig.actions.length > 0) {
      return moduleConfig.actions;
    }
    // Fallback: config simple (pas de multi-actions)
    if (moduleConfig.actionConfig) {
      return [{ order: 1, status: 'pending', actionConfig: moduleConfig.actionConfig }];
    }
    return [];
  }, [moduleConfig]);

  // 🔥 Interroger Supabase pour connaître le vrai statut de chaque action
  const [actionStatuses, setActionStatuses] = useState({}); // { 'v2-inscription-action-0': 'approved', ... }
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  useEffect(() => {
    if (!isOpen || !prospectId || !moduleId || configActions.length <= 1) {
      setActionStatuses({});
      return;
    }
    
    const fetchActionStatuses = async () => {
      setLoadingStatus(true);
      try {
        // Générer tous les action_id possibles pour ce module
        const expectedActionIds = configActions.map((_, idx) => `v2-${moduleId}-action-${idx}`);
        
        // Query 1: Chercher par action_id exact (panels V2 avec le fix)
        const { data: v2Panels, error: v2Error } = await supabase
          .from('client_form_panels')
          .select('id, action_id, status')
          .eq('prospect_id', prospectId)
          .eq('project_type', projectType)
          .in('action_id', expectedActionIds);
        
        const statuses = {};
        
        if (!v2Error && v2Panels && v2Panels.length > 0) {
          // Résolution par action_id exact
          for (const panel of v2Panels) {
            if (panel.action_id && (panel.status === 'approved' || panel.status === 'submitted')) {
              statuses[panel.action_id] = panel.status;
            }
          }
          console.log('[V2 Robot] Action statuses by action_id:', statuses);
        } else {
          // Fallback: compter les approved pour ce prospect+project_type (legacy panels sans action_id)
          const { data: legacyPanels } = await supabase
            .from('client_form_panels')
            .select('id, step_name, status')
            .eq('prospect_id', prospectId)
            .eq('project_type', projectType)
            .in('status', ['approved', 'submitted']);
          
          if (legacyPanels) {
            // Filtrer par step_name matching
            const matchingPanels = legacyPanels.filter(p => 
              !p.step_name || p.step_name === moduleName || p.step_name === moduleId
            );
            // Assigner séquentiellement (premier approved = action 0, etc.)
            matchingPanels.forEach((panel, idx) => {
              if (idx < configActions.length) {
                statuses[`v2-${moduleId}-action-${idx}`] = panel.status;
              }
            });
            console.log('[V2 Robot] Fallback legacy statuses:', statuses, 'from', matchingPanels.length, 'panels');
          }
        }
        
        setActionStatuses(statuses);
      } catch (err) {
        console.error('[V2 Robot] Error fetching action statuses:', err);
      } finally {
        setLoadingStatus(false);
      }
    };
    
    fetchActionStatuses();
  }, [isOpen, prospectId, projectType, moduleName, moduleId, configActions.length]);

  // Enrichir les actions avec le vrai statut basé sur les panels DB
  const resolvedActions = useMemo(() => {
    return configActions.map((action, idx) => {
      const actionId = `v2-${moduleId}-action-${idx}`;
      const dbStatus = actionStatuses[actionId];
      return {
        ...action,
        actionId,
        realStatus: dbStatus === 'approved' ? 'validated' : (dbStatus === 'submitted' ? 'submitted' : 'pending'),
      };
    });
  }, [configActions, actionStatuses, moduleId]);

  // Index de l'action courante (première non-validée selon le vrai statut)
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  
  // Trouver la première action pending au mount / quand les données changent
  useEffect(() => {
    if (isOpen && resolvedActions.length > 0 && !loadingStatus) {
      const pendingIndex = resolvedActions.findIndex(a => a.realStatus !== 'validated');
      setCurrentActionIndex(pendingIndex >= 0 ? pendingIndex : resolvedActions.length - 1);
    }
  }, [isOpen, resolvedActions, loadingStatus]);

  const currentAction = resolvedActions[currentActionIndex] || null;
  const totalActions = resolvedActions.length;
  const isMultiAction = totalActions > 1;

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIG VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  
  const hasValidConfig = useMemo(() => {
    if (!currentAction) return false;
    const ac = currentAction.actionConfig;
    if (!ac) return false;
    if (!ac.actionType) return false;
    // targetAudience peut être string ou array
    const hasTarget = Array.isArray(ac.targetAudience) 
      ? ac.targetAudience.length > 0 
      : !!ac.targetAudience;
    if (!hasTarget) return false;
    return true;
  }, [currentAction]);

  const actionConfig = currentAction?.actionConfig || null;

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD ACTION ORDER
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleSimulate = () => {
    if (!hasValidConfig || !actionConfig) {
      toast({
        title: "Configuration incomplète",
        description: "Aucune action configurée pour ce module.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Normaliser targetAudience en prenant la première valeur
      const firstTarget = Array.isArray(actionConfig.targetAudience)
        ? actionConfig.targetAudience[0]
        : actionConfig.targetAudience;
        
      const order = buildActionOrder({
        moduleId,
        moduleName,
        projectType,
        prospectId,
        actionIndex: currentActionIndex,
        actionConfig: {
          ...actionConfig,
          // Prendre la première cible pour la simulation
          targetAudience: firstTarget || 'CLIENT',
        },
        message: '', // Message écrit manuellement par l'admin
      });

      setGeneratedOrder(order);
      setExecutionResult(null);
      
      console.log('[V2 Robot] ActionOrder généré:', order);
    } catch (err) {
      console.error('[V2 Robot] Erreur génération:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTE ACTION ORDER
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleExecute = async () => {
    if (!generatedOrder) {
      toast({
        title: "Aucun ordre",
        description: "Simulez d'abord pour générer un ActionOrder.",
        variant: "destructive",
      });
      return;
    }

    if (!executionEnabled) {
      toast({
        title: "Exécution désactivée",
        description: "Le flag EXECUTION_FROM_V2 est OFF.",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
    setExecutionResult(null);

    try {
      // Marquer comme NON-simulation pour exécution réelle
      const orderForExecution = {
        ...generatedOrder,
        _meta: {
          ...generatedOrder._meta,
          isSimulation: false, // 🔥 Important: permet l'exécution réelle
        },
      };

      const result = await executeActionOrder(orderForExecution, context);
      
      setExecutionResult(result);
      
      if (result.success) {
        toast({
          title: "✅ Action exécutée",
          description: result.message,
          className: "bg-green-500 text-white",
        });
        
        // 🔥 UX-3: Auto-fermeture après 1 seconde si succès
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        toast({
          title: "⚠️ Exécution bloquée",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('[V2 Robot] Erreur exécution:', err);
      setExecutionResult({
        success: false,
        status: 'error',
        message: err.message,
      });
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COPY JSON
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleCopyJson = () => {
    if (!generatedOrder) return;
    navigator.clipboard.writeText(JSON.stringify(generatedOrder, null, 2));
    toast({
      title: "Copié !",
      description: "ActionOrder JSON copié dans le presse-papiers.",
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-SIMULATE on open if config exists
  // ─────────────────────────────────────────────────────────────────────────
  
  // 🔥 FIX: Track previous action index to detect changes
  const prevActionIndexRef = React.useRef(currentActionIndex);
  
  useEffect(() => {
    const actionIndexChanged = prevActionIndexRef.current !== currentActionIndex;
    prevActionIndexRef.current = currentActionIndex;
    
    // Reset order quand on change d'action (évite d'exécuter le formulaire de l'ancienne action)
    if (actionIndexChanged) {
      setGeneratedOrder(null);
      setExecutionResult(null);
    }
    
    // 🔥 FIX: Ne PAS auto-simuler tant que les status DB ne sont pas chargés
    // (sinon on simule Action 1 au lieu de la bonne action courante)
    if (isOpen && hasValidConfig && !loadingStatus) {
      // Auto-simulate si pas d'order ou si l'action a changé
      if (!generatedOrder || actionIndexChanged) {
        // Petit délai pour laisser le state se stabiliser après le reset
        const timer = setTimeout(() => {
          handleSimulate();
        }, actionIndexChanged ? 50 : 0);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasValidConfig, loadingStatus, currentActionIndex]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setGeneratedOrder(null);
      setExecutionResult(null);
      setShowJson(false);
      setCurrentActionIndex(0);
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS pour affichage
  // ─────────────────────────────────────────────────────────────────────────
  
  const getFormName = (formId) => {
    const form = availableForms.find(f => f.id === formId);
    return form?.name || formId;
  };

  const getTemplateName = (templateId) => {
    const template = availableTemplates.find(t => t.id === templateId);
    return template?.name || templateId;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Workflow V2</h3>
              <p className="text-xs text-gray-500">
                {moduleName || moduleId}
                {isMultiAction && (
                  <span className="ml-2 text-blue-600 font-medium">
                    — Action {currentActionIndex + 1}/{totalActions}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Multi-actions: indicateur discret — PAS de sélection manuelle */}
          {/* L'utilisateur traite UNE action à la fois: la première non-validée */}
          {isMultiAction && hasValidConfig && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-600 font-medium">
                📋 Étape {currentActionIndex + 1} sur {totalActions}
              </span>
              {currentActionIndex > 0 && (
                <span className="text-xs text-green-600">
                  ({currentActionIndex} terminée{currentActionIndex > 1 ? 's' : ''})
                </span>
              )}
            </div>
          )}

          {/* Pas de config */}
          {!hasValidConfig && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <h4 className="font-medium text-gray-900 mb-1">Aucune action disponible</h4>
              <p className="text-sm text-gray-500 mb-4">
                Aucune configuration V2 n'est définie pour cette étape.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Ouvrir le cockpit de config
                  toast({
                    title: "Configurer cette étape",
                    description: "Allez dans Workflow V2 > Configuration pour configurer ce module.",
                  });
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurer
              </Button>
            </div>
          )}

          {/* Config valide - Afficher la décision */}
          {hasValidConfig && (
            <>
              {/* Résumé de la config */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {isMultiAction ? `Action ${currentActionIndex + 1}/${totalActions}` : 'Action configurée'}
                  </span>
                  {executionEnabled && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      EXEC ON
                    </span>
                  )}
                </div>
                
                {/* Type d'action */}
                <div className="flex items-center gap-3">
                  {actionConfig?.actionType && (
                    <>
                      {React.createElement(ACTION_TYPE_ICONS[actionConfig.actionType] || FileText, {
                        className: "h-5 w-5 text-blue-600"
                      })}
                      <span className="font-medium text-gray-900">
                        {ACTION_TYPE_LABELS[actionConfig.actionType] || actionConfig.actionType}
                      </span>
                    </>
                  )}
                </div>

                {/* Cibles */}
                {actionConfig?.targetAudience && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">Cibles:</span>
                    {(Array.isArray(actionConfig.targetAudience) 
                      ? actionConfig.targetAudience 
                      : [actionConfig.targetAudience]
                    ).map(target => {
                      const Icon = TARGET_ICONS[target] || User;
                      return (
                        <span 
                          key={target}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border text-sm"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {TARGET_LABELS[target] || target}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Formulaires */}
                {actionConfig?.allowedFormIds?.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-500">Formulaires:</span>{' '}
                    {actionConfig.allowedFormIds.map(id => getFormName(id)).join(', ')}
                  </div>
                )}

                {/* Templates */}
                {actionConfig?.allowedTemplateIds?.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-500">Templates:</span>{' '}
                    {actionConfig.allowedTemplateIds.map(id => getTemplateName(id)).join(', ')}
                  </div>
                )}

                {/* Modes */}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                  <span>Gestion: {actionConfig?.managementMode === 'AI' ? '✨ IA' : '👤 Humain'}</span>
                  <span>Vérif: {actionConfig?.verificationMode === 'AI' ? '✨ IA' : '👤 Humain'}</span>
                </div>
              </div>

              {/* ActionOrder généré */}
              {generatedOrder && (
                <div className="border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between px-4 py-2 bg-gray-50 cursor-pointer"
                    onClick={() => setShowJson(!showJson)}
                  >
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform",
                        showJson && "rotate-90"
                      )} />
                      ActionOrder
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        V2
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyJson(); }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Copier JSON"
                      >
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  
                  {showJson && (
                    <pre className="p-4 bg-gray-900 text-gray-100 text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(generatedOrder, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Résultat d'exécution */}
              {executionResult && (
                <div className={cn(
                  "rounded-lg p-4 flex items-start gap-3",
                  executionResult.success 
                    ? "bg-green-50 border border-green-200" 
                    : "bg-red-50 border border-red-200"
                )}>
                  {executionResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className={cn(
                      "font-medium text-sm",
                      executionResult.success ? "text-green-800" : "text-red-800"
                    )}>
                      {executionResult.status === 'executed' && 'Exécuté avec succès'}
                      {executionResult.status === 'simulated' && 'Simulation uniquement'}
                      {executionResult.status === 'blocked' && 'Exécution bloquée'}
                      {executionResult.status === 'error' && 'Erreur'}
                    </p>
                    <p className={cn(
                      "text-sm mt-1",
                      executionResult.success ? "text-green-700" : "text-red-700"
                    )}>
                      {executionResult.message}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Actions */}
        {hasValidConfig && (
          <div className="px-5 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleSimulate}
              disabled={executing}
            >
              <Eye className="h-4 w-4 mr-2" />
              Simuler
            </Button>
            
            <Button
              onClick={handleExecute}
              disabled={!generatedOrder || executing || !executionEnabled}
              className={cn(
                !executionEnabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {executing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Exécuter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowV2RobotPanel;
