import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DialogFooter } from '@/components/ui/dialog';
import { useAppContext } from '@/App';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Trash2, Plus, FileText } from 'lucide-react';
import MultiSelectSearch from '@/components/ui/MultiSelectSearch';
import { useSupabaseForms } from '@/hooks/useSupabaseForms';
import { logger } from '@/lib/logger';

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

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="form-name">Nom du formulaire (Interne)</Label>
        <Input 
          id="form-name" 
          value={editedForm.name} 
          onChange={e => setEditedForm(prev => ({
            ...prev,
            name: e.target.value
          }))} 
        />
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
        <MultiSelectSearch 
          options={projectOptions} 
          selected={selectedProjects} 
          onChange={selected => setEditedForm(prev => ({
            ...prev,
            projectIds: selected.map(s => s.value)
          }))} 
          placeholder="Sélectionner des projets..." 
          searchPlaceholder="Rechercher un projet..." 
          emptyText="Aucun projet trouvé." 
          className="mt-1" 
        />
      </div>

      <h3 className="text-md font-semibold text-gray-700 pt-4 border-t">Champs du formulaire</h3>
      <div className="space-y-3">
        {(editedForm.fields || []).map((field, index) => (
          <div key={field.id} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <Input 
                value={field.label} 
                onChange={e => handleFieldChange(index, 'label', e.target.value)} 
                placeholder="Nom du champ" 
              />
              <Select 
                value={field.type} 
                onValueChange={value => handleFieldChange(index, 'type', value)}
              >
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
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 pt-4 border-t">
        <div className="flex-grow">
          <Label>Ajouter un champ</Label>
          <div className="flex gap-2">
            <Input 
              value={newFieldName} 
              onChange={e => setNewFieldName(e.target.value)} 
              placeholder="Nom du nouveau champ" 
            />
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Enregistrer le formulaire</Button>
      </div>
    </div>
  );
};

const FormsManagementPage = () => {
  const location = useLocation();
  const { projectsData } = useAppContext();
  const { organizationId } = useOrganization();  // 🔥 Multi-tenant
  
  const {
    forms: supabaseForms,
    loading: formsLoading,
    saveForm: saveFormToSupabase,
    deleteForm: deleteFormFromSupabase
  } = useSupabaseForms(organizationId);  // 🔥 Passer organizationId !

  // 🔥 Forcer React à re-render quand supabaseForms change
  const forms = useMemo(() => {
    return supabaseForms;
  }, [supabaseForms]);

  const [editingForm, setEditingForm] = useState(null);

  // 🔥 NOUVEAU : Récupérer le formulaire pré-rempli depuis le state de navigation
  useEffect(() => {
    const prefilledForm = location.state?.prefilledForm;
    if (prefilledForm) {
      setEditingForm(prefilledForm);
      
      toast({
        title: "📋 Formulaire pré-rempli",
        description: `${prefilledForm.fields.length} champs détectés depuis le template. Vous pouvez les ajuster avant de sauvegarder.`,
        className: "bg-blue-500 text-white",
        duration: 5000
      });
      
      // Nettoyer le state pour éviter de ré-ouvrir si on rafraîchit
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSaveForm = async (formToSave) => {
    // Générer un ID unique si nouveau formulaire
    const formId = formToSave.id || `form-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const result = await saveFormToSupabase(formId, {
      name: formToSave.name,
      fields: formToSave.fields || [],
      projectIds: formToSave.projectIds || [],
      audience: formToSave.audience || 'client', // 🔥 Audience par défaut 'client'
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

  const openFormEditor = form => {
    setEditingForm(form);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 p-6">
      {/* Colonne gauche - Liste des formulaires */}
      <div className="w-[25%] flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-card h-full flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Gestion des Formulaires</h2>
            <Button 
              onClick={() => setEditingForm({
                name: '',
                fields: [],
                projectIds: []
              })} 
              className="bg-teal-600 hover:bg-teal-700 w-full"
            >
              <Plus className="mr-2 h-4 w-4" /> Créer un formulaire
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {formsLoading ? (
              <div className="text-center text-gray-500 py-8">Chargement...</div>
            ) : Object.values(forms).length > 0 ? Object.values(forms).map(f => (
              <div 
                key={`${f.id}-${f.name}-${f.updatedAt || f.createdAt}`} 
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  editingForm?.id === f.id 
                    ? 'bg-teal-50 border-2 border-teal-500' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => openFormEditor(f)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-gray-500">
                      {f.audience === 'internal' ? '🔒 Interne' : '👤 Client'} • {(f.fields || []).length} champs
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer "{f.name}" ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteForm(f.id)} 
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Aucun formulaire créé. Cliquez sur le bouton pour en ajouter un.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonne droite - Éditeur de formulaire détaillé */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {editingForm ? (editingForm.id ? `Modifier "${editingForm.name}"` : "Créer un nouveau formulaire") : "Sélectionnez un formulaire"}
            </h2>
            <p className="text-sm text-gray-500">
              {editingForm 
                ? "Configurez les champs, les conditions d'affichage et les projets associés." 
                : "Cliquez sur un formulaire dans la liste pour le modifier."}
            </p>
          </div>

          {editingForm ? (
            <FormEditor 
              form={editingForm} 
              onSave={handleSaveForm} 
              onCancel={() => setEditingForm(null)} 
            />
          ) : (
            <div className="text-center py-20 text-gray-400">
              <FileText className="mx-auto h-20 w-20 mb-4" />
              <p className="text-lg">Sélectionnez un formulaire à modifier</p>
              <p className="text-sm mt-2">ou créez-en un nouveau</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormsManagementPage;
