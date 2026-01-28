/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTION ORDER SIMULATOR - Prévisualisation d'ActionOrder + Exécution V2→V1
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Composant UI pour générer, afficher et exécuter un ActionOrder.
 * 
 * Modes:
 *   - SIMULATION: Génère et affiche l'ActionOrder sans exécution
 *   - EXÉCUTION: Si flag EXECUTION_FROM_V2 = ON, permet d'exécuter via V1
 * 
 * Props:
 *   - moduleId: ID du module
 *   - projectType: Type de projet
 *   - prospectId: UUID du prospect (requis pour exécution réelle)
 *   - actionConfig: Configuration d'action V2
 *   - availableForms: Liste des formulaires [{id, name}]
 *   - availableTemplates: Liste des templates [{id, name}]
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Bot, 
  Play, 
  Copy, 
  Check, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  PenTool,
  Users,
  Zap,
  Rocket,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Import du builder (simulation pure)
import { 
  buildActionOrder, 
  formatActionOrderSummary,
  getActionOrderJSON,
  validateActionOrder,
} from '@/lib/actionOrderV2';

// Import exécution V2→V1 (PROMPT 7)
import { 
  executeActionOrder, 
  canExecuteActionOrder,
} from '@/lib/executeActionOrderV2';

// Import flag
import { isExecutionFromV2Enabled } from '@/lib/workflowV2Config';

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulateur d'ActionOrder
 */
export function ActionOrderSimulator({
  moduleId,
  projectType,
  prospectId,
  actionConfig,
  availableForms = [],
  availableTemplates = [],
  className,
}) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [generatedOrder, setGeneratedOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  
  // State exécution (PROMPT 7)
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  
  // Mock prospectId si non fourni (pour simulation)
  const effectiveProspectId = prospectId || 'mock-prospect-' + Date.now().toString(36);
  
  // Vérifier si exécution V2→V1 est activée (PROMPT 7)
  const executionEnabled = useMemo(() => isExecutionFromV2Enabled(), []);
  
  // Vérifier si on a un vrai prospectId (pas mock)
  const hasRealProspectId = useMemo(() => {
    return prospectId && !prospectId.startsWith('mock-');
  }, [prospectId]);
  
  // Vérifier si la config est valide pour générer un ordre
  const canGenerate = useMemo(() => {
    if (!actionConfig) return false;
    if (!actionConfig.actionType) return false;
    if (!actionConfig.targetAudience) return false;
    return true;
  }, [actionConfig]);
  
  // Vérifier si l'ordre peut être exécuté
  const canExecute = useMemo(() => {
    if (!generatedOrder) return { canExecute: false, reason: 'Générez d\'abord un ActionOrder' };
    if (!executionEnabled) return { canExecute: false, reason: 'Flag EXECUTION_FROM_V2 désactivé' };
    if (!hasRealProspectId) return { canExecute: false, reason: 'prospectId réel requis' };
    return canExecuteActionOrder(generatedOrder);
  }, [generatedOrder, executionEnabled, hasRealProspectId]);
  
  // Résoudre les noms des formulaires/templates à partir des IDs
  const resolveFormNames = useCallback((formIds) => {
    return formIds.map(id => {
      const form = availableForms.find(f => f.id === id);
      return form ? form.name : id;
    });
  }, [availableForms]);
  
  const resolveTemplateNames = useCallback((templateIds) => {
    return templateIds.map(id => {
      const template = availableTemplates.find(t => t.id === id);
      return template ? template.name : id;
    });
  }, [availableTemplates]);
  
  // Générer l'ActionOrder
  const handleGenerate = useCallback(() => {
    setError(null);
    setCopied(false);
    
    try {
      const order = buildActionOrder({
        moduleId,
        projectType,
        prospectId: effectiveProspectId,
        actionConfig,
        message: `Action ${actionConfig.actionType} générée par V2 Simulator`,
      });
      
      setGeneratedOrder(order);
      setIsExpanded(true);
      
      console.log('[V2 Simulator] ActionOrder généré', order);
    } catch (err) {
      setError(err.message);
      setGeneratedOrder(null);
    }
  }, [moduleId, projectType, effectiveProspectId, actionConfig]);
  
  // Copier le JSON
  const handleCopy = useCallback(() => {
    if (!generatedOrder) return;
    
    const json = getActionOrderJSON(generatedOrder);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedOrder]);
  
  // EXÉCUTION RÉELLE V2→V1 (PROMPT 7)
  const handleExecute = useCallback(async () => {
    if (!generatedOrder) return;
    if (!canExecute.canExecute) return;
    
    setIsExecuting(true);
    setExecutionResult(null);
    setError(null);
    
    try {
      // Créer un ordre pour exécution (sans _meta.isSimulation)
      const executableOrder = {
        ...generatedOrder,
        _meta: {
          ...generatedOrder._meta,
          isSimulation: false, // ⚠️ Mode exécution réelle
        },
      };
      
      console.log('[V2 Simulator] 🚀 Exécution V2→V1', executableOrder);
      
      const result = await executeActionOrder(executableOrder);
      setExecutionResult(result);
      
      console.log('[V2 Simulator] Résultat exécution', result);
    } catch (err) {
      setError(`Erreur exécution: ${err.message}`);
      setExecutionResult({
        success: false,
        status: 'error',
        message: err.message,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [generatedOrder, canExecute]);
  
  // Validation de l'ordre généré
  const validation = useMemo(() => {
    if (!generatedOrder) return null;
    return validateActionOrder(generatedOrder);
  }, [generatedOrder]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">
            {executionEnabled ? 'ActionOrder V2→V1' : 'Simulation ActionOrder'}
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
            V2
          </span>
          {/* Badge exécution activée */}
          {executionEnabled && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded flex items-center gap-1">
              <Rocket className="h-3 w-3" />
              EXEC ON
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Bouton Simuler */}
          <Button
            size="sm"
            variant={canGenerate ? "default" : "outline"}
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={cn(
              "gap-1.5",
              canGenerate && "bg-purple-600 hover:bg-purple-700"
            )}
          >
            <Zap className="h-4 w-4" />
            Simuler
          </Button>
          
          {/* Bouton Exécuter (si flag ON + ordre généré) */}
          {executionEnabled && generatedOrder && (
            <Button
              size="sm"
              variant={canExecute.canExecute ? "default" : "outline"}
              onClick={handleExecute}
              disabled={!canExecute.canExecute || isExecuting}
              className={cn(
                "gap-1.5",
                canExecute.canExecute && "bg-green-600 hover:bg-green-700"
              )}
              title={canExecute.canExecute ? 'Exécuter via V1' : canExecute.reason}
            >
              {isExecuting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exécution...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Exécuter
                </>
              )}
            </Button>
          )}
          
          {/* Toggle expand */}
          {generatedOrder && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-white/50 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Erreur */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Contenu (si généré et expanded) */}
      {generatedOrder && isExpanded && (
        <div className="p-3 space-y-4 bg-white">
          
          {/* Résumé visuel */}
          <div className="grid grid-cols-2 gap-3">
            {/* Action choisie */}
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
                Action
              </div>
              <div className="flex items-center gap-1.5">
                {generatedOrder.actionType === 'FORM' ? (
                  <FileText className="h-4 w-4 text-blue-600" />
                ) : (
                  <PenTool className="h-4 w-4 text-green-600" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {generatedOrder.actionType}
                </span>
              </div>
            </div>
            
            {/* Cible */}
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
                Cible
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  {generatedOrder.target}
                </span>
              </div>
            </div>
          </div>
          
          {/* Formulaires */}
          {generatedOrder.formIds.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
                Formulaires ({generatedOrder.formIds.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {resolveFormNames(generatedOrder.formIds).map((name, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Templates (si SIGNATURE) */}
          {generatedOrder.actionType === 'SIGNATURE' && generatedOrder.templateIds.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
                Templates contrat ({generatedOrder.templateIds.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {resolveTemplateNames(generatedOrder.templateIds).map((name, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Message */}
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">
              Message
            </div>
            <div className="text-sm text-gray-600 italic">
              "{generatedOrder.message}"
            </div>
          </div>
          
          {/* Modes */}
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-gray-400">Gestion: </span>
              <span className="font-medium text-gray-700">
                {generatedOrder.managementMode === 'AI' ? '🤖 IA' : '👤 Humain'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Vérification: </span>
              <span className="font-medium text-gray-700">
                {generatedOrder.verificationMode === 'AI' ? '🤖 IA' : '👤 Humain'}
              </span>
            </div>
          </div>
          
          {/* Validation */}
          {validation && !validation.valid && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Avertissements:</span>
              </div>
              <ul className="mt-1 text-xs text-amber-600 list-disc list-inside">
                {validation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* JSON copiable */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-medium text-gray-400 uppercase">
                JSON ActionOrder
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-6 px-2 text-xs gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copier
                  </>
                )}
              </Button>
            </div>
            <pre className="p-2 bg-gray-900 text-gray-100 rounded-lg text-[10px] overflow-x-auto max-h-48 overflow-y-auto">
              {getActionOrderJSON(generatedOrder)}
            </pre>
          </div>
          
          {/* Résultat d'exécution (PROMPT 7) */}
          {executionResult && (
            <div className={cn(
              "p-3 rounded-lg border",
              executionResult.success 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {executionResult.success ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  executionResult.success ? "text-green-700" : "text-red-700"
                )}>
                  {executionResult.success ? 'Exécution réussie' : 'Échec exécution'}
                </span>
                <span className={cn(
                  "px-1.5 py-0.5 text-[10px] font-medium rounded",
                  executionResult.status === 'executed' && "bg-green-100 text-green-700",
                  executionResult.status === 'simulated' && "bg-purple-100 text-purple-700",
                  executionResult.status === 'blocked' && "bg-amber-100 text-amber-700",
                  executionResult.status === 'error' && "bg-red-100 text-red-700"
                )}>
                  {executionResult.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-600">{executionResult.message}</p>
              {executionResult.data && (
                <pre className="mt-2 p-2 bg-white/50 rounded text-[10px] text-gray-500 overflow-x-auto">
                  {JSON.stringify(executionResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {/* Footer disclaimer */}
          <div className="pt-2 border-t text-center">
            {executionEnabled ? (
              <span className="text-[10px] text-green-600 flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />
                Mode exécution V2→V1 activé (flag ON)
              </span>
            ) : (
              <span className="text-[10px] text-gray-400">
                ⚠️ Simulation pure — Aucune exécution V1
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Message si pas encore généré */}
      {!generatedOrder && !error && (
        <div className="p-4 text-center text-xs text-gray-400">
          {canGenerate 
            ? 'Cliquez sur "Simuler" pour générer un ActionOrder'
            : 'Configurez d\'abord le type d\'action et la cible'
          }
        </div>
      )}
    </div>
  );
}

export default ActionOrderSimulator;
