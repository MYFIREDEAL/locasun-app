/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE CONFIG PANEL - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Panel/Drawer pour éditer la configuration IA d'un module.
 * Stockage in-memory uniquement (pas de write DB).
 * 
 * ⚠️ Phase 1: READ_ONLY - Les modifications sont temporaires (session)
 * Phase 2+: Persistence Supabase
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Settings, 
  Save, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  Zap,
  BookOpen,
  Target,
  FileText,
  PenTool,
  Users,
  Check,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ✅ Import config V2 (pas de V1)
import { 
  getModuleAIConfig, 
  updateModuleAIConfig,
  getModuleActionConfig,
  updateModuleActionConfig,
  isModuleConfigComplete,
  getValidationSummary,
  DEFAULT_MODULE_CONFIG,
  DEFAULT_ACTION_CONFIG,
} from '@/lib/moduleAIConfig';

// ✅ Import catalogueV2 (read-only)
import {
  ACTION_TYPES,
  TARGET_AUDIENCES,
  MANAGEMENT_MODES,
  VERIFICATION_MODES,
  getActionTypesList,
  getTargetAudiencesList,
  getManagementModesList,
  getVerificationModesList,
} from '@/lib/catalogueV2';

// ✅ Import simulateur ActionOrder (PROMPT 6)
import { ActionOrderSimulator } from './ActionOrderSimulator';

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS INTERNES
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, isOpen, onToggle, badge }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-gray-700">{title}</span>
      {badge && badge}
    </div>
    {isOpen ? (
      <ChevronUp className="h-4 w-4 text-gray-400" />
    ) : (
      <ChevronDown className="h-4 w-4 text-gray-400" />
    )}
  </button>
);

const TextInput = ({ label, value, onChange, placeholder, multiline = false }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] resize-y"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    )}
  </div>
);

const SelectInput = ({ label, value, onChange, options }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const TagsInput = ({ label, value = [], onChange }) => {
  const [inputValue, setInputValue] = useState('');
  
  const addTag = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };
  
  const removeTag = (tag) => {
    onChange(value.filter(t => t !== tag));
  };
  
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map(tag => (
          <span 
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-blue-900">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder="Ajouter une action..."
          className="flex-1 px-3 py-1.5 text-sm border rounded-lg"
        />
        <Button size="sm" variant="outline" onClick={addTag}>+</Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS CONFIG ACTIONS V2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sélecteur de cible (radio buttons)
 */
const TargetAudienceSelector = ({ value, onChange }) => {
  const targets = getTargetAudiencesList();
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500">Cible de l'action</label>
      <div className="grid grid-cols-3 gap-2">
        {targets.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => onChange(target.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
              value === target.id
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            )}
          >
            <span className="text-lg">{target.icon}</span>
            <span className="text-xs font-medium">{target.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Sélecteur de type d'action (radio buttons)
 */
const ActionTypeSelector = ({ value, onChange }) => {
  const actionTypes = getActionTypesList();
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500">Type d'action</label>
      <div className="flex gap-2">
        {/* Option: Aucune action */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
            value === null
              ? "border-gray-500 bg-gray-50 text-gray-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          )}
        >
          <span className="text-lg">⏸️</span>
          <span className="text-xs font-medium">Aucune</span>
        </button>
        {actionTypes.map((actionType) => (
          <button
            key={actionType.id}
            type="button"
            onClick={() => onChange(actionType.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
              value === actionType.id
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            )}
          >
            <span className="text-lg">{actionType.icon}</span>
            <span className="text-xs font-medium">{actionType.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Sélecteur multi pour formulaires/templates autorisés
 */
const MultiSelectIds = ({ label, value = [], onChange, options = [], placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (id) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
  };
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      
      {/* Selected items */}
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {value.length === 0 ? (
          <span className="text-xs text-gray-400 italic">{placeholder || 'Aucun sélectionné'}</span>
        ) : (
          value.map(id => {
            const option = options.find(o => o.id === id);
            return (
              <span 
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs"
              >
                {option?.name || id}
                <button onClick={() => toggleOption(id)} className="hover:text-green-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}
      </div>
      
      {/* Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border rounded-lg text-left flex items-center justify-between hover:bg-gray-50"
      >
        <span className="text-gray-500">Sélectionner...</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {isOpen && (
        <div className="border rounded-lg max-h-40 overflow-y-auto">
          {options.length === 0 ? (
            <p className="p-3 text-xs text-gray-400 text-center">Aucune option disponible</p>
          ) : (
            options.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(option.id)}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-50",
                  value.includes(option.id) && "bg-blue-50"
                )}
              >
                <span>{option.name}</span>
                {value.includes(option.id) && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Sélecteur de mode (AI / HUMAN)
 */
const ModeSelector = ({ label, value, onChange, modes }) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    <div className="flex gap-2">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all",
            value === mode.id
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          )}
        >
          <span>{mode.icon}</span>
          <span className="text-xs font-medium">{mode.label}</span>
        </button>
      ))}
    </div>
  </div>
);

/**
 * Badge de validation de la config V2
 * Affiche Complet / Incomplet avec liste des erreurs
 */
const ValidationBadge = ({ validationResult, showDetails = true }) => {
  const { isComplete, errors, warnings } = validationResult;
  
  if (isComplete) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            Configuration complète
          </span>
        </div>
        {showDetails && warnings.length > 0 && (
          <div className="pl-2 space-y-1">
            {warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-amber-600">
                <span className="mt-0.5">⚠️</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-700">
          Configuration incomplète ({errors.length} erreur{errors.length > 1 ? 's' : ''})
        </span>
      </div>
      {showDetails && errors.length > 0 && (
        <div className="pl-2 space-y-1">
          {errors.map((error, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-red-600">
              <span className="mt-0.5">•</span>
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Panel de configuration IA pour un module
 * 
 * @param {Object} props
 * @param {string} props.moduleId - ID du module à configurer
 * @param {string} props.moduleName - Nom du module (pour affichage)
 * @param {boolean} props.isOpen - État d'ouverture du panel
 * @param {Function} props.onClose - Callback de fermeture
 * @param {Function} props.onSave - Callback après sauvegarde (optionnel)
 * @param {Array} props.availableForms - Liste des formulaires disponibles [{id, name}]
 * @param {Array} props.availableTemplates - Liste des templates disponibles [{id, name}]
 */
export function ModuleConfigPanel({ 
  moduleId, 
  moduleName, 
  isOpen, 
  onClose,
  onSave,
  availableForms = [],
  availableTemplates = [],
}) {
  // State local pour édition
  const [config, setConfig] = useState(DEFAULT_MODULE_CONFIG);
  const [actionConfig, setActionConfig] = useState(DEFAULT_ACTION_CONFIG);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [originalActionConfig, setOriginalActionConfig] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Sections collapsibles
  const [openSections, setOpenSections] = useState({
    objective: true,
    instructions: true,
    buttons: false,
    actions: false,
    advanced: false,
    actionConfigV2: true, // ✅ Nouvelle section ouverte par défaut
  });
  
  // Charger la config au mount ou changement de module
  useEffect(() => {
    if (moduleId) {
      const loadedConfig = getModuleAIConfig(moduleId);
      const loadedActionConfig = getModuleActionConfig(moduleId);
      setConfig(loadedConfig);
      setActionConfig(loadedActionConfig);
      setOriginalConfig(loadedConfig);
      setOriginalActionConfig(loadedActionConfig);
      setHasChanges(false);
    }
  }, [moduleId]);
  
  // Détecter les changements
  useEffect(() => {
    if (originalConfig && originalActionConfig) {
      const configChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
      const actionConfigChanged = JSON.stringify(actionConfig) !== JSON.stringify(originalActionConfig);
      setHasChanges(configChanged || actionConfigChanged);
    }
  }, [config, actionConfig, originalConfig, originalActionConfig]);
  
  // Validation en temps réel de la config action (PROMPT 5)
  // ⚠️ Pure validation - aucune exécution, aucun effet de bord
  const validationResult = useMemo(() => {
    // Créer une config temporaire avec les valeurs actuelles pour validation
    // (pas besoin d'aller chercher en mémoire, on valide le state local)
    const tempConfig = {
      targetAudience: actionConfig.targetAudience,
      actionType: actionConfig.actionType,
      allowedFormIds: actionConfig.allowedFormIds || [],
      allowedTemplateIds: actionConfig.allowedTemplateIds || [],
      managementMode: actionConfig.managementMode,
      verificationMode: actionConfig.verificationMode,
    };
    
    // Validation inline (même logique que isModuleConfigComplete)
    const errors = [];
    const warnings = [];
    
    // Règle 1: Au moins une cible
    const audience = tempConfig.targetAudience;
    const hasTarget = Array.isArray(audience) 
      ? audience.length > 0 
      : !!audience;
    if (!hasTarget) {
      errors.push({
        field: 'targetAudience',
        message: 'Au moins une cible doit être sélectionnée',
      });
    }
    
    // Règle 2: actionType défini
    if (!tempConfig.actionType) {
      errors.push({
        field: 'actionType',
        message: 'Le type d\'action doit être défini',
      });
    }
    
    // Règle 3: Si FORM → au moins un formulaire
    if (tempConfig.actionType === 'FORM' && tempConfig.allowedFormIds.length === 0) {
      errors.push({
        field: 'allowedFormIds',
        message: 'Au moins un formulaire doit être sélectionné',
      });
    }
    
    // Règle 4: Si SIGNATURE → au moins un formulaire
    if (tempConfig.actionType === 'SIGNATURE') {
      if (tempConfig.allowedFormIds.length === 0) {
        errors.push({
          field: 'allowedFormIds',
          message: 'Au moins un formulaire de collecte requis',
        });
      }
      if (tempConfig.allowedTemplateIds.length === 0) {
        warnings.push('Aucun template de contrat sélectionné');
      }
    }
    
    // Règle 5: managementMode défini
    if (!tempConfig.managementMode || !['AI', 'HUMAN'].includes(tempConfig.managementMode)) {
      errors.push({
        field: 'managementMode',
        message: 'Le mode de gestion doit être défini',
      });
    }
    
    // Règle 6: verificationMode défini
    if (!tempConfig.verificationMode || !['AI', 'HUMAN'].includes(tempConfig.verificationMode)) {
      errors.push({
        field: 'verificationMode',
        message: 'Le mode de vérification doit être défini',
      });
    }
    
    return { isComplete: errors.length === 0, errors, warnings };
  }, [actionConfig]);
  
  // Toggle section
  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Update field
  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };
  
  // Update nested field (buttonLabels)
  const updateButtonLabel = (key, value) => {
    setConfig(prev => ({
      ...prev,
      buttonLabels: { ...prev.buttonLabels, [key]: value },
    }));
  };
  
  // Update action config field
  const updateActionField = (field, value) => {
    setActionConfig(prev => ({ ...prev, [field]: value }));
  };
  
  // Save (in-memory)
  const handleSave = () => {
    // Save main config avec actionConfig intégré
    const fullConfig = { ...config, actionConfig };
    updateModuleAIConfig(moduleId, fullConfig);
    updateModuleActionConfig(moduleId, actionConfig);
    setOriginalConfig(config);
    setOriginalActionConfig(actionConfig);
    setHasChanges(false);
    onSave?.(fullConfig);
    console.log('[V2 Config] Saved (in-memory)', { moduleId, config: fullConfig });
  };
  
  // Reset
  const handleReset = () => {
    setConfig(originalConfig);
    setActionConfig(originalActionConfig);
    setHasChanges(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Config IA Module</h2>
            <p className="text-xs text-gray-500">{moduleName || moduleId}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>
      
      {/* Warning READ_ONLY */}
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
        <p className="text-xs text-amber-700">
          ⚠️ <strong>Mode READ_ONLY</strong> : Les modifications sont temporaires (session uniquement)
        </p>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Section: Objectif */}
        <div className="space-y-2">
          <SectionHeader 
            icon={Sparkles} 
            title="Objectif" 
            isOpen={openSections.objective}
            onToggle={() => toggleSection('objective')}
          />
          {openSections.objective && (
            <div className="pl-2 space-y-3">
              <TextInput
                label="Objectif du module"
                value={config.objective}
                onChange={(v) => updateField('objective', v)}
                placeholder="Quel est l'objectif principal de ce module ?"
                multiline
              />
            </div>
          )}
        </div>
        
        {/* Section: Instructions */}
        <div className="space-y-2">
          <SectionHeader 
            icon={MessageSquare} 
            title="Instructions IA" 
            isOpen={openSections.instructions}
            onToggle={() => toggleSection('instructions')}
          />
          {openSections.instructions && (
            <div className="pl-2 space-y-3">
              <TextInput
                label="Instructions pour l'IA"
                value={config.instructions}
                onChange={(v) => updateField('instructions', v)}
                placeholder="Comment l'IA doit-elle se comporter ?"
                multiline
              />
              <SelectInput
                label="Ton de l'IA"
                value={config.tone}
                onChange={(v) => updateField('tone', v)}
                options={[
                  { value: 'professional', label: '💼 Professionnel' },
                  { value: 'friendly', label: '😊 Amical' },
                  { value: 'technical', label: '🔧 Technique' },
                  { value: 'reassuring', label: '🤝 Rassurant' },
                  { value: 'enthusiastic', label: '🎉 Enthousiaste' },
                ]}
              />
            </div>
          )}
        </div>
        
        {/* Section: Boutons */}
        <div className="space-y-2">
          <SectionHeader 
            icon={Zap} 
            title="Labels des boutons" 
            isOpen={openSections.buttons}
            onToggle={() => toggleSection('buttons')}
          />
          {openSections.buttons && (
            <div className="pl-2 space-y-3">
              <TextInput
                label="Bouton PROCEED"
                value={config.buttonLabels?.proceedLabel || ''}
                onChange={(v) => updateButtonLabel('proceedLabel', v)}
                placeholder="Valider et continuer"
              />
              <TextInput
                label="Bouton NEED_DATA"
                value={config.buttonLabels?.needDataLabel || ''}
                onChange={(v) => updateButtonLabel('needDataLabel', v)}
                placeholder="J'ai besoin d'infos"
              />
            </div>
          )}
        </div>
        
        {/* Section: Actions */}
        <div className="space-y-2">
          <SectionHeader 
            icon={BookOpen} 
            title="Actions autorisées" 
            isOpen={openSections.actions}
            onToggle={() => toggleSection('actions')}
          />
          {openSections.actions && (
            <div className="pl-2 space-y-3">
              <TagsInput
                label="Actions que l'IA peut effectuer"
                value={config.allowedActions || []}
                onChange={(v) => updateField('allowedActions', v)}
              />
              <TextInput
                label="Clé de connaissance"
                value={config.knowledgeKey || ''}
                onChange={(v) => updateField('knowledgeKey', v)}
                placeholder="Clé vers la base d'info (ex: pdb)"
              />
            </div>
          )}
        </div>
        
        {/* Section: Configuration Actions V2 (Phase 1: FORM + SIGNATURE) */}
        <div className="space-y-2">
          <SectionHeader 
            icon={Target} 
            title="Configuration Actions V2" 
            isOpen={openSections.actionConfigV2}
            onToggle={() => toggleSection('actionConfigV2')}
            badge={<span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">V2</span>}
          />
          {openSections.actionConfigV2 && (
            <div className="pl-2 space-y-4">
              {/* Target Audience */}
              <TargetAudienceSelector
                value={actionConfig.targetAudience}
                onChange={(v) => updateActionField('targetAudience', v)}
              />
              
              {/* Action Type */}
              <ActionTypeSelector
                value={actionConfig.actionType}
                onChange={(v) => updateActionField('actionType', v)}
              />
              
              {/* Forms (if actionType = FORM) */}
              {actionConfig.actionType === ACTION_TYPES.FORM && (
                <MultiSelectIds
                  label="Formulaires autorisés"
                  icon={FileText}
                  items={availableForms}
                  selectedIds={actionConfig.allowedFormIds || []}
                  onChange={(ids) => updateActionField('allowedFormIds', ids)}
                  emptyMessage="Aucun formulaire disponible"
                />
              )}
              
              {/* Templates (if actionType = SIGNATURE) */}
              {actionConfig.actionType === ACTION_TYPES.SIGNATURE && (
                <MultiSelectIds
                  label="Templates de contrat autorisés"
                  icon={PenTool}
                  items={availableTemplates}
                  selectedIds={actionConfig.allowedTemplateIds || []}
                  onChange={(ids) => updateActionField('allowedTemplateIds', ids)}
                  emptyMessage="Aucun template disponible"
                />
              )}
              
              {/* Management Mode */}
              <ModeSelector
                label="Mode de gestion"
                value={actionConfig.managementMode}
                options={Object.values(MANAGEMENT_MODES)}
                onChange={(v) => updateActionField('managementMode', v)}
              />
              
              {/* Verification Mode */}
              <ModeSelector
                label="Mode de vérification"
                value={actionConfig.verificationMode}
                options={Object.values(VERIFICATION_MODES)}
                onChange={(v) => updateActionField('verificationMode', v)}
              />
              
              {/* Validation Badge - PROMPT 5 */}
              <div className="mt-4 pt-3 border-t">
                <ValidationBadge 
                  validationResult={validationResult} 
                  showDetails={true} 
                />
              </div>
              
              {/* Simulateur ActionOrder - PROMPT 6 */}
              {validationResult.isComplete && (
                <div className="mt-4">
                  <ActionOrderSimulator
                    moduleId={moduleId}
                    projectType={null}
                    prospectId={null}
                    actionConfig={actionConfig}
                    availableForms={availableForms}
                    availableTemplates={availableTemplates}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Section: Avancé */}
        <div className="space-y-2">
          <SectionHeader 
            icon={Settings} 
            title="Paramètres avancés" 
            isOpen={openSections.advanced}
            onToggle={() => toggleSection('advanced')}
          />
          {openSections.advanced && (
            <div className="pl-2 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Longueur max des réponses
                </label>
                <input
                  type="number"
                  value={config.maxResponseLength || 500}
                  onChange={(e) => updateField('maxResponseLength', parseInt(e.target.value))}
                  min={100}
                  max={2000}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
                <p className="text-xs text-gray-400">
                  {config.maxResponseLength || 500} caractères max
                </p>
              </div>
            </div>
          )}
        </div>
        
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={!hasChanges}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges}
          className={cn(
            hasChanges && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          <Save className="h-4 w-4 mr-1" />
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUTON POUR OUVRIR LE PANEL
// ─────────────────────────────────────────────────────────────────────────────

export function ModuleConfigButton({ onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors",
        className
      )}
      title="Configurer l'IA du module"
    >
      <Settings className="h-4 w-4" />
    </button>
  );
}

export default ModuleConfigPanel;
