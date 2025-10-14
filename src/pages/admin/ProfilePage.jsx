import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { useAppContext } from '@/App';
import { Trash2, Copy, Phone, Plus, GripVertical, Building, Upload, FileText, Bot, ChevronDown, ChevronRight, Edit, Image as ImageIcon } from 'lucide-react';
import { slugify } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Textarea } from '@/components/ui/textarea';

const FormFieldEditor = ({ field, onSave, onCancel }) => {
  const [editedField, setEditedField] = useState(
    field ? { ...field } : { name: '', type: 'text', placeholder: '', required: false }
  );

  const handleSave = () => {
    if (!editedField.name) {
      toast({ title: "Le nom du champ est obligatoire", variant: "destructive" });
      return;
    }
    onSave({ ...editedField, id: editedField.id || `field-${Date.now()}` });
  };

  return (
    <div className="space-y-4">
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
            <SelectItem value="number">Nombre</SelectItem>
            <SelectItem value="textarea">Zone de texte</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
                    <Label>Projets associés</Label>
                    <MultiSelectSearch options={projectOptions} selected={selectedProjects} onChange={selected => setEditedForm(prev => ({
        ...prev,
        projectIds: selected.map(s => s.value)
      }))} placeholder="Sélectionner des projets..." searchPlaceholder="Rechercher un projet..." emptyText="Aucun projet trouvé." className="mt-1" />
                </div>

                <h3 className="text-md font-semibold text-gray-700 pt-4 border-t">Champs du formulaire</h3>
                <div className="space-y-3">
                    {(editedForm.fields || []).map((field, index) => <div key={field.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
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
                                    <SelectItem value="file">Fichier</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeField(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
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
  onCancel
}) => {
  const [editedProject, setEditedProject] = useState(project ? JSON.parse(JSON.stringify(project)) : {
    type: '',
    title: '',
    clientTitle: '',
    icon: '🆕',
    color: 'gradient-blue',
    steps: [],
    isPublic: true
  });
  const [newStepName, setNewStepName] = useState('');
  const [newStepIcon, setNewStepIcon] = useState('➡️');
  const handleStepChange = (index, field, value) => {
    const newSteps = [...editedProject.steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value
    };
    setEditedProject(prev => ({
      ...prev,
      steps: newSteps
    }));
  };
  const addStep = () => {
    if (!newStepName.trim()) return;
    const newStep = {
      name: newStepName,
      status: 'pending',
      icon: newStepIcon,
      descriptions: {}
    };
    setEditedProject(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    setNewStepName('');
    setNewStepIcon('➡️');
  };
  const removeStep = index => {
    const newSteps = editedProject.steps.filter((_, i) => i !== index);
    setEditedProject(prev => ({
      ...prev,
      steps: newSteps
    }));
  };
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
  const handleSave = () => {
    const finalProject = {
      ...editedProject,
      type: editedProject.type || slugify(editedProject.title),
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
                        <Input id="project-icon" value={editedProject.icon} onChange={e => setEditedProject(prev => ({
          ...prev,
          icon: e.target.value
        }))} />
                    </div>
                </div>

                <h3 className="text-md font-semibold text-gray-700 pt-4 border-t">Étapes de la Timeline</h3>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="steps">
                        {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                {editedProject.steps.map((step, index) => <Draggable key={index} draggableId={String(index)} index={index}>
                                        {provided => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                                                <GripVertical className="h-5 w-5 text-gray-400" />
                                                <Input value={step.icon} onChange={e => handleStepChange(index, 'icon', e.target.value)} className="w-16 text-center" />
                                                <Input value={step.name} onChange={e => handleStepChange(index, 'name', e.target.value)} />
                                                <Button variant="ghost" size="icon" onClick={() => removeStep(index)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>}
                                    </Draggable>)}
                                {provided.placeholder}
                            </div>}
                    </Droppable>
                </DragDropContext>

                <div className="flex items-end gap-2 pt-4 border-t">
                    <div className="flex-grow">
                        <Label>Ajouter une étape</Label>
                        <div className="flex gap-2">
                           <Input value={newStepIcon} onChange={e => setNewStepIcon(e.target.value)} className="w-16 text-center" placeholder="➡️" />
                           <Input value={newStepName} onChange={e => setNewStepName(e.target.value)} placeholder="Nom de la nouvelle étape" />
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
  onSave
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
        descriptions: {}
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
                            <ProjectEditor project={project} onSave={handleSaveProject} onCancel={handleCancel} />
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
  return <div className="p-4 bg-white rounded-lg border space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-grow">
                        <Label>Message à dire</Label>
                        <Textarea placeholder="Ex: Bonjour, merci de compléter les informations..." value={action.message} onChange={e => handleActionChange('message', e.target.value)} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="ml-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
                </AnimatePresence>
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
      type: 'none'
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
                                                                    Quand ce formulaire est complété, passer automatiquement cette étape en “Terminée” et activer la suivante.
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
    users,
    updateUsers,
    deleteUser,
    projectsData,
    setProjectsData,
    forms,
    setForms,
    prompts,
    setPrompts,
    formContactConfig,
    setFormContactConfig,
    activeAdminUser
  } = useAppContext();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isAccessRightsOpen, setIsAccessRightsOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [accessRights, setAccessRights] = useState({
    modules: [],
    users: []
  });
  const [isCreateProjectOpen, setCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    logo: null,
    address: '',
    city: '',
    zip: '',
    country: ''
  });
  const [companies, setCompanies] = useState([]);
  const [editingForm, setEditingForm] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [isPromptCreatorOpen, setIsPromptCreatorOpen] = useState(false);
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
    password: '',
    role: 'commercial',
    manager: ''
  });
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const isGlobalAdmin = activeAdminUser?.role === 'Global Admin';
  const isAdmin = activeAdminUser?.role === 'Admin';
  
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

  const handleDragEnd = (result) => {
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
  const handleSaveDisplayData = () => {
    if (!selectedProjectForDisplay) return;
    const updatedProject = {
      ...projectsData[selectedProjectForDisplay],
      ...projectDisplayData
    };
    const newProjectsData = {
      ...projectsData,
      [selectedProjectForDisplay]: updatedProject
    };
    setProjectsData(newProjectsData);
    toast({
      title: "Modifications enregistrées !",
      description: `L'affichage du projet "${projectsData[selectedProjectForDisplay].title}" a été mis à jour.`,
      className: "bg-green-500 text-white"
    });
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
  const handleSaveChanges = () => {
    if(!activeAdminUser) return;
    
    const updatedUser = { ...activeAdminUser, ...userInfo };
    const updatedUsers = { ...users, [activeAdminUser.id]: updatedUser };
    updateUsers(updatedUsers);

    toast({
      title: "Modifications enregistrées",
      description: "Vos informations personnelles ont été mises à jour.",
      className: "bg-green-500 text-white"
    });
  };
  const handleFeatureClick = featureName => {
    toast({
      title: `🚧 ${featureName}`,
      description: "Cette fonctionnalité n'est pas encore implémentée. Demandez-la dans votre prochain prompt ! 🚀"
    });
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
    const allUserOptions = Object.values(users).filter(u => u.id !== user.id).map(u => ({
      value: u.id,
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
      const selectedUsers = (userAccessRights.users || []).map(userId => {
        const foundUser = users[userId];
        return foundUser ? {
          value: foundUser.id,
          label: foundUser.name
        } : null;
      }).filter(Boolean);
      setAccessRights({
        modules: userAccessRights.modules || ['Pipeline', 'Agenda', 'Contacts'],
        users: selectedUsers
      });
    }
    setIsAccessRightsOpen(true);
  };
  const handleSaveAccessRights = () => {
    if (!editingUser || editingUser.role === 'Admin' || editingUser.role === 'Global Admin') {
      setIsAccessRightsOpen(false);
      return;
    }
    
    const updatedUsers = {
      ...users
    };
    updatedUsers[editingUser.id] = {
      ...editingUser,
      accessRights: {
        modules: accessRights.modules,
        users: accessRights.users.map(u => u.value)
      }
    };
    updateUsers(updatedUsers);
    toast({
      title: "Droits d'accès modifiés !",
      description: `Les droits de ${editingUser.name} ont été mis à jour.`,
      className: "bg-green-500 text-white"
    });
    setIsAccessRightsOpen(false);
    setEditingUser(null);
  };
  const handleAccessModuleChange = (moduleName, checked) => {
    setAccessRights(prev => {
      const newModules = checked ? [...prev.modules, moduleName] : prev.modules.filter(m => m !== moduleName);
      return {
        ...prev,
        modules: newModules
      };
    });
  };
  const handleChangeRole = () => {
    if (!editingUser) return;
    const updatedUsers = {
      ...users
    };
    updatedUsers[editingUser.id] = {
      ...editingUser,
      role: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1),
      manager: selectedManager === 'none' ? '' : selectedManager
    };
    updateUsers(updatedUsers);
    toast({
      title: "Rôle modifié !",
      description: `Le rôle de ${editingUser.name} a été mis à jour.`,
      className: "bg-green-500 text-white"
    });
    setIsChangeRoleOpen(false);
    setEditingUser(null);
  };
  const handleDeleteUser = userToDelete => {
    deleteUser(userToDelete.id);
    toast({
      title: "Utilisateur supprimé",
      description: `${userToDelete.name} a été supprimé et ses contacts ont été réassignés.`,
      className: "bg-green-500 text-white"
    });
  };
  const handleCopyLink = user => {
    const slug = slugify(user.name);
    const link = `https://locasun.io/${slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Lien copié !",
      className: "bg-green-500 text-white"
    });
  };
  const handleSaveProject = projectToSave => {
    const newProjectsData = {
      ...projectsData,
      [projectToSave.type]: projectToSave
    };
    setProjectsData(newProjectsData);
    toast({
      title: "Projet enregistré !",
      description: `Le projet "${projectToSave.title}" a été sauvegardé.`,
      className: "bg-green-500 text-white"
    });
    setEditingProject(null);
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
  const handleDeleteProject = projectType => {
    const {
      [projectType]: _,
      ...remainingProjects
    } = projectsData;
    setProjectsData(remainingProjects);
    toast({
      title: "Projet supprimé !",
      className: "bg-green-500 text-white"
    });
  };
  const handleCreateCompany = () => {
    if (!newCompany.name) {
      toast({
        title: "Nom manquant",
        description: "Veuillez nommer votre entreprise.",
        variant: "destructive"
      });
      return;
    }
    const company = {
      id: `company-${Date.now()}`,
      ...newCompany
    };
    setCompanies([...companies, company]);
    toast({
      title: "Entreprise créée !",
      description: `L'entreprise "${company.name}" a été créée. Un espace de travail vierge est prêt.`,
      className: "bg-green-500 text-white"
    });
    setIsCreateCompanyOpen(false);
    setNewCompany({
      name: '',
      logo: null,
      address: '',
      city: '',
      zip: '',
      country: ''
    });
  };
  const handleNewCompanyChange = (field, value) => {
    setNewCompany(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSaveForm = formToSave => {
    const newForms = {
      ...forms,
      [formToSave.id]: formToSave
    };
    setForms(newForms);
    toast({
      title: "Formulaire enregistré !",
      description: `Le formulaire "${formToSave.name}" a été sauvegardé.`,
      className: "bg-green-500 text-white"
    });
    setEditingForm(null);
  };
  const handleDeleteForm = formId => {
    const {
      [formId]: _,
      ...remainingForms
    } = forms;
    setForms(remainingForms);
    toast({
      title: "Formulaire supprimé !",
      className: "bg-green-500 text-white"
    });
  };
  const handleSavePrompt = promptToSave => {
    setPrompts({
      ...prompts,
      [promptToSave.id]: promptToSave
    });
    toast({
      title: "Prompt enregistré !",
      description: `Le prompt "${promptToSave.name}" a été sauvegardé.`,
      className: "bg-green-500 text-white"
    });
    setEditingPrompt(null);
    setIsPromptCreatorOpen(false);
  };
  const handleDeletePrompt = promptId => {
    const {
      [promptId]: _,
      ...remainingPrompts
    } = prompts;
    setPrompts(remainingPrompts);
    toast({
      title: "Prompt supprimé !",
      className: "bg-green-500 text-white"
    });
  };
  const openPromptCreator = prompt => {
    setEditingPrompt(prompt);
    setIsPromptCreatorOpen(true);
  };
  const usersArray = useMemo(() => Object.values(users), [users]);
  const managers = useMemo(() => usersArray.filter(u => u.role === 'Manager' || u.role === 'Admin'), [usersArray]);
  const managerOptions = useMemo(() => [{
    value: 'none',
    label: 'Personne'
  }, ...managers.map(m => ({
    value: m.name,
    label: m.name
  }))], [managers]);
  const allUserOptionsForAccess = useMemo(() => usersArray.filter(u => u.id !== editingUser?.id).map(u => ({
    value: u.id,
    label: u.name
  })), [usersArray, editingUser]);
  const filteredUsers = useMemo(() => usersArray.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5), [usersArray, searchTerm]);
  const handleNewUserChange = (field, value) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleInviteUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }
    const newUserId = `user-${Date.now()}`;
    const newUserObject = {
      id: newUserId,
      ...newUser,
      name: `${newUser.name}`,
      role: newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1),
      manager: newUser.manager === 'none' ? '' : newUser.manager,
      accessRights: {
        modules: ['Pipeline', 'Agenda', 'Contacts'],
        users: []
      }
    };
    const updatedUsers = {
      ...users,
      [newUserId]: newUserObject
    };
    updateUsers(updatedUsers);
    toast({
      title: "Utilisateur invité !",
      description: `${newUser.name} a été ajouté à la liste.`,
      className: "bg-green-500 text-white"
    });
    setIsInviteUserOpen(false);
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: 'commercial',
      manager: ''
    });
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
          <a href="#info-perso" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Info perso
          </a>
          <a href="#gestion-entreprises" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des Entreprises
          </a>
          <a href="#gestion-formulaire-contact" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion du Formulaire Contact
          </a>
          <a href="#gestion-projets" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des Projets
          </a>
          <a href="#gestion-formulaires" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des Formulaires
          </a>
          <a href="#gestion-affichage-projets" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion de l'Affichage des Projets
          </a>
          <a href="#creation-prompt" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Création de Prompt
          </a>
          <a href="#gestion-utilisateurs" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des utilisateurs
          </a>
          <a href="#gestion-clients" className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Gestion des clients
          </a>
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
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={userInfo.email} onChange={handleUserInfoChange} />
                </div>
              </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-4">
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Changer le mot de passe</Button>
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
              <Button onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700">Enregistrer les modifications</Button>
            </div>
          </motion.div>
          
          {(isAdmin || isGlobalAdmin) && <>
              {isGlobalAdmin && <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-entreprises">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h2 className="text-xl font-semibold text-gray-800">Gestion des Entreprises</h2>
                <Dialog open={isCreateCompanyOpen} onOpenChange={setIsCreateCompanyOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" /> Créer une entreprise
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company-name" className="text-right">Nom</Label>
                        <Input id="company-name" className="col-span-3" value={newCompany.name} onChange={e => handleNewCompanyChange('name', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company-logo" className="text-right">Logo</Label>
                        <div className="col-span-3">
                          <Button asChild variant="outline">
                            <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              <span>{newCompany.logo ? newCompany.logo.name : 'Choisir un fichier'}</span>
                              <input id="logo-upload" type="file" className="hidden" onChange={e => handleNewCompanyChange('logo', e.target.files[0])} />
                            </label>
                          </Button>
                        </div>
                      </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company-address" className="text-right">Adresse</Label>
                        <Input id="company-address" className="col-span-3" value={newCompany.address} onChange={e => handleNewCompanyChange('address', e.target.value)} />
                      </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company-zip" className="text-right">Code Postal</Label>
                        <Input id="company-zip" className="col-span-3" value={newCompany.zip} onChange={e => handleNewCompanyChange('zip', e.target.value)} />
                      </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="company-city" className="text-right">Ville</Label>
                        <Input id="company-city" className="col-span-3" value={newCompany.city} onChange={e => handleNewCompanyChange('city', e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateCompany} className="bg-purple-600 hover:bg-purple-700">Créer l'entreprise</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-3">
                {companies.map(c => <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Building className="h-6 w-6 text-gray-500" />
                        <span className="font-medium">{c.name}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleFeatureClick('Gestion utilisateurs entreprise')}>Gérer les utilisateurs</Button>
                  </div>)}
                {companies.length === 0 && <p className="text-center text-gray-500 py-4">Aucune entreprise créée pour le moment.</p>}
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

              <DragDropContext onDragEnd={handleDragEnd}>
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
                                <p className="text-sm text-gray-500">Type: {field.type} | Placeholder: {field.placeholder || 'Aucun'}</p>
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-projets">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                        <h2 className="text-xl font-semibold text-gray-800">Gestion des Projets</h2>
                        <Button onClick={() => setCreateProjectOpen(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Créer un projet
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {Object.values(projectsData).map(p => <div key={p.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{p.icon}</span>
                                    <span className="font-medium">{p.title}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch id={`publish-${p.type}`} checked={p.isPublic} onCheckedChange={checked => handleToggleProjectVisibility(p.type, checked)} />
                                        <Label htmlFor={`publish-${p.type}`}>En ligne</Label>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setEditingProject(p)}>Modifier</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Supprimer "{p.title}" ?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Cette action est irréversible et supprimera ce modèle de projet.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteProject(p.type)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>)}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-formulaires">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                        <h2 className="text-xl font-semibold text-gray-800">Gestion des Formulaires</h2>
                        <Button onClick={() => setEditingForm({
              name: '',
              fields: [],
              projectIds: []
            })} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Créer un formulaire
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {Object.values(forms).map(f => <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    <span className="font-medium">{f.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setEditingForm(f)}>Modifier</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon">
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
                                                <AlertDialogAction onClick={() => handleDeleteForm(f.id)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>)}
                    </div>
                </motion.div>
              </div>

              <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="gestion-affichage-projets">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">🧱 Gestion de l’Affichage des Projets</h2>
                <div className="space-y-6">
                    <div>
                        <Label htmlFor="project-display-select">Sélecteur de projet</Label>
                        <Select value={selectedProjectForDisplay} onValueChange={setSelectedProjectForDisplay}>
                            <SelectTrigger id="project-display-select">
                                <SelectValue placeholder="Choisir un projet" />
                            </SelectTrigger>
                            <SelectContent>
                                {projectOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedProjectForDisplay && <AnimatePresence>
                            <motion.div key={selectedProjectForDisplay} initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: 10
            }} className="space-y-4 pt-4 border-t">
                                <div>
                                    <Label htmlFor="project-cover-image">Image de couverture (URL)</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input id="project-cover-image" placeholder="https://exemple.com/image.jpg" value={projectDisplayData.coverImage} onChange={e => handleDisplayDataChange('coverImage', e.target.value)} />
                                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                                        <Button variant="outline" onClick={() => fileInputRef.current.click()}>
                                            <Upload className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {projectDisplayData.coverImage ? <div className="mt-2 relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                                            <img src={projectDisplayData.coverImage} alt="Aperçu" className="w-full h-full object-cover" />
                                        </div> : <div className="mt-2 flex items-center justify-center w-full aspect-video rounded-lg bg-gray-100 border-2 border-dashed">
                                            <ImageIcon className="h-10 w-10 text-gray-400" />
                                        </div>}
                                </div>
                                <div>
                                    <Label htmlFor="project-client-description">Description du projet</Label>
                                    <Textarea id="project-client-description" placeholder="Courte description visible par le client..." value={projectDisplayData.clientDescription} onChange={e => handleDisplayDataChange('clientDescription', e.target.value)} rows={4} />
                                </div>
                                <div>
                                    <Label htmlFor="project-cta-text">Texte du bouton (CTA)</Label>
                                    <Input id="project-cta-text" placeholder="Ex: Ajouter ce projet" value={projectDisplayData.ctaText} onChange={e => handleDisplayDataChange('ctaText', e.target.value)} />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSaveDisplayData} className="bg-green-600 hover:bg-green-700">Enregistrer les modifications</Button>
                                </div>
                            </motion.div>
                        </AnimatePresence>}
                </div>
              </motion.div>
              
              <motion.div variants={itemVariants} className="bg-white p-6 sm:p-8 rounded-2xl shadow-card" id="creation-prompt">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <h2 className="text-xl font-semibold text-gray-800">Création de Prompt</h2>
                  <Button onClick={() => openPromptCreator(null)} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Créer un nouveau prompt
                  </Button>
                </div>
                <div className="space-y-3">
                  {Object.values(prompts).length > 0 ? Object.values(prompts).map(p => <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Bot className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-gray-500">{projectsData[p.projectId]?.title || 'Projet inconnu'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openPromptCreator(p)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer "{p.name}" ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Cette action est irréversible.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePrompt(p.id)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </div>) : <div className="text-center text-gray-500 py-4">
                      <Bot className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2">Aucun prompt créé. Cliquez sur le bouton pour en ajouter un.</p>
                    </div>}
                </div>
              </motion.div>

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
                          Remplissez les informations ci-dessous pour ajouter un nouveau membre à votre équipe.
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
                          <Label htmlFor="invite-password" className="text-right col-span-1">Mot de passe</Label>
                          <Input id="invite-password" type="password" className="col-span-3" value={newUser.password} onChange={e => handleNewUserChange('password', e.target.value)} />
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
                        <Button onClick={handleInviteUser} className="bg-blue-600 hover:bg-blue-700">Inviter</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
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
                            <Button variant="outline" size="sm" onClick={() => openChangeRoleDialog(user)} disabled={user.role === 'Admin' || user.role === 'Global Admin'}>Changer le rôle</Button>
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
                            <Label className="font-semibold">Modules accessibles</Label>
                            <div className="mt-2 space-y-2">
                                {['Pipeline', 'Agenda', 'Contacts'].map(module => <div key={module} className="flex items-center space-x-2">
                                        <Checkbox id={`module-${module}`} checked={(accessRights.modules || []).includes(module)} onCheckedChange={checked => handleAccessModuleChange(module, checked)} disabled={isEditingAdmin} />
                                        <Label htmlFor={`module-${module}`} className={isEditingAdmin ? 'text-gray-500' : ''}>{module}</Label>
                                    </div>)}
                            </div>
                        </div>
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

          <CreateProjectDialog open={isCreateProjectOpen} onOpenChange={setCreateProjectOpen} onSave={handleSaveProject} />

          <Dialog open={!!editingProject} onOpenChange={isOpen => !isOpen && setEditingProject(null)}>
              <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>Modifier le projet "{editingProject?.title}"</DialogTitle>
                  </DialogHeader>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                      {editingProject && <ProjectEditor project={editingProject} onSave={handleSaveProject} onCancel={() => setEditingProject(null)} />}
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