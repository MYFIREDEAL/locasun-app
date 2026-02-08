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
  AlertCircle,
  Users,
  FileText,
  PenTool,
  Settings,
  Upload,
  Trash2,
  File,
  Download,
  FolderOpen,
  Check,
  X,
  Plus,
  ChevronRight,
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
    icon: '✨',
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
 * Radio group pour les cibles (sélection unique)
 */
const TargetCheckboxGroup = ({ selected, onChange, targets }) => (
  <div className="grid grid-cols-3 gap-3">
    {targets.map((target) => {
      // Support legacy: si selected est un array, prendre le premier élément
      const selectedValue = Array.isArray(selected) ? selected[0] : selected;
      const isChecked = selectedValue === target.id;
      return (
        <label
          key={target.id}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all",
            isChecked 
              ? "bg-blue-50 border-blue-300 text-blue-700" 
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          <input
            type="radio"
            name="targetAudience"
            value={target.id}
            checked={isChecked}
            onChange={() => onChange(target.id)}
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
      const isMock = type.isMock;
      return (
        <label
          key={type.id}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all flex-1 relative",
            isSelected 
              ? "bg-purple-50 border-purple-300 text-purple-700" 
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
            isMock && "opacity-75"
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
          {isMock && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
              Bientôt
            </span>
          )}
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
  
  // Convertir selected en tableau si ce n'est pas déjà le cas
  const selectedArray = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  const selectedId = selectedArray.length > 0 ? selectedArray[0] : null;
  
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
      {forms.map((form) => {
        const isChecked = selectedId === form.id;
        return (
          <label
            key={form.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
              isChecked ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
            )}
          >
            <input
              type="radio"
              name="formSelection"
              checked={isChecked}
              onChange={() => {
                // Sélectionner uniquement ce formulaire
                onChange([form.id]);
              }}
              className="text-blue-600 focus:ring-blue-500"
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
 * Multi-select pour knowledgeKey - LECTURE SEULE (tout coché par défaut)
 */
const KnowledgeKeySelect = ({ selected = [], onChange }) => {
  // Liste des clés disponibles - toutes activées, non modifiable
  const AVAILABLE_KEYS = [
    { id: 'prospect_info', label: 'Infos Prospect', icon: '👤' },
    { id: 'contract_history', label: 'Historique Contrats', icon: '📜' },
    { id: 'forms_submitted', label: 'Formulaires Soumis', icon: '📝' },
    { id: 'chat_history', label: 'Historique Chat', icon: '💬' },
    { id: 'documents', label: 'Documents', icon: '📁' },
    { id: 'client_projects_history', label: 'Historique projets (client)', icon: '🗂️' },
    { id: 'commercial_activity', label: 'Activité commerciaux', icon: '📞' },
    { id: 'partner_activity', label: 'Activité partenaires', icon: '🤝' },
  ];
  
  // Tout est coché par défaut, lecture seule
  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE_KEYS.map((key) => (
        <div
          key={key.id}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border bg-green-50 border-green-300 text-green-700 cursor-default"
          title="Activé par défaut (lecture seule)"
        >
          <span>{key.icon}</span>
          <span>{key.label}</span>
        </div>
      ))}
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
 * Composant pour configurer les champs requis d'un formulaire
 * + Paramétrage de la relance automatique
 */
const FormRequiredFieldsConfig = ({ 
  selectedFormIds = [], 
  availableForms = [],
  requiredFields = [],
  reminderConfig = { enabled: false, delayDays: 1 },
  onRequiredFieldsChange,
  onReminderConfigChange
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [tempRequiredFields, setTempRequiredFields] = useState([]);
  const [tempReminderConfig, setTempReminderConfig] = useState({
    enabled: false,
    delayDays: 1,
    maxRemindersBeforeTask: 3
  });
  
  // Récupérer les champs du premier formulaire sélectionné
  const selectedForm = useMemo(() => {
    if (!selectedFormIds || selectedFormIds.length === 0) return null;
    const form = availableForms.find(f => f.id === selectedFormIds[0]);
    return form;
  }, [selectedFormIds, availableForms]);
  
  const formFields = useMemo(() => {
    if (!selectedForm?.fields) return [];
    return selectedForm.fields;
  }, [selectedForm]);
  
  const openModal = () => {
    setTempRequiredFields(requiredFields || []);
    setShowModal(true);
  };
  
  const openReminderModal = () => {
    setTempReminderConfig({
      enabled: reminderConfig.enabled || false,
      delayDays: reminderConfig.delayDays || 1,
      maxRemindersBeforeTask: reminderConfig.maxRemindersBeforeTask || 3
    });
    setShowReminderModal(true);
  };
  
  const toggleField = (fieldName) => {
    setTempRequiredFields(prev => {
      if (prev.includes(fieldName)) {
        return prev.filter(f => f !== fieldName);
      }
      return [...prev, fieldName];
    });
  };
  
  const confirmSelection = () => {
    onRequiredFieldsChange(tempRequiredFields);
    setShowModal(false);
    toast({
      title: "✅ Champs requis enregistrés",
      description: `${tempRequiredFields.length} champ(s) obligatoire(s)`,
    });
  };
  
  if (!selectedFormIds || selectedFormIds.length === 0) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      {/* Bouton pour définir les champs requis */}
      <div className="flex flex-col items-center justify-center p-6 bg-blue-50 border border-blue-200 rounded-lg min-h-[120px]">
        <div className="text-center mb-3">
          <p className="text-5xl font-bold text-blue-600">
            {requiredFields.length}
          </p>
          <p className="text-sm font-medium text-blue-900 mt-2">
            {requiredFields.length > 1 ? "champs requis" : requiredFields.length === 1 ? "champ requis" : "Aucun champ requis"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openModal}
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <Settings className="h-4 w-4 mr-1" />
          Définir
        </Button>
      </div>
      
      {/* Configuration de la relance */}
      <div className="flex flex-col items-center justify-center p-6 bg-purple-50 border border-purple-200 rounded-lg min-h-[120px]">
        <div className="text-center mb-3">
          <p className="text-5xl font-bold text-purple-600">
            {reminderConfig.enabled ? (reminderConfig.maxRemindersBeforeTask || 3) : 0}
          </p>
          <p className="text-sm font-medium text-purple-900 mt-2">
            {reminderConfig.enabled 
              ? `relance${(reminderConfig.maxRemindersBeforeTask || 3) > 1 ? 's' : ''}`
              : "Relance désactivée"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openReminderModal}
          className="border-purple-300 text-purple-700 hover:bg-purple-100"
        >
          <Settings className="h-4 w-4 mr-1" />
          Configurer
        </Button>
      </div>
      
      {/* Modal de sélection des champs */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Champs requis pour validation
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Formulaire : <span className="font-medium">{selectedForm?.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {formFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Aucun champ disponible dans ce formulaire</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formFields.map((field) => {
                    const isRequired = tempRequiredFields.includes(field.id);
                    return (
                      <label
                        key={field.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isRequired
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isRequired}
                          onChange={() => toggleField(field.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-medium",
                            isRequired ? "text-blue-900" : "text-gray-700"
                          )}>
                            {field.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {field.type} {field.required && '• Obligatoire dans le formulaire'}
                          </p>
                        </div>
                        {isRequired && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {tempRequiredFields.length} champ(s) sélectionné(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={confirmSelection}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Valider
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de configuration de la relance */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Configuration de la relance
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Si le formulaire n'est pas validé
                  </p>
                </div>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Toggle activation */}
              <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-purple-900">Activer la relance</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Relancer automatiquement le client
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempReminderConfig.enabled}
                    onChange={(e) => setTempReminderConfig({ ...tempReminderConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {tempReminderConfig.enabled && (
                <>
                  {/* Délai de relance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Délai de relance
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTempReminderConfig({ ...tempReminderConfig, delayDays: days })}
                          className={cn(
                            "px-3 py-2 text-sm font-medium rounded border transition-all",
                            tempReminderConfig.delayDays === days
                              ? "bg-purple-600 text-white border-purple-700"
                              : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"
                          )}
                        >
                          J+{days}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-purple-600 mt-2">
                      ⏱️ Relance envoyée J+{tempReminderConfig.delayDays} si formulaire incomplet
                    </p>
                  </div>

                  {/* Seuil de relances */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de relances avant création de tâche
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(count => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setTempReminderConfig({ ...tempReminderConfig, maxRemindersBeforeTask: count })}
                          className={cn(
                            "px-3 py-2 text-sm font-medium rounded border transition-all",
                            tempReminderConfig.maxRemindersBeforeTask === count
                              ? "bg-orange-600 text-white border-orange-700"
                              : "bg-white text-orange-700 border-orange-300 hover:bg-orange-50"
                          )}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                      📋 Après {tempReminderConfig.maxRemindersBeforeTask} relance(s), une tâche sera créée pour le commercial
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReminderModal(false)}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onReminderConfigChange(tempReminderConfig);
                  setShowReminderModal(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Check className="h-4 w-4 mr-1" />
                Valider
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Composant pour uploader et afficher les documents de connaissance IA par étape
 * UX-4: Documents privés pour l'IA (FAQ, argumentaires, procédures)
 * 
 * ⚠️ Ces documents sont EXCLUSIVEMENT pour l'IA, le client n'y a pas accès
 * Utilise module_ids[] pour permettre le partage sur plusieurs étapes
 */
const IAKnowledgeDocuments = ({ 
  moduleId, 
  projectType, 
  organizationId,
  uploadedBy 
}) => {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [allProjectFiles, setAllProjectFiles] = useState([]); // Tous les docs du projet
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  
  // Label pour identifier les docs IA de ce projet
  const projectLabel = `ia-knowledge:${projectType}`;
  
  // Charger les fichiers de connaissance IA pour cette étape
  const loadFiles = async () => {
    if (!projectType || !moduleId || !organizationId) return;
    
    setLoading(true);
    try {
      // Fichiers de cette étape (moduleId dans module_ids[])
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('organization_id', organizationId)
        .like('field_label', `${projectLabel}:%`)
        .is('prospect_id', null)
        .contains('module_ids', [moduleId])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error('Error loading IA knowledge files:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Charger TOUS les fichiers du projet (pour la bibliothèque)
  const loadAllProjectFiles = async () => {
    if (!projectType || !organizationId) return;
    
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('organization_id', organizationId)
        .like('field_label', `${projectLabel}:%`)
        .is('prospect_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAllProjectFiles(data || []);
      
      // Pré-sélectionner ceux déjà liés à cette étape
      const alreadyLinked = new Set(
        (data || [])
          .filter(f => f.module_ids?.includes(moduleId))
          .map(f => f.id)
      );
      setSelectedFiles(alreadyLinked);
    } catch (err) {
      console.error('Error loading all project files:', err);
    }
  };
  
  useEffect(() => {
    loadFiles();
  }, [projectType, moduleId, organizationId]);
  
  // Ouvrir la bibliothèque
  const openLibrary = () => {
    loadAllProjectFiles();
    setShowLibrary(true);
  };
  
  // Toggle sélection d'un fichier
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };
  
  // Valider la sélection de la bibliothèque
  const confirmLibrarySelection = async () => {
    try {
      // Pour chaque fichier du projet, mettre à jour module_ids
      for (const file of allProjectFiles) {
        const isSelected = selectedFiles.has(file.id);
        const currentlyHasModule = file.module_ids?.includes(moduleId);
        
        console.log('[Library] File:', file.file_name, 'selected:', isSelected, 'hasModule:', currentlyHasModule);
        
        if (isSelected && !currentlyHasModule) {
          // Ajouter moduleId
          const newModuleIds = [...(file.module_ids || []), moduleId];
          console.log('[Library] Adding moduleId:', moduleId, 'to', file.file_name, '→', newModuleIds);
          const { error } = await supabase
            .from('project_files')
            .update({ module_ids: newModuleIds })
            .eq('id', file.id);
          if (error) console.error('[Library] Update error:', error);
        } else if (!isSelected && currentlyHasModule) {
          // Retirer moduleId
          const newModuleIds = (file.module_ids || []).filter(m => m !== moduleId);
          console.log('[Library] Removing moduleId:', moduleId, 'from', file.file_name, '→', newModuleIds);
          const { error } = await supabase
            .from('project_files')
            .update({ module_ids: newModuleIds })
            .eq('id', file.id);
          if (error) console.error('[Library] Update error:', error);
        }
      }
      
      toast({
        title: '✅ Sélection enregistrée',
        description: 'Les documents ont été liés à cette étape.',
        duration: 3000,
      });
      
      setShowLibrary(false);
      loadFiles(); // Refresh
    } catch (err) {
      toast({
        title: '❌ Erreur',
        description: err.message,
        variant: 'destructive',
      });
    }
  };
  
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!organizationId) {
      toast({
        title: '❌ Erreur',
        description: 'Organization ID manquant',
        variant: 'destructive',
      });
      return;
    }
    
    setUploading(true);
    try {
      // Upload dans Storage
      const ext = file.name.split('.').pop();
      const newName = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `ia-knowledge/${projectType}/${newName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file);
      
      if (uploadError) throw uploadError;
      
      // Insert avec module_ids array
      const { error: insertError } = await supabase
        .from('project_files')
        .insert({
          project_type: projectType,
          prospect_id: null,
          organization_id: organizationId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          uploaded_by: uploadedBy || null, // UUID ou null
          field_label: `${projectLabel}:${moduleId}`,
          module_ids: [moduleId], // Array avec cette étape
        });
      
      if (insertError) throw insertError;
      
      toast({
        title: '✅ Document IA ajouté',
        description: `${file.name} est maintenant disponible pour l'IA à cette étape.`,
        duration: 3000,
      });
      
      loadFiles(); // Refresh
    } catch (err) {
      toast({
        title: '❌ Erreur upload',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDelete = async (file) => {
    if (!confirm(`Supprimer "${file.file_name}" de la base de connaissance IA ?`)) return;
    
    try {
      // Delete storage
      await supabase.storage
        .from('project-files')
        .remove([file.storage_path]);
      
      // Delete DB
      await supabase
        .from('project_files')
        .delete()
        .eq('id', file.id);
      
      toast({
        title: '🗑️ Document supprimé',
        description: `${file.file_name} n'est plus accessible à l'IA.`,
        duration: 3000,
      });
      
      loadFiles(); // Refresh
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
  
  if (!projectType || !moduleId) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 text-center">
        Sélectionnez un projet et une étape pour gérer les documents IA.
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Boutons d'action */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !organizationId}
          className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Upload...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Nouveau
            </>
          )}
        </Button>
        
        {/* Bouton Bibliothèque */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openLibrary}
          disabled={!organizationId}
          className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <FolderOpen className="h-4 w-4" />
          Bibliothèque
        </Button>
      </div>
      
      {/* Modal Bibliothèque */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">📚 Bibliothèque - {projectType}</h3>
                <p className="text-xs text-gray-500">Sélectionnez les documents à utiliser sur cette étape</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLibrary(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Liste des documents */}
            <div className="flex-1 overflow-y-auto p-4">
              {allProjectFiles.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  Aucun document dans la bibliothèque.
                  <br />
                  <span className="text-sm">Uploadez d'abord un document via "Nouveau".</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {allProjectFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.id);
                    const usedOn = file.module_ids?.length || 0;
                    
                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleFileSelection(file.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-50 border-2 border-blue-400' 
                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {/* Checkbox visuel */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        
                        <File className="h-5 w-5 text-purple-500 flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {file.file_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(file.file_size)} • Utilisé sur {usedOn} étape{usedOn > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLibrary(false)}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={confirmLibrarySelection}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Valider ({selectedFiles.size} sélectionné{selectedFiles.size > 1 ? 's' : ''})
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Liste des fichiers de cette étape */}
      {loading ? (
        <div className="text-sm text-gray-400 italic">Chargement...</div>
      ) : files.length === 0 ? (
        <div className="text-sm text-gray-400 italic">
          Aucun document IA pour cette étape.
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 bg-white border border-purple-100 rounded-lg hover:bg-purple-50/50 transition-colors"
            >
              <File className="h-5 w-5 text-purple-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {file.file_name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.file_size)} • {file.module_ids?.length || 1} étape{(file.module_ids?.length || 1) > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-purple-600"
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
  
  // ✅ MULTI-ACTIONS: Liste d'actions et index actif
  const [actions, setActions] = useState([]); // Array d'objets { config, actionConfig }
  const [activeActionIndex, setActiveActionIndex] = useState(0);
  
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
      
      // ✅ FIX: Reset multi-actions quand on change de module
      // L'init useEffect recréera actions[0] avec la config du nouveau module
      setActions([]);
      setActiveActionIndex(0);
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
            
            // ✅ MULTI-ACTIONS: Restaurer actions[] si persistées
            if (dbConfig.actions && Array.isArray(dbConfig.actions) && dbConfig.actions.length > 0) {
              setActions(dbConfig.actions.map(a => ({
                order: a.order,
                status: a.status || 'pending',
                config: a.config || {},
                actionConfig: a.actionConfig || { ...DEFAULT_ACTION_CONFIG },
              })));
              setActiveActionIndex(0);
              // Charger la première action dans config/actionConfig
              const firstAction = dbConfig.actions[0];
              if (firstAction?.config) {
                setConfig(prev => ({ ...prev, ...firstAction.config }));
              }
              if (firstAction?.actionConfig) {
                setActionConfig(prev => ({ ...prev, ...firstAction.actionConfig }));
              }
            }
            
            console.log('[V2 Config Tab] Loaded config from Supabase:', { moduleId, projectType, hasActionConfig: !!dbConfig.actionConfig, actionsCount: dbConfig.actions?.length || 0 });
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
  
  // ✅ MULTI-ACTIONS: Initialiser actions[] quand config + actionConfig sont prêts
  useEffect(() => {
    if (config && actions.length === 0) {
      setActions([{
        order: 1,
        status: 'pending', // 'pending' | 'validated'
        config: JSON.parse(JSON.stringify(config)),
        actionConfig: JSON.parse(JSON.stringify(actionConfig)),
      }]);
      setActiveActionIndex(0);
    }
  }, [config, actions.length]); // Se déclenche quand config change OU quand actions est vidé (changement de module)
  
  // ✅ MULTI-ACTIONS: Sync config/actionConfig → actions[activeActionIndex] (quand l'utilisateur édite)
  useEffect(() => {
    if (actions.length > 0 && config) {
      setActions(prev => {
        const updated = [...prev];
        if (updated[activeActionIndex]) {
          updated[activeActionIndex] = {
            ...updated[activeActionIndex], // Conserver order + status
            config: JSON.parse(JSON.stringify(config)),
            actionConfig: JSON.parse(JSON.stringify(actionConfig)),
          };
        }
        return updated;
      });
    }
  }, [config, actionConfig]);
  
  // ✅ MULTI-ACTIONS: Quand on change d'onglet, charger l'action correspondante
  const switchToAction = (index) => {
    if (index === activeActionIndex || index < 0 || index >= actions.length) return;
    // Sauvegarder l'action courante dans actions[]
    setActions(prev => {
      const updated = [...prev];
      updated[activeActionIndex] = {
        ...updated[activeActionIndex], // Conserver order + status
        config: JSON.parse(JSON.stringify(config)),
        actionConfig: JSON.parse(JSON.stringify(actionConfig)),
      };
      return updated;
    });
    // Charger la nouvelle action
    const target = actions[index];
    if (target) {
      setConfig(JSON.parse(JSON.stringify(target.config)));
      setActionConfig(JSON.parse(JSON.stringify(target.actionConfig)));
      setActiveActionIndex(index);
      // Scroll vers le haut pour voir le contenu de l'action
      setTimeout(() => scrollToTop(), 100);
    }
  };
  
  // ✅ MULTI-ACTIONS: Ajouter une action (duplication profonde de l'action courante)
  const handleAddAction = () => {
    // Sauvegarder l'action courante d'abord
    const currentAction = {
      ...actions[activeActionIndex], // Conserver order + status existants
      config: JSON.parse(JSON.stringify(config)),
      actionConfig: JSON.parse(JSON.stringify(actionConfig)),
    };
    // Dupliquer avec nouvel order et status pending
    const newOrder = actions.length + 1;
    const newAction = {
      order: newOrder,
      status: 'pending', // Toujours pending à la création
      config: JSON.parse(JSON.stringify(currentAction.config)),
      actionConfig: JSON.parse(JSON.stringify(currentAction.actionConfig)),
    };
    
    setActions(prev => {
      const updated = [...prev];
      updated[activeActionIndex] = currentAction; // sync courante
      return [...updated, newAction];
    });
    
    // Sélectionner automatiquement la nouvelle action
    const newIndex = actions.length; // index de la nouvelle action
    setActiveActionIndex(newIndex);
    // Charger la copie dans config/actionConfig
    setConfig(JSON.parse(JSON.stringify(newAction.config)));
    setActionConfig(JSON.parse(JSON.stringify(newAction.actionConfig)));
    
    // Scroll vers le haut pour voir les onglets
    setTimeout(() => scrollToTop(), 100);
    
    toast({
      title: `➕ Action ${newOrder} ajoutée`,
      description: `Ordre : ${newOrder} — En attente de validation de l'action ${newOrder - 1}`,
      duration: 3000,
    });
  };
  
  // ✅ MULTI-ACTIONS: Vérifier si une action est bloquée (action précédente non validée)
  const isActionBlocked = (index) => {
    if (index === 0) return false; // Action 1 jamais bloquée
    const previousAction = actions[index - 1];
    return previousAction?.status !== 'validated';
  };
  
  // ✅ MULTI-ACTIONS: Supprimer une action
  const handleDeleteAction = (index) => {
    if (actions.length <= 1) return; // Impossible de supprimer la dernière action
    
    const updated = actions.filter((_, i) => i !== index).map((action, i) => ({
      ...action,
      order: i + 1, // Réindexer
    }));
    
    setActions(updated);
    
    // Déterminer le nouvel index actif
    const newIndex = index >= updated.length ? updated.length - 1 : index;
    setActiveActionIndex(newIndex);
    
    // Charger l'action au nouvel index
    const target = updated[newIndex];
    if (target) {
      setConfig(JSON.parse(JSON.stringify(target.config)));
      setActionConfig(JSON.parse(JSON.stringify(target.actionConfig)));
    }
    
    toast({
      title: `🗑️ Action supprimée`,
      description: `${updated.length} action(s) restante(s)`,
      duration: 3000,
    });
  };
  
  // ✅ MULTI-ACTIONS: Résumé court d'une action
  const getActionSummary = (action) => {
    const ac = action.actionConfig || {};
    const targetMap = { CLIENT: '👤 Client', COMMERCIAL: '💼 Commercial', PARTENAIRE: '🤝 Partenaire' };
    const typeMap = { FORM: '📝 Formulaire', SIGNATURE: '✍️ Signature' };
    const target = targetMap[ac.targetAudience] || '—';
    const type = typeMap[ac.actionType] || '⚙️ Non défini';
    const mode = ac.managementMode === 'AI' ? '🤖 IA' : '👨 Humain';
    return { target, type, mode };
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
      // Sync l'action active avant sauvegarde
      const syncedActions = actions.map((action, i) => {
        if (i === activeActionIndex) {
          return {
            ...action,
            config: JSON.parse(JSON.stringify(config)),
            actionConfig: JSON.parse(JSON.stringify(actionConfig)),
          };
        }
        return action;
      });
      
      // Fusionner config + actionConfig + actions[] pour persistance
      const fullConfig = {
        ...config,
        actionConfig: actionConfig,
        actions: syncedActions.map(a => ({
          order: a.order,
          status: a.status,
          config: a.config,
          actionConfig: a.actionConfig,
        })),
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
      // Persister en mémoire via moduleAIConfig UNIQUEMENT si 1 seule action
      // En multi-actions, actions[] est la source de vérité (sync via useEffect)
      if (actions.length <= 1) {
        updateModuleActionConfig(moduleId, updated);
      }
      console.log('[V2 Config Tab] ActionConfig updated:', { field, value, moduleId, actionIndex: activeActionIndex });
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
  
  // ✅ MULTI-ACTIONS: Ref pour scroll to top
  const configTopRef = useRef(null);
  const scrollToTop = () => {
    configTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    <div className="space-y-6" ref={configTopRef}>
      
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
          ONGLETS MULTI-ACTIONS — Timeline horizontale
      ───────────────────────────────────────────────────────────────── */}
      {actions.length > 1 && (
        <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-gradient-to-b from-white to-gray-50/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {actions.map((action, index) => {
              const blocked = isActionBlocked(index);
              const isActive = activeActionIndex === index;
              const isValidated = action.status === 'validated';
              const stepNumber = index + 1;
              
              return (
                <React.Fragment key={index}>
                  {/* Connecteur entre actions */}
                  {index > 0 && (
                    <div className="flex items-center px-1 flex-shrink-0">
                      <div className={cn(
                        "w-6 h-0.5 rounded-full",
                        isValidated || actions[index - 1]?.status === 'validated'
                          ? "bg-emerald-300"
                          : "bg-gray-200"
                      )} />
                      <ChevronRight className={cn(
                        "h-4 w-4 -ml-1 flex-shrink-0",
                        isValidated || actions[index - 1]?.status === 'validated'
                          ? "text-emerald-400"
                          : "text-gray-300"
                      )} />
                    </div>
                  )}
                  
                  {/* Card action — toujours cliquable en mode config */}
                  <div
                    onClick={() => switchToAction(index)}
                    className={cn(
                      "group relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all flex-shrink-0 min-w-[200px] max-w-[280px] cursor-pointer",
                      isActive
                        ? "bg-blue-50 border-blue-500 shadow-md shadow-blue-100"
                        : isValidated
                          ? "bg-emerald-50 border-emerald-300 hover:shadow-sm"
                          : blocked
                            ? "bg-gray-50/80 border-gray-200 hover:border-blue-300 hover:shadow-sm"
                            : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                    )}
                  >
                    {/* Pastille numérotée */}
                    <div className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold flex-shrink-0 transition-all",
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : isValidated
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                    )}>
                      {isValidated ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        stepNumber
                      )}
                    </div>
                    
                    {/* Texte */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-semibold leading-tight",
                        isActive ? "text-blue-800" : isValidated ? "text-emerald-700" : "text-gray-700"
                      )}>
                        Action {stepNumber}
                      </p>
                      <p className={cn(
                        "text-xs mt-0.5 truncate",
                        isActive ? "text-blue-500" : "text-gray-400"
                      )}>
                        {action.config?.objective?.slice(0, 40) || 'Pas d\'objectif'}
                        {action.config?.objective?.length > 40 ? '…' : ''}
                      </p>
                    </div>
                    
                    {/* Bouton supprimer — visible au hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAction(index);
                      }}
                      className={cn(
                        "absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 shadow-sm transition-all",
                        "opacity-0 group-hover:opacity-100",
                        "border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      )}
                      title="Supprimer cette action"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
      
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
          SECTION 4.5: CONFIGURATION ACTIONS V2 ÉDITABLE (PHASE 3)
      ───────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 -mx-6 px-6 py-6 border border-purple-200/50 rounded-xl shadow-sm overflow-hidden">
        {/* Effet de fond décoratif */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-100/30 rounded-full blur-3xl -z-0" />
        
        {/* Header du bloc */}
        <div className="relative z-10 flex items-center justify-between mb-6 pb-4 border-b border-purple-200/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-md">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                Configuration Actions V2
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/80 text-purple-700 rounded-full border border-purple-200 shadow-sm">
                  Phase 3
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Définissez les actions automatisées du workflow</p>
            </div>
          </div>
          <ValidationBadge 
            isComplete={configValidation.isComplete} 
            details={configValidation.summary} 
          />
        </div>
        
        {/* Contenu du bloc (avec z-index pour être au-dessus du fond) */}
        <div className="relative z-10 space-y-5">
          
          {/* 1️⃣ CIBLES AUTORISÉES */}
          <div>
            <FieldLabel icon={Users} label="Qui réalise l'action ?" />
            <TargetCheckboxGroup
              selected={Array.isArray(actionConfig.targetAudience) 
                ? actionConfig.targetAudience[0] 
                : actionConfig.targetAudience}
              onChange={(target) => updateActionConfigField('targetAudience', target)}
              targets={getTargetAudiencesList()}
            />
          </div>
          
          {/* 2️⃣ TYPE D'ACTION */}
          <div>
            <FieldLabel icon={Zap} label="Type d'action autorisée" />
            <ActionTypeRadioGroup
              selected={actionConfig.actionType}
              onChange={(type) => updateActionConfigField('actionType', type)}
              actionTypes={getActionTypesList()}
            />
          </div>
          
          {/* 3️⃣ FORMULAIRES AUTORISÉS (si actionType = FORM) */}
          {actionConfig.actionType === 'FORM' && (
            <>
              <div>
                <FieldLabel icon={FileText} label="Formulaires autorisés" />
                <FormMultiSelect
                  selected={actionConfig.allowedFormIds || []}
                  onChange={(formIds) => updateActionConfigField('allowedFormIds', formIds)}
                  forms={availableForms}
                />
              </div>
              
              {/* ✨ Configuration champs requis + relance */}
              {actionConfig.targetAudience === 'CLIENT' && (
                <div>
                  <FormRequiredFieldsConfig
                    selectedFormIds={actionConfig.allowedFormIds || []}
                    availableForms={availableForms}
                    requiredFields={actionConfig.requiredFields || []}
                    reminderConfig={actionConfig.reminderConfig || { enabled: false, delayDays: 1 }}
                    onRequiredFieldsChange={(fields) => updateActionConfigField('requiredFields', fields)}
                    onReminderConfigChange={(config) => updateActionConfigField('reminderConfig', config)}
                  />
                </div>
              )}
            </>
          )}
          
          {/* 4️⃣ TEMPLATE SIGNATURE (si actionType = SIGNATURE) */}
          {actionConfig.actionType === 'SIGNATURE' && (
            <>
              <div>
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
              <div>
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
          <div className="grid grid-cols-2 gap-4">
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
              selected={actionConfig.verificationMode || 'HUMAN'}
              onChange={(mode) => updateActionConfigField('verificationMode', mode)}
              modes={getVerificationModesList()}
            />
          </div>
          
          {/* ─────────────────────────────────────────────────────────────────
              SECTION 6: VALIDATION DE L'ÉTAPE
          ───────────────────────────────────────────────────────────────── */}
          <div className="border-t border-purple-200/50 my-5" />
          
          <div>
            <CompletionTriggerSelect
              selected={actionConfig.completionTrigger}
              onChange={(trigger) => updateActionConfigField('completionTrigger', trigger)}
            />
          </div>
          
          {/* Séparateur avant simulateur */}
          <div className="border-t border-purple-200/50 my-5" />
          
          {/* Simulateur ActionOrder */}
          <div>
            <ActionOrderSimulator
              moduleId={moduleId}
              projectType={projectType}
              prospectId={prospectId}
              actionConfig={actionConfig}
              availableForms={availableForms}
              availableTemplates={availableTemplates}
            />
          </div>
          
        </div>
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 5: DOCUMENTS IA - BASE DE CONNAISSANCES (UX-4)
      ───────────────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <FieldLabel icon={FileText} label="📚 Documents IA (Base de connaissances)" />
        <IAKnowledgeDocuments
          moduleId={moduleId}
          projectType={projectType}
          organizationId={templateOps?.organizationId}
          uploadedBy={templateOps?.uploadedBy}
        />
      </section>
      
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 6: ACCÈS AUX DONNÉES (ÉDITABLE PHASE 3)
      ───────────────────────────────────────────────────────────────── */}
      <section className="mt-8">
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
          SECTION 3: LABELS BOUTONS (déplacé en bas)
      ───────────────────────────────────────────────────────────────── */}
      <section className="mt-8">
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
          SECTION 4: ACTIONS AUTORISÉES (READ_ONLY) (déplacé en bas)
      ───────────────────────────────────────────────────────────────── */}
      <section className="mt-8">
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
          BOUTON AJOUTER UNE ACTION
      ───────────────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAction}
          className="w-full border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter une action
        </Button>
      </div>
      
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
