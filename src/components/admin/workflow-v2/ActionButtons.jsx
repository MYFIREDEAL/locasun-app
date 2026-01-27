/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTION BUTTONS - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Boutons d'action pour le workflow.
 * 
 * ⚠️  PHASE 1: READ_ONLY MODE
 *     - PROCEED = console.log uniquement (mock)
 *     - NEED_DATA = ouvre discussion (pas d'état modifié)
 *     - Aucune écriture DB
 *     - Aucun routing automatique
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Rocket, 
  HelpCircle, 
  Loader2,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logV2, DEFAULT_BUTTON_LABELS, MOCK_TOAST_MESSAGES } from '@/lib/workflowV2Config';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ActionButtonsProps
 * @property {() => Object} onProceed - Handler pour PROCEED
 * @property {() => Object} onNeedData - Handler pour NEED_DATA
 * @property {boolean} isReadOnly - Mode lecture seule
 * @property {boolean} disabled - Désactiver tous les boutons
 * @property {string} proceedLabel - Label custom pour PROCEED
 * @property {string} needDataLabel - Label custom pour NEED_DATA
 * @property {'pending'|'in_progress'|'completed'} stepStatus - Status du step actif
 */

// Délai de feedback visuel après clic (ms)
const FEEDBACK_DELAY = 1500;

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Boutons d'action du workflow
 * 
 * @param {ActionButtonsProps} props
 */
const ActionButtons = ({
  onProceed,
  onNeedData,
  isReadOnly = true,
  disabled = false,
  proceedLabel = DEFAULT_BUTTON_LABELS.proceed,
  needDataLabel = DEFAULT_BUTTON_LABELS.needData,
  stepStatus = 'in_progress',
  className,
  showToast, // Optionnel: fonction toast externe
}) => {
  // ───────────────────────────────────────────────────────────────────────────
  // STATE LOCAL (feedback visuel uniquement)
  // ───────────────────────────────────────────────────────────────────────────
  
  const [proceedState, setProceedState] = useState('idle'); // idle | loading | success
  const [needDataState, setNeedDataState] = useState('idle'); // idle | loading | success
  
  // ───────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ───────────────────────────────────────────────────────────────────────────
  
  const handleProceed = async () => {
    if (disabled || proceedState !== 'idle') return;
    
    logV2('ActionButtons: PROCEED cliqué', { isReadOnly, stepStatus });
    
    // Feedback visuel
    setProceedState('loading');
    
    try {
      // Appeler le handler parent
      const result = onProceed?.();
      
      // Log du résultat
      logV2('ActionButtons: PROCEED résultat', result);
      
      // Feedback success après délai
      setTimeout(() => {
        setProceedState('success');
        
        // Reset après feedback
        setTimeout(() => {
          setProceedState('idle');
        }, FEEDBACK_DELAY);
      }, 300);
      
      // Toast si fourni
      if (showToast && result?.mock) {
        showToast(MOCK_TOAST_MESSAGES.proceed);
      }
      
    } catch (error) {
      logV2('ActionButtons: PROCEED erreur', error);
      setProceedState('idle');
    }
  };
  
  const handleNeedData = async () => {
    if (disabled || needDataState !== 'idle') return;
    
    logV2('ActionButtons: NEED_DATA cliqué', { isReadOnly, stepStatus });
    
    // Feedback visuel
    setNeedDataState('loading');
    
    try {
      // Appeler le handler parent
      const result = onNeedData?.();
      
      // Log du résultat
      logV2('ActionButtons: NEED_DATA résultat', result);
      
      // Feedback success après délai
      setTimeout(() => {
        setNeedDataState('success');
        
        // Reset après feedback
        setTimeout(() => {
          setNeedDataState('idle');
        }, FEEDBACK_DELAY);
      }, 300);
      
      // Toast si fourni
      if (showToast && result?.mock) {
        showToast(MOCK_TOAST_MESSAGES.needData);
      }
      
    } catch (error) {
      logV2('ActionButtons: NEED_DATA erreur', error);
      setNeedDataState('idle');
    }
  };
  
  // ───────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ───────────────────────────────────────────────────────────────────────────
  
  const getProceedIcon = () => {
    switch (proceedState) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Rocket className="h-4 w-4" />;
    }
  };
  
  const getNeedDataIcon = () => {
    switch (needDataState) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };
  
  // Désactiver PROCEED si step déjà completed
  const isProceedDisabled = disabled || stepStatus === 'completed' || proceedState !== 'idle';
  const isNeedDataDisabled = disabled || needDataState !== 'idle';
  
  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Message READ_ONLY */}
      <div className="flex-1">
        {isReadOnly && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Mode lecture — Actions simulées
          </p>
        )}
        {stepStatus === 'completed' && !isReadOnly && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Module terminé
          </p>
        )}
      </div>
      
      {/* Boutons */}
      <div className="flex gap-3">
        {/* NEED_DATA Button */}
        <Button 
          variant="outline" 
          onClick={handleNeedData}
          disabled={isNeedDataDisabled}
          className={cn(
            'gap-2 transition-all',
            needDataState === 'success' && 'border-green-500 text-green-600'
          )}
        >
          {getNeedDataIcon()}
          {needDataLabel}
        </Button>
        
        {/* PROCEED Button */}
        <Button 
          onClick={handleProceed}
          disabled={isProceedDisabled}
          className={cn(
            'gap-2 transition-all',
            proceedState === 'success' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-blue-600 hover:bg-blue-700',
            stepStatus === 'completed' && 'opacity-50 cursor-not-allowed'
          )}
        >
          {getProceedIcon()}
          {stepStatus === 'completed' ? 'Déjà validé' : proceedLabel}
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTES EXPORTÉES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Version compacte (boutons petits, sans message)
 */
ActionButtons.Compact = ({ 
  onProceed, 
  onNeedData, 
  disabled,
  stepStatus,
}) => (
  <div className="flex gap-2">
    <Button 
      size="sm"
      variant="outline" 
      onClick={onNeedData}
      disabled={disabled}
      className="gap-1"
    >
      <HelpCircle className="h-3 w-3" />
      Info
    </Button>
    <Button 
      size="sm"
      onClick={onProceed}
      disabled={disabled || stepStatus === 'completed'}
      className="gap-1 bg-blue-600 hover:bg-blue-700"
    >
      <Rocket className="h-3 w-3" />
      {stepStatus === 'completed' ? '✓' : 'Go'}
    </Button>
  </div>
);

/**
 * Version simple (juste PROCEED)
 */
ActionButtons.ProceedOnly = ({ 
  onProceed, 
  disabled,
  label = DEFAULT_BUTTON_LABELS.proceed,
  stepStatus,
}) => (
  <Button 
    onClick={onProceed}
    disabled={disabled || stepStatus === 'completed'}
    className="gap-2 bg-blue-600 hover:bg-blue-700"
  >
    <Rocket className="h-4 w-4" />
    {stepStatus === 'completed' ? 'Déjà validé' : label}
  </Button>
);

export default ActionButtons;
