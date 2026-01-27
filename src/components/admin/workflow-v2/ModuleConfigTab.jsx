/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE CONFIG TAB - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Onglet de configuration IA pour un module, affiché inline dans ModulePanel.
 * 
 * Affiche et permet de modifier (en mémoire) :
 *   1) Objective du module (input texte)
 *   2) Instructions IA (textarea principal)
 *   3) Labels des 2 boutons (PROCEED / NEED_DATA)
 *   4) Actions possibles (allowedActions) — READ_ONLY
 *   5) Base d'info liée (knowledgeKey) — READ_ONLY
 * 
 * ⚠️ Phase 1: READ_ONLY - Modifications temporaires (session uniquement)
 *    Aucune écriture DB, aucune cascade.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RotateCcw,
  Sparkles,
  MessageSquare,
  Zap,
  BookOpen,
  Shield,
  Info,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

// ✅ Import config V2 (pas de V1)
import { 
  getModuleAIConfig, 
  updateModuleAIConfig,
  DEFAULT_MODULE_CONFIG,
  getActionDescription,
} from '@/lib/moduleAIConfig';

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

const FieldLabel = ({ icon: Icon, label, readOnly = false }) => (
  <div className="flex items-center gap-2 mb-1.5">
    {Icon && <Icon className="h-4 w-4 text-blue-600" />}
    <span className="text-sm font-medium text-gray-700">{label}</span>
    {readOnly && (
      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
        Lecture seule
      </span>
    )}
  </div>
);

const TextInput = ({ value, onChange, placeholder, disabled = false }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className={cn(
      "w-full px-3 py-2 text-sm border rounded-lg",
      "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      disabled && "bg-gray-50 text-gray-500 cursor-not-allowed"
    )}
  />
);

const TextArea = ({ value, onChange, placeholder, rows = 5, disabled = false }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    className={cn(
      "w-full px-3 py-2 text-sm border rounded-lg resize-y",
      "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      disabled && "bg-gray-50 text-gray-500 cursor-not-allowed"
    )}
  />
);

const ActionTag = ({ action }) => {
  const desc = getActionDescription(action);
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
      title={desc.description}
    >
      <span>{desc.icon}</span>
      <span>{desc.label}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Onglet de configuration IA pour un module
 * 
 * @param {Object} props
 * @param {string} props.moduleId - ID du module (ex: 'inscription', 'pdb')
 * @param {string} props.moduleName - Nom affiché du module
 * @param {boolean} props.isReadOnly - Mode lecture seule (toujours true en Phase 1)
 */
const ModuleConfigTab = ({ 
  moduleId, 
  moduleName,
  isReadOnly = true,
}) => {
  // State local pour édition
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Charger la config au mount ou changement de module
  useEffect(() => {
    if (moduleId) {
      const loadedConfig = getModuleAIConfig(moduleId);
      setConfig({ ...loadedConfig });
      setOriginalConfig({ ...loadedConfig });
      setHasChanges(false);
      setSaveSuccess(false);
    }
  }, [moduleId]);
  
  // Détecter les changements
  useEffect(() => {
    if (config && originalConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
      if (hasChanges) setSaveSuccess(false);
    }
  }, [config, originalConfig]);
  
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
    setOriginalConfig({ ...config });
    setHasChanges(false);
    setSaveSuccess(true);
    
    toast({
      title: '✅ Configuration sauvegardée',
      description: 'Modifications appliquées (session uniquement)',
      duration: 3000,
    });
    
    console.log('[V2 Config Tab] Saved (in-memory)', { moduleId, config });
  };
  
  // Reset
  const handleReset = () => {
    setConfig({ ...originalConfig });
    setHasChanges(false);
    setSaveSuccess(false);
  };
  
  if (!config) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Chargement de la configuration...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────────
          HEADER + WARNING
      ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Configuration IA
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Module : {moduleName || moduleId}
          </p>
        </div>
        
        {/* Badge READ_ONLY */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
          <Shield className="h-3.5 w-3.5" />
          Modifications temporaires
        </div>
      </div>
      
      {/* Warning */}
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-700 flex items-start gap-2">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Les modifications sont appliquées en mémoire (session uniquement). 
            Elles seront perdues au rechargement de la page jusqu'à activation 
            de la persistance (PROMPT 9).
          </span>
        </p>
      </div>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 1: OBJECTIF
      ───────────────────────────────────────────────────────────────── */}
      <section>
        <FieldLabel icon={Sparkles} label="Objectif du module" />
        <TextArea
          value={config.objective || ''}
          onChange={(v) => updateField('objective', v)}
          placeholder="Décrivez l'objectif principal de ce module..."
          rows={2}
        />
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 2: INSTRUCTIONS IA
      ───────────────────────────────────────────────────────────────── */}
      <section>
        <FieldLabel icon={MessageSquare} label="Instructions IA" />
        <TextArea
          value={config.instructions || ''}
          onChange={(v) => updateField('instructions', v)}
          placeholder="Instructions détaillées pour l'IA (comportement, règles, contexte)..."
          rows={6}
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Ces instructions guident le comportement de l'IA dans ce module.
        </p>
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 3: LABELS BOUTONS
      ───────────────────────────────────────────────────────────────── */}
      <section>
        <FieldLabel icon={Zap} label="Labels des boutons" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Bouton PROCEED
            </label>
            <TextInput
              value={config.buttonLabels?.proceedLabel || ''}
              onChange={(v) => updateButtonLabel('proceedLabel', v)}
              placeholder="Valider et continuer"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Bouton NEED_DATA
            </label>
            <TextInput
              value={config.buttonLabels?.needDataLabel || ''}
              onChange={(v) => updateButtonLabel('needDataLabel', v)}
              placeholder="J'ai besoin d'infos"
            />
          </div>
        </div>
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 4: ACTIONS AUTORISÉES (READ_ONLY)
      ───────────────────────────────────────────────────────────────── */}
      <section>
        <FieldLabel icon={BookOpen} label="Actions autorisées" readOnly />
        {config.allowedActions && config.allowedActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {config.allowedActions.map((action) => (
              <ActionTag key={action} action={action} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Aucune action configurée
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Liste des actions que l'IA peut effectuer (non modifiable en Phase 1).
        </p>
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 5: BASE D'INFO (READ_ONLY)
      ───────────────────────────────────────────────────────────────── */}
      <section>
        <FieldLabel icon={BookOpen} label="Base d'info liée" readOnly />
        <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">
          {config.knowledgeKey ? (
            <span className="text-gray-700 font-mono">
              📚 {config.knowledgeKey}
            </span>
          ) : (
            <span className="text-gray-400 italic">
              Aucune base de connaissance liée
            </span>
          )}
        </div>
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          FOOTER: BOUTONS ACTION
      ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Sauvegardé
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
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
      
    </div>
  );
};

export default ModuleConfigTab;
