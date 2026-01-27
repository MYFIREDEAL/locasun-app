/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE NAVIGATION - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Timeline de navigation entre modules (étapes du workflow).
 * 
 * ⚠️  PHASE 1: READ_ONLY MODE
 *     - Navigation visuelle uniquement
 *     - Aucune écriture DB
 *     - Aucun effet secondaire
 * 
 * Règles de navigation:
 *   ✅ Cliquable : modules actifs (in_progress) et terminés (completed)
 *   🔒 Lecture seule : modules à venir (pending)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect } from 'react';
import { CheckCircle, Circle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Step
 * @property {string} id - ID unique du step
 * @property {string} name - Nom affiché
 * @property {string} [icon] - Emoji/icône optionnel
 * @property {'pending'|'in_progress'|'completed'} status - Statut actuel
 */

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    labelClass: 'text-green-600',
    label: 'Terminé',
    clickable: true,
  },
  in_progress: {
    icon: Circle,
    iconClass: 'text-blue-500 fill-blue-500',
    labelClass: 'text-blue-600',
    label: 'En cours',
    clickable: true,
  },
  pending: {
    icon: Lock,
    iconClass: 'text-gray-300',
    labelClass: 'text-gray-400',
    label: 'À venir',
    clickable: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT MODULE ITEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Item individuel de la navigation
 */
const ModuleItem = ({ 
  step, 
  index, 
  isActive, 
  onSelect,
  itemRef,
}) => {
  const status = step.status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const IconComponent = config.icon;
  const isClickable = config.clickable;
  
  const handleClick = () => {
    if (isClickable && onSelect) {
      onSelect(index, step);
    }
  };
  
  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
      e.preventDefault();
      handleClick();
    }
  };
  
  return (
    <div
      ref={itemRef}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-selected={isActive}
      aria-disabled={!isClickable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        isActive && 'bg-blue-50 border-2 border-blue-500 shadow-sm',
        !isActive && isClickable && 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200 cursor-pointer',
        !isActive && !isClickable && 'bg-gray-50 border-2 border-transparent opacity-60 cursor-not-allowed',
      )}
    >
      {/* Icône status */}
      <div className={cn('flex-shrink-0', config.iconClass)}>
        <IconComponent className="h-5 w-5" />
      </div>
      
      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isActive ? 'text-blue-900' : 'text-gray-900'
        )}>
          {step.icon || '📋'} {step.name || `Module ${index + 1}`}
        </p>
        <p className={cn('text-xs', config.labelClass)}>
          {config.label}
        </p>
      </div>
      
      {/* Indicateur actif */}
      {isActive && (
        <div className="flex-shrink-0">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigation des modules du workflow
 * 
 * @param {Object} props
 * @param {Step[]} props.steps - Liste des étapes
 * @param {number} props.activeStepIndex - Index de l'étape active (0-based)
 * @param {string} [props.activeStepId] - ID de l'étape active (alternatif)
 * @param {(index: number, step: Step) => void} props.onSelectStep - Callback de sélection
 * @param {string} [props.className] - Classes CSS additionnelles
 */
const ModuleNavigation = ({
  steps = [],
  activeStepIndex = 0,
  activeStepId,
  onSelectStep,
  className,
}) => {
  // Refs pour scroll automatique
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  
  // Déterminer l'index actif (priorité à activeStepId si fourni)
  const resolvedActiveIndex = activeStepId
    ? steps.findIndex(s => s.id === activeStepId)
    : activeStepIndex;
  
  const safeActiveIndex = resolvedActiveIndex >= 0 ? resolvedActiveIndex : 0;
  
  // Auto-scroll vers l'élément actif
  useEffect(() => {
    const activeRef = itemRefs.current[safeActiveIndex];
    if (activeRef && containerRef.current) {
      activeRef.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [safeActiveIndex]);
  
  // Stats rapides
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  
  if (!steps || steps.length === 0) {
    return (
      <div className={cn('bg-white rounded-xl shadow-sm border p-4', className)}>
        <p className="text-sm text-gray-400 text-center">
          Aucun module configuré
        </p>
      </div>
    );
  }
  
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border', className)}>
      {/* Header avec progression */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Modules
          </h2>
          <span className="text-xs text-gray-400">
            {completedCount}/{totalCount}
          </span>
        </div>
        
        {/* Barre de progression */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      
      {/* Liste des modules */}
      <div 
        ref={containerRef}
        className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto"
        role="listbox"
        aria-label="Modules du workflow"
      >
        {steps.map((step, index) => (
          <ModuleItem
            key={step.id || index}
            step={step}
            index={index}
            isActive={index === safeActiveIndex}
            onSelect={onSelectStep}
            itemRef={el => itemRefs.current[index] = el}
          />
        ))}
      </div>
      
      {/* Footer info */}
      <div className="px-4 py-2 border-t bg-gray-50 rounded-b-xl">
        <p className="text-xs text-gray-400 text-center">
          {progressPercent}% complété
        </p>
      </div>
    </div>
  );
};

export default ModuleNavigation;
