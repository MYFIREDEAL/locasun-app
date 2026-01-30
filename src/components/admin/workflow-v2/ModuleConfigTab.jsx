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

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Users,
  FileText,
  PenTool,
  Settings,
  Upload,
  Trash2,
  File,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { useSupabaseProjectFiles } from '@/hooks/useSupabaseProjectFiles';
import { supabase } from '@/lib/supabase';

// ✅ Import config V2 (pas de V1)
import { 
  getModuleAIConfig, 
  updateModuleAIConfig,
  DEFAULT_MODULE_CONFIG,
  getActionDescription,
  getModuleActionConfig,
  updateModuleActionConfig,
  DEFAULT_ACTION_CONFIG,
  isModuleConfigComplete,
} from '@/lib/moduleAIConfig';

// ✅ Import simulateur ActionOrder (PROMPT 6-7)
import { ActionOrderSimulator } from './ActionOrderSimulator';

// ✅ Import catalogue V2 pour les sélecteurs
import {
  ACTION_TYPES,
  TARGET_AUDIENCES,
  MANAGEMENT_MODES,
  VERIFICATION_MODES,
  getTargetAudiencesList,
  getActionTypesList,
  getManagementModesList,
  getVerificationModesList,
} from '@/lib/catalogueV2';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES COMPLETION TRIGGER
// ─────────────────────────────────────────────────────────────────────────────

const COMPLETION_TRIGGER_OPTIONS = [
  { 
    id: 'form_approved', 
    label: 'Formulaire validé', 
    icon: '📝',
    description: 'L\'étape est terminée quand un formulaire est approuvé'
  },
  { 
    id: 'signature', 
    label: 'Signature complétée', 
    icon: '✍️',
    description: 'L\'étape est terminée quand le contrat est signé'
  },
  { 
    id: 'checklist', 
    label: 'Checklist complétée', 
    icon: '✅',
    description: 'L\'étape est terminée quand toutes les cases sont cochées'
  },
  { 
    id: 'ia_confirmation', 
    label: 'Objectif atteint par échange IA', 
    icon: '🤖',
    description: 'L\'étape est terminée quand l\'IA confirme l\'objectif atteint'
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

const FieldLabel = ({ icon: Icon, label, readOnly = false, required = false }) => (
  <div className="flex items-center gap-2 mb-1.5">
    {Icon && <Icon className="h-4 w-4 text-blue-600" />}
    <span className="text-sm font-medium text-gray-700">{label}</span>
    {required && (
      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
        Requis
      </span>
    )}
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
// SOUS-COMPOSANTS ÉDITABLES (PHASE 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checkbox multiple pour les cibles
 */
const TargetCheckboxGroup = ({ selected = [], onChange, targets }) => (
  <div className="flex flex-wrap gap-3">
    {targets.map((target) => {
      const isChecked = selected.includes(target.id);
      return (
        <label
          key={target.id}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
            isChecked 
              ? "bg-blue-50 border-blue-300 text-blue-700" 
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selected, target.id]);
              } else {
                onChange(selected.filter(t => t !== target.id));
              }
            }}
            className="sr-only"
          />
          <span className="text-lg">{target.icon}</span>
          <span className="text-sm font-medium">{target.label}</span>
          {isChecked && <CheckCircle className="h-4 w-4 text-blue-600" />}
        </label>
      );
    })}
  </div>
);

/**
 * Radio group pour le type d'action
 */
const ActionTypeRadioGroup = ({ selected, onChange, actionTypes }) => (
  <div className="flex gap-3">
    {actionTypes.map((type) => {
      const isSelected = selected === type.id;
      return (
        <label
          key={type.id}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1",
            isSelected 
              ? "bg-purple-50 border-purple-300 text-purple-700" 
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          <input
            type="radio"
            name="actionType"
            value={type.id}
            checked={isSelected}
            onChange={() => onChange(type.id)}
            className="sr-only"
          />
          <span className="text-lg">{type.icon}</span>
          <span className="text-sm font-medium">{type.label}</span>
          {isSelected && <CheckCircle className="h-4 w-4 text-purple-600" />}
        </label>
      );
    })}
  </div>
);

/**
 * Multi-select pour formulaires
 */
const FormMultiSelect = ({ selected = [], onChange, forms = [] }) => {
  if (forms.length === 0) {
    return (
      <div className="p-3 bg-gray-50 border border-dashed rounded-lg text-sm text-gray-400 italic">
        Aucun formulaire disponible. Chargez les formulaires depuis Supabase.
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
      {forms.map((form) => {
        const isChecked = selected.includes(form.id);
        return (
          <label
            key={form.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
              isChecked ? "bg-blue-50" : "hover:bg-gray-50"
            )}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, form.id]);
                } else {
                  onChange(selected.filter(f => f !== form.id));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{form.name}</span>
          </label>
        );
      })}
    </div>
  );
};

/**
 * Select pour template signature
 */
const TemplateSelect = ({ selected, onChange, templates = [] }) => {
  if (templates.length === 0) {
    return (
      <div className="p-3 bg-gray-50 border border-dashed rounded-lg text-sm text-gray-400 italic">
        Aucun template disponible. Chargez les templates depuis Supabase.
      </div>
    );
  }
  return (
    <select
      value={selected || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
    >
      <option value="">-- Sélectionner un template --</option>
      {templates.map((template) => (
        <option key={template.id} value={template.id}>
          {template.name}
        </option>
      ))}
    </select>
  );
};

/**
 * Select pour mode (AI / HUMAN)
 */
const ModeSelect = ({ label, icon: Icon, selected, onChange, modes }) => (
  <div>
    <div className="flex items-center gap-2 mb-1.5">
      {Icon && <Icon className="h-4 w-4 text-gray-500" />}
      <span className="text-xs text-gray-600">{label}</span>
    </div>
    <div className="flex gap-2">
      {modes.map((mode) => {
        const isSelected = selected === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all",
              isSelected
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * Multi-select pour knowledgeKey
 */
const KnowledgeKeySelect = ({ selected = [], onChange }) => {
  // Liste des clés disponibles (statique pour Phase 3)
  const AVAILABLE_KEYS = [
    { id: 'prospect_info', label: 'Infos Prospect', icon: '👤' },
    { id: 'project_data', label: 'Données Projet', icon: '📊' },
    { id: 'contract_history', label: 'Historique Contrats', icon: '📜' },
    { id: 'forms_submitted', label: 'Formulaires Soumis', icon: '📝' },
    { id: 'chat_history', label: 'Historique Chat', icon: '💬' },
    { id: 'documents', label: 'Documents', icon: '📁' },
  ];
  
  const selectedArray = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  
  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE_KEYS.map((key) => {
        const isChecked = selectedArray.includes(key.id);
        return (
          <button
            key={key.id}
            type="button"
            onClick={() => {
              if (isChecked) {
                onChange(selectedArray.filter(k => k !== key.id));
              } else {
                onChange([...selectedArray, key.id]);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition-all",
              isChecked
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            )}
          >
            <span>{key.icon}</span>
            <span>{key.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Badge de validation config
 */
const ValidationBadge = ({ isComplete, details }) => (
  <div
    className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      isComplete
        ? "bg-green-100 text-green-700"
        : "bg-orange-100 text-orange-700"
    )}
    title={details}
  >
    {isComplete ? (
      <>
        <CheckCircle className="h-3.5 w-3.5" />
        Config complète
      </>
    ) : (
      <>
        <Info className="h-3.5 w-3.5" />
        Config incomplète
      </>
    )}
  </div>
);

/**
 * Select pour le trigger de complétion d'étape
 */
const CompletionTriggerSelect = ({ selected, onChange }) => (
  <div className="space-y-2">
    {COMPLETION_TRIGGER_OPTIONS.map((option) => {
      const isSelected = selected === option.id;
      return (
        <label
          key={option.id}
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
            isSelected 
              ? "bg-green-50 border-green-300 shadow-sm" 
              : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          <input
            type="radio"
            name="completionTrigger"
            value={option.id}
            checked={isSelected}
            onChange={() => onChange(option.id)}
            className="sr-only"
          />
          <span className="text-xl mt-0.5">{option.icon}</span>
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              isSelected ? "text-green-800" : "text-gray-700"
            )}>
              {option.label}
            </p>
            <p className={cn(
              "text-xs mt-0.5",
              isSelected ? "text-green-600" : "text-gray-500"
            )}>
              {option.description}
            </p>
          </div>
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          )}
        </label>
      );
    })}
  </div>
);

/**
 * Composant pour uploader et afficher les documents liés à une étape
 * UX-4: Ajout de documents manuels par étape
 */
const ModuleDocuments = ({ 
  moduleId, 
  projectType, 
  prospectId, 
  organizationId,
  uploadedBy 
}) => {
  const fileInputRef = useRef(null);
  
  // Hook pour gérer les fichiers avec field_label = moduleId pour filtrer par étape
  const { 
    files, 
    loading, 
    uploading, 
    uploadFile, 
    deleteFile 
  } = useSupabaseProjectFiles({ 
    projectType, 
    prospectId, 
    organizationId,
    enabled: !!projectType && !!prospectId 
  });
  
  // Filtrer les fichiers pour ce module spécifique
  const moduleFiles = useMemo(() => {
    if (!files || !moduleId) return [];
    return files.filter(f => f.field_label === `module:${moduleId}`);
  }, [files, moduleId]);
  
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await uploadFile({
        file,
        uploadedBy: uploadedBy || 'admin',
        fieldLabel: `module:${moduleId}`, // Tag pour identifier le module
      });
      
      toast({
        title: '✅ Document ajouté',
        description: `${file.name} a été uploadé pour cette étape.`,
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: '❌ Erreur upload',
        description: err.message,
        variant: 'destructive',
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDelete = async (file) => {
    if (!confirm(`Supprimer "${file.file_name}" ?`)) return;
    
    try {
      await deleteFile(file.id, file.storage_path);
      toast({
        title: '🗑️ Document supprimé',
        description: `${file.file_name} a été supprimé.`,
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: '❌ Erreur suppression',
        description: err.message,
        variant: 'destructive',
      });
    }
  };
  
  const handleDownload = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);
      
      if (error) throw error;
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: '❌ Erreur téléchargement',
        description: err.message,
        variant: 'destructive',
      });
    }
  };
  
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  if (!prospectId || !projectType) {
    return (
      <div className="p-3 bg-gray-50 border border-dashed rounded-lg text-sm text-gray-400 italic text-center">
        Sélectionnez un prospect pour gérer les documents de cette étape.
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Bouton d'upload */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Ajouter un document pour cette étape
            </>
          )}
        </Button>
      </div>
      
      {/* Liste des fichiers */}
      {loading ? (
        <div className="text-sm text-gray-400 italic">Chargement des documents...</div>
      ) : moduleFiles.length === 0 ? (
        <div className="text-sm text-gray-400 italic">
          Aucun document pour cette étape.
        </div>
      ) : (
        <div className="space-y-2">
          {moduleFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <File className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {file.file_name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-blue-600"
                  onClick={() => handleDownload(file)}
                  title="Télécharger"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-red-600"
                  onClick={() => handleDelete(file)}
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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
  prospectId = null,  // ✅ Ajouté pour exécution V2
  projectType = null, // ✅ Ajouté pour exécution V2
  availableForms = [], // ✅ Ajouté pour sélection formulaires
  availableTemplates = [], // ✅ Ajouté pour sélection templates
  templateOps = {},   // ✅ PROMPT 9: Load/Save config vers Supabase
}) => {
  // Extraire fonctions templateOps
  const { 
    loadTemplate, 
    saveTemplate, 
    isPersisted = false, 
    isSaving = false,
    loading: templateLoading = false 
  } = templateOps;
  // State local pour édition
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // State pour actionConfig V2 (PROMPT 3-7)
  const [actionConfig, setActionConfig] = useState(DEFAULT_ACTION_CONFIG);
  
  // ✅ Calculer si config complète (PHASE 3)
  const configValidation = useMemo(() => {
    return isModuleConfigComplete(moduleId, actionConfig);
  }, [moduleId, actionConfig]);
  
  // Charger la config au mount ou changement de module
  useEffect(() => {
    if (moduleId) {
      const loadedConfig = getModuleAIConfig(moduleId);
      setConfig({ ...loadedConfig });
      setOriginalConfig({ ...loadedConfig });
      setHasChanges(false);
      setSaveSuccess(false);
      
      // Charger aussi l'actionConfig V2
      const loadedActionConfig = getModuleActionConfig(moduleId);
      setActionConfig(loadedActionConfig);
    }
  }, [moduleId]);
  
  // ✅ PROMPT 9: Charger config depuis Supabase (si existe)
  useEffect(() => {
    const loadFromDB = async () => {
      if (moduleId && projectType && loadTemplate) {
        try {
          const dbRecord = await loadTemplate(projectType, moduleId);
          // ✅ FIX: La config est dans configJson, pas à la racine
          const dbConfig = dbRecord?.configJson;
          if (dbConfig) {
            // Fusionner avec la config locale (DB a priorité)
            setConfig(prev => ({ ...prev, ...dbConfig }));
            setOriginalConfig(prev => ({ ...prev, ...dbConfig }));
            
            // ✅ FIX: Charger aussi actionConfig depuis la DB
            if (dbConfig.actionConfig) {
              setActionConfig(prev => ({ ...prev, ...dbConfig.actionConfig }));
            }
            
            console.log('[V2 Config Tab] Loaded config from Supabase:', { moduleId, projectType, hasActionConfig: !!dbConfig.actionConfig });
          }
        } catch (err) {
          console.warn('[V2 Config Tab] No DB config found, using in-memory:', err.message);
        }
      }
    };
    loadFromDB();
  }, [moduleId, projectType, loadTemplate]);
  
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
  
  // ✅ PROMPT 9: Save to Supabase (persistent)
  const handleSaveToDB = async () => {
    if (!saveTemplate || !projectType) {
      toast({
        title: '⚠️ Persistance non disponible',
        description: 'projectType ou saveTemplate manquant',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }
    
    try {
      // Fusionner config + actionConfig pour persistance
      const fullConfig = {
        ...config,
        actionConfig: actionConfig,
      };
      
      await saveTemplate(projectType, moduleId, fullConfig);
      
      toast({
        title: '✅ Configuration persistée',
        description: 'Sauvegarde en base réussie — sera rechargée au prochain refresh',
        duration: 4000,
      });
      
      console.log('[V2 Config Tab] Saved to Supabase:', { moduleId, projectType, fullConfig });
    } catch (err) {
      console.error('[V2 Config Tab] Save to DB failed:', err);
      toast({
        title: '❌ Erreur de sauvegarde',
        description: err.message,
        variant: 'destructive',
        duration: 4000,
      });
    }
  };
  
  // Reset
  const handleReset = () => {
    setConfig({ ...originalConfig });
    setHasChanges(false);
    setSaveSuccess(false);
  };
  
  // ✅ PHASE 3: Update actionConfig field (in-memory)
  const updateActionConfigField = (field, value) => {
    setActionConfig(prev => {
      const updated = { ...prev, [field]: value };
      // Persister en mémoire via moduleAIConfig
      updateModuleActionConfig(moduleId, updated);
      console.log('[V2 Config Tab] ActionConfig updated:', { field, value, moduleId });
      return updated;
    });
  };
  
  // ✅ PHASE 3: Update knowledgeKey in main config
  const updateKnowledgeKey = (value) => {
    setConfig(prev => {
      const updated = { ...prev, knowledgeKey: value };
      return updated;
    });
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
        
        {/* Badge PERSISTED ou TEMPORARY */}
        {isPersisted ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
            <CheckCircle className="h-3.5 w-3.5" />
            Configuration persistée
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
            <Shield className="h-3.5 w-3.5" />
            Modifications temporaires
          </div>
        )}
      </div>
      
      {/* Info banner - contextuel */}
      <div className={cn(
        "p-3 border rounded-lg",
        isPersisted ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"
      )}>
        <p className={cn(
          "text-xs flex items-start gap-2",
          isPersisted ? "text-emerald-700" : "text-blue-700"
        )}>
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            {isPersisted 
              ? "Cette configuration est enregistrée en base. Elle sera rechargée automatiquement au prochain refresh."
              : "Cliquez 'Enregistrer en base' pour persister cette configuration. Elle sera rechargée automatiquement après refresh."
            }
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
          SECTION 4.5: CONFIGURATION ACTIONS V2 ÉDITABLE (PHASE 3)
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-purple-50 to-blue-50 -mx-6 px-6 py-4 border-y border-purple-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-700">Configuration Actions V2</h3>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
              Phase 3 - Éditable
            </span>
          </div>
          <ValidationBadge 
            isComplete={configValidation.isComplete} 
            details={configValidation.summary} 
          />
        </div>
        
        {/* 1️⃣ CIBLES AUTORISÉES */}
        <div className="mb-4">
          <FieldLabel icon={Users} label="Cibles autorisées" />
          <TargetCheckboxGroup
            selected={Array.isArray(actionConfig.targetAudience) 
              ? actionConfig.targetAudience 
              : (actionConfig.targetAudience ? [actionConfig.targetAudience] : [])}
            onChange={(targets) => updateActionConfigField('targetAudience', targets)}
            targets={getTargetAudiencesList()}
          />
        </div>
        
        {/* 2️⃣ TYPE D'ACTION */}
        <div className="mb-4">
          <FieldLabel icon={Zap} label="Type d'action autorisée" />
          <ActionTypeRadioGroup
            selected={actionConfig.actionType}
            onChange={(type) => updateActionConfigField('actionType', type)}
            actionTypes={getActionTypesList()}
          />
        </div>
        
        {/* 3️⃣ FORMULAIRES AUTORISÉS (si actionType = FORM) */}
        {actionConfig.actionType === 'FORM' && (
          <div className="mb-4">
            <FieldLabel icon={FileText} label="Formulaires autorisés" />
            <FormMultiSelect
              selected={actionConfig.allowedFormIds || []}
              onChange={(formIds) => updateActionConfigField('allowedFormIds', formIds)}
              forms={availableForms}
            />
          </div>
        )}
        
        {/* 4️⃣ TEMPLATE SIGNATURE (si actionType = SIGNATURE) */}
        {actionConfig.actionType === 'SIGNATURE' && (
          <>
            <div className="mb-4">
              <FieldLabel icon={PenTool} label="Template de signature" required />
              <TemplateSelect
                selected={actionConfig.templateId}
                onChange={(templateId) => updateActionConfigField('templateId', templateId)}
                templates={availableTemplates}
              />
              {/* ⚠️ Avertissement template obligatoire */}
              {!actionConfig.templateId && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <span className="text-amber-500">⚠️</span>
                  <span className="font-medium">Obligatoire pour générer le contrat PDF</span>
                </p>
              )}
            </div>
            <div className="mb-4">
              <FieldLabel icon={FileText} label="Formulaire(s) de collecte" />
              <FormMultiSelect
                forms={availableForms}
                selected={actionConfig.allowedFormIds || []}
                onChange={(formIds) => updateActionConfigField('allowedFormIds', formIds)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Sélectionnez le formulaire contenant les données à injecter dans le contrat
              </p>
            </div>
          </>
        )}
        
        {/* 5️⃣ MODES (Gestion + Vérification) */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <ModeSelect
            label="Mode de gestion"
            icon={Settings}
            selected={actionConfig.managementMode || 'AI'}
            onChange={(mode) => updateActionConfigField('managementMode', mode)}
            modes={getManagementModesList()}
          />
          <ModeSelect
            label="Mode de vérification"
            icon={Shield}
            selected={actionConfig.verificationMode || 'AI'}
            onChange={(mode) => updateActionConfigField('verificationMode', mode)}
            modes={getVerificationModesList()}
          />
        </div>
        
        {/* ─────────────────────────────────────────────────────────────────
            SECTION 6: VALIDATION DE L'ÉTAPE
        ───────────────────────────────────────────────────────────────── */}
        <div className="border-t border-purple-200 my-4" />
        
        <CompletionTriggerSelect
          selected={actionConfig.completionTrigger}
          onChange={(trigger) => updateActionConfigField('completionTrigger', trigger)}
        />
        
        {/* Séparateur avant simulateur */}
        <div className="border-t border-purple-200 my-4" />
        
        {/* Simulateur ActionOrder */}
        <ActionOrderSimulator
          moduleId={moduleId}
          projectType={projectType}
          prospectId={prospectId}
          actionConfig={actionConfig}
          availableForms={availableForms}
          availableTemplates={availableTemplates}
        />
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 5: ACCÈS AUX DONNÉES (ÉDITABLE PHASE 3)
      ───────────────────────────────────────────────────────────────── */}
      <section>
        <FieldLabel icon={BookOpen} label="Accès aux données (knowledgeKey)" />
        <KnowledgeKeySelect
          selected={config.knowledgeKey}
          onChange={updateKnowledgeKey}
        />
        <p className="text-xs text-gray-400 mt-2">
          Sélectionnez les sources de données auxquelles l'IA peut accéder.
        </p>
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 6: DOCUMENTS DE L'ÉTAPE (UX-4)
      ───────────────────────────────────────────────────────────────── */}
      <section>
        <FieldLabel icon={FileText} label="Documents de cette étape" />
        <p className="text-xs text-gray-500 mb-3">
          Ajoutez des documents spécifiques à cette étape (contrats, guides, annexes...).
        </p>
        <ModuleDocuments
          moduleId={moduleId}
          projectType={projectType}
          prospectId={prospectId}
          organizationId={templateOps?.organizationId}
          uploadedBy={templateOps?.uploadedBy}
        />
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          FOOTER: BOUTONS ACTION
      ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Sauvegardé (session)
            </span>
          )}
          {isPersisted && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="h-3.5 w-3.5" />
              Persisté en base
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
            Session
          </Button>
          {/* ✅ PROMPT 9: Bouton persistance Supabase */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveToDB}
            disabled={isSaving || !projectType}
            className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
          >
            {isSaving ? (
              <>
                <Settings className="h-4 w-4 mr-1 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Enregistrer en base
              </>
            )}
          </Button>
        </div>
      </div>
      
    </div>
  );
};

export default ModuleConfigTab;
