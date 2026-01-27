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

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ✅ Import config V2 (pas de V1)
import { 
  getModuleAIConfig, 
  updateModuleAIConfig,
  DEFAULT_MODULE_CONFIG,
} from '@/lib/moduleAIConfig';

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS INTERNES
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, isOpen, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-gray-700">{title}</span>
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
 */
export function ModuleConfigPanel({ 
  moduleId, 
  moduleName, 
  isOpen, 
  onClose,
  onSave,
}) {
  // State local pour édition
  const [config, setConfig] = useState(DEFAULT_MODULE_CONFIG);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Sections collapsibles
  const [openSections, setOpenSections] = useState({
    objective: true,
    instructions: true,
    buttons: false,
    actions: false,
    advanced: false,
  });
  
  // Charger la config au mount ou changement de module
  useEffect(() => {
    if (moduleId) {
      const loadedConfig = getModuleAIConfig(moduleId);
      setConfig(loadedConfig);
      setOriginalConfig(loadedConfig);
      setHasChanges(false);
    }
  }, [moduleId]);
  
  // Détecter les changements
  useEffect(() => {
    if (originalConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
    }
  }, [config, originalConfig]);
  
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
  
  // Save (in-memory)
  const handleSave = () => {
    updateModuleAIConfig(moduleId, config);
    setOriginalConfig(config);
    setHasChanges(false);
    onSave?.(config);
    console.log('[V2 Config] Saved (in-memory)', { moduleId, config });
  };
  
  // Reset
  const handleReset = () => {
    setConfig(originalConfig);
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
