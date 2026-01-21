import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import MultiSelectSearch from '@/components/ui/MultiSelectSearch';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppContext } from '@/App';
import { Trash2, Copy, Phone, Plus, GripVertical, Upload, FileText, Bot, ChevronDown, ChevronRight, Edit, Image as ImageIcon, LogOut } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseUsersCRUD } from '@/hooks/useSupabaseUsersCRUD';
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import { useSupabasePrompts } from '@/hooks/useSupabasePrompts';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const normalizePipelineStepLabel = (label) => (label || '').toString().trim().toUpperCase();
const generatePipelineStepId = (prefix = 'pipeline-step') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const buildPipelineStep = (label, id, color) => ({
  id: id || generatePipelineStepId(),
  label: normalizePipelineStepLabel(label),
  color: typeof color === 'string' && color.trim() ? color : null,
});

// 🎨 Emojis utilisés dans l'application LOCASUN
const EMOJI_COLLECTION = [
  '🔌', '💡', '☀️', '💸', '🏭', '🆕', '✅', '⚡', '📝', '⏳',
  '🌞', '➡️', '🔎', '🛠️', '✍️', '🏦', '📦', '👷', '📋', '⚡️',
  '💶', '📈', '🔧',
];

// 🎯 Composant réutilisable : Emoji Picker avec bouton flèche
const EmojiPickerButton = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <Input 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-16 text-center text-xl"
    />
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
          title="Choisir un emoji"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex flex-wrap gap-1 max-h-96 overflow-y-auto">
          {EMOJI_COLLECTION.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 rounded-md transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  </div>
);

const COLOR_OPTIONS = [
  { value: 'bg-blue-100', label: 'Bleu pastel' },
  { value: 'bg-yellow-100', label: 'Jaune doux' },
  { value: 'bg-green-100', label: 'Vert tendre' },
  { value: 'bg-purple-100', label: 'Violet pastel' },
  { value: 'bg-orange-100', label: 'Orange clair' },
  { value: 'bg-indigo-100', label: 'Indigo clair' },
  { value: 'bg-teal-100', label: 'Turquoise' },
  { value: 'bg-pink-100', label: 'Rose' },
  { value: 'bg-rose-100', label: 'Framboise' },
  { value: 'bg-gray-100', label: 'Gris doux' },
];

// Options de couleurs pour les badges de projets (tags)
const PROJECT_COLOR_OPTIONS = [
  { value: 'bg-blue-100 text-blue-800', label: 'Bleu', preview: 'bg-blue-100' },
  { value: 'bg-green-100 text-green-800', label: 'Vert', preview: 'bg-green-100' },
  { value: 'bg-orange-100 text-orange-800', label: 'Orange', preview: 'bg-orange-100' },
  { value: 'bg-teal-100 text-teal-800', label: 'Turquoise', preview: 'bg-teal-100' },
  { value: 'bg-purple-100 text-purple-800', label: 'Violet', preview: 'bg-purple-100' },
  { value: 'bg-yellow-100 text-yellow-800', label: 'Jaune', preview: 'bg-yellow-100' },
  { value: 'bg-pink-100 text-pink-800', label: 'Rose', preview: 'bg-pink-100' },
  { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo', preview: 'bg-indigo-100' },
  { value: 'bg-red-100 text-red-800', label: 'Rouge', preview: 'bg-red-100' },
  { value: 'bg-gray-100 text-gray-800', label: 'Gris', preview: 'bg-gray-100' },
];

const DEFAULT_COLOR_BY_LABEL = {
  MARKET: 'bg-blue-100',
  ETUDE: 'bg-yellow-100',
  OFFRE: 'bg-green-100',
  CONTRAT: 'bg-blue-100',
  'CONTRAT OK': 'bg-blue-100',
  'CLIENT ACTIF': 'bg-purple-100',
};

const getDefaultColorForLabel = (label, index = 0) => {
  const normalized = normalizePipelineStepLabel(label);
  return (
    DEFAULT_COLOR_BY_LABEL[normalized] ||
    COLOR_OPTIONS[index % COLOR_OPTIONS.length].value
  );
};

const PipelineStepCard = React.memo(({ step, index, provided, snapshot, onColorChange, onEdit, onRemove }) => (
  <div
    ref={provided.innerRef}
    {...provided.draggableProps}
    className={`flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-xl shadow-sm transition-all ${
      snapshot.isDragging ? 'ring-2 ring-purple-200 shadow-lg' : ''
    }`}
  >
    <div
      {...provided.dragHandleProps}
      className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
    >
      <GripVertical className="h-5 w-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0 ${step.color || 'bg-gray-200'}`} />
        <p className="text-sm font-semibold tracking-wide text-gray-800 break-words">{step.label}</p>
      </div>
      <p className="text-xs text-gray-500 mt-1">Étape #{index + 1}</p>
    </div>
    {!snapshot.isDragging && (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Select
          value={step.color || getDefaultColorForLabel(step.label, index)}
          onValueChange={onColorChange}
        >
          <SelectTrigger className="w-36 justify-between">
            <SelectValue placeholder="Couleur" />
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full border border-white shadow-sm ${option.value}`} />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-blue-600"
          onClick={onEdit}
          aria-label={`Renommer ${step.label}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-red-500"
          onClick={onRemove}
          aria-label={`Supprimer ${step.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )}
  </div>
));

const FormFieldEditor = ({ field, onSave, onCancel }) => {
  const { formContactConfig } = useAppContext();
  
  const [editedField, setEditedField] = useState(
    field ? { ...field } : { 
      name: '', 
      type: 'text', 
      placeholder: '', 
      required: false, 
      options: [],
      show_if_conditions: [],
      condition_operator: 'AND',
      is_repeater: false,
      repeats_fields: []
    }
  );

  const handleSave = () => {
    if (!editedField.name) {
      toast({ title: "Le nom du champ est obligatoire", variant: "destructive" });
      return;
    }
    onSave({ ...editedField, id: editedField.id || `field-${Date.now()}` });
  };

  // Récupérer l'index du champ actuel pour les conditions
  const currentFieldIndex = field ? formContactConfig.findIndex(f => f.id === field.id) : formContactConfig.length;

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div>
        <Label htmlFor="field-name">Nom du champ</Label>
        <Input
          id="field-name"
          value={editedField.name}
          onChange={(e) => setEditedField({ ...editedField, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="field-type">Type</Label>
        <Select
          value={editedField.type}
          onValueChange={(value) => setEditedField({ ...editedField, type: value })}
        >
          <SelectTrigger id="field-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texte</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Téléphone</SelectItem>
            <SelectItem value="number">Nombre</SelectItem>
            <SelectItem value="textarea">Zone de texte</SelectItem>
            <SelectItem value="select">Liste déroulante</SelectItem>
            <SelectItem value="file">Fichier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 🔥 Si type = select, afficher éditeur d'options */}
      {editedField.type === 'select' && (
        <div className="pl-2 space-y-2 border-l-2 border-blue-300">
          <Label className="text-xs font-semibold text-blue-700">Options du menu déroulant :</Label>
          <div className="space-y-1">
            {(editedField.options || []).map((option, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <Input 
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(editedField.options || [])];
                    newOptions[optIndex] = e.target.value;
                    setEditedField({ ...editedField, options: newOptions });
                  }}
                  placeholder={`Option ${optIndex + 1}`}
                  className="flex-1"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const newOptions = (editedField.options || []).filter((_, i) => i !== optIndex);
                    setEditedField({ ...editedField, options: newOptions });
                  }}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const newOptions = [...(editedField.options || []), ''];
              setEditedField({ ...editedField, options: newOptions });
            }}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Ajouter une option
          </Button>
        </div>
      )}

      {/* 🔥 SYSTÈME DE CONDITIONS MULTIPLES */}
      <div className="pl-2 space-y-2 border-l-2 border-purple-300">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-purple-700">Conditions d'affichage :</Label>
          {editedField.show_if_conditions && editedField.show_if_conditions.length > 1 && (
            <Select
              value={editedField.condition_operator || 'AND'}
              onValueChange={(value) => setEditedField({ ...editedField, condition_operator: value })}
            >
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">ET (toutes)</SelectItem>
                <SelectItem value="OR">OU (au moins une)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {(editedField.show_if_conditions || []).map((condition, condIndex) => (
          <div key={condIndex} className="flex items-center gap-2 bg-purple-50 p-2 rounded">
            <Select 
              value={`${condition.field}::${condition.equals}`}
              onValueChange={(value) => {
                const [fieldId, expectedValue] = value.split('::');
                const newConditions = [...(editedField.show_if_conditions || [])];
                newConditions[condIndex] = { field: fieldId, equals: expectedValue };
                setEditedField({ ...editedField, show_if_conditions: newConditions });
              }}
            >
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formContactConfig
                  .slice(0, currentFieldIndex)
                  .filter(f => f.type === 'text' || f.type === 'email' || f.type === 'phone' || f.type === 'select')
                  .map(previousField => {
                    if (previousField.type === 'select' && previousField.options && previousField.options.length > 0) {
                      return previousField.options.map(option => (
                        <SelectItem 
                          key={`${previousField.id}::${option}`}
                          value={`${previousField.id}::${option}`}
                        >
                          "{previousField.name}" = "{option}"
                        </SelectItem>
                      ));
                    }
                    return (
                      <SelectItem 
                        key={previousField.id} 
                        value={`${previousField.id}::has_value`}
                      >
                        "{previousField.name}" rempli
                      </SelectItem>
                    );
                  })
                  .flat()
                }
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const newConditions = (editedField.show_if_conditions || []).filter((_, i) => i !== condIndex);
                setEditedField({ ...editedField, show_if_conditions: newConditions.length > 0 ? newConditions : [] });
              }}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newConditions = [...(editedField.show_if_conditions || []), { field: '', equals: '' }];
            setEditedField({ ...editedField, show_if_conditions: newConditions });
          }}
          className="text-xs w-full"
        >
          <Plus className="h-3 w-3 mr-1" /> Ajouter une condition
        </Button>
        
        {(!editedField.show_if_conditions || editedField.show_if_conditions.length === 0) && (
          <p className="text-xs text-gray-500 italic">Toujours visible (aucune condition)</p>
        )}
      </div>

      {/* 🔥 SYSTÈME DE CHAMPS RÉPÉTABLES */}
      {editedField.type === 'select' && (
        <div className="pl-2 space-y-2 border-l-2 border-green-300">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-green-700">Répétition de champs :</Label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="repeater-checkbox"
                checked={editedField.is_repeater || false}
                onChange={(e) => setEditedField({ ...editedField, is_repeater: e.target.checked })}
                className="h-4 w-4 text-green-600 focus:ring-green-500"
              />
              <Label htmlFor="repeater-checkbox" className="text-xs font-normal cursor-pointer">
                Utiliser comme compteur de répétition
              </Label>
            </div>
          </div>
          
          {editedField.is_repeater && (
            <div className="space-y-2 bg-green-50 p-3 rounded">
              <Label className="text-xs">Champs à répéter :</Label>
              <p className="text-xs text-gray-600 mb-2">
                Sélectionnez les champs qui doivent être répétés N fois (où N = valeur choisie dans le menu déroulant)
              </p>
              
              <div className="space-y-1">
                {formContactConfig
                  .slice(currentFieldIndex + 1)
                  .map((laterField) => {
                    const isSelected = (editedField.repeats_fields || []).includes(laterField.id);
                    
                    return (
                      <div key={laterField.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                        <input
                          type="checkbox"
                          id={`repeat-${laterField.id}`}
                          checked={isSelected}
                          onChange={(e) => {
                            const currentRepeats = editedField.repeats_fields || [];
                            const newRepeats = e.target.checked
                              ? [...currentRepeats, laterField.id]
                              : currentRepeats.filter(id => id !== laterField.id);
                            setEditedField({ ...editedField, repeats_fields: newRepeats });
                          }}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <Label 
                          htmlFor={`repeat-${laterField.id}`}
                          className="text-xs font-normal cursor-pointer flex-1"
                        >
                          {laterField.name} ({laterField.type})
                        </Label>
                      </div>
                    );
                  })
                }
              </div>
              
              {formContactConfig.slice(currentFieldIndex + 1).length === 0 && (
                <p className="text-xs text-orange-600 italic">
                  Ajoutez des champs après celui-ci pour pouvoir les répéter
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="field-placeholder">Placeholder</Label>
        <Input
          id="field-placeholder"
          value={editedField.placeholder}
          onChange={(e) => setEditedField({ ...editedField, placeholder: e.target.value })}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="field-required"
          checked={editedField.required}
          onCheckedChange={(checked) => setEditedField({ ...editedField, required: checked })}
        />
        <Label htmlFor="field-required">Obligatoire ?</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Enregistrer</Button>
      </DialogFooter>
    </div>
  );
};

const FormEditor = ({
  form,
  onSave,
  onCancel
}) => {
  const {
    projectsData
  } = useAppContext();
  const [editedForm, setEditedForm] = useState(form ? JSON.parse(JSON.stringify(form)) : {
    name: '',
    fields: [],
    projectIds: []
  });
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const projectOptions = useMemo(() => Object.values(projectsData).map(p => ({
    value: p.type,
    label: p.title
  })), [projectsData]);
  const selectedProjects = useMemo(() => (editedForm.projectIds || []).map(id => projectOptions.find(opt => opt.value === id)).filter(Boolean), [editedForm.projectIds, projectOptions]);

  // 🔥 Synchroniser avec les changements real-time du formulaire
  useEffect(() => {
    if (form) {
      setEditedForm(JSON.parse(JSON.stringify(form)));
    }
  }, [form]);
  const handleFieldChange = (index, property, value) => {
    const newFields = [...editedForm.fields];
    newFields[index] = {
      ...newFields[index],
      [property]: value
    };
    setEditedForm(prev => ({
      ...prev,
      fields: newFields
    }));
  };
  const addField = () => {
    if (!newFieldName.trim()) return;
    const newField = {
      id: `field-${Date.now()}`,
      label: newFieldName,
      type: newFieldType,
      placeholder: ''
    };
    setEditedForm(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
    setNewFieldName('');
    setNewFieldType('text');
  };
  const removeField = index => {
    const newFields = (editedForm.fields || []).filter((_, i) => i !== index);
    setEditedForm(prev => ({
      ...prev,
      fields: newFields
    }));
  };
  const handleSave = () => {
    if (!editedForm.name.trim()) {
      toast({
        title: "Nom manquant",
        description: "Veuillez nommer votre formulaire.",
        variant: "destructive"
      });
      return;
    }
    const finalForm = {
      ...editedForm,
      id: editedForm.id || `form-${Date.now()}`
    };
    onSave(finalForm);
  };
  return <div className="space-y-6">
                <div>
                    <Label htmlFor="form-name">Nom du formulaire (Interne)</Label>
                    <Input id="form-name" value={editedForm.name} onChange={e => setEditedForm(prev => ({
        ...prev,
        name: e.target.value
      }))} />
                </div>

                <div>
                    <Label>À qui est destiné ce formulaire ?</Label>
                    <div className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2">
                            <input
                                type="radio"
                                id="audience-client"
                                name="audience"
                                value="client"
                                checked={(editedForm.audience || 'client') === 'client'}
                                onChange={(e) => setEditedForm(prev => ({
                                    ...prev,
                                    audience: e.target.value
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="audience-client" className="font-normal cursor-pointer">
                                Client
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="radio"
                                id="audience-internal"
                                name="audience"
                                value="internal"
                                checked={editedForm.audience === 'internal'}
                                onChange={(e) => setEditedForm(prev => ({
                                    ...prev,
                                    audience: e.target.value
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="audience-internal" className="font-normal cursor-pointer">
                                Interne (équipe)
                            </Label>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {(editedForm.audience || 'client') === 'client' 
                            ? 'Ce formulaire sera envoyable au client via le chat' 
                            : 'Ce formulaire sera visible uniquement dans la fiche prospect (équipe)'}
                    </p>
                </div>

                <div>
                    <Label>Projets associés</Label>
                    <MultiSelectSearch options={projectOptions} selected={selectedProjects} onChange={selected => setEditedForm(prev => ({
        ...prev,
        projectIds: selected.map(s => s.value)
      }))} placeholder="Sélectionner des projets..." searchPlaceholder="Rechercher un projet..." emptyText="Aucun projet trouvé." className="mt-1" />
                </div>

                <h3 className="text-md font-semibold text-gray-700 pt-4 border-t">Champs du formulaire</h3>
                <div className="space-y-3">
                    {(editedForm.fields || []).map((field, index) => <div key={field.id} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-md">
                            <div className="flex items-center gap-2">
                                <Input value={field.label} onChange={e => handleFieldChange(index, 'label', e.target.value)} placeholder="Nom du champ" />
                                <Select value={field.type} onValueChange={value => handleFieldChange(index, 'type', value)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Texte</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="phone">Téléphone</SelectItem>
                                        <SelectItem value="number">Nombre</SelectItem>
                                        <SelectItem value="select">Liste déroulante</SelectItem>
                                        <SelectItem value="file">Fichier</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" onClick={() => removeField(index)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                            
                            {/* 🔥 Si type = select, afficher éditeur d'options */}
                            {field.type === 'select' && (
                                <div className="pl-2 space-y-2 border-l-2 border-blue-300">
                                    <Label className="text-xs font-semibold text-blue-700">Options du menu déroulant :</Label>
                                    <div className="space-y-1">
                                        {(field.options || []).map((option, optIndex) => (
                                            <div key={optIndex} className="flex items-center gap-2">
                                                <Input 
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(field.options || [])];
                                                        newOptions[optIndex] = e.target.value;
                                                        handleFieldChange(index, 'options', newOptions);
                                                    }}
                                                    placeholder={`Option ${optIndex + 1}`}
                                                    className="flex-1"
                                                />
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => {
                                                        const newOptions = (field.options || []).filter((_, i) => i !== optIndex);
                                                        handleFieldChange(index, 'options', newOptions);
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                            const newOptions = [...(field.options || []), ''];
                                            handleFieldChange(index, 'options', newOptions);
                                        }}
                                        className="text-xs"
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Ajouter une option
                                    </Button>
                                </div>
                            )}
                            
                            {/* 🔥 SYSTÈME DE CONDITIONS MULTIPLES */}
                            <div className="pl-2 space-y-2 border-l-2 border-purple-300">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-purple-700">Conditions d'affichage :</Label>
                                    {field.show_if_conditions && field.show_if_conditions.length > 1 && (
                                        <Select
                                            value={field.condition_operator || 'AND'}
                                            onValueChange={(value) => handleFieldChange(index, 'condition_operator', value)}
                                        >
                                            <SelectTrigger className="w-[100px] h-7 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AND">ET (toutes)</SelectItem>
                                                <SelectItem value="OR">OU (au moins une)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                
                                {(field.show_if_conditions || []).map((condition, condIndex) => (
                                    <div key={condIndex} className="flex items-center gap-2 bg-purple-50 p-2 rounded">
                                        <Select 
                                            value={`${condition.field}::${condition.equals}`}
                                            onValueChange={(value) => {
                                                const [fieldId, expectedValue] = value.split('::');
                                                const newConditions = [...(field.show_if_conditions || [])];
                                                newConditions[condIndex] = { field: fieldId, equals: expectedValue };
                                                handleFieldChange(index, 'show_if_conditions', newConditions);
                                            }}
                                        >
                                            <SelectTrigger className="flex-1 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(editedForm.fields || [])
                                                    .slice(0, index)
                                                    .filter(f => f.type === 'text' || f.type === 'email' || f.type === 'phone' || f.type === 'select')
                                                    .map(previousField => {
                                                        if (previousField.type === 'select' && previousField.options && previousField.options.length > 0) {
                                                            return previousField.options.map(option => (
                                                                <SelectItem 
                                                                    key={`${previousField.id}::${option}`}
                                                                    value={`${previousField.id}::${option}`}
                                                                >
                                                                    "{previousField.label}" = "{option}"
                                                                </SelectItem>
                                                            ));
                                                        }
                                                        return (
                                                            <SelectItem 
                                                                key={previousField.id} 
                                                                value={`${previousField.id}::has_value`}
                                                            >
                                                                "{previousField.label}" rempli
                                                            </SelectItem>
                                                        );
                                                    })
                                                    .flat()
                                                }
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => {
                                                const newConditions = (field.show_if_conditions || []).filter((_, i) => i !== condIndex);
                                                handleFieldChange(index, 'show_if_conditions', newConditions.length > 0 ? newConditions : undefined);
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const newConditions = [...(field.show_if_conditions || []), { field: '', equals: '' }];
                                        handleFieldChange(index, 'show_if_conditions', newConditions);
                                    }}
                                    className="text-xs w-full"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Ajouter une condition
                                </Button>
                                
                                {(!field.show_if_conditions || field.show_if_conditions.length === 0) && (
                                    <p className="text-xs text-gray-500 italic">Toujours visible (aucune condition)</p>
                                )}
                            </div>
                            
                            {/* 🔥 SYSTÈME DE CHAMPS RÉPÉTABLES */}
                            {field.type === 'select' && (
                                <div className="pl-2 space-y-2 border-l-2 border-green-300 mt-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-green-700">Répétition de champs :</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`repeater-${field.id}`}
                                                checked={field.is_repeater || false}
                                                onChange={(e) => handleFieldChange(index, 'is_repeater', e.target.checked)}
                                                className="h-4 w-4 text-green-600 focus:ring-green-500"
                                            />
                                            <Label htmlFor={`repeater-${field.id}`} className="text-xs font-normal cursor-pointer">
                                                Utiliser comme compteur de répétition
                                            </Label>
                                        </div>
                                    </div>
                                    
                                    {field.is_repeater && (
                                        <div className="space-y-2 bg-green-50 p-3 rounded">
                                            <Label className="text-xs">Champs à répéter :</Label>
                                            <p className="text-xs text-gray-600 mb-2">
                                                Sélectionnez les champs qui doivent être répétés N fois (où N = valeur choisie dans le menu déroulant)
                                            </p>
                                            
                                            <div className="space-y-1">
                                                {(editedForm.fields || [])
                                                    .slice(index + 1)
                                                    .map((laterField, laterIndex) => {
                                                        const realIndex = index + 1 + laterIndex;
                                                        const isSelected = (field.repeats_fields || []).includes(laterField.id);
                                                        
                                                        return (
                                                            <div key={laterField.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`repeat-${field.id}-${laterField.id}`}
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        const currentRepeats = field.repeats_fields || [];
                                                                        const newRepeats = e.target.checked
                                                                            ? [...currentRepeats, laterField.id]
                                                                            : currentRepeats.filter(id => id !== laterField.id);
                                                                        handleFieldChange(index, 'repeats_fields', newRepeats);
                                                                    }}
                                                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                                />
                                                                <Label 
                                                                    htmlFor={`repeat-${field.id}-${laterField.id}`}
                                                                    className="text-xs font-normal cursor-pointer flex-1"
                                                                >
                                                                    {laterField.label} ({laterField.type})
                                                                </Label>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                            
                                            {(editedForm.fields || []).slice(index + 1).length === 0 && (
                                                <p className="text-xs text-orange-600 italic">
                                                    Ajoutez des champs après celui-ci pour pouvoir les répéter
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {!field.is_repeater && (
                                        <p className="text-xs text-gray-500 italic">
                                            Activez cette option pour générer automatiquement N copies des champs suivants
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>)}
                </div>

                <div className="flex items-end gap-2 pt-4 border-t">
                    <div className="flex-grow">
                        <Label>Ajouter un champ</Label>
                        <div className="flex gap-2">
                            <Input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Nom du nouveau champ" />
                            <Select value={newFieldType} onValueChange={setNewFieldType}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Texte</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="phone">Téléphone</SelectItem>
                                    <SelectItem value="number">Nombre</SelectItem>
                                    <SelectItem value="select">Liste déroulante</SelectItem>
                                    <SelectItem value="file">Fichier</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={addField}><Plus className="h-4 w-4" /></Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Annuler</Button>
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Enregistrer le formulaire</Button>
                </DialogFooter>
            </div>;
};
const ProjectEditor = ({
  project,
  onSave,
  onCancel,
  globalPipelineSteps = []
}) => {
  const createInitialProject = () => {
    const baseProject = project ? JSON.parse(JSON.stringify(project)) : {
      type: '',
      title: '',
      clientTitle: '',
      icon: '🆕',
      color: 'gradient-blue',
      steps: [],
      isPublic: true
    };

    const fallbackId = globalPipelineSteps[0]?.id ?? null;

    baseProject.steps = Array.isArray(baseProject.steps)
      ? baseProject.steps.map(step => ({
          ...step,
          id: step.id || `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          globalStepId: step.globalStepId ?? fallbackId
        }))
      : [];

    return baseProject;
  };

  const [editedProject, setEditedProject] = useState(createInitialProject);
  const [newStepName, setNewStepName] = useState('');
  const [newStepIcon, setNewStepIcon] = useState('➡️');

  // Mémoriser les options du Select pour éviter les re-renders inutiles
  const globalStepOptions = useMemo(() => 
    globalPipelineSteps.map(globalStep => (
      <SelectItem key={globalStep.id} value={globalStep.id}>
        {globalStep.label}
      </SelectItem>
    ))
  , [globalPipelineSteps]);

  useEffect(() => {
    setEditedProject(createInitialProject());
    setNewStepName('');
    setNewStepIcon('➡️');
  }, [project]);

  useEffect(() => {
    setEditedProject(prev => {
      const availableIds = new Set(globalPipelineSteps.map(step => step.id));
      const fallbackId = globalPipelineSteps[0]?.id ?? null;
      let hasChanges = false;

      const updatedSteps = (prev.steps || []).map(step => {
        const isValid = step.globalStepId && availableIds.has(step.globalStepId);
        const nextId = isValid ? step.globalStepId : fallbackId ?? null;
        if (nextId !== step.globalStepId) {
          hasChanges = true;
          return { ...step, globalStepId: nextId };
        }
        return step;
      });

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        steps: updatedSteps
      };
    });
  }, [globalPipelineSteps]);
  
  const handleStepChange = useCallback((index, field, value) => {
    setEditedProject(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = {
        ...newSteps[index],
        [field]: value
      };
      return {
        ...prev,
        steps: newSteps
      };
    });
  }, []);
  
  const addStep = useCallback(() => {
    if (!newStepName.trim()) return;
    const fallbackId = globalPipelineSteps[0]?.id ?? null;
    const newStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: newStepName,
      status: 'pending',
      icon: newStepIcon,
      descriptions: {},
      globalStepId: fallbackId
    };
    setEditedProject(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setNewStepName('');
    setNewStepIcon('➡️');
  }, [newStepName, newStepIcon, globalPipelineSteps]);
  
  const removeStep = useCallback((index) => {
    setEditedProject(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  }, []);
  const handleDragEnd = result => {
    if (!result.destination) return;
    const items = Array.from(editedProject.steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setEditedProject(prev => ({
      ...prev,
      steps: items
    }));
  };
  
  const handleDragStart = () => {
    // Désactiver les scroll pour éviter les décalages
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };
  
  const handleDragEndWithCleanup = (result) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    handleDragEnd(result);
  };
  const handleSave = () => {
    // 🔍 Déterminer si c'est une création ou modification
    const isExistingProject = project && project.type;
    
    const finalProject = {
      ...editedProject,
      // ✅ Si modification → garder le type existant
      // ✅ Si création → générer un nouveau type basé sur le titre
      type: isExistingProject 
        ? editedProject.type 
        : (slugify(editedProject.title) || `project-${Date.now()}`),
      id: editedProject.id || Date.now()
    };
    if (!finalProject.title) {
      toast({
        title: "Titre manquant",
        description: "Veuillez donner un titre à votre projet.",
        variant: "destructive"
      });
      return;
    }
    if (!finalProject.clientTitle) {
      finalProject.clientTitle = finalProject.title;
    }
    onSave(finalProject);
  };
  return <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b">
                    <h3 className="text-lg font-semibold">Paramètres du Projet</h3>
                    <div className="flex items-center space-x-2">
                        <Switch id="isPublic" checked={editedProject.isPublic} onCheckedChange={checked => setEditedProject(prev => ({
          ...prev,
          isPublic: checked
        }))} />
                        <Label htmlFor="isPublic">En ligne</Label>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="project-title">Titre du Projet (Interne)</Label>
                        <Input id="project-title" value={editedProject.title} onChange={e => setEditedProject(prev => ({
          ...prev,
          title: e.target.value
        }))} />
                    </div>
                    <div>
                        <Label htmlFor="project-client-title">Nom affiché au client</Label>
                        <Input id="project-client-title" value={editedProject.clientTitle} onChange={e => setEditedProject(prev => ({
          ...prev,
          clientTitle: e.target.value
        }))} />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project-icon">Icône (Emoji)</Label>
                    <EmojiPickerButton
                      value={editedProject.icon}
                      onChange={(newIcon) => setEditedProject(prev => ({
                        ...prev,
                        icon: newIcon
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-color">Couleur du Badge</Label>
                    <Select 
                      value={editedProject.color || 'bg-blue-100 text-blue-800'} 
                      onValueChange={(value) => setEditedProject(prev => ({
                        ...prev,
                        color: value
                      }))}
                    >
                      <SelectTrigger id="project-color">
                        <SelectValue placeholder="Choisir une couleur" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_COLOR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full ${option.preview} border border-gray-300`} />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <h3 className="text-md font-semibold text-gray-700 pt-4 border-t">Étapes de la Timeline</h3>
                <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEndWithCleanup}>
                    <Droppable droppableId="steps">
                        {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                {editedProject.steps.map((step, index) => <Draggable key={step.id} draggableId={step.id} index={index}>
                                        {(provided, snapshot) => {
                                          const style = snapshot.isDragging
                                            ? {
                                                ...provided.draggableProps.style,
                                                position: 'relative',
                                                left: 'auto',
                                                top: 'auto',
                                              }
                                            : provided.draggableProps.style;
                                          
                                          return <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            style={style}
                                            className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all ${snapshot.isDragging ? 'ring-2 ring-purple-200 shadow-lg' : ''}`}
                                          >
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                              <div className="flex items-center gap-3 md:flex-1">
                                                <div
                                                  {...provided.dragHandleProps}
                                                  className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                                >
                                                  <GripVertical className="h-5 w-5" />
                                                </div>
                                                <EmojiPickerButton
                                                  value={step.icon}
                                                  onChange={(newIcon) => handleStepChange(index, 'icon', newIcon)}
                                                />
                                                <Input
                                                  value={step.name}
                                                  onChange={e => handleStepChange(index, 'name', e.target.value)}
                                                  placeholder="Nom de l'étape"
                                                  className="flex-1"
                                                />
                                              </div>
                                              <div className="flex items-center gap-2 md:w-72">
                                                <Select
                                                  value={step.globalStepId ?? ''}
                                                  onValueChange={value => handleStepChange(index, 'globalStepId', value || null)}
                                                >
                                                  <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Associer à une étape globale" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="">Non assignée</SelectItem>
                                                    {globalStepOptions}
                                                  </SelectContent>
                                                </Select>
                                                <Button variant="ghost" size="icon" onClick={() => removeStep(index)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>}}
                                    </Draggable>)}
                                {provided.placeholder}
                            </div>}
                    </Droppable>
                </DragDropContext>

                <div className="flex items-end gap-2 pt-4 border-t">
                    <div className="flex-grow">
                        <Label>Ajouter une étape</Label>
                        <div className="flex gap-2">
                           <EmojiPickerButton
                             value={newStepIcon}
                             onChange={setNewStepIcon}
                           />
                           <Input value={newStepName} onChange={e => setNewStepName(e.target.value)} placeholder="Nom de la nouvelle étape" className="flex-1" />
                        </div>
                    </div>
                    <Button onClick={addStep}><Plus className="h-4 w-4" /></Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Annuler</Button>
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Enregistrer le projet</Button>
                </DialogFooter>
            </div>;
};
const CreateProjectDialog = ({
  open,
  onOpenChange,
  onSave,
  globalPipelineSteps = []
}) => {
  const {
    projectsData
  } = useAppContext();
  const [step, setStep] = useState(1);
  const [project, setProject] = useState(null);
  const handleSelectTemplate = templateKey => {
    const template = projectsData[templateKey];
    if (!template) {
      toast({
        title: "Modèle introuvable",
        description: "Le modèle de projet n'existe plus.",
        variant: "destructive"
      });
      return;
    }
    const newProject = {
      ...JSON.parse(JSON.stringify(template)),
      title: `${template.title} (Copie)`,
      clientTitle: `${template.clientTitle} (Copie)`,
      type: `${template.type}-copie-${Date.now()}`,
      isPublic: true
    };
    setProject(newProject);
    setStep(2);
  };
  const handleCreateFromScratch = () => {
    const fallbackId = globalPipelineSteps[0]?.id ?? null;
    setProject({
      type: '',
      title: '',
      clientTitle: '',
      icon: '🆕',
      color: 'gradient-blue',
      steps: [{
        name: 'Nouvelle Étape',
        status: 'pending',
        icon: '➡️',
        descriptions: {},
        globalStepId: fallbackId
      }],
      isPublic: true
    });
    setStep(2);
  };
  const handleSaveProject = editedProject => {
    onSave(editedProject);
    setStep(1);
    setProject(null);
    onOpenChange(false);
  };
  const handleCancel = () => {
    setStep(1);
    setProject(null);
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={isOpen => {
    if (!isOpen) handleCancel();else onOpenChange(true);
  }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{step === 1 ? 'Créer un nouveau projet' : 'Modifier le projet'}</DialogTitle>
                        <DialogDescription>
                            {step === 1 ? "Choisissez un modèle de base ou partez de zéro." : "Personnalisez le titre, l'icône et les étapes de votre nouveau projet."}
                        </DialogDescription>
                    </DialogHeader>
                    {step === 1 && <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(projectsData).map(template => <motion.button key={template.type} onClick={() => handleSelectTemplate(template.type)} className="p-4 border rounded-lg hover:shadow-lg hover:border-blue-500 transition-all text-center space-y-2" whileHover={{
          y: -5
        }}>
                                    <span className="text-4xl">{template.icon}</span>
                                    <p className="font-semibold">{template.title}</p>
                                </motion.button>)}
                             <motion.button onClick={handleCreateFromScratch} className="p-4 border border-dashed rounded-lg hover:shadow-lg hover:border-green-500 transition-all text-center space-y-2 flex flex-col items-center justify-center" whileHover={{
          y: -5
        }}>
                                <Plus className="h-10 w-10 text-gray-400 mb-2" />
                                <p className="font-semibold">Partir de zéro</p>
                            </motion.button>
                        </div>}
                    {step === 2 && project && <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <ProjectEditor project={project} onSave={handleSaveProject} onCancel={handleCancel} globalPipelineSteps={globalPipelineSteps} />
                        </div>}
                </DialogContent>
            </Dialog>;
};
const ActionEditor = ({
  action,
  onChange,
  onDelete,
  forms
}) => {
  const handleActionChange = (field, value) => {
    onChange({
      ...action,
      [field]: value
    });
  };
  
  const addChecklistItem = () => {
    const newChecklist = [...(action.checklist || []), {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: ''
    }];
    handleActionChange('checklist', newChecklist);
  };
  
  const updateChecklistItem = (index, text) => {
    const newChecklist = [...(action.checklist || [])];
    newChecklist[index].text = text;
    handleActionChange('checklist', newChecklist);
  };
  
  const deleteChecklistItem = (index) => {
    const newChecklist = [...(action.checklist || [])];
    newChecklist.splice(index, 1);
    handleActionChange('checklist', newChecklist);
  };
  
  return <div className="p-4 bg-white rounded-lg border space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Type d'action</Label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleActionChange('hasClientAction', true)}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                    action.hasClientAction !== false
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-lg">👤</span>
                                    <span className="font-medium text-sm">Associée au client</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActionChange('hasClientAction', false)}
                                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                    action.hasClientAction === false
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-lg">💼</span>
                                    <span className="font-medium text-sm">Associée au commercial</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="ml-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
                
                {action.hasClientAction !== false ? (
                    <>
                        <div className="space-y-2">
                            <Label>Message à dire</Label>
                            <Textarea placeholder="Ex: Bonjour, merci de compléter les informations..." value={action.message} onChange={e => handleActionChange('message', e.target.value)} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Action à associer</Label>
                            <Select value={action.type} onValueChange={value => handleActionChange('type', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucune</SelectItem>
                                    <SelectItem value="show_form">Afficher un formulaire</SelectItem>
                                    <SelectItem value="start_signature">Lancer une signature</SelectItem>
                                    <SelectItem value="request_document">Demander un document</SelectItem>
                                    <SelectItem value="open_payment">Ouvrir un paiement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <AnimatePresence>
                            {action.type === 'show_form' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }} className="space-y-2 overflow-hidden">
                                    <Label>Formulaire à afficher</Label>
                                    <Select value={action.formId} onValueChange={value => handleActionChange('formId', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir un formulaire" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(forms).map(form => <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </motion.div>}
                            
                            {action.type === 'request_document' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }} className="space-y-2 overflow-hidden">
                                    <Label>Type de document attendu</Label>
                                    <input
                                        type="text"
                                        value={action.documentType || ''}
                                        onChange={(e) => handleActionChange('documentType', e.target.value)}
                                        placeholder="Ex: Facture EDF, RIB, Titre de propriété..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </motion.div>}

                            {action.type === 'start_signature' && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} exit={{
                opacity: 0,
                height: 0
              }} className="space-y-2 overflow-hidden">
                                    <Label>Template de contrat à utiliser</Label>
                                    <Select value={action.templateId} onValueChange={value => handleActionChange('templateId', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {contractTemplates
                                                .filter(template => template.isActive)
                                                .map(template => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {!action.templateId && (
                                        <p className="text-xs text-red-500">⚠️ Template obligatoire pour sauvegarder</p>
                                    )}
                                </motion.div>}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <Label>Mode de gestion</Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('managementMode', 'automatic')}
                                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                        (action.managementMode || 'automatic') === 'automatic'
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-lg">🤖</span>
                                        <span className="font-medium text-sm">Géré par l'IA</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('managementMode', 'manual')}
                                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                        action.managementMode === 'manual'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-lg">👤</span>
                                        <span className="font-medium text-sm">Géré par commercial</span>
                                    </div>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {(action.managementMode || 'automatic') === 'automatic' 
                                    ? '⚡ Envoyé automatiquement par Charly AI'
                                    : '👨‍💼 Le commercial devra envoyer manuellement'}
                            </p>
                            
                            <AnimatePresence>
                                {action.managementMode === 'manual' && <motion.div initial={{
                    opacity: 0,
                    height: 0
                  }} animate={{
                    opacity: 1,
                    height: 'auto'
                  }} exit={{
                    opacity: 0,
                    height: 0
                  }} className="pt-3 border-t overflow-hidden space-y-3">
                                        <div className="flex items-start space-x-2">
                                            <Checkbox 
                                                id={`create-task-${action.id}`}
                                                checked={action.createTask !== false}
                                                onCheckedChange={checked => handleActionChange('createTask', checked)}
                                            />
                                            <div className="space-y-1 flex-1">
                                                <Label htmlFor={`create-task-${action.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    Créer automatiquement une tâche pour le commercial
                                                </Label>
                                                <p className="text-xs text-gray-500">
                                                    Une tâche sera envoyée au commercial dès que cette étape devient l'étape en cours.
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {action.createTask !== false && <div className="space-y-2 ml-6">
                                                <Label className="text-sm">Titre de la tâche</Label>
                                                <input
                                                    type="text"
                                                    value={action.taskTitle || 'Action requise pour ce client'}
                                                    onChange={(e) => handleActionChange('taskTitle', e.target.value)}
                                                    placeholder="Action requise pour ce client"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>}
                                    </motion.div>}
                            </AnimatePresence>
                        </div>
                        
                        {action.type === 'show_form' && (
                            <div className="space-y-2">
                                <Label>Mode de vérification</Label>
                                <Select value={action.verificationMode || 'human'} onValueChange={value => handleActionChange('verificationMode', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir le mode de vérification" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Pas de vérification (auto-validation)</SelectItem>
                                        <SelectItem value="ai">IA automatique</SelectItem>
                                        <SelectItem value="human">Humain (commercial vérifie)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">
                                    {action.verificationMode === 'none' && '✅ Validé automatiquement dès que le client termine'}
                                    {action.verificationMode === 'ai' && '🤖 L\'IA analysera et validera automatiquement'}
                                    {(!action.verificationMode || action.verificationMode === 'human') && '👤 Une tâche sera créée pour que le commercial vérifie'}
                                </p>
                                
                                {/* 🆕 Messages automatiques de validation/rejet */}
                                {(!action.verificationMode || action.verificationMode === 'human') && (
                                    <div className="space-y-4 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">
                                                ✅ Message si validé
                                            </Label>
                                            <p className="text-xs text-gray-500">
                                                Ce message sera envoyé automatiquement dans le chat quand le commercial valide le formulaire
                                            </p>
                                            <Textarea
                                                value={action.approvalMessage || 'Merci ! Votre formulaire a été validé.'}
                                                onChange={(e) => handleActionChange('approvalMessage', e.target.value)}
                                                placeholder="Merci ! Votre formulaire a été validé."
                                                className="min-h-[60px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">
                                                ❌ Message si rejeté
                                            </Label>
                                            <p className="text-xs text-gray-500">
                                                Message prédéfini affiché au commercial. Il pourra ajouter sa raison de refus avant d'envoyer dans le chat.
                                            </p>
                                            <Textarea
                                                value={action.rejectionMessage || 'Oups !! Votre formulaire a été rejeté pour la raison suivante :'}
                                                onChange={(e) => handleActionChange('rejectionMessage', e.target.value)}
                                                placeholder="Oups !! Votre formulaire a été rejeté pour la raison suivante :"
                                                className="min-h-[60px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">Checklist de tâches pour le commercial</Label>
                        <p className="text-xs text-gray-500">Liste des tâches à effectuer manuellement pour cette action</p>
                        
                        <div className="space-y-2">
                            {(action.checklist || []).map((item, index) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={item.text}
                                        onChange={(e) => updateChecklistItem(index, e.target.value)}
                                        placeholder="Ex: Vérifier le document"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => deleteChecklistItem(index)}
                                        className="h-8 w-8"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={addChecklistItem}
                            className="w-full border-dashed"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Ajouter une tâche
                        </Button>
                    </div>
                )}
            </div>;
};
const PromptCreatorDialog = ({
  open,
  onOpenChange,
  onSave,
  existingPrompt
}) => {
  const {
    projectsData,
    forms
  } = useAppContext();
  const [promptData, setPromptData] = useState({
    name: '',
    tone: '',
    projectId: null,
    stepsConfig: {}
  });
  const [activeStep, setActiveStep] = useState(null);
  useEffect(() => {
    if (existingPrompt) {
      setPromptData(JSON.parse(JSON.stringify(existingPrompt)));
    } else {
      setPromptData({
        name: '',
        tone: '',
        projectId: null,
        stepsConfig: {}
      });
    }
  }, [existingPrompt, open]);
  const projectOptions = useMemo(() => Object.values(projectsData).map(p => ({
    value: p.type,
    label: p.title
  })), [projectsData]);
  const projectSteps = useMemo(() => {
    if (!promptData.projectId) return [];
    return projectsData[promptData.projectId]?.steps || [];
  }, [promptData.projectId, projectsData]);
  const handleProjectChange = projectId => {
    setPromptData(prev => ({
      ...prev,
      projectId,
      stepsConfig: {}
    }));
    setActiveStep(null);
  };
  const toggleStep = stepIndex => {
    setActiveStep(activeStep === stepIndex ? null : stepIndex);
  };
  const handleActionChange = (stepIndex, actionIndex, newAction) => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (!newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex] = {
        actions: [],
        autoCompleteStep: false
      };
    }
    newStepsConfig[stepIndex].actions[actionIndex] = newAction;
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };
  const addAction = stepIndex => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (!newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex] = {
        actions: [],
        autoCompleteStep: false
      };
    }
    newStepsConfig[stepIndex].actions.push({
      id: `action-${Date.now()}`,
      message: '',
      type: 'none',
      hasClientAction: true
    });
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };
  const deleteAction = (stepIndex, actionIndex) => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex].actions.splice(actionIndex, 1);
    }
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };
  const handleStepConfigChange = (stepIndex, field, value) => {
    const newStepsConfig = {
      ...promptData.stepsConfig
    };
    if (!newStepsConfig[stepIndex]) {
      newStepsConfig[stepIndex] = {
        actions: [],
        autoCompleteStep: false
      };
    }
    newStepsConfig[stepIndex][field] = value;
    setPromptData(prev => ({
      ...prev,
      stepsConfig: newStepsConfig
    }));
  };
  const handleSave = () => {
    if (!promptData.name || !promptData.tone || !promptData.projectId) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir le nom, le ton et le projet.",
        variant: "destructive"
      });
      return;
    }
    onSave({
      ...promptData,
      id: existingPrompt?.id || `prompt-${Date.now()}`
    });
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{existingPrompt ? "Modifier le prompt" : "Créer un nouveau prompt"}</DialogTitle>
                        <DialogDescription>Paramétrez votre prompt pour générer des communications personnalisées.</DialogDescription>
                    </DialogHeader>
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div>
                            <Label htmlFor="prompt-name">Nom du prompt</Label>
                            <Input id="prompt-name" placeholder="Ex: Relance après RDV" value={promptData.name} onChange={e => setPromptData(p => ({
            ...p,
            name: e.target.value
          }))} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="prompt-tone">Ton</Label>
                                <Select value={promptData.tone} onValueChange={value => setPromptData(p => ({
              ...p,
              tone: value
            }))}>
                                    <SelectTrigger id="prompt-tone">
                                        <SelectValue placeholder="Choisir un ton" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professionnel">Professionnel</SelectItem>
                                        <SelectItem value="detendu">Détendu</SelectItem>
                                        <SelectItem value="humain">Humain</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="prompt-project">Projet</Label>
                                <Select value={promptData.projectId} onValueChange={handleProjectChange}>
                                    <SelectTrigger id="prompt-project">
                                        <SelectValue placeholder="Choisir un projet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {promptData.projectId && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} className="pt-4 border-t">
                                <h4 className="font-semibold text-gray-700 mb-3">Étapes du projet "{projectsData[promptData.projectId]?.title}"</h4>
                                <div className="space-y-2">
                                    {projectSteps.map((step, index) => <div key={index}>
                                            <button onClick={() => toggleStep(index)} className="w-full flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{step.icon}</span>
                                                    <span className="text-sm font-medium text-gray-800">{step.name}</span>
                                                </div>
                                                {activeStep === index ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                            </button>
                                            <AnimatePresence>
                                                {activeStep === index && <motion.div initial={{
                  opacity: 0,
                  height: 0,
                  marginTop: 0
                }} animate={{
                  opacity: 1,
                  height: 'auto',
                  marginTop: '0.5rem'
                }} exit={{
                  opacity: 0,
                  height: 0,
                  marginTop: 0
                }} className="pl-8 bg-gray-50/50 rounded-b-md">
                                                        <div className="p-4 space-y-4">
                                                            {(promptData.stepsConfig[index]?.actions || []).map((action, actionIndex) => <ActionEditor key={action.id} action={action} onChange={newAction => handleActionChange(index, actionIndex, newAction)} onDelete={() => deleteAction(index, actionIndex)} forms={forms} />)}
                                                            <Button variant="outline" size="sm" onClick={() => addAction(index)} className="w-full border-dashed">
                                                                <Plus className="h-4 w-4 mr-2" /> Ajouter un message + action
                                                            </Button>
                                                            <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                                                                <Checkbox id={`form-complete-step-${index}`} checked={promptData.stepsConfig[index]?.autoCompleteStep || false} onCheckedChange={checked => handleStepConfigChange(index, 'autoCompleteStep', checked)} />
                                                                <Label htmlFor={`form-complete-step-${index}`} className="text-sm text-gray-600">
                                                                    Si action validée, passer automatiquement à l'étape suivante
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    </motion.div>}
                                            </AnimatePresence>
                                        </div>)}
                                </div>
                            </motion.div>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Enregistrer le prompt</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>;
};
const ProfilePage = () => {
  const {
    projectsData,
    setProjectsData,
    deleteProjectTemplate, // 🔥 Fonction de suppression directe depuis Supabase
    prompts: promptsFromContext,
    formContactConfig,
    setFormContactConfig,
    globalPipelineSteps = [],
    setGlobalPipelineSteps: setGlobalPipelineStepsContext,
    activeAdminUser,
    setActiveAdminUser,
    companyLogo,
    setCompanyLogo,
    removeLogo
  } = useAppContext();

  // 🏢 Hook pour récupérer l'organization courante (multi-tenant) - DOIT ÊTRE AVANT LES HOOKS SUPABASE
  const { organizationId } = useOrganization();

  // 🔥 Hook Supabase pour la gestion des formulaires (remplace Context)
  const {
    forms: supabaseForms,
    loading: formsLoading,
    saveForm: saveFormToSupabase,
    deleteForm: deleteFormFromSupabase
  } = useSupabaseForms(organizationId);  // 🔥 Passer organizationId !

  // 🔥 Forcer React à re-render quand supabaseForms change en créant un nouveau memo
  const forms = useMemo(() => {
    return supabaseForms;
  }, [supabaseForms]);

  // 🔥 Hook Supabase pour la gestion des prompts (remplace Context)
  const {
    prompts: supabasePrompts,
    loading: promptsLoading,
    savePrompt: savePromptToSupabase,
    deletePrompt: deletePromptFromSupabase
  } = useSupabasePrompts(organizationId);  // 🔥 Passer organizationId !

  // 🔥 Forcer React à re-render quand supabasePrompts change
  const prompts = useMemo(() => {
    return supabasePrompts;
  }, [supabasePrompts]);

  // 🔥 Hook Supabase pour la gestion des templates de contrats
  const {
    templates: contractTemplates,
    loading: templatesLoading,
    createTemplate,
    updateTemplate,
    deactivateTemplate
  } = useSupabaseContractTemplates(organizationId);  // 🔥 Passer organizationId !

  // 🔥 Utiliser le hook Supabase pour la gestion des utilisateurs
  const {
    users: supabaseUsers,
    loading: usersLoading,
    addUser,
    updateUser,
    deleteUser: deleteUserSupabase
  } = useSupabaseUsersCRUD(activeAdminUser);

  // Transformer le array Supabase en objet compatible avec le code existant
  // { user_id: { id, user_id, name, email, ... } }
  const usersByAuthId = useMemo(() => {
    return supabaseUsers.reduce((acc, user) => {
      if (!user.user_id) return acc;
      
      // 🔥 FIX : Trouver le NOM du manager à partir de manager_id (UUID)
      let managerName = null;
      if (user.manager_id) {
        const managerUser = supabaseUsers.find(u => u.user_id === user.manager_id);
        managerName = managerUser ? managerUser.name : user.manager_id; // Fallback sur UUID si nom pas trouvé
      }
      
      acc[user.user_id] = {
        id: user.id,               // PK
        user_id: user.user_id,     // AUTH UUID
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        manager: managerName,      // 🔥 NOM du manager au lieu de UUID
        accessRights: user.access_rights,
      };
      return acc;
    }, {});
  }, [supabaseUsers]);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isAccessRightsOpen, setIsAccessRightsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [accessRights, setAccessRights] = useState({
    modules: [],
    users: []
  });
  const [isCreateProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  // 🏢 State pour édition du nom d'entreprise (organizations.name)
  const [organizationName, setOrganizationName] = useState('');
  const [isUpdatingOrgName, setIsUpdatingOrgName] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [isPromptCreatorOpen, setIsPromptCreatorOpen] = useState(false);
  const [editingContractTemplate, setEditingContractTemplate] = useState(null);
  const [isPreviewTemplateOpen, setIsPreviewTemplateOpen] = useState(false);
  const [selectedProjectForDisplay, setSelectedProjectForDisplay] = useState('');
  const [projectDisplayData, setProjectDisplayData] = useState({
    coverImage: '',
    clientDescription: '',
    ctaText: ''
  });
  const fileInputRef = useRef(null);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'commercial',
    manager: ''
  });
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [newPipelineStep, setNewPipelineStep] = useState('');
  const [isPipelineStepEditorOpen, setIsPipelineStepEditorOpen] = useState(false);
  const [editingPipelineStepId, setEditingPipelineStepId] = useState(null);
  const [pipelineStepDraft, setPipelineStepDraft] = useState('');
  const logoInputRef = useRef(null);

  const updateGlobalPipelineSteps = (updater) => {
    if (typeof setGlobalPipelineStepsContext !== 'function') {
      return;
    }
    setGlobalPipelineStepsContext(updater);
  };

  const isGlobalAdmin = activeAdminUser?.role === 'Global Admin';
  const isPlatformAdmin = activeAdminUser?.role === 'platform_admin';
  const isAdminProfile = isGlobalAdmin || isPlatformAdmin;
  const isAdmin = activeAdminUser?.role === 'Admin';
  
  // 🔒 UI GATE : vérifier que organization_id est chargé avant d'autoriser l'invitation
  const isOrganizationReady = !!activeAdminUser?.organization_id;
  
  useEffect(() => {
    if (activeAdminUser) {
        setUserInfo({
            name: activeAdminUser.name || '',
            email: activeAdminUser.email || '',
            phone: activeAdminUser.phone || '',
            role: activeAdminUser.role || ''
        });
    }
  }, [activeAdminUser]);

  // 🏢 Charger le nom de l'organisation au montage
  useEffect(() => {
    const loadOrganizationName = async () => {
      if (!organizationId) return;
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single();
        
        if (error) throw error;
        if (data?.name) {
          setOrganizationName(data.name);
        }
      } catch (err) {
        logger.error('Erreur chargement nom organisation', { error: err.message });
      }
    };
    
    loadOrganizationName();
  }, [organizationId]);

  // 🔥 Synchroniser editingForm avec les changements real-time
  useEffect(() => {
    if (editingForm?.id && forms[editingForm.id]) {
      const currentForm = forms[editingForm.id];
      
      // Vérifier si le formulaire a vraiment changé (comparer les updatedAt)
      if (currentForm.updatedAt !== editingForm.updatedAt) {
        setEditingForm(currentForm);
      }
    }
  }, [forms]);

  const handleFormFieldsDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(formContactConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFormContactConfig(items);
  };

  const openFieldEditor = (field) => {
    setEditingField(field);
    setIsFieldEditorOpen(true);
  };

  const handleSaveField = (fieldToSave) => {
    let newConfig;
    if (editingField) {
      newConfig = formContactConfig.map(f => f.id === fieldToSave.id ? fieldToSave : f);
    } else {
      newConfig = [...formContactConfig, fieldToSave];
    }
    setFormContactConfig(newConfig);
    setIsFieldEditorOpen(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId) => {
    const newConfig = formContactConfig.filter(f => f.id !== fieldId);
    setFormContactConfig(newConfig);
  };

  const handleAddPipelineStep = () => {
    const normalizedStep = normalizePipelineStepLabel(newPipelineStep);
    if (!normalizedStep) {
      toast({
        title: "Nom d'étape requis",
        description: "Ajoutez un libellé avant d'enregistrer une étape.",
        variant: "destructive"
      });
      return;
    }

    if (globalPipelineSteps.some(step => step.label === normalizedStep)) {
      toast({
        title: "Étape déjà présente",
        description: "Ce type d'étape figure déjà dans votre liste globale.",
        variant: "destructive"
      });
      return;
    }

    const defaultColor = getDefaultColorForLabel(normalizedStep, globalPipelineSteps.length);
    updateGlobalPipelineSteps(prev => [...prev, buildPipelineStep(normalizedStep, null, defaultColor)]);
    setNewPipelineStep('');
    toast({
      title: "Étape ajoutée",
      description: `${normalizedStep} est désormais disponible pour vos pipelines globales.`
    });
  };

  const handleRemovePipelineStep = useCallback((stepId) => {
    updateGlobalPipelineSteps(prev => {
      const stepToRemove = prev.find(step => step.id === stepId);
      const updatedSteps = prev.filter(step => step.id !== stepId);
      if (stepToRemove) {
        toast({
          title: "Étape retirée",
          description: `${stepToRemove.label} a été supprimée de la liste globale.`
        });
      }
      return updatedSteps;
    });
  }, [updateGlobalPipelineSteps]);

  const handleChangePipelineStepColor = useCallback((stepId, colorValue) => {
    if (!colorValue) return;
    updateGlobalPipelineSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, color: colorValue } : step
    ));
  }, [updateGlobalPipelineSteps]);

  const openPipelineStepEditor = useCallback((step) => {
    setEditingPipelineStepId(step.id);
    setPipelineStepDraft(step.label);
    setIsPipelineStepEditorOpen(true);
  }, []);

  const handlePipelineStepEditorOpenChange = (open) => {
    setIsPipelineStepEditorOpen(open);
    if (!open) {
      setEditingPipelineStepId(null);
      setPipelineStepDraft('');
    }
  };

  const handleSavePipelineStep = () => {
    if (!editingPipelineStepId) return;
    const normalizedDraft = normalizePipelineStepLabel(pipelineStepDraft);
    if (!normalizedDraft) {
      toast({
        title: "Nom d'étape requis",
        description: "Le libellé ne peut pas être vide.",
        variant: "destructive"
      });
      return;
    }

    if (globalPipelineSteps.some(step => step.id !== editingPipelineStepId && step.label === normalizedDraft)) {
      toast({
        title: "Étape déjà présente",
        description: "Un autre type d'étape porte déjà ce nom.",
        variant: "destructive"
      });
      return;
    }

    updateGlobalPipelineSteps(prev => prev.map(step => step.id === editingPipelineStepId ? { ...step, label: normalizedDraft } : step));
    handlePipelineStepEditorOpenChange(false);
    toast({
      title: "Étape mise à jour",
      description: `${normalizedDraft} remplacera désormais l'ancien libellé.`
    });
  };

  const handlePipelineDragEnd = useCallback((result) => {
    if (!result.destination) return;
    updateGlobalPipelineSteps(prev => {
      const items = Array.from(prev);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      return items;
    });
  }, [updateGlobalPipelineSteps]);

  const projectOptions = useMemo(() => Object.values(projectsData).map(p => ({
    value: p.type,
    label: p.title
  })), [projectsData]);
  useEffect(() => {
    if (projectOptions.length > 0 && !selectedProjectForDisplay) {
      setSelectedProjectForDisplay(projectOptions[0].value);
    }
  }, [projectOptions, selectedProjectForDisplay]);
  useEffect(() => {
    if (selectedProjectForDisplay && projectsData[selectedProjectForDisplay]) {
      const project = projectsData[selectedProjectForDisplay];
      setProjectDisplayData({
        coverImage: project.coverImage || '',
        clientDescription: project.clientDescription || '',
        ctaText: project.ctaText || ''
      });
    }
  }, [selectedProjectForDisplay, projectsData]);
  const handleDisplayDataChange = (field, value) => {
    setProjectDisplayData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSaveDisplayData = async () => {
    if (!selectedProjectForDisplay) return;
    const updatedProject = {
      ...projectsData[selectedProjectForDisplay],
      ...projectDisplayData
    };
    const newProjectsData = {
      ...projectsData,
      [selectedProjectForDisplay]: updatedProject
    };
    
    try {
      await setProjectsData(newProjectsData);
      toast({
        title: "Modifications enregistrées !",
        description: `L'affichage du projet "${projectsData[selectedProjectForDisplay].title}" a été mis à jour.`,
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      toast({
        title: "Erreur !",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    }
  };
  const handleFileSelect = event => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleDisplayDataChange('coverImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleUserInfoChange = e => {
    const {
      name,
      value
    } = e.target;
    setUserInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSaveChanges = async () => {
    if(!activeAdminUser) return;
    
    try {
      // Trouver l'utilisateur dans supabaseUsers par ID ou user_id
      const currentUser = supabaseUsers.find(u => u.id === activeAdminUser.id || u.user_id === activeAdminUser.user_id);
      
      if (!currentUser) {
        throw new Error('Utilisateur non trouvé');
      }
      
      await updateUser(currentUser.id, userInfo);
      // Le toast de succès est déjà affiché dans le hook
    } catch (err) {
      logger.error('Erreur sauvegarde modifications', { error: err.message });
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive",
      });
    }
  };
  const handleFeatureClick = featureName => {
    toast({
      title: `🚧 ${featureName}`,
      description: "Cette fonctionnalité n'est pas encore implémentée. Demandez-la dans votre prochain prompt ! 🚀"
    });
  };
  
  const handleAdminLogout = async () => {
    try {
      // Déconnexion Supabase
      await supabase.auth.signOut();
      
      // Nettoyer le state
      setActiveAdminUser(null);
      
      // Nettoyer seulement les données de session, pas tout le localStorage
      localStorage.removeItem('activeAdminUser');
      
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      
      // Rediriger vers la page de login
      window.location.href = '/';
    } catch (error) {
      logger.error('Erreur déconnexion', { error: error.message });
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter.",
        variant: "destructive",
      });
    }
  };
  
  const scrollToSection = (sectionId) => {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const openChangeRoleDialog = user => {
    setEditingUser(user);
    setSelectedRole(user.role.toLowerCase());
    setSelectedManager(user.manager || 'none');
    setIsChangeRoleOpen(true);
  };
  const openAccessRightsDialog = user => {
    setEditingUser(user);
    const isEditingAdmin = user.role === 'Admin' || user.role === 'Global Admin';
    
    const allUserOptions = Object.values(usersByAuthId)
      .filter(u => u.user_id !== user.user_id)
      .map(u => ({
        value: u.user_id, // ✅ AUTH UUID
        label: u.name
      }));
    
    let userAccessRights = user.accessRights;
    if (!userAccessRights) {
      userAccessRights = { modules: ['Pipeline', 'Agenda', 'Contacts'], users: [] };
    }

    if (isEditingAdmin) {
      setAccessRights({
        modules: ['Pipeline', 'Agenda', 'Contacts'],
        users: allUserOptions
      });
    } else {
      const ids = userAccessRights?.users || [];
      const selectedUsers = ids.map((authId) => {
        const foundUser = usersByAuthId[authId];  // ✅ indexé par user_id
        if (!foundUser) return null;
        
        return {
          value: foundUser.user_id,  // AUTH UUID
          label: foundUser.name,
        };
      }).filter(Boolean);
      
      setAccessRights({
        modules: userAccessRights.modules || ['Pipeline', 'Agenda', 'Contacts'],
        users: selectedUsers
      });
    }
    setIsAccessRightsOpen(true);
  };
  const handleSaveAccessRights = async () => {
    if (!editingUser || editingUser.role === 'Admin' || editingUser.role === 'Global Admin') {
      setIsAccessRightsOpen(false);
      return;
    }
    
    try {
      await updateUser(editingUser.id, {
        accessRights: {
          modules: accessRights.modules,
          users: accessRights.users.map(u => u.value)
        }
      });
      // Le toast est déjà affiché dans le hook
      setIsAccessRightsOpen(false);
      setEditingUser(null);
    } catch (err) {
      logger.error('Erreur sauvegarde droits accès', { error: err.message });
    }
  };
  const handleChangeRole = async () => {
    if (!editingUser) return;
    
    try {
      // 🔥 Mapper les valeurs du select vers les rôles Supabase exacts
      const roleMapping = {
        'admin': 'Global Admin',
        'manager': 'Manager',
        'commercial': 'Commercial'
      };
      
      const finalRole = roleMapping[selectedRole] || selectedRole;
      
      await updateUser(editingUser.id, {
        role: finalRole,
        manager: selectedManager === 'none' ? '' : selectedManager
      });
      // Le toast est déjà affiché dans le hook
      setIsChangeRoleOpen(false);
      setEditingUser(null);
    } catch (err) {
      logger.error('Erreur changement rôle', { error: err.message });
    }
  };
  const handleDeleteUser = async (userToDelete) => {
    try {
      await deleteUserSupabase(userToDelete.id);
      // Le toast est déjà affiché dans le hook
    } catch (err) {
      logger.error('Erreur suppression utilisateur', { error: err.message });
    }
  };
  const handleCopyLink = user => {
    if (!user?.id) return;
    
    // 🔥 Trouver le user dans supabaseUsers pour récupérer affiliate_slug
    const fullUser = supabaseUsers.find(u => u.id === user.id || u.user_id === user.user_id);
    
    if (!fullUser?.affiliate_slug) {
      toast({
        title: "Erreur",
        description: "Ce commercial n'a pas de lien d'affiliation (affiliate_slug manquant).",
        variant: "destructive"
      });
      return;
    }
    
    // ✅ Générer le VRAI lien d'affiliation pointant vers /inscription/{slug}
    const link = `https://evatime.fr/inscription/${fullUser.affiliate_slug}`;

    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Lien d'affiliation copié !",
        description: "Envoyez-le à votre client pour qu'il s'inscrive avec votre affiliation.",
        className: "bg-green-500 text-white"
      });
    }).catch(() => {
      toast({
        title: "Impossible de copier le lien",
        description: "Copiez-le manuellement : " + link,
        variant: "destructive"
      });
    });
  };
  const handleSaveProject = async projectToSave => {
    const newProjectsData = {
      ...projectsData,
      [projectToSave.type]: projectToSave
    };
    
    try {
      await setProjectsData(newProjectsData);
      toast({
        title: "Projet enregistré !",
        description: `Le projet "${projectToSave.title}" a été sauvegardé.`,
        className: "bg-green-500 text-white"
      });
      setEditingProject(null);
    } catch (error) {
      toast({
        title: "Erreur !",
        description: "Impossible de sauvegarder le projet.",
        variant: "destructive"
      });
    }
  };
  const handleToggleProjectVisibility = (projectType, isPublic) => {
    const projectToUpdate = projectsData[projectType];
    if (projectToUpdate) {
      const updatedProject = {
        ...projectToUpdate,
        isPublic
      };
      handleSaveProject(updatedProject);
      toast({
        title: `Projet ${isPublic ? 'mis en ligne' : 'mis hors ligne'}`,
        description: `Le projet "${projectToUpdate.title}" est maintenant ${isPublic ? 'visible' : 'caché'} pour les clients.`
      });
    }
  };
  const handleDeleteProjectClick = (projectType) => {
    // 🔒 Protection UX : Empêcher la suppression des projets "En ligne"
    const template = projectsData[projectType];
    
    if (template?.isPublic) {
      toast({
        title: "Impossible de supprimer",
        description: "Désactivez ce projet avant de le supprimer.",
        variant: "destructive"
      });
      return;
    }
    
    // Si le projet est hors ligne, procéder à la suppression
    handleDeleteProject(projectType);
  };

  const handleDeleteProject = async projectType => {
    try {
      // 🔥 Trouver le template par type pour obtenir son ID Supabase (UUID)
      const template = projectsData[projectType];
      
      if (!template || !template.id) {
        throw new Error('Template introuvable ou ID manquant');
      }
      
      // 🔥 Appeler deleteTemplate avec l'UUID Supabase (pas le type string)
      await deleteProjectTemplate(template.id);
      
      toast({
        title: "Projet supprimé !",
        description: `Le projet "${template.title}" a été supprimé de la base de données.`,
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      logger.error('Erreur suppression projet', { error: error.message });
      toast({
        title: "Erreur !",
        description: error.message || "Impossible de supprimer le projet.",
        variant: "destructive"
      });
    }
  };

  // 🏢 Handler pour mettre à jour le nom de l'organisation
  const handleUpdateOrganizationName = async () => {
    if (!organizationName.trim()) {
      toast({
        title: "Nom manquant",
        description: "Veuillez entrer un nom pour votre entreprise.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdatingOrgName(true);
      
      const { error } = await supabase
        .from('organizations')
        .update({ name: organizationName.trim() })
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: "✅ Nom mis à jour !",
        description: "Le nom de votre entreprise a été modifié.",
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      logger.error('Erreur mise à jour nom organisation', { error: error.message });
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le nom.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingOrgName(false);
    }
  };
  
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // 🔥 Sauvegarder dans Supabase (le real-time mettra à jour le contexte)
          await setCompanyLogo(reader.result);
        } catch (error) {
          logger.error('Erreur upload logo', { error: error.message });
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveLogo = async () => {
    try {
      // 🔥 Supprimer dans Supabase via le contexte
      await removeLogo();
      
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
      setIsLogoMenuOpen(false);
    } catch (error) {
      logger.error('Erreur suppression logo', { error: error.message });
    }
  };
  const handleSaveForm = async (formToSave) => {
    // Générer un ID unique si nouveau formulaire
    const formId = formToSave.id || `form-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const result = await saveFormToSupabase(formId, {
      name: formToSave.name,
      fields: formToSave.fields || [],
      projectIds: formToSave.projectIds || [],
      audience: formToSave.audience || 'client', // 🔥 AJOUT: Audience par défaut 'client'
    });

    if (result.success) {
      toast({
        title: "✅ Formulaire enregistré !",
        description: `Le formulaire "${formToSave.name}" a été sauvegardé dans Supabase.`,
        className: "bg-green-500 text-white"
      });
      
      // 🔥 Fermer immédiatement - le real-time mettra à jour la liste
      setEditingForm(null);
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible d'enregistrer le formulaire : ${result.error}`,
        variant: "destructive"
      });
    }
  };
  const handleDeleteForm = async (formId) => {
    const result = await deleteFormFromSupabase(formId);

    if (result.success) {
      toast({
        title: "✅ Formulaire supprimé !",
        description: "Le formulaire a été supprimé de Supabase.",
        className: "bg-green-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible de supprimer le formulaire : ${result.error}`,
        variant: "destructive"
      });
    }
  };
  const handleSavePrompt = async (promptToSave) => {
    // Générer un ID unique si nouveau prompt
    const promptId = promptToSave.id || `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const result = await savePromptToSupabase(promptId, {
      name: promptToSave.name,
      tone: promptToSave.tone,
      projectId: promptToSave.projectId,
      stepsConfig: promptToSave.stepsConfig || {},
    });

    if (result.success) {
      toast({
        title: "✅ Prompt enregistré !",
        description: `Le prompt "${promptToSave.name}" a été sauvegardé dans Supabase.`,
        className: "bg-green-500 text-white"
      });
      
      // 🔥 Fermer immédiatement - le real-time mettra à jour la liste
      setEditingPrompt(null);
      setIsPromptCreatorOpen(false);
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible d'enregistrer le prompt : ${result.error}`,
        variant: "destructive"
      });
    }
  };
  const handleDeletePrompt = async (promptId) => {
    const result = await deletePromptFromSupabase(promptId);

    if (result.success) {
      toast({
        title: "✅ Prompt supprimé !",
        description: "Le prompt a été supprimé de Supabase.",
        className: "bg-green-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible de supprimer le prompt : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  // 🔥 Handlers pour les templates de contrats
  const handleSaveContractTemplate = async (templateToSave) => {
    const isNew = !templateToSave.id;
    
    const result = isNew 
      ? await createTemplate({
          name: templateToSave.name,
          projectType: templateToSave.projectType || 'ACC',
          contentHtml: templateToSave.contentHtml || '',
        })
      : await updateTemplate(templateToSave.id, {
          name: templateToSave.name,
          projectType: templateToSave.projectType,
          contentHtml: templateToSave.contentHtml,
        });

    if (result.success) {
      toast({
        title: "✅ Template enregistré !",
        description: `Le template "${templateToSave.name}" a été sauvegardé.`,
        className: "bg-green-500 text-white"
      });
      setEditingContractTemplate(null);
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible d'enregistrer le template : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  const handleDeactivateContractTemplate = async (templateId) => {
    const result = await deactivateTemplate(templateId);

    if (result.success) {
      toast({
        title: "✅ Template désactivé !",
        description: "Le template a été désactivé.",
        className: "bg-green-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible de désactiver le template : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  const openPromptCreator = prompt => {
    setEditingPrompt(prompt);
    setIsPromptCreatorOpen(true);
  };
  const usersArray = useMemo(() => Object.values(usersByAuthId), [usersByAuthId]);
  const managers = useMemo(() => usersArray.filter(u => u.role === 'Manager' || u.role === 'Admin'), [usersArray]);
  const managerOptions = useMemo(() => [{
    value: 'none',
    label: 'Personne'
  }, ...managers.map(m => ({
    value: m.name,
    label: m.name
  }))], [managers]);
  const allUserOptionsForAccess = useMemo(() => usersArray.filter(u => u.user_id !== editingUser?.user_id).map(u => ({
    value: u.user_id,
    label: u.name
  })), [usersArray, editingUser]);
  const filteredUsers = useMemo(() => usersArray.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5), [usersArray, searchTerm]);
  const handleNewUserChange = (field, value) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleInviteUser = async () => {
    try {
      // Validation des champs
      if (!newUser.name || !newUser.email) {
        toast({
          title: "Champs manquants",
          description: "Veuillez remplir le nom et l'email.",
          variant: "destructive"
        });
        return;
      }

      // 🔒 GUARD BLOQUANT : organization_id requis (ne doit pas arriver si bouton disabled)
      const organizationId = activeAdminUser?.organization_id;
      if (!organizationId) {
        throw new Error("Organization non chargée — invitation bloquée");
      }

      await addUser({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1),
        manager: newUser.manager === 'none' ? '' : newUser.manager,
        phone: newUser.phone || '',
        organizationId, // ✅ Depuis activeAdminUser
        accessRights: {
          modules: ['Pipeline', 'Agenda', 'Contacts'],
          users: []
        }
      });

      // Le toast est déjà affiché dans le hook
      setIsInviteUserOpen(false);
      setNewUser({
        name: '',
        email: '',
        role: 'commercial',
        manager: ''
      });
    } catch (err) {
      logger.error('[InviteUser] error:', err);
      toast({
        title: "Invitation impossible",
        description: err?.message || "Erreur inconnue",
        variant: "destructive",
      });
    }
  };

  const openEditUserDialog = (user) => {
    setEditingUser(user);
    setEditUserData({
      name: user.name || '',
      email: user.email || '',
      password: '' // Mot de passe vide par défaut (optionnel lors de l'édition)
    });
    setIsEditUserOpen(true);
  };

  const handleEditUserChange = (field, value) => {
    setEditUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    
    if (!editUserData.name || !editUserData.email) {
      toast({
        title: "Champs manquants",
        description: "Le nom et l'email sont obligatoires.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updates = {
        name: editUserData.name
      };

      // 🔥 Si l'email a changé, utiliser la fonction RPC pour mettre à jour auth.users + public.users
      if (editUserData.email !== editingUser.email) {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_update_user_email', {
          target_user_id: editingUser.user_id,
          new_email: editUserData.email
        });

        if (rpcError) {
          throw new Error(`Erreur changement email: ${rpcError.message}`);
        }

        toast({
          title: "Email modifié !",
          description: `L'email de connexion a été changé en ${editUserData.email}. L'utilisateur peut maintenant se connecter avec cette adresse.`,
          className: "bg-green-500 text-white",
          duration: 6000,
        });

        // L'email a déjà été mis à jour dans public.users par la RPC, donc pas besoin de le faire deux fois
        updates.email = editUserData.email;
      }

      // Mettre à jour le nom (et l'email si pas déjà fait)
      if (editUserData.email === editingUser.email) {
        updates.email = editUserData.email;
      }
      
      await updateUser(editingUser.id, updates);

      setIsEditUserOpen(false);
      setEditingUser(null);
      setEditUserData({
        name: '',
        email: '',
        password: ''
      });
    } catch (err) {
      logger.error('Erreur modification utilisateur', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de modifier l'utilisateur.",
        variant: "destructive"
      });
    }
  };

  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };
  const isEditingAdmin = editingUser?.role === 'Admin' || editingUser?.role === 'Global Admin';
  return (
    <>
      <style>
        {`
          html {
            scroll-behavior: smooth;
            scroll-padding-top: 100px;
          }
        `}
      </style>
      <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden md:block w-60 bg-white shadow-lg rounded-2xl mr-6 p-6 h-fit sticky top-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Navigation</h3>
        <nav className="space-y-2">
          <button type="button" onClick={() => scrollToSection('info-perso')} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Info perso
          </button>
          {isAdminProfile && (
            <button type="button" onClick={() => scrollToSection('logo-entreprise')} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
              Logo Entreprise
            </button>
          )}
          {isAdminProfile && (
            <button type="button" onClick={() => scrollToSection('info-entreprise')} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
              Informations de l'entreprise
            </button>
          )}
          <button type="button" onClick={() => scrollToSection('gestion-formulaire-contact')} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion du Formulaire Contact
          </button>
          <button type="button" onClick={() => scrollToSection('gestion-pipelines-globales')} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des Pipelines Globales
          </button>
          <button type="button" onClick={() => scrollToSection('gestion-utilisateurs')} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des utilisateurs
          </button>
          <button type="button" onClick={() => scrollToSection('gestion-clients')} className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des clients
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <motion.div className="max-w-5xl mx-auto space-y-8" variants={containerVariants} initial="hidden" animate="visible">
          <motion.h1 variants={itemVariants} className="text-3xl font-bold text-gray-900">Mon Profil</motion.h1>

          <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="info-perso">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Informations personnelles</h2>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" name="name" value={userInfo.name} onChange={handleUserInfoChange} />
                </div>
                <div>
                  <Label htmlFor="email">Email de connexion</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={userInfo.email} 
                    disabled 
                    className="bg-gray-100 cursor-not-allowed" 
                  />
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Pour changer votre email de connexion, contactez un Global Admin
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="phone" name="phone" type="tel" value={userInfo.phone} onChange={handleUserInfoChange} className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role">Rôle</Label>
                  <Input id="role" name="role" value={userInfo.role === 'Admin' ? 'Admin' : userInfo.role === 'Global Admin' ? 'Admin Global (tous les droits)' : userInfo.role} disabled className="bg-gray-100" />
                </div>
              </div>
            </div>

            {/* 🔗 Lien d'affiliation personnel */}
            {(() => {
              const currentUserFull = supabaseUsers.find(u => u.user_id === activeAdminUser?.id || u.email === userInfo.email);
              const affiliateSlug = currentUserFull?.affiliate_slug;
              const affiliateLink = affiliateSlug ? `https://evatime.fr/inscription/${affiliateSlug}` : null;

              if (!affiliateLink) return null;

              return (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Votre lien d'affiliation personnel
                      </Label>
                      <p className="text-xs text-blue-700 mb-3">
                        Partagez ce lien avec vos clients. Quand ils s'inscrivent via ce lien, ils vous seront automatiquement attribués.
                      </p>
                      <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-blue-300">
                        <Input 
                          value={affiliateLink} 
                          readOnly 
                          className="flex-1 font-mono text-sm bg-transparent border-none focus:ring-0 cursor-pointer select-all" 
                          onClick={(e) => e.target.select()}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(affiliateLink).then(() => {
                              toast({
                                title: "✅ Lien copié !",
                                description: "Le lien d'affiliation a été copié dans votre presse-papiers.",
                                className: "bg-green-500 text-white"
                              });
                            }).catch(() => {
                              toast({
                                title: "Erreur",
                                description: "Impossible de copier le lien automatiquement. Copiez-le manuellement.",
                                variant: "destructive"
                              });
                            });
                          }}
                          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-none"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copier
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Changer le mot de passe
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Changer le mot de passe</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="old-password">Ancien mot de passe</Label>
                      <Input id="old-password" type="password" />
                    </div>
                    <div>
                      <Label htmlFor="new-password">Nouveau mot de passe</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Confirmation du nouveau mot de passe</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                handleFeatureClick('Validation mot de passe');
                setIsPasswordDialogOpen(false);
              }} className="bg-green-600 hover:bg-green-700">Valider</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir vous déconnecter de l'espace admin ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAdminLogout} className="bg-red-600 hover:bg-red-700">
                      Se déconnecter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700">Enregistrer les modifications</Button>
            </div>
          </motion.div>
          
          {(isAdmin || isAdminProfile) && <>
              {isAdminProfile && <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="logo-entreprise">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">🏢 Logo Entreprise</h2>
                    <p className="text-sm text-gray-500 mt-1">Ce logo sera affiché dans l'espace client</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {companyLogo && (companyLogo.startsWith('data:') || companyLogo.startsWith('http')) ? (
                    <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <img 
                        src={companyLogo} 
                        alt="Logo de l'entreprise" 
                        className="max-w-xs max-h-48 object-contain rounded-lg shadow-md"
                        onError={(e) => {
                          logger.error('Erreur chargement image', { url: companyLogo });
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => logoInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Remplacer
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Cliquez pour télécharger un logo</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG ou SVG (max. 2MB)</p>
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </motion.div>}
              
              {/* 🏢 Bloc Informations de l'entreprise - Édition du nom uniquement */}
              {isAdminProfile && <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="info-entreprise">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">🏢 Informations de l'entreprise</h2>
                <p className="text-sm text-gray-500 mt-1">Modifiez le nom de votre entreprise</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="org-name">Nom de l'entreprise</Label>
                  <div className="flex gap-3 mt-1">
                    <Input 
                      id="org-name" 
                      value={organizationName} 
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Nom de votre entreprise"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleUpdateOrganizationName}
                      disabled={isUpdatingOrgName}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isUpdatingOrgName ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>}

            <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-formulaire-contact">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    🧩 Gestion du Formulaire Contact
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Ajoutez, modifiez et réorganisez les champs du formulaire de création de contact.
                  </p>
                </div>
                <Button onClick={() => openFieldEditor(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Ajouter un champ
                </Button>
              </div>

              <DragDropContext onDragEnd={handleFormFieldsDragEnd}>
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {formContactConfig.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab text-gray-400">
                                <GripVertical />
                              </div>
                              <div className="flex-grow">
                                <p className="font-medium">{field.name}{field.required && <span className="text-red-500">*</span>}</p>
                                <p className="text-sm text-gray-500">
                                  Type: {field.type} | Placeholder: {field.placeholder || 'Aucun'}
                                  {field.type === 'select' && field.options && field.options.length > 0 && (
                                    <span className="ml-2 text-blue-600">
                                      ({field.options.length} option{field.options.length > 1 ? 's' : ''}: {field.options.join(', ')})
                                    </span>
                                  )}
                                </p>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => openFieldEditor(field)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer le champ "{field.name}" ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteField(field.id)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-pipelines-globales">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">
                    🛠️ Gestion des Pipelines Globales
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Visualisez et organisez les variantes de pipeline auxquelles l’équipe pourra accéder prochainement.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                  <Label htmlFor="new-pipeline-step" className="text-gray-700 font-medium">Ajouter un type d'étape</Label>
                  <div className="mt-3 flex flex-col sm:flex-row gap-3">
                    <Input
                      id="new-pipeline-step"
                      value={newPipelineStep}
                      onChange={(e) => setNewPipelineStep(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPipelineStep();
                        }
                      }}
                      placeholder="Ex. MARKET, ETUDE, OFFRE..."
                      className="uppercase tracking-wide"
                    />
                    <Button
                      type="button"
                      onClick={handleAddPipelineStep}
                      disabled={!newPipelineStep.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Ajouter
                    </Button>
                  </div>
                  <div className="mt-4">
                    {globalPipelineSteps.length > 0 ? (
                      <DragDropContext onDragEnd={handlePipelineDragEnd}>
                        <Droppable droppableId="global-pipeline-steps">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="space-y-2"
                            >
                              {globalPipelineSteps.map((step, index) => (
                                <Draggable key={step.id} draggableId={step.id} index={index}>
                                  {(provided, snapshot) => (
                                    <PipelineStepCard
                                      step={step}
                                      index={index}
                                      provided={provided}
                                      snapshot={snapshot}
                                      onColorChange={(value) => handleChangePipelineStepColor(step.id, value)}
                                      onEdit={() => openPipelineStepEditor(step)}
                                      onRemove={() => handleRemovePipelineStep(step.id)}
                                    />
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Aucune étape définie pour le moment. Ajoutez-en pour structurer vos pipelines globaux.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <Dialog open={isPipelineStepEditorOpen} onOpenChange={handlePipelineStepEditorOpenChange}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Renommer le type d'étape</DialogTitle>
                  <DialogDescription>
                    Personnalisez le libellé affiché pour cette étape globale. Utilisez un intitulé court et explicite (ex. OFFRE, CLOTURE, RELANCE).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Label htmlFor="pipeline-step-draft">Libellé de l'étape</Label>
                  <Input
                    id="pipeline-step-draft"
                    value={pipelineStepDraft}
                    onChange={(e) => setPipelineStepDraft(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSavePipelineStep();
                      }
                    }}
                    placeholder="Ex. CLOTURE"
                    className="uppercase tracking-wide"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => handlePipelineStepEditorOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSavePipelineStep} className="bg-blue-600 hover:bg-blue-700">
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>


              <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-utilisateurs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <h2 className="text-xl font-semibold text-gray-800">Gestion des utilisateurs</h2>
                  <Dialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">Inviter un utilisateur</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Inviter un nouvel utilisateur</DialogTitle>
                        <DialogDescription>
                          L'utilisateur recevra un email pour créer son mot de passe et activer son compte.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 px-6">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="invite-nom" className="text-right col-span-1">Nom</Label>
                          <Input id="invite-nom" className="col-span-3" value={newUser.name} onChange={e => handleNewUserChange('name', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="invite-email" className="text-right col-span-1">Email</Label>
                          <Input id="invite-email" type="email" className="col-span-3" value={newUser.email} onChange={e => handleNewUserChange('email', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="invite-role" className="text-right col-span-1">Rôle</Label>
                          <Select value={newUser.role} onValueChange={value => handleNewUserChange('role', value)}>
                            <SelectTrigger id="invite-role" className="col-span-3">
                              <SelectValue placeholder="Commercial" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="invite-manager" className="text-right col-span-1">Manager</Label>
                          <div className="col-span-3">
                            <SearchableSelect options={managerOptions} value={newUser.manager} onSelect={value => handleNewUserChange('manager', value)} placeholder="Sélectionner..." searchPlaceholder="Rechercher un manager..." emptyText="Aucun manager trouvé." />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="px-6 pb-4">
                        {!isOrganizationReady && (
                          <p className="text-sm text-muted-foreground mr-auto">
                            Chargement de l'organisation…
                          </p>
                        )}
                        <Button 
                          onClick={handleInviteUser} 
                          disabled={!isOrganizationReady}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Envoyer une invitation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Dialog pour éditer un utilisateur existant */}
                <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Modifier l'utilisateur</DialogTitle>
                      <DialogDescription>
                        Modifiez le nom de {editingUser?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 px-6">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-nom" className="text-right col-span-1">Nom</Label>
                        <Input 
                          id="edit-nom" 
                          className="col-span-3" 
                          value={editUserData.name} 
                          onChange={e => handleEditUserChange('name', e.target.value)} 
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-email" className="text-right col-span-1">Email</Label>
                        <div className="col-span-3 space-y-1">
                          <Input 
                            id="edit-email" 
                            type="email" 
                            value={editUserData.email} 
                            onChange={e => handleEditUserChange('email', e.target.value)}
                          />
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Attention : Changer l'email modifie l'identifiant de connexion de l'utilisateur
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right col-span-1">Mot de passe</Label>
                        <div className="col-span-3 space-y-1">
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-800 flex items-start gap-2">
                              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Pour réinitialiser le mot de passe de cet utilisateur, envoyez-lui un lien "Mot de passe oublié" ou demandez-lui de le faire depuis la page de connexion.</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="px-6 pb-4">
                      <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Annuler</Button>
                      <Button onClick={handleSaveEditUser} className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="mb-4">
                  <Input type="text" placeholder="Rechercher par nom ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3">Nom</th>
                        <th scope="col" className="px-6 py-3">Email</th>
                        <th scope="col" className="px-6 py-3">Rôle</th>
                        <th scope="col" className="px-6 py-3">Manager</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                        <th scope="col" className="px-6 py-3">Droits d'accès</th>
                        <th scope="col" className="px-6 py-3">Lien d'affiliation</th>
                        <th scope="col" className="px-6 py-3">Supprimer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{user.name}</td>
                          <td className="px-6 py-4">{user.email}</td>
                          <td className="px-6 py-4">{user.role}</td>
                          <td className="px-6 py-4">{user.manager || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditUserDialog(user)}>Modifier</Button>
                              <Button variant="outline" size="sm" onClick={() => openChangeRoleDialog(user)} disabled={user.role === 'Admin' || user.role === 'Global Admin'}>Changer le rôle</Button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Button variant="outline" size="sm" onClick={() => openAccessRightsDialog(user)}>Modifier droits</Button>
                          </td>
                          <td className="px-6 py-4">
                            <Button variant="outline" size="sm" onClick={() => handleCopyLink(user)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copier le lien
                            </Button>
                          </td>
                          <td className="px-6 py-4">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={user.role === 'Admin' || user.role === 'Global Admin'}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Voulez-vous vraiment supprimer {user.name} ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. Tous les contacts de cet utilisateur seront réassignés à son manager ({user.manager || 'Admin'}).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Changer le rôle de {editingUser?.name}</DialogTitle>
                    <DialogDescription>
                      Sélectionnez un nouveau rôle et assignez un manager pour cet utilisateur.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 px-6">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="change-role-select" className="text-right col-span-1">
                        Rôle
                      </Label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger id="change-role-select" className="col-span-3">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="change-manager-select" className="text-right col-span-1">
                        Manager
                      </Label>
                      <div className="col-span-3">
                        <SearchableSelect options={managerOptions.filter(m => m.value !== editingUser?.name)} value={selectedManager} onSelect={setSelectedManager} placeholder="Sélectionner..." searchPlaceholder="Rechercher un manager..." emptyText="Aucun manager trouvé." />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="px-6 pb-4">
                    <Button onClick={handleChangeRole} className="bg-green-600 hover:bg-green-700">Valider</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAccessRightsOpen} onOpenChange={setIsAccessRightsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Droits d’accès de {editingUser?.name}</DialogTitle>
                        {isEditingAdmin && <DialogDescription>Les administrateurs ont accès à tout par défaut.</DialogDescription>}
                    </DialogHeader>
                    <div className="space-y-6 p-6">
                        <div>
                            <Label className="font-semibold">Accès aux données d’autres utilisateurs</Label>
                            <MultiSelectSearch options={allUserOptionsForAccess} selected={accessRights.users} onChange={selected => setAccessRights(prev => ({
                ...prev,
                users: selected
              }))} placeholder="Sélectionner des utilisateurs..." searchPlaceholder="Rechercher un utilisateur..." emptyText="Aucun utilisateur trouvé." className="mt-2" disabled={isEditingAdmin} showSelectAll={!isEditingAdmin} selectAllText="Tout le monde" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAccessRightsOpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveAccessRights} disabled={isEditingAdmin}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>

              <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-clients">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Gestion des clients</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3">Nom</th>
                        <th scope="col" className="px-6 py-3">Email</th>
                        <th scope="col" className="px-6 py-3">Projet</th>
                        <th scope="col" className="px-6 py-3">Statut</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td colSpan="5" className="px-6 py-10 text-center text-gray-400">
                          La gestion des clients sera bientôt disponible ici.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>}

          <CreateProjectDialog open={isCreateProjectOpen} onOpenChange={setCreateProjectOpen} onSave={handleSaveProject} globalPipelineSteps={globalPipelineSteps} />

          <Dialog open={!!editingProject} onOpenChange={isOpen => !isOpen && setEditingProject(null)}>
              <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>Modifier le projet "{editingProject?.title}"</DialogTitle>
                  </DialogHeader>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                      {editingProject && (
                        <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>}>
                          <ProjectEditor project={editingProject} onSave={handleSaveProject} onCancel={() => setEditingProject(null)} globalPipelineSteps={globalPipelineSteps} />
                        </Suspense>
                      )}
                  </div>
              </DialogContent>
          </Dialog>

          <Dialog open={!!editingForm} onOpenChange={isOpen => !isOpen && setEditingForm(null)}>
              <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>{editingForm?.id ? `Modifier le formulaire "${editingForm.name}"` : 'Créer un nouveau formulaire'}</DialogTitle>
                  </DialogHeader>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                      {editingForm && <FormEditor form={editingForm} onSave={handleSaveForm} onCancel={() => setEditingForm(null)} />}
                  </div>
              </DialogContent>
          </Dialog>

          {/* Modal Template de Contrat */}
          <Dialog open={!!editingContractTemplate} onOpenChange={isOpen => !isOpen && setEditingContractTemplate(null)}>
              <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                      <DialogTitle>
                          {editingContractTemplate?.id 
                              ? `Modifier le template "${editingContractTemplate.name}"` 
                              : 'Créer un nouveau template de contrat'}
                      </DialogTitle>
                  </DialogHeader>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                      <div>
                          <Label htmlFor="template-name">Nom du template</Label>
                          <Input 
                              id="template-name"
                              value={editingContractTemplate?.name || ''}
                              onChange={(e) => setEditingContractTemplate(prev => ({
                                  ...prev,
                                  name: e.target.value
                              }))}
                              placeholder="Ex: Contrat ACC Standard"
                          />
                      </div>
                      
                      <div>
                          <Label htmlFor="template-project-type">Type de projet</Label>
                          <Select 
                              value={editingContractTemplate?.projectType || 'ACC'}
                              onValueChange={(value) => setEditingContractTemplate(prev => ({
                                  ...prev,
                                  projectType: value
                              }))}
                          >
                              <SelectTrigger id="template-project-type">
                                  <SelectValue placeholder="Sélectionner un type" />
                              </SelectTrigger>
                              <SelectContent>
                                  {projectOptions.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div>
                          <Label htmlFor="template-content">Contenu HTML</Label>
                          <Textarea 
                              id="template-content"
                              value={editingContractTemplate?.contentHtml || ''}
                              onChange={(e) => setEditingContractTemplate(prev => ({
                                  ...prev,
                                  contentHtml: e.target.value
                              }))}
                              placeholder="Entrez le contenu HTML du contrat..."
                              rows={12}
                              className="font-mono text-sm"
                          />
                      </div>
                  </div>
                  <DialogFooter className="px-6 pb-4">
                      <Button 
                          variant="outline" 
                          onClick={() => setEditingContractTemplate(null)}
                      >
                          Annuler
                      </Button>
                      <Button 
                          variant="secondary"
                          onClick={() => setIsPreviewTemplateOpen(true)}
                          disabled={!editingContractTemplate?.contentHtml}
                      >
                          👁️ Visualiser
                      </Button>
                      <Button 
                          onClick={() => handleSaveContractTemplate(editingContractTemplate)}
                          className="bg-purple-600 hover:bg-purple-700"
                      >
                          Enregistrer
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>

          {/* Modal Prévisualisation Template */}
          <Dialog open={isPreviewTemplateOpen} onOpenChange={setIsPreviewTemplateOpen}>
              <DialogContent className="sm:max-w-5xl max-h-[90vh]">
                  <DialogHeader>
                      <DialogTitle>
                          Prévisualisation : {editingContractTemplate?.name || 'Template'}
                      </DialogTitle>
                      <DialogDescription>
                          Aperçu du rendu HTML du template de contrat
                      </DialogDescription>
                  </DialogHeader>
                  <div className="p-6 max-h-[70vh] overflow-y-auto bg-white border rounded-lg">
                      <div 
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: editingContractTemplate?.contentHtml || '' }}
                      />
                  </div>
                  <DialogFooter className="px-6 pb-4">
                      <Button 
                          onClick={() => setIsPreviewTemplateOpen(false)}
                      >
                          Fermer
                      </Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
          
          <PromptCreatorDialog open={isPromptCreatorOpen} onOpenChange={setIsPromptCreatorOpen} onSave={handleSavePrompt} existingPrompt={editingPrompt} />
        
          <Dialog open={isFieldEditorOpen} onOpenChange={setIsFieldEditorOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingField ? 'Modifier le champ' : 'Ajouter un champ'}</DialogTitle>
              </DialogHeader>
              <FormFieldEditor
                field={editingField}
                onSave={handleSaveField}
                onCancel={() => {
                  setIsFieldEditorOpen(false);
                  setEditingField(null);
                }}
              />
            </DialogContent>
          </Dialog>

        </motion.div>
      </div>
    </div>
    </>
  );
};

export default ProfilePage;
