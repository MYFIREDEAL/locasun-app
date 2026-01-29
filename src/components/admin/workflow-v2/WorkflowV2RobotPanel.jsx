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
  // CONFIG VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  
  const hasValidConfig = useMemo(() => {
    if (!moduleConfig) return false;
    const ac = moduleConfig.actionConfig;
    if (!ac) return false;
    if (!ac.actionType) return false;
    if (!ac.targetAudience || ac.targetAudience.length === 0) return false;
    return true;
  }, [moduleConfig]);

  const actionConfig = moduleConfig?.actionConfig || null;

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
      const order = buildActionOrder({
        moduleId,
        projectType,
        prospectId,
        actionConfig: {
          ...actionConfig,
          // Prendre la première cible pour la simulation
          targetAudience: actionConfig.targetAudience?.[0] || 'CLIENT',
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
  
  useEffect(() => {
    if (isOpen && hasValidConfig && !generatedOrder) {
      handleSimulate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasValidConfig]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setGeneratedOrder(null);
      setExecutionResult(null);
      setShowJson(false);
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
              <p className="text-xs text-gray-500">{moduleName || moduleId}</p>
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
                  <span className="text-xs font-medium text-gray-500 uppercase">Action configurée</span>
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
                {actionConfig?.targetAudience?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">Cibles:</span>
                    {actionConfig.targetAudience.map(target => {
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
                  <span>Gestion: {actionConfig?.managementMode === 'AI' ? '🤖 IA' : '👤 Humain'}</span>
                  <span>Vérif: {actionConfig?.verificationMode === 'AI' ? '🤖 IA' : '👤 Humain'}</span>
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
